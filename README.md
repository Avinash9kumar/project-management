# Project Timeline Tracker

Internal project management app for **AE Research** — track survey projects across timeline tabs (Programming, Launch, QC, PPT, etc.), assign tickets, send automated reminders, and view reports.

**Production:** https://dash-bot.net/project-management

---

## Quick links

| Document | Description |
|----------|-------------|
| **[DOCUMENTATION.md](./DOCUMENTATION.md)** | **Complete documentation** — every page, ticket type, email, device alert, Quick ticket, cron, SMTP mailbox, and deploy step |
| [SETUP-STEPS.md](./SETUP-STEPS.md) | Quick setup checklist (local + Hostinger) |
| [CHANGELOG.md](./CHANGELOG.md) | Dated change history |

---

## Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind (static export)
- **Backend:** PHP 8.1+ REST API
- **Database:** MySQL / MariaDB

---

## Quick start (local)

1. Import `database/schema.sql`
2. Copy `api/config/config.local.example.php` → `api/config/config.local.php`
3. Copy `frontend/.env.local.example` → `frontend/.env.local`
4. `cd frontend && npm install`
5. Run `scripts/start-api.bat` and `scripts/start-frontend.bat`
6. Open http://localhost:3000 — login: `Avinash` / `Avinash@@11##11`

---

## Deploy (Hostinger)

```powershell
cd scripts
.\prepare-hostinger-upload.bat
```

Upload `hostinger-upload/` to `public_html/project-management/`.

See [DOCUMENTATION.md § Deployment](./DOCUMENTATION.md#24-deployment-hostinger) for full details.

---

## Login

| Role | Who | Credentials |
|------|-----|-------------|
| **Main (admin)** | Avinash, Paritosh | Fixed passwords in `auth_users` config |
| **Employee** | Assignees on team list | Username (email local part) / `{username}@11#11` |

---

*For full details on every feature, API endpoint, email rule, and file — read [DOCUMENTATION.md](./DOCUMENTATION.md).*
