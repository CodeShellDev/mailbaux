import pino from "pino"

const _logger = pino({
	level: process.env.LOG_LEVEL ?? "info",
	customLevels: {
		dev: 15,
	},
	transport: {
		target: "pino-pretty",
		options: {
			colorize: true,
			translateTime: "dd.mm.yy HH:MM:ss",
			ignore: "pid,hostname",
		},
	},
})

function getCaller(skips) {
	const stack = new Error().stack?.split("\n") ?? []

	return parseCaller(stack[4 + skips])
}

function parseCaller(
	frame,
	{ showFunction = false, showLine = true, showFile = true } = {},
) {
	if (!frame) return "unknown"

	let match = frame.match(/^\s*at\s+(.+?)\s+\((.+):(\d+):(\d+)\)$/)

	if (match) {
		const [, functionName, file, line] = match

		let res = ``

		if (showFile) res += cleanPath(file)
		if (showLine) res += `:${line}`
		if (showFunction) res += ` ${functionName}()`

		return res
	}

	match = frame.match(/^\s*at\s+(.+):(\d+):(\d+)$/)

	if (match) {
		const [, file, line] = match
		let res = ``

		if (showFile) res += cleanPath(file)
		if (showLine) res += `:${line}`

		return res
	}

	return frame.trim().replace(/^at\s+/, "")
}

function cleanPath(file) {
	return file.replace(/^file:\/\//, "").replace(/^.*\/src\//, "")
}

function normalize(obj) {
	if (obj instanceof Error) {
		return { err: obj }
	}

	return obj
}

function log(level, msg, obj, options = {}) {
	const caller = getCaller(options.skipCaller ?? 0)

	if (obj !== undefined && typeof obj === "object" && obj !== null) {
		obj.caller = caller

		_logger[level](normalize(obj), msg)
	} else {
		_logger[level]({ caller }, msg)
	}
}

const logger = {
	trace(msg, obj, options = {}) {
		log("trace", msg, obj, options)
	},

	dev(msg, obj, options = {}) {
		log("dev", msg, obj, options)
	},

	debug(msg, obj, options = {}) {
		log("debug", msg, obj, options)
	},

	info(msg, obj, options = {}) {
		log("info", msg, obj, options)
	},

	warn(msg, obj, options = {}) {
		log("warn", msg, obj, options)
	},

	error(msg, obj, options = {}) {
		log("error", msg, obj, options)
	},

	fatal(msg, obj, options = {}) {
		log("fatal", msg, obj, options)
	},
}

export default logger
