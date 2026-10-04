# Running on this server

`docker-compose.yml` runs the production web application, DM worker, cron
scheduler, migrations, PostgreSQL, Redis, and Caddy. Configure `.env` using
`.env.example`; `DOCKER_DATABASE_URL` must use `postgres` as the hostname and
the credentials already present in the database volume. Redis uses its internal
service address automatically. Secrets are supplied at runtime, not copied into
the image.

Start or deploy updates:

```sh
sudo docker compose up -d --build
sudo docker compose ps
sudo docker compose logs --tail 100 worker web cron migrate
```

Migrations must succeed before web and worker start. Long-running services
restart automatically after a crash or host restart. Worker health verifies its
own Redis heartbeat; `/api/health` checks the database, Redis, queue, and worker.

Caddy proxies HTTPS to the production web container on `127.0.0.1:3001`.
Database and Redis ports are bound to localhost. Their existing named volumes
are retained; Redis also persists queue changes with append-only logging.
Do not run `docker compose down -v`: it deletes the database and queue volumes.

Inspect application health:

```sh
curl -fsS https://openreply.vps12022.panel.icontainer.work/api/health
```

Delivery errors returned by Instagram appear in worker logs and the campaign's
DM history. A healthy worker alone does not prove delivery: confirm `SENT` in
the DM history after triggering a campaign.
