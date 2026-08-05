const express = require("express")
const session = require("express-session")
const passport = require("passport")
const { RedisStore } = require("connect-redis")

const { GetRedis } = require("./utils/db")

const logger = require("./utils/logger")
const config = require("./utils/config")

const routes = require("./routes/routes")
const dataRoutes = require("./routes/data")
const oauthMailRoutes = require("./routes/oauth-mail")
const oauthApplicationRoutes = require("./routes/oauth-application")

function CreateApp() {
	const app = express()
	const rootRouter = express.Router()

	app.use(config.PREFIX, express.static("public"))

	app.use(express.urlencoded({ extended: true }))
	app.use(express.json())

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
		logger.log(`New ${req.method} Request from ${req.ip} [${req.path}]`)
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

		logger.err(err)

		res.status(500).json({ error: "Internal server error" })
	})

	return app
}

module.exports = CreateApp
