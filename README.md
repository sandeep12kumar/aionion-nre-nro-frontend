# Aionion NRE / NRO account opening — frontends

Two React (Vite) apps, deployed on AWS Amplify from this one repo:

| Folder | Used by | Amplify app root |
|---|---|---|
| `rm-portal/` | Relationship managers — start and fill the application | `rm-portal` |
| `client-portal/` | Clients — review, pay, live photo, e-sign, submit (opened from the emailed link) | `client-portal` |

Build settings for both are in `amplify.yml`.

## Backend address

Each app calls the backend at `VITE_API_BASE_URL`:

- live build (`npm run build`): `.env.production` in the app folder, or an Amplify
  environment variable of the same name (takes priority)
- local (`npm run dev`): a `.env` file in the app folder (not committed), e.g.
  `VITE_API_BASE_URL=http://localhost:5077/api`

The value must be the backend's https address ending in `/api`.

## Amplify setup (per app)

1. New app → GitHub → this repo, branch `main`, tick **My app is a monorepo**, root
   directory `client-portal` (second app: `rm-portal`).
2. App settings → Rewrites and redirects → add:
   - Source: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>`
   - Target: `/index.html`
   - Type: `200 (Rewrite)`

## Run locally

```
cd rm-portal && npm install && npm run dev        # http://localhost:5173
cd client-portal && npm install && npm run dev    # http://localhost:5174
```
