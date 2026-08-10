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

function normalize(obj) {
	if (obj instanceof Error) {
		return { err: obj }
	}

	return obj
}

const logger = {
	trace(msg, obj) {
		_logger.trace(normalize(obj), msg)
	},

	dev(msg, obj) {
		_logger.dev(normalize(obj), msg)
	},

	debug(msg, obj) {
		_logger.debug(normalize(obj), msg)
	},

	info(msg, obj) {
		_logger.info(normalize(obj), msg)
	},

	warn(msg, obj) {
		_logger.warn(normalize(obj), msg)
	},

	error(msg, obj) {
		_logger.error(normalize(obj), msg)
	},

	fatal(msg, obj) {
		_logger.fatal(normalize(obj), msg)
	},
}

export default logger
