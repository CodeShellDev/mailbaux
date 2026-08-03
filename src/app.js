const express = require("express")
const session = require("express-session")

const passport = require("passport")

const logger = require("./logger")
const db = require("./db")
const config = require("./config")
const docker = require("./docker")

const routes = require("./routes/routes")
const dataRoutes = require("./routes/data")
const oauthMailRoutes = require("./routes/oauth-mail")
const oauthApplicationRoutes = require("./routes/oauth-application")

const rootRouter = express.Router()

const path = require("path")

const app = express()

const PORT = process.env.PORT || 8070

app.use(config.PREFIX, express.static("public"))

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.set("view engine", "ejs")

app.enable("trust proxy")

app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
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

	res.redirect = function redirectOverride(...args) {
		let target = args.pop()

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

app.listen(PORT, () => {
	db.Init()
	docker()

	logger.log(`Server running on http://localhost:${PORT}`)
})
