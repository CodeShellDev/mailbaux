const express = require("express")
const router = express.Router()

const { HttpError } = require("../types/errors")
const { RequireMailAuth } = require("../router")
const logger = require("../utils/logger")

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
