const jwt = require("jsonwebtoken")
const fs = require("fs")
const path = require("path")

const config = require("./config")

const logger = require("./logger")

const { generateKeyPairSync } = require("crypto")

let privateKey

function CheckForKey() {
	const privateKeyPath = path.join(config.JWT_KEY_PATH, "private_key.pem")
	const publicKeyPath = path.join(config.JWT_KEY_PATH, "public_key.pem")

	if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
		privateKey = fs.readFileSync(privateKeyPath, "utf8")

		logger.log("Loaded existing RSA private key")
	} else {
		const { privateKey: genPrivKey, publicKey: genPubKey } =
			generateKeyPairSync("rsa", {
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

		fs.mkdirSync(path.dirname(keyPath), { recursive: true })
		fs.writeFileSync(keyPath, genPrivKey)
		fs.writeFileSync(publicKeyPath, genPubKey)
		privateKey = genPrivKey

		logger.log("Generated new RSA key pair")
	}
}

function SignToken(payload) {
	const options = {
		algorithm: "RS256",
		keyid: "middleware-key-1",
	}

	return jwt.sign(payload, privateKey, options)
}

function DecodeToken(idToken) {
	return jwt.decode(idToken)
}

CheckForKey()

exports.SignToken = SignToken
exports.DecodeToken = DecodeToken
exports.CheckForKey = CheckForKey
