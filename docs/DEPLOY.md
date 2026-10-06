# Deploy Mingmaben AI V1

This project has two deployments: a static `web/` front end and a Cloudflare Worker API in `worker/`.

## 1. Cloudflare Worker and D1

From `worker/`:

1. Copy `wrangler.toml.example` to `wrangler.toml`.
2. Create the D1 database:
   `npx wrangler d1 create mingmaben-ai`
3. Put the returned database UUID into `wrangler.toml` as `database_id`.
4. Apply the schema to the remote database:
   `npx wrangler d1 execute mingmaben-ai --remote --file=./schema.sql`
5. Configure the required OpenAI key as a Worker secret. Never write the key into a file committed to Git.
6. Deploy the Worker:
   `npx wrangler deploy`
7. Copy the deployed Worker URL.

## 2. Front end

Edit only the public values in `web/config.js`:

- `API_BASE_URL` = deployed Worker URL
- `SUPPORT_URL` = optional external personal support link, or leave blank

Do not put an API key or bank credentials in `web/config.js`.

Publish the contents of `web/` with GitHub Pages. The expected repository is `wepaira-blip/mingmaben-ai` and the expected Pages URL is `https://wepaira-blip.github.io/mingmaben-ai/`.

## 3. Verification

Run the checks in `docs/DEPLOY_CHECKLIST.md` before announcing the beta publicly.
