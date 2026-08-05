const express = require("express")
const { HttpError } = require("../types/errors")
const { RequireMailAuth } = require("../router")
const router = express.Router()

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

module.exports = router
