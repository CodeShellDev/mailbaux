import { Router } from "express"

import crypto from "crypto"

import { DecodeToken, SignToken } from "#utils/token"

import logger from "#utils/logger"
import config from "#utils/config"
import {
	GetUserByID,
	WriteToCache,
	GetFromCache,
	DeleteFromCache,
} from "#utils/db"

import tldts from "tldts"

import querystring from "querystring"

import axios from "axios"

const router = Router()

async function TokenExchange(endpoint, code, id, secret, redirectURI) {
	const data = {
		grant_type: "authorization_code",
		code: code,
		redirect_uri: redirectURI,
		client_id: id,
		client_secret: secret,
	}

	const formData = querystring.stringify(data)

	const response = await axios.post(endpoint, formData, {
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
	})

	logger.dev("Token Exchange", response.data)

	return response.data
}

async function GetUserInfo(endpoint, token) {
	const response = await axios.get(endpoint, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})

	logger.dev("Userinfo:", response.data)

	return response.data
}

async function IsOwnedByUser(id, email) {
	if (!id || !email) return false

	const user = await GetUserByID(id)

	if (!user) return false

	return user.mailboxes.some((mailbox) => mailbox.email === email)
}

function GetBaseUrl(req, overwriteHost = null) {
	const prot = req.protocol
	const host = overwriteHost || req.get("host")

	return `${prot}://${host}`
}

function GetMatchingRedirectUri(req, redirectUris, host = null) {
	const baseUrl = GetBaseUrl(req, host)

	const rootDomain = tldts.parse(baseUrl).domain

	let candidates = redirectUris.filter(
		(uri) => tldts.parse(uri).domain === rootDomain,
	)

	if (candidates.length > 1) {
		const subdomain = tldts.parse(baseUrl).subdomain

		const match = candidates.find(
			(uri) => tldts.parse(uri).subdomain === subdomain,
		)

		if (match) candidates = [match]
	}

	return candidates[0]
}

