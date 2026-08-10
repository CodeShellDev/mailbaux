import logger from "#utils/logger"

/**
 * @typedef {Object} Config
 *
 * @property {number} LOG_LEVEL
 * @property {string} HOST
 * @property {string} PREFIX
 * @property {string} SESSION_SECRET
 * @property {string} JWT_KEY_PATH
 *
 * @property {string} APP_ISSUER
 * @property {string} APP_AUTHORIZATION_ENDPOINT
 * @property {string} APP_TOKEN_ENDPOINT
 * @property {string} APP_USERINFO_ENDPOINT
 * @property {string} APP_REDIRECT_PATH
 * @property {string} APP_CLIENT_ID
 * @property {string} APP_CLIENT_SECRET
 * @property {string} APP_SCOPE
 *
 * @property {string[]} VALID_EMAIL_DOMAINS
 * @property {boolean} ALLOW_USER_MAILBOX_CREATION
 *
 * @property {string} MAIL_ISSUER
 * @property {string} MAIL_AUTHORIZATION_ENDPOINT
 * @property {string} MAIL_TOKEN_ENDPOINT
 * @property {string} MAIL_USERINFO_ENDPOINT
 * @property {string[]} MAIL_REDIRECT_URIS
 * @property {string[]} MAIL_CALLBACK_URIS
 * @property {string} MAIL_CLIENT_ID
 * @property {string} MAIL_CLIENT_SECRET
 *
 * @property {string} DB_HOST
 * @property {string} DB_NAME
 * @property {string} DB_USER
 * @property {string} DB_PASSWORD
 * @property {string} DB_URI
 *
 * @property {string} REDIS_HOST
 * @property {string} REDIS_PASSWORD
 * @property {string} REDIS_URI
 */

/** @type {Config} */
const config = {}

/**
 * @typedef {Object} DefineOptions
 * @property {"string"|"number"|"array"|"bool"} [type]
 * @property {boolean} [required]
 */

/**
 * @overload
 * @param {string} name
 * @param {DefineOptions & { type: "string", default?: string | (() => string) }} options
 * @returns {string}
 */

/**
 * @overload
 * @param {string} name
 * @param {DefineOptions & { type: "number", default?: number | (() => number) }} options
 * @returns {number}
 */

/**
 * @overload
 * @param {string} name
 * @param {DefineOptions & { type: "array", default?: string[] | (() => string[]) }} options
 * @returns {string[]}
 */

/**
 * @overload
 * @param {string} name
 * @param {DefineOptions & { type: "bool", default?: boolean | (() => boolean) }} options
 * @returns {boolean}
 */

/**
 * @overload
 * @param {string} name
 * @param {DefineOptions & { type?: undefined, default?: string | (() => string) }} options
 * @returns {string}
 */

/**
 * @param {string} name
 * @param {DefineOptions & { default?: unknown }} [options={}]
 * @returns {string|number|string[]|boolean|undefined}
 */
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
			logger.error(`${name} is required but not set`, null, {
				skipCaller: true,
			})
			process.exit(1)
		}
	} else if (type === "number") {
		value = Number(raw)

		if (Number.isNaN(value)) {
			logger.error(`${name} must be a number, got "${raw}"`, null, {
				skipCaller: true,
			})
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
		logger.warn(`${name} is not set`, null, { skipCaller: true })
	} else {
		logger.debug(`${name} = ${value}`, null, { skipCaller: true })
	}

	config[name] = value
	return value
}

define("LOG_LEVEL", { type: "string", default: "info" })

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

define("ALLOW_USER_MAILBOX_CREATION", { type: "bool", default: true })

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

export default config
