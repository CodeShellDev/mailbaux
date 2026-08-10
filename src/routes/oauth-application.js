import { Router } from "express"

import config from "#utils/config"
import logger from "#utils/logger"

import passport from "passport"
import { Strategy as OpenIDConnectStrategy } from "passport-openidconnect"

const router = Router()

passport.use(
	"oidc",
	new OpenIDConnectStrategy(
		{
			issuer: config.APP_ISSUER,
			authorizationURL: config.APP_AUTHORIZATION_ENDPOINT,
			tokenURL: config.APP_TOKEN_ENDPOINT,
			userInfoURL: config.APP_USERINFO_ENDPOINT,
			clientID: config.APP_CLIENT_ID,
			clientSecret: config.APP_CLIENT_SECRET,
			callbackURL: config.APP_REDIRECT_PATH,
			scope: config.APP_SCOPE,
		},
		(issuer, profile, done) => {
			if (!profile?.id) {
				return done(new Error("OIDC profile missing id"))
			}

			logger.dev("Profile: ", profile)

			return done(null, profile)
		},
	),
)

passport.serializeUser((user, done) => {
	done(null, {
		id: user.id,
		displayName: user.displayName,
		emails: user.emails,
	})
})

passport.deserializeUser((obj, done) => {
	done(null, obj)
})

router.get("/", passport.authenticate("oidc"))

router.get(
	"/callback",
	passport.authenticate("oidc", { failureRedirect: "/" }),
	(req, res) => {
		return res.redirect("/")
	},
)

export default router
