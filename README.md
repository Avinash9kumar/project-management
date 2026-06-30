# Project Timeline Tracker

Web app for **AE Research** to manage project timelines, assign tasks by email, send automated reminders, and track progress across multiple timeline tabs per project.

| Environment | URL |
|-------------|-----|
| **Production** | https://dash-bot.net/project-management |
| **Local dev** | http://localhost:3000 |

---

## Documentation

| Document | Purpose |
|----------|---------|
| **[DOCUMENTATION.md](./DOCUMENTATION.md)** | Full reference — features, architecture, API, email rules, reminders, deployment |
| **[SETUP-STEPS.md](./SETUP-STEPS.md)** | Step-by-step local + Hostinger setup checklist |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history — **update this whenever you change the app** |

---

## Quick start (local)

```powershell
# 1. Import database/schema.sql into MySQL (database: project_timeline)
# 2. Copy api/config/config.local.example.php → api/config/config.local.php
# 3. Copy frontend/.env.local.example → frontend/.env.local

cd frontend
npm install
npm run dev          # Terminal 1 — http://localhost:3000

cd api
php -S localhost:8000 router.php   # Terminal 2 — API
```

Or use `scripts\start-frontend.bat` and `scripts\start-api.bat`.

**Login:** any username; password = `{username}@11#11` (example: `avi` / `avi@11#11`).

---

## Deploy to Hostinger

```powershell
cd scripts
.\prepare-hostinger-upload.bat
```

Upload the `hostinger-upload/` folder to `public_html/project-management/`.  
Edit `api/config/config.local.php` on the server with real DB credentials and secrets.

See [DOCUMENTATION.md § Deployment](./DOCUMENTATION.md#deployment) for details.

---

## Tech stack

- **Frontend:** Next.js 14 (static export), React, Tailwind CSS
- **Backend:** PHP 8.1+, MySQL
- **Email:** PHP `mail()` via Hostinger
- **Auth:** Token-based (no user database)

---

## Project structure

```
Project Management/
├── frontend/          Next.js UI
├── api/               PHP REST API
├── database/          MySQL schema + migrations
├── deploy/            .htaccess templates
├── hostinger-upload/  Ready-to-upload build (generated)
├── scripts/           Build & start helpers
├── DOCUMENTATION.md   Full documentation
├── SETUP-STEPS.md     Setup checklist
└── CHANGELOG.md       Change log
```

---

## Maintaining documentation

When you add or change a feature, bug fix, or deployment step:

1. Add an entry to **[CHANGELOG.md](./CHANGELOG.md)** (date + what changed).
2. Update the relevant section in **[DOCUMENTATION.md](./DOCUMENTATION.md)**.
3. Update **[SETUP-STEPS.md](./SETUP-STEPS.md)** if setup or deploy steps changed.
