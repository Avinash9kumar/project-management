# Project Timeline Tracker — Documentation

**Last updated:** 2026-06-20  
**Production URL:** https://dash-bot.net/project-management

When you change the application, update this file and [CHANGELOG.md](./CHANGELOG.md).

---

## Table of contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication](#authentication)
4. [Pages & features](#pages--features)
5. [Projects & timelines](#projects--timelines)
6. [Schedule modes](#schedule-modes)
7. [Assignments & assignees](#assignments--assignees)
8. [Email system](#email-system)
9. [Reminders & cron](#reminders--cron)
10. [Completion link](#completion-link)
11. [Database](#database)
12. [API reference](#api-reference)
13. [Configuration](#configuration)
14. [Local development](#local-development)
15. [Deployment](#deployment)
16. [Troubleshooting](#troubleshooting)
17. [File map](#file-map)
18. [Documentation maintenance](#documentation-maintenance)

---

## Overview

Project Timeline Tracker helps AE Research teams:

- Create **projects** with multiple **timeline tabs** (Programming, Launch, QC, etc.).
- Add **tickets** (timeline items) with schedules, assignees, status, and descriptions.
- Send **emails** on assignment, updates, progress reminders, and overdue.
- Mark tasks **completed** via a link in emails.
- View a global **Report**, per-employee work, **Gantt** chart, and export **Excel/PDF**.

---

## Architecture

```
┌─────────────────┐     HTTPS/JSON      ┌──────────────────┐
│  Next.js UI     │ ◄─────────────────► │  PHP API         │
│  (static export)│   Bearer token      │  (index.php)     │
└─────────────────┘                     └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │  MySQL           │
                                        │  projects, items │
                                        │  assignees, etc. │
                                        └──────────────────┘

Cron (Hostinger) ──GET──► /api/cron/reminders?key=...  (every 5 min)
Email link ──GET/POST──► /api/timeline/complete?token=...
```

| Layer | Technology | Location |
|-------|------------|----------|
| Frontend | Next.js 14, React, Tailwind | `frontend/` |
| API | PHP 8.1+ | `api/` |
| Database | MySQL 8 / MariaDB | `database/schema.sql` |
| Production bundle | Static + PHP | `hostinger-upload/` (generated) |

---

## Authentication

- **No user database.** Login is validated in PHP only.
- **Rule:** password must equal `{username}@11#11` (case-sensitive username after trim).
- Examples:
  - Username `avi` → password `avi@11#11`
  - Username `john` → password `john@11#11`
- On success, API returns a **JWT-like signed token** (7-day expiry) stored in `localStorage` as `auth_token`.
- Protected API routes require header: `Authorization: Bearer <token>`.
- **Public routes** (no login): `/auth/*`, `/cron/*` (with secret key), `/timeline/complete` (with completion token).

**Config:** only `auth_secret` in `config.local.php` (for signing tokens). No `users` array.

**Files:** `api/config/auth.php`, `api/routes/auth.php`, `frontend/src/app/login/page.tsx`

---

## Pages & features

| Page | Path | Description |
|------|------|-------------|
| Login | `/login/` | Sign in |
| Report | `/report/` | All timeline items; filters by status + timeline tab; edit modal |
| Projects | `/projects/` | Project list; create projects |
| Project detail | `/project/?id=` | Timeline tabs, Gantt, add/edit tickets |
| Employee | `/employee/` | Tasks for selected assignee (**main assign only**) |
| Assignees | `/assignees/` | Manage team email list |

**Navigation:** Report · Projects · Employee · Assignees (see `frontend/src/components/Providers.tsx`).

### Report filters
- **Status:** All (active), In Progress, Overdue, Completed
- Legacy **pending** tickets appear under **In Progress**
- **Timeline tab:** All or a specific tab (Programming, Launch, …)
- Overdue = not completed and past schedule end
- Active filter chips + Clear all

---

## Projects & timelines

### Project
- **Project ID** (unique code), **Title**, optional **End date**
- Stored in `projects` table

### Timeline tabs (per project)
| Key | Label |
|-----|-------|
| `programming` | Programming |
| `launch` | Launch |
| `qc` | QC |
| `tabs_syntax` | Tabs Syntax |
| `oe_coding` | OE Coding |
| `tabs` | Tabs |
| `invite` | Invite |
| `reminders` | Reminders |
| `project_end_date` | End Date |

Each tab holds its own list of **timeline items** (tickets).

### Ticket fields
- **Main assign** (required email)
- **CC** (optional, multiple emails)
- **Status:** In Progress · Hold · Completed (legacy Pending on older tickets)
- **Description**
- **Schedule** (see [Schedule modes](#schedule-modes))
- **Reminders** (see [Reminders](#reminders--cron))
- **Custom fields** (per timeline type, from DB definitions)

**Launch tab:** changing status shows reminder to fill project end date.

**Programming tab:** after a new ticket is saved, a popup reminds: *"Please share the questionnaire with the Bangalore team."* A separate questionnaire email is sent (see [Email system](#email-system)).

---

## Schedule modes

Set on each ticket via **Date** or **Same day** toggle.

### Date range mode
- **Start date** and **End date** (calendar)
- **End time on due date** (one of):
  | Slot | Meaning |
  |------|---------|
  | **SOD** | 6:00 PM on end date |
  | **MID** | 9:30 PM on end date |
  | **EOD** | 3:00 AM on the **next day** after end date |
- Default slot: **SOD**
- Stored: `custom_fields.date_end_slot`, `custom_fields.end_time`
- Legacy items without slot use end of day (23:59) on due date

### Same day mode
- **Day**, **Start time**, **End** (duration 1–24 hours)
- Stored: `custom_fields.start_time`, `end_time`, `end_duration_hours`, `timeline_mode: same_day`

Schedule drives: Gantt bars, progress %, reminder triggers, overdue detection.

**Files:** `frontend/src/components/TimelineScheduleFields.tsx`, `frontend/src/lib/timeline-utils.ts`, `api/config/reminders.php` (`getTimelineItemTimeWindow`)

---

## Assignments & assignees

- **Main assign:** single email — receives **To** on all emails
- **CC:** optional list — on **Cc** with admin
- Assignee dropdown populated from `assignees` table (+ Assignees page)
- **Self** option removed from UI; legacy "Self" in old data maps to `avinash@ae-research.com` in PHP
- **Employee report** shows tickets where selected person is **main assign only** (not CC)

**Files:** `frontend/src/components/AssignEmailFields.tsx`, `api/routes/assignees.php`

---

## Email system

All timeline emails use **one message**: **To** = main assignee, **Cc** = ticket CC emails + **admin**.

**Admin email:** `avinash@ae-research.com` (from `mail.status_notify_email` or `mail.self_email` in config).

### When emails are sent

| Event | To | Cc | Notes |
|-------|-----|-----|-------|
| New ticket | Main assign | CC list + admin | On create |
| Ticket edited | Main assign | CC list + admin | On PUT update |
| Progress reminder | Main assign | CC list + admin | Cron at each % threshold |
| Overdue (100%) | Main assign | CC list + admin | Cron when schedule ends |
| **Completed via email link** | **Admin only** | **None** | Assignee/CC **not** notified |
| **New Programming ticket** | qazimudassir@outlook.com | insighta1@outlook.com, projects@ae-research.com | Questionnaire request (separate from assignment email) |

### Email content
- Project title & ID, timeline tab, status, schedule, description
- **Mark as completed** link (except admin-only completion notice)
- Subject format: `{Timeline Tab} - {Survey Name} - {Project ID} - {Suffix}`

### Completion notification (admin only)
After someone submits the completion form from the email link, only admin receives a summary (project, assignee, schedule, description, status change).

**Files:** `api/config/mailer.php`, `api/config/reminders.php`

### Mail config (`config.local.php` → `mail` section)
```php
'mail' => [
    'enabled' => true,
    'from_email' => 'avinash@ae-research.com',
    'from_name' => 'Project Timeline Tracker',
    'app_url' => 'https://dash-bot.net/project-management',
    'status_notify_email' => 'avinash@ae-research.com',
    // ...
],
```

---

## Reminders & cron

### Per-ticket reminder settings
- **Always on every ticket:** 75% progress email + 100% overdue email
- **Optional extras** (user selects): 50%, 70%, 80%, 90%, 95%
- Stored: `custom_fields.reminder_percents` (array of optional % only)
- Changing schedule or reminder settings **resets** sent state so new thresholds can fire

### How progress is calculated
- Based on elapsed time between schedule **start** and **end** (including SOD/MID/EOD).
- At each threshold %, cron sends one email if not already sent (`custom_fields.email_reminders_sent`).
- At 100%, sends an overdue email when the schedule ends, then **every hour** until status is **Completed** or **Hold** (`custom_fields.overdue_last_sent_at`).

### Hold status
- When a ticket is set to **Hold**, the cron job skips it: no progress reminders, no overdue email.
- The email **completion link** shows a message and does not allow marking complete until status is changed.
- Hold tickets are not counted as **Overdue** in reports.

### Hostinger cron
- **URL:** `https://dash-bot.net/project-management/api/cron/reminders?key=YOUR_CRON_SECRET`
- **Schedule:** every **5 minutes** (`*/5 * * * *`)
- **Secret:** `cron_secret` in `config.local.php`
- **Debug (no send):** add `&debug=1` to see diagnostics JSON

**Files:** `api/routes/cron.php`, `api/config/reminders.php`, `frontend/src/components/ReminderTriggerFields.tsx`

---

## Completion link

- Each assignment email includes: `/api/timeline/complete?token=...`
- Token is signed, ~90-day expiry, tied to ticket ID
- **GET:** shows completion form (optional comment)
- **POST:** sets status to `completed`, append comment to description
- Sends **admin-only** status email (see above)
- **Blocked** when ticket status is **Hold** (user must change status in the app first)
- **Public route** — no login required

**File:** `api/config/mailer.php` → `handleTimelineCompleteRoute()`

---

## Database

### Tables
| Table | Purpose |
|-------|---------|
| `projects` | Project master |
| `timeline_items` | Tickets per project/tab |
| `assignees` | Team email dropdown |
| `custom_field_definitions` | Extra fields per timeline type |

### `timeline_items.custom_fields` (JSON)
| Key | Type | Description |
|-----|------|-------------|
| `timeline_mode` | string | `date` or `same_day` |
| `assign_main` | string | Main assignee email |
| `assign_cc` | string | Comma-separated CC emails |
| `assign_to` | string | Legacy display string |
| `start_time` | string | Same-day start `HH:MM` |
| `end_time` | string | Computed end time |
| `end_duration_hours` | number | Same-day duration |
| `date_end_slot` | string | `SOD`, `MID`, or `EOD` |
| `reminder_percents` | array | Optional extra reminder % |
| `email_reminders_sent` | array | Internal — sent thresholds |
| `overdue_last_sent_at` | int | Unix time — last overdue email sent |
| `timeline_passed_notified` | bool | Legacy — overdue cycle started |

**Schema:** `database/schema.sql`  
**Migration example:** `database/migrations/add_assignees.sql`

---

## API reference

Base URL:
- **Local:** `http://localhost:8000`
- **Production:** `https://dash-bot.net/project-management/api`

All JSON. Auth required except public routes.

### Auth
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/auth/login` | `{ username, password }` | `{ token, user }` |
| GET | `/auth/me` | — | `{ user }` |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List projects |
| POST | `/projects` | Create |
| GET | `/projects/{id}` | Get one |
| PUT | `/projects/{id}` | Update |
| DELETE | `/projects/{id}` | Delete |

### Timeline
| Method | Path | Description |
|--------|------|-------------|
| GET | `/timeline/{projectId}/{type}` | Items for tab |
| POST | `/timeline/{projectId}/{type}` | Create item (+ assignment email) |
| PUT | `/timeline/{id}` | Update item (+ update email) |
| DELETE | `/timeline/{id}` | Delete item |
| GET | `/timeline/report` | Global report data |

### Assignees
| Method | Path | Description |
|--------|------|-------------|
| GET | `/assignees` | List |
| POST | `/assignees` | Add |
| DELETE | `/assignees/{id}` | Remove |

### Cron
| Method | Path | Description |
|--------|------|-------------|
| GET | `/cron/reminders?key=...` | Process reminders |
| GET | `/cron/reminders?key=...&debug=1` | Diagnostics only |

### Export
| Method | Path | Description |
|--------|------|-------------|
| GET | `/export/...` | Excel/PDF export endpoints |

### Complete (public)
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/timeline/complete?token=...` | Completion page |

---

## Configuration

Copy example config to **`api/config/config.local.php`** (never commit secrets).

| Key | Purpose |
|-----|---------|
| `host`, `database`, `username`, `password` | MySQL |
| `base_path` | `''` local, `'/project-management'` Hostinger |
| `auth_secret` | Token signing |
| `cron_secret` | Cron URL key |
| `timezone` | e.g. `Asia/Kolkata` |
| `mail` | Email settings |

**Examples:**
- `api/config/config.local.example.php` — local
- `api/config/config.hostinger.example.php` — production template

**Frontend env:**
- Local: `frontend/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Build: `frontend/.env.production` → production API URL

---

## Local development

1. Import `database/schema.sql` → database `project_timeline`
2. `api/config/config.local.php` with MySQL credentials, `base_path` = `''`
3. `frontend/.env.local` with API URL
4. `cd frontend && npm install`
5. Run API: `php -S localhost:8000 router.php` in `api/`
6. Run UI: `npm run dev` in `frontend/`
7. Open http://localhost:3000 — login with any username / `{username}@11#11`

See [SETUP-STEPS.md](./SETUP-STEPS.md) for a printable checklist.

---

## Deployment

### Build upload package
```powershell
cd scripts
.\prepare-hostinger-upload.bat
```
This:
1. Builds frontend (`npm run build`) with production env
2. Copies `frontend/out/` + `api/` into `hostinger-upload/`
3. Applies `.htaccess` from `deploy/`

### Upload to Hostinger
Upload **`hostinger-upload/`** contents to **`public_html/project-management/`**.

### After every code change

| What changed | Action |
|--------------|--------|
| Frontend only | `npm run build` → re-upload `out/` (or full `hostinger-upload/`) |
| API only | Re-upload `api/` folder |
| Both | Run `prepare-hostinger-upload.bat` → upload all |
| Config/secrets | Edit `api/config/config.local.php` on server only |
| Schema | Run SQL migration in phpMyAdmin |

### Cron on Hostinger
hPanel → Cron Jobs → Custom → every 5 minutes:
```
curl -s "https://dash-bot.net/project-management/api/cron/reminders?key=YOUR_CRON_SECRET"
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page | Check `.htaccess` in `project-management/` |
| Login fails | Password must be `{username}@11#11`; check `auth_secret` |
| Database error | Verify DB name/user/password in `config.local.php` |
| API 404 | Check `api/.htaccess`, `base_path` matches URL |
| CSS/JS missing | Rebuild frontend, re-upload `_next/` and HTML |
| No reminder emails | Configure cron; test with `debug=1`; check `mail.enabled` |
| Emails not delivered | Check Hostinger mail / SPF; verify `from_email` |

---

## File map

```
frontend/src/
  app/                    Pages (report, project, login, …)
  components/             UI (TimelineTab, ReportFilters, …)
  lib/
    api.ts                API client
    timeline-utils.ts     Schedule, reminders, assign helpers
    types.ts              TypeScript types

api/
  index.php               Router entry
  config/
    auth.php              Login & tokens
    mailer.php            All email sending
    reminders.php         Progress & overdue logic
    database.php          PDO connection
  routes/
    timeline.php          CRUD + report
    auth.php              Login
    cron.php              Reminder job
    assignees.php         Assignee CRUD

database/schema.sql       Full schema
scripts/                  start-*.bat, prepare-hostinger-upload.bat
deploy/                   .htaccess templates
```

---

## Documentation maintenance

**When you change the project:**

1. **[CHANGELOG.md](./CHANGELOG.md)** — add dated entry (required).
2. **[DOCUMENTATION.md](./DOCUMENTATION.md)** — update the section that describes the changed behavior.
3. **[SETUP-STEPS.md](./SETUP-STEPS.md)** — update if install/deploy steps changed.
4. **[README.md](./README.md)** — update only if quick-start or links change.

Suggested CHANGELOG entry template:

```markdown
## YYYY-MM-DD

### Short title
- What changed and why
- Any deploy notes (e.g. "re-upload mailer.php")
```

---

*Project Timeline Tracker · AE Research*
