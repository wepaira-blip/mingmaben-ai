# Deployment Verification Checklist

- [ ] `OPENAI_API_KEY` is absent from Git history and browser source.
- [ ] No personal bank/routing/SWIFT details exist in repository or browser source.
- [ ] D1 schema applies successfully to the remote `mingmaben-ai` database.
- [ ] `GET /api/health` returns `{ "ok": true, "service": "mingmaben-ai" }`.
- [ ] `POST /api/analyze` succeeds for a non-sensitive text fixture.
- [ ] Repeating the same canonical request returns the same Frozen ID and does not create a second model reading.
- [ ] Switching Reading/Evidence in the browser creates no second `/api/analyze` request.
- [ ] Feedback writes successfully and does not mutate the frozen reading.
- [ ] The sixth uncached daily analysis under the default quota returns HTTP 429.
- [ ] A forced backend/model failure produces an error state, never a local fabricated reading.
