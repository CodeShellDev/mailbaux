import logger from "#utils/logger"
import { Init } from "#utils/db"
import docker from "./docker.js"
import createApp from "./app.js"

const PORT = process.env.PORT || 8070

async function start() {
	try {
		await Init()

		const app = createApp()

		await docker()

		app.listen(PORT, () => {
			logger.info(`Server running on http://localhost:${PORT}`)
		})
	} catch (err) {
		logger.error("", err, { skipCaller: true })
		process.exit(1)
	}
}

start()
