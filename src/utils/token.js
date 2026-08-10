import jwt from "jsonwebtoken"
import crypto from "crypto"

import fs from "fs"
import path from "path"

import config from "#utils/config"

import logger from "#utils/logger"

let privateKey

export function CheckForKey() {
	const privateKeyPath = path.join(config.JWT_KEY_PATH, "private_key.pem")
	const publicKeyPath = path.join(config.JWT_KEY_PATH, "public_key.pem")

	if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
		privateKey = fs.readFileSync(privateKeyPath, "utf8")

		logger.info("Loaded existing RSA private key")
	} else {
		const { privateKey: genPrivKey, publicKey: genPubKey } =
			crypto.generateKeyPairSync("rsa", {
				modulusLength: 2048,
				publicKeyEncoding: {
					type: "spki",
					format: "pem",
				},
				privateKeyEncoding: {
					type: "pkcs8",
					format: "pem",
				},
			})

		fs.mkdirSync(path.dirname(config.JWT_KEY_PATH), { recursive: true })

		fs.writeFileSync(privateKeyPath, genPrivKey)
		fs.writeFileSync(publicKeyPath, genPubKey)

		privateKey = genPrivKey

		logger.log("Generated new RSA key pair")
	}
}

export function SignToken(payload) {
	const options = {
		algorithm: "RS256",
		keyid: "middleware-key-1",
	}

	return jwt.sign(payload, privateKey, options)
}

export function DecodeToken(idToken) {
	return jwt.decode(idToken)
}

CheckForKey()
