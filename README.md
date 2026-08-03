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

### Configuration

Mailauth currently works by modifying the `email` claim during OAuth2 **Token Exchange** and **UserInfo** requests.

Because of this, Mailauth requires an external Identity Provider (IdP), such as [authentik](https://goauthentik.io).

Create a `.env` file in the same directory as your `docker-compose.yaml` and copy the configuration template:

```dotenv
# Mail

# Get from your IdP (for your mailserver)
MAIL_CLIENT_ID=
MAIL_CLIENT_SECRET=

MAIL_AUTHORIZATION_ENDPOINT=
MAIL_TOKEN_ENDPOINT=
MAIL_USERINFO_ENDPOINT=

MAIL_REDIRECT_URIS=https://mailauth.domain.com/oauth/mail/callback,https://mailauth.yourdomain.com/oauth/mail/callback
MAIL_CALLBACK_URIS=https://mail.domain.com,https://mail.yourdomain.com # This is your mailserver's oauth callback url

# App

# Get this from your IdP (for mailauth)
APP_CLIENT_ID= 
APP_CLIENT_SECRET=

APP_ISSUER=
APP_AUTHORIZATION_ENDPOINT=
APP_TOKEN_ENDPOINT=
APP_USERINFO_ENDPOINT=
APP_LOGOUT_ENDPOINT=

# Storage

DB_PASSWORD=SECURE_ROOT_PW
REDIS_PASSWORD=SECURE_REDIS_PW

# General

SESSION_SECRET=SECURE_KEY # Generate with openssl

HOST=https://mailauth.domain.com
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
