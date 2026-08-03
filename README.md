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
services:
  mailauth:
    image: ghcr.io/codeshelldev/mailauth:latest
    container_name: mailauth
    ports:
      - "8070:8070"
    environment:
      DB_HOST: ${DB_HOST:-mongo:27017}
      DB_USER: ${DB_USER:-admin}
      DB_NAME: ${DB_NAME:-mailauth}
      REDIS_HOST: ${REDIS_HOST:-redis:6379}
    env_file:
      - .env
    depends_on:
      - mongo
      - redis
    restart: unless-stopped
    networks:
      - mailauth

  mongo:
    image: mongo:7
    container_name: mailauth-db
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${DB_USER:-admin}
      MONGO_INITDB_ROOT_PASSWORD: ${DB_PASSWORD}
      MONGO_INITDB_DATABASE: ${DB_NAME:-mailauth}
    volumes:
      - db:/data/db
    networks:
      - mailauth
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: mailauth-redis
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}"]
    networks:
      - mailauth
    restart: unless-stopped

networks:
  mailauth:

volumes:
  db:

```

## Setup

Mailauth requires two separate OAuth2 clients because it is involved in two different OAuth2 flows.

The first OAuth client is created for the mail server in your IdP.
It allows the mail server to authenticate users through Mailauth.
During this flow, Mailauth authenticates the user with your IdP, allows the user to select a mailbox, modifies the `email` claim, and returns the result to the mail server.

The second client is used by Mailauth itself. This allows users to log into the Mailauth interface through your IdP, where they can manage their configured mailboxes.

Mailauth uses two OAuth2 flows:

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
# Mail Server OAuth Client
# Created in your IdP for the mail server

MAIL_CLIENT_ID=
MAIL_CLIENT_SECRET=

MAIL_AUTHORIZATION_ENDPOINT=
MAIL_TOKEN_ENDPOINT=
MAIL_USERINFO_ENDPOINT=

MAIL_REDIRECT_URIS=https://mailauth.domain.com/oauth/mail/callback,https://mailauth.yourdomain.com/oauth/mail/callback
MAIL_CALLBACK_URIS=https://mail.domain.com,https://mail.yourdomain.com # This is your mailserver's oauth callback url

# Mailauth OAuth Client
# Created in your IdP for Mailauth

APP_CLIENT_ID= 
APP_CLIENT_SECRET=

APP_ISSUER=
APP_AUTHORIZATION_ENDPOINT=
APP_TOKEN_ENDPOINT=
APP_USERINFO_ENDPOINT=
APP_LOGOUT_ENDPOINT=

# Storage

DB_PASSWORD=SECURE_DB_PASSWORD
REDIS_PASSWORD=SECURE_REDIS_PASSWORD

# General

HOST=https://mailauth.domain.com

SESSION_SECRET=SECURE_KEY
```

#### Defaults

```dotenv
DB_USER=admin
DB_NAME=mailauth

DB_HOST=mongo:27017
REDIS_HOST=redis:6379

APP_REDIRECT_PATH=/oauth/app/callback

PREFIX=/
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
---
services:
  mailauth:
    image: ghcr.io/codeshelldev/mailauth:latest
    container_name: mailauth
    labels:
      - traefik.enable=true
      - traefik.http.routers.mailauth-secure.entrypoints=websecure
      - traefik.http.routers.mailauth-secure.rule=Host(`mailauth.domain.com`)
      - traefik.http.routers.mailauth-secure.tls=true
      - traefik.http.routers.mailauth-secure.tls.certresolver=resolver
      - traefik.http.routers.mailauth-secure.service=mailauth-svc
      - traefik.http.services.mailauth-svc.loadbalancer.server.port=8070
      - traefik.docker.network=proxy
    environment:
      DB_HOST: ${DB_HOST:-mongo:27017}
      DB_USER: ${DB_USER:-admin}
      DB_NAME: ${DB_NAME:-mailauth}
      REDIS_HOST: ${REDIS_HOST:-redis:6379}
    env_file:
      - .env
    depends_on:
      - mongo
      - redis
    restart: unless-stopped
    networks:
      mailauth:
        aliases:
          - mailauth
      proxy:

  mongo:
    image: mongo:7
    container_name: mailauth-db
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${DB_USER:-admin}
      MONGO_INITDB_ROOT_PASSWORD: ${DB_PASSWORD}
      MONGO_INITDB_DATABASE: ${DB_NAME:-mailauth}
    volumes:
      - db:/data/db
    networks:
      - mailauth
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: mailauth-redis
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}"]
    networks:
      - mailauth
    restart: unless-stopped

networks:
  mailauth:
  proxy:
    external: true

volumes:
  db:

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
