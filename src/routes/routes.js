const express = require("express")
const { HttpError } = require("../types/errors")
const router = express.Router()

router.get("/", (req, res, next) => {
	if (!req.isAuthenticated()) {
		return res.redirect("/oauth/app")
	}

	return res.render("home", {
		prefix: req.baseUrl,
	})
})

router.get("/select", async (req, res, next) => {
	if (res.locals.context !== "mail")
		throw new HttpError(401, "No mail flow is currently active")

	return res.render("select", {
		prefix: req.baseUrl,
	})
})

module.exports = router
