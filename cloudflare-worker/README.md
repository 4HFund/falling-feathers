# Falling Feathers Hollow Admin API

This Cloudflare Worker is the secure backend for the mobile admin dashboard and live public gallery.

## Features

- Public live gallery endpoint: `GET /gallery`
- PIN-protected photo library: `GET /admin/photos`
- Hide and restore photos site-wide
- Feature and unfeature photos
- Edit title, description, and category
- Permanently delete a photo from Cloudinary
- Cloudinary API credentials remain in Cloudflare secrets and never enter browser code

## Cloudflare deployment

When connecting the GitHub repository in Cloudflare Workers & Pages, use:

- **Project name:** `falling-feathers-admin`
- **Root directory / Path:** `/cloudflare-worker`
- **Build command:** leave blank, or use `npm install`
- **Deploy command:** `npx wrangler deploy`
- **Production branch:** `main`

The Worker configuration is in `wrangler.toml` and the entry file is `src/index.js`.

## Required Worker secrets

After the first deployment, open the Worker in Cloudflare and go to **Settings → Variables and Secrets**. Add these as encrypted secrets:

- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `ADMIN_PIN` — choose a private PIN with at least 6 digits

Optional plain-text variable:

- `ALLOWED_ORIGINS` — comma-separated additional website origins

Do not put any secret values in GitHub files, commits, browser JavaScript, screenshots, or chat messages.

## Connect the website

Copy the deployed `workers.dev` address and place it in the root `site-config.js` file:

```js
window.FFH_CONFIG = {
  apiBase: 'https://falling-feathers-admin.example.workers.dev'
};
```

Until this is configured, the public gallery continues using `gallery-data.json` as a fallback. The admin page also lets the owner save the Worker address locally on one device for testing.

## Cloudinary tags

Visible photos use `website-gallery`. Hidden photos use `website-hidden`. The supported category tags are:

- `ducks`
- `chickens`
- `quail`
- `eggs`
- `babies`
- `rescues`
- `around-the-hollow`
- `farm-life`

Featured photos use the `featured` tag.

## Security notes

- The Cloudinary API secret is server-side only.
- The public `/gallery` endpoint is read-only.
- All editing and deletion endpoints require the `X-Admin-Pin` header.
- CORS is restricted to the Falling Feathers website origins.
- Permanent deletion asks for confirmation in the dashboard and invalidates Cloudinary CDN copies.
