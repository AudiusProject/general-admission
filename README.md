<img src="https://user-images.githubusercontent.com/2731362/62400456-224e6280-b534-11e9-82c4-3b04175d4e01.png" alt="drawing" width="400"/>

## Audius frontend gateway for 3p traffic

There are two modes of operation of General Admission
1. As a first-layer proxy
   * Client sends a request to GA
   * GA identifies User-Agent and redirects traffic accordingly
     * Humans are forwarded to the DApp
     * Bots / etxc. are forwarded to the internal Node server that handles OG tags or to the embed player

2. **(current) As a host/origin of secondary endpoints for the App (Embed Player, OG Meta Tags, etc.)**
   * Client sends a request to a CDN with something like Lambda@Edge of CloudFlare Workers
   * CDN identifies User-Agent and optionally redirects traffic to GA
   * GA picks up on a subset of requests and forward to the internal Node server or the embed player

## Getting started

```
git clone git@github.com:AudiusProject/general-admission.git
cd general-admission

cp .env.staging .env # or .env.production

docker-compose up --build
```

visit http://localhost:9000.

and to stop it:

```
docker-compose down
```

or if you want to run just the node service:

```
npm run start

# or with docker

docker build -t ga-node .
docker run --rm ga-node -p 8000:8000 -d
```

### Against a local dapp

1. Run the dapp locally
2. Set `APP_URL` env var in `.env` to `http://docker.for.mac.localhost:{DAPP_PORT}`