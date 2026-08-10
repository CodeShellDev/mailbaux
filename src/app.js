import express, { static as staticServe, urlencoded, json } from "express"
import session from "express-session"
import passport from "passport"
import { RedisStore } from "connect-redis"
import { HttpError } from "#types/errors"

import { GetRedis } from "#utils/db"

import logger from "#utils/logger"
import config from "#utils/config"

import { router as rootRouter } from "#router"

import routes from "#routes"
import dataRoutes from "#routes/data"
import oauthMailRoutes from "#routes/oauth-mail"
import oauthApplicationRoutes from "#routes/oauth-application"

function CreateApp() {
	const app = express()

	app.use(config.PREFIX, staticServe("public"))

	app.use(urlencoded({ extended: true }))
	app.use(json())

	app.set("view engine", "ejs")

	app.enable("trust proxy")

	app.use(
		session({
			store: new RedisStore({
				client: GetRedis(),
			}),
			secret: process.env.SESSION_SECRET,
			resave: false,
			saveUninitialized: false,
			cookie: {
				secure: true,
				httpOnly: true,
				maxAge: 1000 * 60 * 60 * 24,
			},
		}),
	)

	app.use(passport.initialize())
	app.use(passport.session())

	app.use((req, res, next) => {
		logger.info(`New ${req.method} Request from ${req.ip} [${req.path}]`)
		next()
	})

	rootRouter.use("/", routes)
	rootRouter.use("/data", dataRoutes)
	rootRouter.use("/oauth/mail", oauthMailRoutes)
	rootRouter.use("/oauth/app", oauthApplicationRoutes)

	app.use((req, res, next) => {
		const origRedirect = res.redirect.bind(res)
		const prefix = config.PREFIX || ""

		res.redirect = function (...args) {
			const target = args.pop()

			if (typeof target === "string" && target.startsWith("/")) {
				args.push(prefix + target)
			} else {
				args.push(target)
			}

			return origRedirect(...args)
		}

		next()
	})

	app.use(config.PREFIX, rootRouter)

	app.use((req, res) => {
		res.status(404).json({ error: "Not found" })
	})

	app.use((err, req, res, next) => {
		if (err instanceof HttpError) {
			return res.status(err.status).json({ error: err.message })
		}

		logger.error("", err)

		res.status(500).json({ error: "Internal server error" })
	})

	return app
}

export default CreateApp
