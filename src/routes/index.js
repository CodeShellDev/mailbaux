import { Router } from "express"

import { HttpError } from "#types/errors"
import { RequireMailAuth } from "#router"
import logger from "#utils/logger"

const router = Router()

router.get("/", (req, res, next) => {
	if (!req.isAuthenticated()) {
		return res.redirect("/oauth/app")
	}

	return res.render("home", {
		prefix: req.baseUrl,
	})
})

router.get("/select", RequireMailAuth, async (req, res, next) => {
	return res.render("select", {
		prefix: req.baseUrl,
	})
})

export default router
