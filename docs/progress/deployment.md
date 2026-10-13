# Deployment

How the app is built and run on the home server, and what has been deployed.

## Built

- **One image, one origin.** nginx serves the build on port 80 and proxies
  `/api/` to the backend container over the backend's compose network.
- **Versioned image** (`bcf6189`, 2026-10-13). The image is
  `family-finance-web:<version>` with the version read from the `VERSION` file;
  before this it was `family-finance-crm-front-web:latest`. `./deploy.ps1`
  copies the version into `.env` and runs compose.

## Deployed versions

| Version | Date | What it brought |
|---|---|---|
| 1.0.0 | 2026-10-13 | First versioned image. The Excel export on `/transactions`. |
| 1.1.0 | 2026-10-13 | The «Покупки» page (phase 9, planned purchases). |
| 1.1.1 | 2026-10-13 | The two lists on «Покупки» start at the same height. |

Add a row per deploy. The version in `VERSION` is raised **before** the deploy,
never reused.

## Decisions worth remembering

- **The scheme is the backend's, the mechanism is not.** The backend stamps
  `.env` from Gradle. The server that deploys has no Node, so an npm task could
  not do the same job here; a PowerShell script can.
- **The stamp goes into `.env`, not the shell's environment.** Compose requires
  `VERSION` for every command, so a variable set only for the deploy would
  leave `ps`, `logs` and `down` failing in a plain terminal.
- **The Dockerfile checks the tag against the `VERSION` file.** A stale `.env`
  would otherwise build new code under an old tag and overwrite the image a
  rollback needs.
- **Versions start at 1.0.0 and are this repo's own.** They do not track the
  backend's number; the two deploy separately.
- **No pruning of old images.** The backend keeps the last three with a Gradle
  task; nothing does that here yet, so old tags accumulate until removed by
  hand.

## Verified

On 2026-10-13, on the server:

- `./deploy.ps1 build` produced `family-finance-web:1.0.0` carrying the
  `org.opencontainers.image.version` label, and `.env` was written without a
  BOM.
- A build given a tag that differs from `VERSION` stopped with the guard's
  message.
- After `./deploy.ps1`, the container ran `family-finance-web:1.0.0` and
  reported healthy; `/` returned 200 with a bundle containing the export call,
  and `/api/v1/reports/transactions.xlsx` answered 401 without a token, so the
  proxy reaches the new endpoint.

## Open

- **A rollback has not been tried**, though 1.0.0 is now on the server to roll back to;
  the steps in the spec are still untested.
- The old `family-finance-crm-front-web:latest` image is still on the server,
  unused.
- Image pruning, as above.
