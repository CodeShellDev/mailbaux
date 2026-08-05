const express = require("express")
const router = express.Router()
const { HttpError } = require("../types/errors")
const micromatch = require("micromatch")

const logger = require("../utils/logger")
const config = require("../utils/config")
const db = require("../utils/db")

const { RequireAppAuth, RequireMailAuth } = require("../router")

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

// Read-only (allowed for both)
router.get("/mailbox", async (req, res, next) => {
	const user = res.locals.user

	if (!user) {
		throw new HttpError(401, "Not authenticated")
	}

	let mailboxes = user.mailboxes

	if (res.locals.context === "mail")
		mailboxes = mailboxes.filter(
			(m) => ValidateEmail(m.email) && EmailAllowed(m.email),
		)

	return res.json(mailboxes)
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
