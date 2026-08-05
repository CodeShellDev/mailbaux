const util = require("util")

const LOG_LEVEL = parseInt(process.env.LOG_LEVEL) || 1

const LEVEL = {
	ENV: { value: "ENV_", id: 1 },
	DB: { value: "DB__", id: 1 },
	INFO: { value: "INFO", id: 1 },
	WARN: { value: "WARN", id: 1 },
	EROR: { value: "EROR", id: 1 },
	DEBG: { value: "DEBG", id: 10 },
}

function _log(level, ...args) {
	if (LOG_LEVEL < level.id) {
		return
	}

	const formattedArgs = args.map((arg) => {
		if (typeof arg === "object") {
			return util.inspect(arg, { showHidden: false, depth: null, colors: true })
		}
		return arg
	})
	console.log(`[${level.value}]`, ...formattedArgs)
}

function log(...args) {
	_log(LEVEL.INFO, ...args)
}

function warn(...args) {
	_log(LEVEL.WARN, ...args)
}

function err(...args) {
	_log(LEVEL.EROR, ...args)
}

function env(...args) {
	_log(LEVEL.ENV, ...args)
}

function db(...args) {
	_log(LEVEL.DB, ...args)
}

function debug(...args) {
	_log(LEVEL.DEBG, ...args)
}

exports.log = log
exports.warn = warn
exports.err = err
exports.env = env
exports.db = db
exports.debug = debug

exports.LEVEL = LEVEL
