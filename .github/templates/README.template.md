# Mailauth

Mailauth is a mailbox manager that allows users to select between multiple mailboxes and authenticate with their mail server (such as [mailcow](https://github.com/mailcow/mailcow-dockerized)) through an OAuth2-compatible identity provider.

## Screenshots

**Home**
![mailauth home](./screenshots/home.png)

**Select flow**
![mailauth select flow](./screenshots/select-flow.png)

## Getting Started

### Docker Compose

Download the latest version of the `docker-compose.yaml` file:

```yaml
+{{{ read "docker-compose.yaml" }}}
```

### Configuration

Mailauth currently works by modifying the `email` claim during OAuth2 **Token Exchange** and **UserInfo** requests.

Because of this, Mailauth requires an external Identity Provider (IdP), such as [authentik](https://goauthentik.io).

Create a `.env` file in the same directory as your `docker-compose.yaml` and copy the configuration template:

```dotenv
+{{{ read "examples/config.env" }}}
```

### OAuth Setup

Configure an OAuth authentication method in your mail server.

Instead of using your IdP's OAuth endpoints, use the Mailauth endpoints:

| Endpoint       | URL                     |
| -------------- | ----------------------- |
| Authorization  | `/oauth/mail/authorize` |
| Token Exchange | `/oauth/mail/token`     |
| User Info      | `/oauth/mail/userinfo`  |

Set the redirect URI to the value configured in your `.env` file.

## Reverse Proxy

OAuth2 authentication should always be used over a secure connection.

The following example shows a reverse proxy setup using Traefik:

```yaml
+{{{ read "examples/traefik.docker-compose.yaml" }}}
```

## Usage

When authenticating through Mailauth:

1. You are redirected to your configured IdP.
2. After successful authentication, Mailauth redirects you to the mailbox selection page.
3. You select the mailbox you want to authenticate with.
4. Mailauth updates the `email` claim and completes the OAuth2 flow.

You are now authenticated with the selected mailbox.

## Contributing

Found a bug or have an idea for improving Mailauth?

Feel free to open an issue or submit a pull request.

Please be respectful and patient when contributing. Mailauth is maintained by volunteers.

## Supporting

If you find Mailauth useful, consider giving the repository a ⭐ to help others discover it.

## License

This Project is licensed under the [MIT License](./LICENSE).
