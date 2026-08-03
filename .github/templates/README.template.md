# Mailauth

Mailauth is a Mailbox Manager which enables you too select between your Mailboxes and authenticate with your Mailserver (like [mailcow](https://github.com/mailcow/mailcow-dockerized))

## Screenshots

![mailauth-home](https://github.com/user-attachments/assets/934fb3a3-3160-4fcb-a30e-10b62a804411)

## Getting Started

Get the latest version of the `docker-compose.yaml` file:

```yaml
+{{{ read "docker-compose.yaml" }}}
```

### Setup

Mailauth _currently_ works by modifying the `email` claim during Token Exchange and Userinfo,
this means that you **will have to** use a IdP (like [authentik](https://goauthentik.io)).

Create a `.env` file inside of you `docker-compose.yaml` directory and copy the template below

```dotenv
+{{{ read "examples/config.env" }}}
```

Now you need to setup a Oauth Authentication Method in your mailserver,
but instead of using your IdP's endpoints you use:

- `/oauth/mail/authorize`
- `/oauth/mail/token`
- `/oauth/mail/userinfo`

And set Redirect URI to the one from your `.env` file.

### Reverse Proxy

When working with OAuth2 and Auth in general it is recommended to be sure to use secure connections,
here you will see a Reverse Proxy implementation with traefik:

```yaml
+{{{ read "examples/traefik.docker-compose.yaml" }}}
```

## Usage

When authenticating via mailauth you get redirected to your actual IdP then to `/select`,
where you will be able to select your mailbox, mailauth changes the `email` claim and now you're logged in.

## Contributing

Found an Issue or want to see something implemented into Mailauth?
Open up an Issue or start a Pull Request!

But always be respectful and patient, we are all volunteers after all.

## Supporting

Found this Project useful? Let others know about Mailauth by ⭐️ this Repo!

## License

[MIT](https://choosealicense.com/licenses/mit/)
