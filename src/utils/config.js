const logger = require("./logger")

const config = {}

function define(
	name,
	{ type = "string", default: def, required = false } = {},
) {
	const raw = process.env[name]
	let value

	if (raw === undefined || raw === "") {
		if (def !== undefined) {
			value = typeof def === "function" ? def() : def
		} else if (required) {
			logger.env(`${name} is required but not set`)
			process.exit(1)
		}
	} else if (type === "number") {
		value = Number(raw)

		if (Number.isNaN(value)) {
			logger.env(`${name} must be a number, got "${raw}"`)
			process.exit(1)
		}
	} else if (type === "array") {
		value = raw
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean)
	} else {
		value = raw
	}

	if (value === undefined) {
		logger.env(`${name} is not set`)
	} else {
		logger.debug(`${name} = ${value}`)
	}

	config[name] = value
	return value
}

define("LOG_LEVEL", { type: "number", default: 1 })

const HOST = define("HOST", { required: true })
define("PREFIX", { default: "/" })
define("SESSION_SECRET", { required: true })

config.JWT_KEY_PATH = "/app/data/secrets"

// App

define("APP_ISSUER", { required: true })
define("APP_AUTHORIZATION_ENDPOINT", { required: true })
define("APP_TOKEN_ENDPOINT", { required: true })
define("APP_USERINFO_ENDPOINT", { required: true })
define("APP_REDIRECT_PATH", { default: "/oauth/app/callback" })
define("APP_CLIENT_ID", { required: true })
define("APP_CLIENT_SECRET", { required: true })
define("APP_SCOPE", { default: "openid profile email" })

define("VALID_EMAIL_DOMAINS", { type: "array", default: ["*"] })

// Mail

define("MAIL_ISSUER", { default: HOST })
define("MAIL_AUTHORIZATION_ENDPOINT", { required: true })
define("MAIL_TOKEN_ENDPOINT", { required: true })
define("MAIL_USERINFO_ENDPOINT", { required: true })
define("MAIL_REDIRECT_URIS", {
	type: "array",
	default: () => [`${HOST}/oauth/mail/callback`],
})
define("MAIL_CALLBACK_URIS", { type: "array", required: true })
define("MAIL_CLIENT_ID", { required: true })
define("MAIL_CLIENT_SECRET", { required: true })

// DB

define("DB_HOST", { required: true })
define("DB_NAME", { required: true })
define("DB_USER", { required: true })
define("DB_PASSWORD", { required: true })

config.DB_URI = `mongodb://${encodeURIComponent(config.DB_USER)}:${encodeURIComponent(
	config.DB_PASSWORD,
)}@${config.DB_HOST}/${config.DB_NAME}?authSource=admin`

// Redis

define("REDIS_HOST", { required: true })
define("REDIS_PASSWORD", { required: true })

config.REDIS_URI = `redis://default:${encodeURIComponent(config.REDIS_PASSWORD)}@${config.REDIS_HOST}`

module.exports = config
