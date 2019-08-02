# general-admission
Audius frontend gateway for proxying traffic 

Buy a ticket:

```
git clone git@github.com:AudiusProject/general-admission.git
cd general-admission

docker-compose up --build
```

and to stop it

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