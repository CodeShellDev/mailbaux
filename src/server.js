const logger = require("./logger")
const db = require("./db")
const docker = require("./docker")
const CreateApp = require("./app")

const PORT = process.env.PORT || 8070

async function start() {
	try {
		await db.Init()

		CreateApp(redisClient)

		await docker()

		app.listen(PORT, () => {
			logger.log(`Server running on http://localhost:${PORT}`)
		})
	} catch (err) {
		console.error(err)
		process.exit(1)
	}
}

start()
