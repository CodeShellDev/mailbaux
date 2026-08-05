const express = require("express")
const router = express.Router()
const { HttpError } = require("./types/errors")
const micromatch = require("micromatch")

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

module.exports.router = router
module.exports.GetAppUserID = GetAppUserID
module.exports.GetMailFlowUserID = GetMailFlowUserID
module.exports.RequireAppAuth = RequireAppAuth