router.get("/authorize", async (req, res, next) => {
	try {
		if (!req.query.state) {
			return res.status(400).send("Missing state")
		}

		const queryString = Object.entries(req.query)
			.map(
				([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`,
			)
			.join("&")

		// mailcow starts this flow cross-domain (its own origin -> mailbaux -> authentik)
		// We still need to know which mailcow host to route the callback back to.
		// The caller must also be a known configured host, matched against MAIL_REDIRECT_URIS
		const referer = req.get("Referer")
		let originalHost = req.get("host")

		if (referer) {
			try {
				originalHost = new URL(referer).host
			} catch {
				// malformed Referer, fall back to req.get("host")
			}
		}

		const matchedUri = GetMatchingRedirectUri(
			req,
			config.MAIL_REDIRECT_URIS,
			originalHost,
		)

		// state is attacker-influenced (comes from mailcow's query string),
		// so it must never be used directly as a cache key.
		// Generate our own random nonce instead
		const nonce = crypto.randomBytes(24).toString("hex")

		await WriteToCache(`state:${nonce}`, {
			host: originalHost,
			origState: req.query.state,
		})

		if (
			matchedUri &&
			tldts.parse(GetBaseUrl(req)).domain !== tldts.parse(matchedUri).domain
		) {
			const authorizeUrl = matchedUri.replace("callback", "authorize")

			const forwardedQuery = new URLSearchParams(req.query)
			forwardedQuery.set("state", nonce)

			return res.redirect(`${authorizeUrl}?${forwardedQuery.toString()}`)
		}

		const forwardedQuery = new URLSearchParams(req.query)
		forwardedQuery.set("state", nonce)

		const newUrl = `${config.MAIL_AUTHORIZATION_ENDPOINT}?${forwardedQuery.toString()}`

		return res.redirect(newUrl)
	} catch (err) {
		logger.error("Error in /authorize:", err, { skipCaller: true })
		return res.status(500).send("Authorization failed")
	}
})

router.get("/callback", async (req, res, next) => {
	try {
		const nonce = req.query.state

		if (!nonce) {
			return res.status(400).send("Missing state")
		}

		const stateData = await GetFromCache(`state:${nonce}`)

		if (!stateData?.host) {
			return res.status(400).send("Invalid or expired state")
		}

		await DeleteFromCache(`state:${nonce}`)

		const redirectUri = GetMatchingRedirectUri(
			req,
			config.MAIL_REDIRECT_URIS,
			stateData.host,
		)

		if (!redirectUri) {
			return res.status(400).send("No matching redirect URI")
		}

		const tokenRes = await TokenExchange(
			config.MAIL_TOKEN_ENDPOINT,
			req.query.code,
			config.MAIL_CLIENT_ID,
			config.MAIL_CLIENT_SECRET,
			redirectUri,
		)

		if (!tokenRes?.id_token || !tokenRes?.access_token) {
			return res.status(502).send("Token exchange failed")
		}

		const codeHandle = crypto.randomBytes(24).toString("hex")

		await WriteToCache(`code:${codeHandle}`, tokenRes)

		const idToken = DecodeToken(tokenRes.id_token)

		await WriteToCache(`access:${tokenRes.access_token}`, idToken.sub)

		req.session.mail = {
			code: codeHandle,
			state: stateData.origState,
			id: idToken.sub,
		}

		return res.redirect("/select")
	} catch (err) {
		logger.error("Error in /callback:", err, { skipCaller: true })
		return res.status(502).send("Callback failed")
	}
})

router.get("/mailbox", async (req, res, next) => {
	try {
		const mailData = req.session.mail

		if (!mailData?.code) {
			return res.status(400).send("No pending mail session")
		}

		const originalHost = await GetFromCache(`state:${mailData.state}`)

		const tokenRes = await GetFromCache(`code:${mailData.code}`)

		if (!tokenRes?.id_token) {
			return res.status(400).send("Session expired, please restart")
		}

		const idToken = DecodeToken(tokenRes.id_token)

		await WriteToCache(`id:${idToken.sub}`, mailData.selected_mailbox)

		req.session.mail = {}

		const redirectUri = GetMatchingRedirectUri(
			req,
			config.MAIL_CALLBACK_URIS,
			originalHost,
		)

		if (!redirectUri) {
			return res.status(400).send("No matching callback URI")
		}

		return res.redirect(
			`${redirectUri}?code=${mailData.code}&state=${mailData.state}`,
		)
	} catch (err) {
		logger.error("Error in /mailbox:", err, { skipCaller: true })
		return res.status(500).send("Mailbox selection failed")
	}
})

router.post("/token", async (req, res, next) => {
	try {
		if (!req.body.code) {
			return res.status(400).json({ error: "invalid_request" })
		}

		const tokenRes = await GetFromCache(`code:${req.body.code}`)

		if (!tokenRes?.id_token) {
			return res.status(400).json({ error: "invalid_grant" })
		}

		await DeleteFromCache(`code:${req.body.code}`)

		const idToken = tokenRes.id_token
		const accessToken = tokenRes.access_token

		const decoded = DecodeToken(idToken)

		let newPayload = decoded

		const id = await GetFromCache(`access:${accessToken}`)
		const mailbox = id ? await GetFromCache(`id:${id}`) : null

		if (!(await IsOwnedByUser(id, mailbox))) {
			return res.status(403).json({ error: "mailbox_not_selected" })
		}

		newPayload.email = mailbox
		newPayload.iss = config.MAIL_ISSUER

		const newIdToken = SignToken(newPayload)

		// Keep access-token -> id mapping alive only as long as the token itself is valid
		await WriteToCache(`access:${accessToken}`, id, 300)

		const responseBody = {
			access_token: accessToken,
			token_type: "Bearer",
			expires_in: 300,
			id_token: newIdToken,
			scope: tokenRes.scope,
		}

		return res.status(200).json(responseBody)
	} catch (err) {
		logger.error("Error in /token:", err, { skipCaller: true })
		return res.status(500).json({ error: "server_error" })
	}
})

router.get("/userinfo", async (req, res, next) => {
	try {
		const authHeader = req.headers["authorization"]

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({ error: "missing_token" })
		}

		const accessToken = authHeader.slice("Bearer ".length)

		const userinfo = await GetUserInfo(
			config.MAIL_USERINFO_ENDPOINT,
			accessToken,
		)

		if (!userinfo) {
			return res.status(502).json({ error: "userinfo_unavailable" })
		}

		const id = await GetFromCache(`access:${accessToken}`)
		const mailbox = id ? await GetFromCache(`id:${id}`) : null

		if (!(await IsOwnedByUser(id, mailbox))) {
			return res.status(403).json({ error: "mailbox_not_selected" })
		}

		userinfo.email = mailbox

		await DeleteFromCache(`access:${accessToken}`)
		await DeleteFromCache(`id:${id}`)

		return res.status(200).json(userinfo)
	} catch (err) {
		_err("Error in /userinfo:", err)
		return res.status(502).json({ error: "server_error" })
	}
})

export default router
