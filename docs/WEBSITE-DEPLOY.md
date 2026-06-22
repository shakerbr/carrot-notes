# Carrot Notes — website deploy (Spidrahub VM)

Marketing site (Next.js) for [carrot-notes.spidrahub.com](https://carrot-notes.spidrahub.com).

Source lives in this repo under `website/`. The Tauri desktop app is separate (`src/`, `src-tauri/`).

---

## Local development

```bash
cd website
npm install
npm run dev
```

Open http://localhost:3000

**Screenshots:** the site expects PNGs at `website/public/assets/screenshots/`. If missing after migration, copy them from your VM backup:

```bash
rsync -av ubuntu@spidrahubserver:/opt/spidrahub/apps/carrot-notes.old.*/public/assets/screenshots/ \
  website/public/assets/screenshots/
```

(or from your local `carrot-notes-website-backup/public/assets/screenshots/`)

Production build test:

```bash
npm run build
npm run start
```

Docker test (optional):

```bash
docker build -t carrot-notes-web .
docker run -p 3000:3000 carrot-notes-web
```

---

## VM deploy (one-time setup)

SSH to your OCI server, then run from `/opt/spidrahub`:

### 1. Back up old site

```bash
cd /opt/spidrahub
mv apps/carrot-notes apps/carrot-notes.old.$(date +%Y%m%d)
```

### 2. Add Git submodule (full carrot-notes repo)

```bash
git submodule add https://github.com/shakerbr/carrot-notes.git apps/carrot-notes
git submodule update --init --recursive
```

Result:

```
apps/carrot-notes/website/   ← Docker build context
apps/carrot-notes/src/       ← desktop app (not deployed to VM)
```

### 3. Update docker-compose.yml

Change the `carrot-notes` service **build context** only:

```yaml
  carrot-notes:
    build:
      context: ./apps/carrot-notes/website
      dockerfile: Dockerfile
    restart: always
    environment:
      - NODE_ENV=production
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.carrot-notes.rule=Host(`carrot-notes.spidrahub.com`)"
      - "traefik.http.routers.carrot-notes.entrypoints=websecure"
      - "traefik.http.routers.carrot-notes.tls=true"
      - "traefik.http.routers.carrot-notes.tls.certresolver=myresolver"
      - "traefik.http.services.carrot-notes.loadbalancer.server.port=3000"
    networks:
      - web
```

### 4. Remove carrot-notes from monorepo npm workspaces (if listed)

Edit `/opt/spidrahub/package.json` — remove `apps/carrot-notes` from `workspaces` if present.

### 5. Commit monorepo

```bash
git add .gitmodules apps/carrot-notes docker-compose.yml package.json
git commit -m "Point carrot-notes site to GitHub submodule (website/)."
```

### 6. Build and start

```bash
docker compose build carrot-notes
docker compose up -d carrot-notes
docker compose logs -f carrot-notes
```

Verify: https://carrot-notes.spidrahub.com

### 7. Clean up (after verified)

```bash
rm -rf apps/carrot-notes.old.*
```

---

## VM deploy (every website update)

After pushing changes to `carrot-notes` GitHub repo:

```bash
cd /opt/spidrahub
git submodule update --remote apps/carrot-notes
docker compose build carrot-notes
docker compose up -d carrot-notes
```

Or use the helper script from the submodule:

```bash
cd /opt/spidrahub
./apps/carrot-notes/website/scripts/deploy-on-vm.sh
```

---

## Rollback

If a deploy breaks:

```bash
cd /opt/spidrahub
docker compose stop carrot-notes
# checkout previous submodule commit:
cd apps/carrot-notes && git checkout <previous-commit> && cd ../..
docker compose build carrot-notes
docker compose up -d carrot-notes
```

Or restore `apps/carrot-notes.old.*` and revert docker-compose.

---

## Configuration

Site version, download URLs, and GitHub links: `website/src/lib/config.ts`

When releasing a new app version, update `SITE.version`, `SITE.versionTag`, and `SITE.downloads` there, then deploy.
