# Family Finance CRM — frontend

React SPA for a self-hosted family finance tracker. Russian-only UI. It talks
to a Spring Boot/Kotlin backend that lives in its own repository,
`koldassovnt/family-finance-crm`.

## Develop

```bash
cp .env.example .env    # VITE_API_BASE_URL, default http://localhost:8080
npm install
npm run dev             # Vite dev server
npm run build           # tsc -b && vite build
npm run lint            # oxlint
```

The backend allows all origins and auth is a bearer token, so the dev server
needs no proxy.

## Deploy

The app runs as one Docker image: nginx serves the build on port 80 and proxies
`/api/` to the backend container, so start the backend stack first.

1. Raise the number in `VERSION` (plain `MAJOR.MINOR.PATCH`). Every deploy gets
   a new one.
2. Run `./deploy.ps1`. If PowerShell refuses to run scripts:
   `powershell -ExecutionPolicy Bypass -File .\deploy.ps1`.

The script copies the version into `.env` and runs
`docker compose up -d --build`, which builds and starts
`family-finance-web:<version>`. `docker compose ps` shows the running version
in the IMAGE column.

To roll back, set `VERSION` in `.env` to an older tag that is still on the
host (`docker images family-finance-web`) and run `docker compose up -d`,
without `--build` and without the script.

## Where things are written down

- `CLAUDE.md` — layout, commands and the rules that are easy to get wrong.
- `.claude/requirements/` — the spec, split by phase.
- `docs/progress/` — what was actually built, verified and deployed.
- `TODO.md` — open items outside any phase.
