import { Router } from "express"

import { HttpError } from "#types/errors"
import { GetUserByID } from "#utils/db"

const router = Router()

// App OIDC: full trust, user logged into mailbaux directly
export function GetAppUserID(req) {
	return req.isAuthenticated?.() ? req.user?.id : null
}

// Mail OIDC: id from a validated id_token during the mailcow -> mailbaux -> authentik flow
// Only allowed to read/select existing mailboxes
export function GetMailFlowUserID(req) {
	return req.session?.mail?.id || null
}

export function RequireAppAuth(req, res, next) {
	if (!res.locals.context.isApp) {
		throw new HttpError(401, "App authentication required")
	}

	if (!res.locals.user) {
		throw new HttpError(404, "User not found")
	}

	next()
}

export function RequireMailAuth(req, res, next) {
	if (!res.locals.context.isMail) {
		throw new HttpError(401, "Mail authentication required")
	}

	if (!res.locals.user) {
		throw new HttpError(404, "User not found")
	}

	next()
}

export function RequireMailOrAppAuth(req, res, next) {
	if (!res.locals.context.isMail && !res.locals.context.isApp) {
		throw new HttpError(401, "Mail or App authentication required")
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

	res.locals.context = {
		isApp: appId != null,
		isMail: mailFlowId != null,
	}

	const id = appId || mailFlowId

	if (id) {
		res.locals.id = id
		res.locals.user = await GetUserByID(id)
	}

	next()
})

export { router }
