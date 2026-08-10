import { Router } from "express"
import { HttpError } from "#types/errors"
import micromatch from "micromatch"

import logger from "#utils/logger"
import config from "#utils/config"
import { FindBy, UpdateBy, DeleteFromArrayBy, AddToArray } from "#utils/db"

import services from "#services"

import { RequireAppAuth, RequireMailAuth, RequireMailOrAppAuth } from "#router"

const router = Router()

function IsValideEmail(email) {
	if (!email || typeof email !== "string") {
		return false
	}

	const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

	return regex.test(email)
}

function IsEmailAllowed(email) {
	const [, domain] = email.split("@")

	return micromatch.isMatch(domain, config.VALID_EMAIL_DOMAINS)
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

	if (!isMatch(domain, config.VALID_EMAIL_DOMAINS)) {
		throw new HttpError(400, "Email domain not allowed")
	}
}

async function ValidateMailboxAsync(email, name) {
	ValidateEmail(email)

	EmailAllowed(email)

	if (!name || typeof name !== "string") {
		throw new HttpError(400, "Invalid name")
	}

	const existing = await FindBy({ "mailboxes.email": email })

	if (existing) {
		throw new HttpError(409, "Mailbox already claimed")
	}
}

async function EnsureNotMailboxAsync(email) {
	ValidateEmail(email)

	const mailbox = await FindBy({ "mailboxes.email": email })

	if (mailbox) {
		throw new HttpError(409, "Mailbox already claimed")
	}
}

async function EnsureMailboxAsync(email) {
	ValidateEmail(email)

	const mailbox = await FindBy({ "mailboxes.email": email })

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

// Read-only (allowed for both)
router.get("/mailbox", RequireMailOrAppAuth, async (req, res, next) => {
	const user = res.locals.user

	let mailboxes = user.mailboxes

	if (res.locals.context.isMail)
		mailboxes = mailboxes.filter(
			(m) => IsValideEmail(m.email) && IsEmailAllowed(m.email),
		)

	return res.json(mailboxes)
})

// Modifcations require full app auth, never mail-flow
router.post("/mailbox/edit", RequireAppAuth, async (req, res, next) => {
	const user = res.locals.user
	const email = req.body.email

	await EnsureMailboxOwnershipAsync(user, email)

	await services.mailboxes.EditMailbox(res.locals.id, email, {
		name: req.body.name,
	})

	return res.sendStatus(200)
})

router.post("/mailbox/delete", RequireAppAuth, async (req, res, next) => {
	const user = res.locals.user
	const email = req.body.email

	await EnsureMailboxOwnershipAsync(user, email)

	await services.mailboxes.DeleteMailbox(res.locals.id, email)

	return res.sendStatus(200)
})

// Select: allowed from mail-flow context
router.post("/mailbox/select", RequireMailAuth, async (req, res, next) => {
	const user = res.locals.user
	const email = req.body?.email

	EmailAllowed(email)

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

	await services.mailboxes.CreateMailbox(res.locals.id, { email, name })

	return res.sendStatus(200)
})

router.post("/mailbox/check", async (req, res, next) => {
	const email = req.body.email
	const name = req.body.name

	await ValidateMailboxAsync(email, name)

	await EnsureNotMailboxAsync(email)

	return res.sendStatus(200)
})

export default router
