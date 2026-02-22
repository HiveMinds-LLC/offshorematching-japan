# OffshoreMatch (Next.js SaaS UI Prototype)

This repository is now migrated to a modern frontend stack:

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- shadcn-style component primitives

## What is implemented

- Public marketing website (landing) for Japanese market
- Dedicated pricing page
- Japanese-first SaaS app interface (`/app`)
- Public marketplace directory (inside app)
- Vendor company signup flow (application based)
- Buyer company signup/login flow + AI chat matching
- Admin dashboard to review/approve/reject company applications
- Vendor dashboard for approved companies (plan updates + boost purchases)
- Pricing + boost catalog
- Tier-aware matching logic ported into typed domain modules

## Package manager

- Use `pnpm` only.
- This repo is configured with `packageManager: pnpm@10.20.0`.

## Run locally

```bash
cd /Users/mand8ate/Software/offshoremaching
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase env setup (placeholders only)

1. Copy placeholders:

```bash
cp .env.example .env.local
```

2. Fill your real values in `.env.local` only.

3. Never commit real secrets and never paste keys in chat.

Required keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)

### Route map

- `/` landing page (static marketing)
- `/pricing` static pricing page
- `/hacchuu-kigyou-muke` 発注企業向けページ
- `/kaihatsu-kaisha-muke` 開発会社向けページ
- `/app` product application

### Pricing decision reflected

- Offshore development company listing starts at `¥5,000 / month` (`掲載ベーシック`).
- Additional monetization: Boost options + sidebar ad spot sales.

## Notes

- Previous static prototype was preserved in `/Users/mand8ate/Software/offshoremaching/legacy-static`.
- Current data/auth/matching state is mock/local for frontend prototyping.
- Next step is wiring backend APIs (auth, plans, boosts, matching endpoint, billing).

## Demo credentials

- Admin: `admin@offshorematch.jp` / `admin1234`
- Buyer (seed): `buyer@example.jp` / `demo1234`

## Security checks

```bash
pnpm audit --prod
pnpm audit
pnpm outdated
```
