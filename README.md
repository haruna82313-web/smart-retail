# SMART RETAIL

SMART RETAIL is a Vite + React POS app with:
- Sales, Stock, Debts, Creditors, and Dashboard modules
- Role switch flow (Staff/Admin with PIN)
- PWA support (installable app + offline shell cache)

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

The production output is generated in `dist/`.

## PWA readiness

The app already includes:
- `public/manifest.webmanifest`
- `public/sw.js` (service worker for offline shell/assets)
- App icons (`favicon.svg`, `app-icon.svg`, `app-icon-maskable.svg`)

When deployed over HTTPS, browsers can install it as an app.

## Deployment checklist

- Set Supabase keys in environment variables before build/deploy.
- Ensure your host serves SPA routes to `index.html` fallback.
- Deploy the `dist/` folder (or connect the repo with build command `npm run build`).

## Suggested hosts

- Vercel
- Netlify
- Cloudflare Pages
- Firebase Hosting
