import logger from "#utils/logger"
import { Close } from "#utils/db"

export default () => {
	process.on("SIGTERM", async () => {
		logger.info("Received SIGTERM, shutting down gracefully...")

		await Close()

		process.exit(0)
	})

	process.on("SIGINT", async () => {
		logger.info("Received SIGINT, shutting down gracefully...")

		await Close()

		process.exit(0)
	})
}
