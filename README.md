# Mingmaben AI — Naked Language

**Mingmaben AI Public Beta V1.0 — Text** is a new standalone web application for experimental structural language decoding.

It is intentionally separate from the earlier deterministic/local Mingmaben prototype. The browser is responsible for input and presentation; a Cloudflare Worker protects the OpenAI API key, calls the OpenAI Responses API, freezes the first canonical result in D1, and stores simple user feedback.

## V1 flow

Text → Worker → GPT-6.1 Sol (`high` reasoning) → structured result → Frozen ID → Reading / Evidence views → optional feedback → optional external $1 support link.

Reading and Evidence are views of the same frozen result. Switching views never triggers a second analysis.

## Local tests

```bash
npm test
```

## Deployment

See `docs/DEPLOY.md`.

## Privacy and method

See `docs/PRIVACY.md` and `docs/METHOD.md`.

## Independent project

Independently developed and maintained by Li WenGuan. Participation is free. Support is voluntary and does not affect the analysis. It is not an investment, purchase, subscription, or promise of financial return.
