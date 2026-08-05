const express = require("express")
const router = express.Router()
const { HttpError } = require("../types/errors")
const micromatch = require("micromatch")

const logger = require("../utils/logger")
const config = require("../utils/config")
const db = require("../utils/db")

// App OIDC: full trust, user logged into mailbaux directly
function GetAppUserID(req) {
	return req.isAuthenticated?.() ? req.user?.id : null
}

// Mail OIDC: id from a validated id_token during the mailcow -> mailbaux -> authentik flow
// Only allowed to read/select existing mailboxes
function GetMailFlowUserID(req) {
	return req.session?.mail?.id || null
}

function RequireAppAuth(req, res, next) {
	if (res.locals.context !== "app") {
		throw new HttpError(401, "App authentication required")
	}

	if (!res.locals.user) {
		throw new HttpError(404, "User not found")
	}

	next()
}

function ValidateEmail(email) {
	if (!email || typeof email !== "string") {
		throw new HttpError(400, "Invalid email")
	}

	const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

	if (!regex.test(email)) {
		throw new HttpError(400, "Invalid email")
	}
}

function EmailAllowed(email) {
	const [, domain] = email.split("@")

	if (!micromatch.isMatch(domain, config.ALLOWED_EMAIL_DOMAINS)) {
		throw new HttpError(400, "Email domain not allowed")
	}
}

async function ValidateMailboxAsync(email, name) {
	ValidateEmail(email)

	EmailAllowed(email)

	if (!name || typeof name !== "string") {
		throw new HttpError(400, "Invalid name")
	}

	const existing = await db.FindBy({ "mailboxes.email": email })

	if (existing) {
		throw new HttpError(409, "Mailbox already claimed")
	}
}

async function EnsureNotMailboxAsync(email) {
	ValidateEmail(email)

	const mailbox = await db.FindBy({ "mailboxes.email": email })

	if (mailbox) {
		throw new HttpError(409, "Mailbox already claimed")
	}
}

async function EnsureMailboxAsync(email) {
	ValidateEmail(email)

	const mailbox = await db.FindBy({ "mailboxes.email": email })

	if (!mailbox) {
		throw new HttpError(404, "Mailbox does not exist")
	}

	return mailbox
}

async function EnsureMailboxOwnershipAsync(user, email) {
	const mailbox = await EnsureMailboxAsync(email)

	if (mailbox.id !== user.id) {
		throw new HttpError(403, "Not your mailbox")
	}

	return mailbox
}

// Loads user for either via app-flow or mail-flow context is present, app auth preferred
router.use(async (req, res, next) => {
	const appId = GetAppUserID(req)
	const mailFlowId = GetMailFlowUserID(req)

	const id = appId || mailFlowId

	if (id) {
		res.locals.id = id
		res.locals.user = await db.GetUserByID(id)
		res.locals.context = appId ? "app" : "mail"
	}

	next()
})

// Read-only (allowed for both)
router.get("/mailbox", async (req, res, next) => {
	const user = res.locals.user

	if (!user) {
		throw new HttpError(401, "Not authenticated")
	}

	return res.json(user)
})

// Modifcations require full app auth, never mail-flow
router.post("/mailbox/edit", RequireAppAuth, async (req, res, next) => {
	const user = res.locals.user
	const email = req.body.email

	await EnsureMailboxOwnershipAsync(user, email)

	await db.UpdateBy(
		{ id: res.locals.id, "mailboxes.email": email },
		{ "mailboxes.$.name": req.body.name },
	)

	return res.sendStatus(200)
})

router.post("/mailbox/delete", RequireAppAuth, async (req, res, next) => {
	const user = res.locals.user
	const email = req.body.email

	await EnsureMailboxOwnershipAsync(user, email)

	await db.DeleteFromArrayBy(
		{ id: res.locals.id },
		{ mailboxes: { email: email } },
	)

	return res.sendStatus(200)
})

// Select: allowed from mail-flow context
router.post("/mailbox/select", async (req, res, next) => {
	const user = res.locals.user
	const email = req.body?.email

	if (!user) {
		throw new HttpError(400, "Bad Request")
	}

	await EnsureMailboxOwnershipAsync(user, email)

	if (!req.session.mail) {
		req.session.mail = {}
	}

	req.session.mail.selected_mailbox = email

	return res.json({ url: `${config.PREFIX}/oauth/mail/mailbox` })
})

router.post("/mailbox/create", RequireAppAuth, async (req, res, next) => {
	const email = req.body.email
	const name = req.body.name

	await ValidateMailboxAsync(email, name)

	await EnsureNotMailboxAsync(email)

	await db.AddToArray({ id: res.locals.id }, { mailboxes: { email, name } })

	return res.sendStatus(200)
})

router.post("/mailbox/check", async (req, res, next) => {
	const email = req.body.email
	const name = req.body.name

	await ValidateMailboxAsync(email, name)

	await EnsureNotMailboxAsync(email)

	return res.sendStatus(200)
})

module.exports = router
