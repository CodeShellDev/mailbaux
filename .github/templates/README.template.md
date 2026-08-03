# Mailauth

Mailauth is a mailbox manager that allows users to select between multiple mailboxes and authenticate to their mail server through an existing Identity Provider (IdP).

Mailauth acts as an OAuth2 relay between your mail server and your IdP.

Supported mail servers include solutions such as [mailcow](https://github.com/mailcow/mailcow-dockerized).

## Screenshots

![mailauth-home](https://github.com/user-attachments/assets/934fb3a3-3160-4fcb-a30e-10b62a804411)

# Getting Started

## Docker Compose

Get the latest version of the `docker-compose.yaml` file:

```yaml
+{{{ read "docker-compose.yaml" }}}
```

## Setup

Mailauth requires two separate OAuth2 clients because it is involved in two different OAuth2 flows:

1. **Mail server authentication**
   - Your mail server redirects the user to Mailauth
   - Mailauth redirects the user to your IdP
   - The IdP authenticates the user
   - Mailauth receives the user information
   - The user selects their mailbox.
   - Mailauth modifies the `email` claim and completes the OAuth flow with the mail server

2. **Mailauth interface authentication**
   - The user opens Mailauth directly
   - Mailauth verifies the user's identity with your IdP
   - The IdP authenticates the user
   - Mailauth creates a session and allows the user to manage their mailboxes

The general flow:

```mermaid
flowchart LR
    User[User]

    Mail[Mail Server<br/>OAuth Client]
    Mailauth[Mailauth<br/>OAuth Relay]
    IdP[Identity Provider<br/>authentik, etc.]

    User -->|Login| Mail
    Mail -->|OAuth Request| Mailauth
    Mailauth -->|Select mailbox<br/>Modify email claim| Mail

    User -->|Open interface| Mailauth

    Mailauth -->|Redirect Login| IdP
    Mailauth -->|Verify Identity| IdP
    IdP -->|User Information| Mailauth
```

### Configuration

Create a `.env` file in the same directory as your `docker-compose.yaml`.

Copy the example:

```dotenv
+{{{ read "examples/config.env" }}}
```

#### Defaults

```dotenv
+{{{ read "examples/defaults.env" }}}
```

#### Storage

Mailauth requires MongoDB and Redis.

Generate secure passwords:

```bash
openssl rand -base64 32
```

Example:

```dotenv
DB_PASSWORD=SECURE_DB_PASSWORD
REDIS_PASSWORD=SECURE_REDIS_PASSWORD
```

#### Session Secret

Generate a session secret:

```bash
openssl rand -hex 32
```

Set it:

```dotenv
SESSION_SECRET=SECURE_SESSION_KEY
```

### Reverse Proxy

OAuth2 authentication should always be used over HTTPS.

An example Traefik setup:

```yaml
+{{{ read "examples/traefik.docker-compose.yaml" }}}
```

## Usage

When authenticating through Mailauth:

1. The user starts the login process from the mail server
2. The mail server redirects the user to Mailauth
3. Mailauth redirects the user to the configured IdP
4. The user authenticates with the IdP
5. Mailauth receives the user information and shows mailbox selection
6. The user selects their mailbox
7. Mailauth modifies the `email` claim and completes the OAuth flow

The mail server now sees the selected mailbox as the authenticated identity.

## Contributing

Found a bug or have an idea for improving Mailauth?

Feel free to open an issue or submit a pull request.

Please be respectful and patient when contributing. Mailauth is maintained by volunteers.

## Supporting

If you find Mailauth useful, consider giving the repository a ⭐ to help others discover it.

## License

This Project is licensed under the [MIT License](./LICENSE).
