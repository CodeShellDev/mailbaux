const express = require("express")
const router = express.Router()

const logger = require("../logger")
const config = require("../config")
const db = require("../db")

// App OIDC: full trust, user logged into mailauth directly
function GetAppUserID(req) {
	return req.isAuthenticated?.() ? req.user?.id : null
}

// Mail OIDC: id from a validated id_token during the mailcow -> mailauth -> authentik flow
// Only allowed to read/select existing mailboxes
function GetMailFlowUserID(req) {
	return req.session?.mail?.id || null
}

function RequireAppAuth(req, res, next) {
	const id = GetAppUserID(req)

	if (!id) {
		return res.status(401).json({ error: "App authentication required" })
	}

	next()
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
		return res.status(401).json({ error: "Not authenticated" })
	}

	return res.json(user)
})

// Modifcations require full app auth, never mail-flow
router.post("/mailbox/edit", RequireAppAuth, async (req, res, next) => {
	const user = res.locals.user
	const mailbox = req.body.email

	if (!user) return res.status(404).json({ error: "User not found" })

	const owned = user.mailboxes.some((m) => m.email === mailbox)
	if (!owned) return res.status(403).json({ error: "Not your mailbox" })

	await db.UpdateBy(
		{ id: res.locals.id, "mailboxes.email": mailbox },
		{ "mailboxes.$.name": req.body.name },
	)

	return res.sendStatus(200)
})

router.post("/mailbox/delete", RequireAppAuth, async (req, res, next) => {
	const user = res.locals.user
	const mailbox = req.body.email

	if (!user) return res.status(404).json({ error: "User not found" })

	const owned = user.mailboxes.some((m) => m.email === mailbox)
	if (!owned) return res.status(403).json({ error: "Not your mailbox" })

	await db.DeleteFromArrayBy(
		{ id: res.locals.id },
		{ mailboxes: { email: mailbox } },
	)

	return res.sendStatus(200)
})

router.post("/mailbox/create", RequireAppAuth, async (req, res, next) => {
	const email = req.body.email
	const name = req.body.name

	if (!email || typeof email !== "string") {
		return res.status(400).json({ error: "Invalid email" })
	}

	if (!name || typeof name !== "string") {
		return res.status(400).json({ error: "Invalid name" })
	}

	const existing = await db.FindBy({ "mailboxes.email": email })

	if (existing) {
		return res.status(409).json({ error: "Mailbox already claimed" })
	}

	await db.AddToArray({ id: res.locals.id }, { mailboxes: { email, name } })

	return res.sendStatus(200)
})

// Select: allowed from mail-flow context
router.post("/mailbox/select", async (req, res, next) => {
	const user = res.locals.user
	const email = req.body?.email

	if (!user || !email) {
		return res.status(400).json({ error: "Bad request" })
	}

	const owned = user.mailboxes.some((m) => m.email === email)

	if (!owned) {
		return res.status(403).json({ error: "Not your mailbox" })
	}

	if (!req.session.mail) {
		req.session.mail = {}
	}

	req.session.mail.selected_mailbox = email

	return res.json({ url: `${config.PREFIX}/oauth/mail/mailbox` })
})

router.use((req, res, next) => res.sendStatus(404))

module.exports = router
