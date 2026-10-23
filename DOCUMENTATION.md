# Project Timeline Tracker — Complete Documentation

**Last updated:** 2026-10-23  
**Production URL:** https://dash-bot.net/project-management  
**API version:** 2.1  
**Timezone:** Asia/Kolkata

When you change the application, update this file and [CHANGELOG.md](./CHANGELOG.md).

---

## Table of contents

1. [Introduction](#1-introduction)
2. [System architecture](#2-system-architecture)
3. [Repository structure](#3-repository-structure)
4. [Technology stack](#4-technology-stack)
5. [Authentication & authorization](#5-authentication--authorization)
6. [Frontend — pages & routing](#6-frontend--pages--routing)
7. [Frontend — components](#7-frontend--components)
8. [Frontend — libraries & utilities](#8-frontend--libraries--utilities)
9. [Projects & timeline tabs](#9-projects--timeline-tabs)
10. [Timeline tickets (items)](#10-timeline-tickets-items)
11. [Schedule modes & time windows](#11-schedule-modes--time-windows)
12. [Assignments & assignees](#12-assignments--assignees)
13. [Reminders & progress calculation](#13-reminders--progress-calculation)
14. [Email system](#14-email-system)
15. [Completion link (email status update)](#15-completion-link-email-status-update)
16. [Employee personal reports](#16-employee-personal-reports)
17. [Report page & filtering](#17-report-page--filtering)
18. [Gantt chart](#18-gantt-chart)
19. [Export (Excel, PDF, CSV)](#19-export-excel-pdf-csv)
20. [Database schema](#20-database-schema)
21. [API reference (complete)](#21-api-reference-complete)
22. [Configuration reference](#22-configuration-reference)
23. [Local development](#23-local-development)
24. [Deployment (Hostinger)](#24-deployment-hostinger)
25. [Cron jobs](#25-cron-jobs)
26. [Security model](#26-security-model)
27. [Troubleshooting](#27-troubleshooting)
28. [Complete file map](#28-complete-file-map)
29. [Documentation maintenance](#29-documentation-maintenance)
30. [Device notifications](#30-device-notifications)
31. [Quick tickets](#31-quick-tickets)
32. [Automatic Tabs Syntax ticket](#32-automatic-tabs-syntax-ticket)
33. [Idle refresh](#33-idle-refresh)
34. [Mobile layout and PWA](#34-mobile-layout-and-pwa)
35. [SMTP mailbox](#35-smtp-mailbox)
36. [End-to-end behavior index](#36-end-to-end-behavior-index)

---

## 1. Introduction

### 1.1 Purpose

**Project Timeline Tracker** is an internal web application for **AE Research** teams to manage survey/project delivery workflows. It replaces ad-hoc spreadsheets and email threads with a structured system for:

- Creating **projects** with unique project IDs
- Organizing work across **timeline tabs** (Programming, Launch, QC, PPT, etc.)
- Creating **tickets** (timeline items) with schedules, assignees, status, and descriptions
- Sending automated **emails** on assignment, updates, progress reminders, and overdue
- Allowing assignees to mark tasks **Completed** or **Hold** via a link in emails
- Viewing a global **Report**, per-employee work views, **Gantt** charts, and **Excel/PDF/CSV** exports

### 1.2 Users & roles

| Role | Who | Access |
|------|-----|--------|
| **Main (admin)** | Avinash, Paritosh | Full app: Report, Projects, Project detail, Employee admin, Assignees |
| **Employee** | Anyone on the assignees list | Read-only personal report via signed link + employee login |

### 1.3 Production vs local

| | Local | Production (Hostinger) |
|---|-------|------------------------|
| App URL | http://localhost:3000 | https://dash-bot.net/project-management |
| API URL | http://localhost:8000 | https://dash-bot.net/project-management/api |
| Database | `project_timeline` | `u511101901_project_manage` |
| `base_path` | `''` (empty) | `'/project-management'` |
| Deploy folder | N/A (dev servers) | `hostinger-upload/` (generated) |

---

## 2. System architecture

### 2.1 High-level diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Browser (user)                                   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Next.js 14 Frontend (static export)                                     │
│  - React pages in frontend/out/                                          │
│  - basePath: /project-management (production)                            │
│  - Token in localStorage: auth_token                                     │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ JSON + Bearer token
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHP 8.1+ API (api/index.php)                                            │
│  - Routes: auth, projects, timeline, assignees, export, cron             │
│  - Config: api/config/config.local.php                                   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ PDO
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  MySQL 8 / MariaDB                                                       │
│  Tables: projects, timeline_items, assignees, custom_field_definitions  │
└─────────────────────────────────────────────────────────────────────────┘

External integrations:
  Hostinger Cron (every 5 min) ──► GET /api/cron/reminders?key=...
  Email link click ───────────────► GET|POST /api/timeline/complete?token=...
  PHP mail() ─────────────────────► Assignees, admin, questionnaire team
```

### 2.2 Request flow (authenticated API call)

1. Frontend reads `auth_token` from `localStorage`
2. `fetch()` to `{NEXT_PUBLIC_API_URL}/timeline/report` with header `Authorization: Bearer {token}`
3. Apache/nginx routes `/project-management/api/*` → `api/index.php` (via `.htaccess`)
4. `index.php` strips `base_path` and `/api` prefix, parses segments
5. Auth middleware: `requireMainAuth()` or `requireAuth()` depending on route
6. Route handler executes SQL, returns JSON via `jsonResponse()`
7. On **401**, frontend clears token and redirects to login

### 2.3 Static export model

The frontend uses **`output: 'export'`** in `next.config.js`. There is **no Node.js server** in production. All pages are pre-rendered HTML/JS in `frontend/out/`. Dynamic data always comes from the PHP API.

---

## 3. Repository structure

```
Project Management/
├── frontend/                 # Next.js 14 app (TypeScript, Tailwind)
│   ├── src/
│   │   ├── app/              # Pages (App Router)
│   │   ├── components/       # Reusable UI
│   │   ├── context/          # AuthContext, AssigneeContext
│   │   └── lib/              # api.ts, types.ts, config.ts, timeline-utils.ts
│   ├── out/                  # Build output (after npm run build)
│   ├── .env.local            # Local env (not committed)
│   └── .env.production       # Production build env
│
├── api/                      # PHP REST API
│   ├── index.php             # Router entry point
│   ├── router.php            # PHP built-in server router (local dev)
│   ├── config/               # database, auth, mailer, reminders, constants
│   └── routes/               # auth, projects, timeline, assignees, export, cron
│
├── database/
│   ├── schema.sql            # Full schema + seed data
│   └── migrations/           # Incremental SQL for existing installs
│
├── deploy/                   # .htaccess templates for Hostinger
├── scripts/                  # start-api.bat, start-frontend.bat, prepare-hostinger-upload.bat
├── hostinger-upload/         # Generated deploy bundle (upload to server)
├── DOCUMENTATION.md          # This file
├── CHANGELOG.md              # Dated change log
├── SETUP-STEPS.md            # Quick setup checklist
└── README.md                 # Project overview
```

---

## 4. Technology stack

### 4.1 Frontend

| Package | Version | Purpose |
|---------|---------|---------|
| Next.js | 14.2.x | App framework, static export |
| React | 18.3.x | UI |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.4.x | Styling |
| xlsx | 0.18.x | Client-side Excel export |
| jspdf + jspdf-autotable | 2.5 / 3.8 | Client-side PDF export |

### 4.2 Backend

| Component | Purpose |
|-----------|---------|
| PHP 8.1+ | API runtime |
| PDO (MySQL) | Database access |
| Hostinger SMTP (`ssl://smtp.hostinger.com:465`, AUTH LOGIN) | Outbound email. No `mail()` fallback. |

### 4.3 Database

- MySQL 8 or MariaDB
- InnoDB, `utf8mb4_unicode_ci`
- JSON column for `timeline_items.custom_fields`

---

## 5. Authentication & authorization

### 5.1 Overview

The app uses **stateless Bearer tokens** (custom HMAC-signed payloads, not JWT). Tokens are stored in the browser at `localStorage.auth_token` and sent on every API request.

There are **two login modes**:

1. **Main login** — fixed admin accounts from config
2. **Employee login** — assignee username + derived password, must exist in assignees list

### 5.2 Main (admin) login

**Config:** `auth_users` in `api/config/config.local.php`

| Username (case-insensitive) | Password |
|-----------------------------|----------|
| Avinash | `Avinash@@11##11` |
| Paritosh | `Paritosh@@11##11` |

**API:** `POST /auth/login` with body `{ "username": "Avinash", "password": "..." }` (default `login_mode: "main"`)

**Result:** Token with `"role": "main"`. Can access all admin routes.

**Frontend guard:** `MainAuthGuard` on Report, Projects, Project, Employee, Assignees pages. Blocks users with `role === 'employee'`.

### 5.3 Employee login

**Used for:** Personal read-only report at `/employee/view/?token=...`

**Credentials:**
- **Username:** assignee username — typically the **local part** of their email (e.g. `mansiha` for `mansiha@ae-research.com`)
- **Password:** `{username}@11#11` (username lowercased in formula)

**API:** `POST /auth/login` with:
```json
{
  "username": "mansiha",
  "password": "mansiha@11#11",
  "login_mode": "employee"
}
```

**Validation:** Username must resolve to an email in the `assignees` table (or `mail.user_emails` config map).

**Result:** Token with `"role": "employee"`. Can access `/auth/me` and `/timeline/employee-report` only.

**Frontend guard:** `AuthGuard` on `/employee/view/` — allows any authenticated user (employee or main).

**Note:** Main admins can also open an employee link using their main login if their email matches the token.

### 5.4 Token format

```
{base64url(JSON payload)}.{HMAC-SHA256(payload, auth_secret)}
```

**Login token payload:**
```json
{
  "user_id": 1,
  "username": "Avinash",
  "role": "main"
}
```

- **Expiry:** none. `generateToken()` does not set `exp`. The browser keeps the token until **Logout**. Closing the tab does not sign the user out.
- **Signing key:** `auth_secret` in config (must match between deploys)

**Other signed tokens:**

| Token type | Payload | TTL | Used for |
|------------|---------|-----|----------|
| Complete | `{ item_id, action: "complete", exp }` | 90 days | Email status link |
| Employee report | `{ email, action: "employee_report", exp }` | 10 years | Personal report URL |

### 5.5 Auth guards (PHP)

| Function | Requirement |
|----------|-------------|
| `requireAuth()` | Valid non-expired Bearer token |
| `requireMainAuth()` | Valid token + `role === "main"` |
| Public routes | `auth/*`, `cron/*` — no token |
| `/timeline/complete` | Handled **before** auth (public HTML) |
| `/timeline/employee-report` | `requireAuth()` (main or employee) + URL token must match user email |

**Error responses:**
- **401** `{ "error": "Authentication required" }` — missing/invalid/expired token
- **403** `{ "error": "Admin access required" }` — employee hitting main-only route
- **403** `{ "error": "Invalid link or this report belongs to another account" }` — employee report token mismatch

### 5.6 Frontend auth flow

**Files:** `frontend/src/context/AuthContext.tsx`, `frontend/src/app/login/page.tsx`, `frontend/src/components/AuthGuard.tsx`, `frontend/src/components/MainAuthGuard.tsx`

1. **App load:** `AuthProvider` calls `getMe()` if token exists
2. **Login:** `login()` → stores token → `refreshUser()`
3. **Logout:** `clearToken()` → redirect to `/login/`
4. **API 401:** `api.ts` clears token, `window.location.href = appPath('/login/?redirect=...')`

**Login URL parameters:**
- `?mode=employee` — employee login UI and API mode
- `?redirect=/employee/view/?token=...` — return after login

### 5.7 Resolving username → email (employee)

Order in `api/config/auth.php`:

1. `mail.user_emails` config (e.g. `"Avinash"` → `avinash@ae-research.com`)
2. Username is valid email → use as-is (lowercased)
3. Query `assignees` table — match full email or local-part prefix

---

## 6. Frontend — pages & routing

### 6.1 Base path handling

**Production:** `NEXT_PUBLIC_BASE_PATH=/project-management`

| Helper | Use case | Example |
|--------|----------|---------|
| `routerPath('/report/')` | Next.js `Link`, `router.push` | `/report/` (Next adds basePath) |
| `appPath('/login/')` | `window.location.href` | `/project-management/login/` |
| `stripBasePath(pathname)` | Store redirect param | Remove `/project-management` prefix |

**File:** `frontend/src/lib/config.ts`

**Trailing slashes:** All routes use trailing slashes (`trailingSlash: true` in `next.config.js`).

### 6.2 Page reference

| Route | File | Auth | Description |
|-------|------|------|-------------|
| `/` | `app/page.tsx` | None | Redirects to `/report/` |
| `/login/` | `app/login/page.tsx` | None | Main or employee sign-in |
| `/report/` | `app/report/page.tsx` | MainAuthGuard | Global timeline report |
| `/projects/` | `app/projects/page.tsx` | MainAuthGuard | Project list + create |
| `/project/?id={n}` | `app/project/page.tsx` | MainAuthGuard | Project detail, tabs, Gantt |
| `/employee/` | `app/employee/page.tsx` | MainAuthGuard | Manager view by assignee |
| `/employee/view/?token=` | `app/employee/view/page.tsx` | AuthGuard | Employee read-only report |
| `/assignees/` | `app/assignees/page.tsx` | MainAuthGuard | Manage team emails + copy links |

### 6.3 Navigation shell

**File:** `frontend/src/components/Providers.tsx`

- Wraps app in `AuthProvider` → `AssigneeProvider` → header + children
- **Header links:** Report · Projects · Employee · Assignees
- **Hidden on:** `/login/`, `/employee/view/` (clean employee experience)
- Shows username, the notification bell, and Sign out when logged in
- The bell is hidden for `role === 'employee'` in the admin shell. The assignee page `/employee/view/` has its own bell.

### 6.4 Page details

#### `/report/` — Global report

- Loads all timeline items via `GET /timeline/report`, including Quick tickets
- **Default filter:** In Progress (not All)
- **Status filters:** All (active), In Progress, Hold, Overdue, Completed
- **Timeline filter:** All or specific tab. Quick tickets use the label **Quick**.
- **Search:** project title, project ID, assignee, description, tab name
- **Sort (All view):** Overdue → In Progress (least time left) → Hold → Completed
- **Edit:** Opens `ReportTimelineEditModal`. Saving a normal ticket sends email. Saving a Quick ticket does not.
- **Row click:** a normal ticket opens `/project/?id={id}&tab={type}&item={item}`. A Quick ticket opens the edit modal instead, because it is not a project tab.
- **Quick ticket button:** opens `QuickTicketModal`. See [Quick tickets](#31-quick-tickets).
- **Idle reload:** the page reloads after 15 minutes with no pointer, key, scroll, or wheel activity. See [Idle refresh](#33-idle-refresh).
- **Device alerts:** the page polls while it is open. See [Device notifications](#30-device-notifications).
- Legacy `pending` status treated as In Progress in filters

#### `/projects/` — Project list

- CRUD for projects
- Search by project ID or title
- Create via `NewProjectModal` (project ID max 50 chars, unique)
- Edit title via `EditProjectModal` (ID read-only)
- Delete with confirmation (cascades timeline items)
- Click row → `/project/?id={numeric_id}`

#### `/project/?id=` — Project detail

- **Tabs:** Gantt + all timeline types in order
- **Gantt tab:** Visual schedule of all items across tabs
- **Timeline tabs:** Add form + list of tickets for that type
- New tickets inserted at top (`sort_order = 0`, others bumped)
- **ExportButtons** at top (Excel, PDF, CSV)
- **Launch tab:** Alert when changing status — fill project end date
- **Programming tab:** Alert after new ticket — share questionnaire with Bangalore team

#### `/employee/` — Manager employee view

- Select assignee from dropdown
- Shows tickets where person is **main assign only** (not CC)
- Edit/delete allowed via modal
- Same status filters as report

#### `/employee/view/?token=` — Employee personal report

- Requires employee login (`?mode=employee` on redirect)
- Loads `GET /timeline/employee-report?token=...`
- **Read-only:** no Edit, Delete, or project navigation
- Token in URL must match logged-in assignee email
- Has the same notification bell and the same 15-minute idle reload as the admin report
- Device alerts use this assignee’s tickets only

#### `/assignees/` — Team management

- Add/remove assignee emails
- **Copy link** column — personal report URL (`report_url` from API)
- Fallback default emails if API fails (negative IDs, not deletable)

---

## 7. Frontend — components

### 7.1 Auth & shell

| Component | File | Purpose |
|-----------|------|---------|
| Providers | `Providers.tsx` | Root wrapper, nav header |
| AuthGuard | `AuthGuard.tsx` | Requires login; employee mode redirect |
| MainAuthGuard | `MainAuthGuard.tsx` | Requires main role |

### 7.2 Projects

| Component | Purpose |
|-----------|---------|
| ProjectTable | Desktop table + mobile cards, actions menu |
| NewProjectModal | Create project dialog |
| EditProjectModal | Edit project title |
| AddProjectForm | Inline create (unused in current pages) |
| ProjectCard | Legacy link card (unused) |

### 7.3 Timeline

| Component | Purpose |
|-----------|---------|
| AddTimelineItemForm | Create ticket — schedule, assign, reminders |
| TimelineTab | List items + inline expand-to-edit |
| TimelineScheduleFields | Date range vs same-day mode, SOD/MID/EOD |
| ReminderTriggerFields | Optional reminder % checkboxes + preview |
| AssignEmailFields | Main assign select + CC multi-select |
| GanttChart | Visual timeline bars |
| ExportButtons | Excel/PDF/CSV export |
| ReportTimelineEditModal | Edit from report/employee pages |
| ReportFilters | Status/timeline chips, search, counts |

### 7.4 Assignees

| Component | Purpose |
|-----------|---------|
| AssigneeManager | CRUD + copy report link |
| AssignToSelect | Legacy multi-select (unused) |

### 7.5 Other

| Component | Purpose |
|-----------|---------|
| CustomFieldsForm | Dynamic fields from DB (unused in current UI) |

---

## 8. Frontend — libraries & utilities

### 8.1 API client (`frontend/src/lib/api.ts`)

**Base URL:** `process.env.NEXT_PUBLIC_API_URL || '/api'`

**Token storage:** `localStorage` key `auth_token`

| Function | Method | Endpoint |
|----------|--------|----------|
| `login(user, pass, mode?)` | POST | `/auth/login` |
| `getMe()` | GET | `/auth/me` |
| `getProjects()` | GET | `/projects` |
| `createProject(...)` | POST | `/projects` |
| `getProject(id)` | GET | `/projects/{id}` |
| `updateProject(id, ...)` | PUT | `/projects/{id}` |
| `deleteProject(id)` | DELETE | `/projects/{id}` |
| `getTimelineItems(projectId, type?)` | GET | `/timeline?project_id=&type=` |
| `getTimelineReport()` | GET | `/timeline/report` |
| `getEmployeeReport(token)` | GET | `/timeline/employee-report?token=` |
| `createTimelineItem(item)` | POST | `/timeline` |
| `updateTimelineItem(id, updates)` | PUT | `/timeline/{id}` |
| `deleteTimelineItem(id)` | DELETE | `/timeline/{id}` |
| `getCustomFields(type?)` | GET | `/custom-fields` |
| `getAssignees()` | GET | `/assignees` |
| `createAssignee(value)` | POST | `/assignees` |
| `deleteAssignee(id)` | DELETE | `/assignees/{id}` |
| `downloadExport(projectId, format)` | GET | `/export/{excel\|pdf}?project_id=` |

**401 handling:** Clears token, redirects to login with current path as `redirect` param.

### 8.2 Types (`frontend/src/lib/types.ts`)

**Timeline types (in tab order):**
```
programming, launch, qc, tabs_syntax, oe_coding, tabs, invite, reminders, ppt, project_end_date
```

**Status values:** `pending`, `in_progress`, `hold`, `completed`

**Ticket dropdown options:** In Progress, Hold, Completed (Pending shown only when editing legacy tickets)

### 8.3 Timeline utilities (`frontend/src/lib/timeline-utils.ts`)

Key functions:

| Category | Functions |
|----------|-----------|
| Schedule | `getTimelineMode`, `getDateModeScheduleWindow`, `resolveDateModeEnd`, `parseScheduleDateTime` |
| Assignees | `getAssignMain`, `getAssignCcList`, `isMainAssigneeForEmployee`, `assigneesMatch` |
| Reminders | `getEffectiveReminderPercents`, `computeReminderTriggerMs`, `formatReminderTriggersPreview` |
| Validation | `validateTimelineItemInput`, `toApiPayload`, `itemToFormState` |
| Display | `formatTimelineRange`, `formatTimeRemaining`, `sortItemsForGantt` |
| Alerts | `showLaunchEndDateReminder`, `showProgrammingQuestionnaireReminder` |

**Self assignee:** Legacy `"Self"` maps to `avinash@ae-research.com` in PHP and frontend.

### 8.4 Contexts

**AuthContext:** `user`, `loading`, `refreshUser()`, `logout()`

**AssigneeContext:** `assignees`, `assigneeValues`, `refreshAssignees()`, `addAssignee()`, `removeAssignee()`. Loads on auth user change. Falls back to `DEFAULT_ASSIGNEE_EMAILS` if API empty.

---

## 9. Projects & timeline tabs

### 9.1 Project entity

| Field | Type | Rules |
|-------|------|-------|
| `id` | int | Auto-increment (internal) |
| `project_id` | string | User-facing code, unique, max 50 chars |
| `title` | string | Survey/project name, required |
| `end_date` | date | Optional, YYYY-MM-DD |

### 9.2 Timeline tabs

Each project has **10 timeline tabs** plus **Gantt** (visual only, not a DB type):

| Key | Tab label | Full label (emails/export) |
|-----|-----------|----------------------------|
| `programming` | Programming | Programming Timeline |
| `launch` | Launch | Launch Timeline |
| `qc` | QC | QC Timeline |
| `tabs_syntax` | Tabs Syntax | Tabs Syntax Timeline |
| `oe_coding` | OE Coding | OE Coding Timeline |
| `tabs` | Tabs | Tabs Timeline |
| `invite` | Invite | Invite Timeline |
| `reminders` | Reminders | Reminders Timeline |
| `ppt` | PPT | PPT Timeline |
| `project_end_date` | End Date | Project End Date |

**Source of truth:** `api/config/constants.php` (`TIMELINE_TYPES`, `TIMELINE_LABELS`) and `frontend/src/lib/types.ts`.

Custom timeline types are also allowed by API validation: `[a-z][a-z0-9_]*` up to 50 chars.

### 9.3 Default custom fields per tab

Defined in `database/schema.sql` → `custom_field_definitions`:

| Tab | Fields |
|-----|--------|
| programming | Developer (text), Priority (Low/Medium/High) |
| launch | Launch Phase (Alpha/Beta/Production), Stakeholder |
| qc | Tester, Test Result (Pass/Fail/Pending) |
| tabs_syntax | Syntax Version |
| oe_coding | OE Module |
| tabs | Tab Count (number) |
| invite | Invite Type (Client/Team/Vendor/Other) |
| reminders | Reminder Type (Follow-up/Meeting/Deadline/Other) |
| ppt | Presenter, Deck Status (Draft/Review/Final) |
| project_end_date | Milestone Type (Planning/Review/Final Delivery) |

---

## 10. Timeline tickets (items)

### 10.1 Database columns

| Column | Description |
|--------|-------------|
| `id` | Primary key |
| `project_id` | FK → projects |
| `timeline_type` | Tab key |
| `title` | Stores **main assignee email** (UI label: "Assign to") |
| `description` | Free text; completion comments appended here |
| `status` | pending, in_progress, hold, completed |
| `start_date` | Schedule start (DATE) |
| `due_date` | Schedule end date (DATE) |
| `sort_order` | Order within tab (0 = newest at top) |
| `custom_fields` | JSON blob (see below) |

### 10.2 `custom_fields` JSON keys

| Key | Type | Description |
|-----|------|-------------|
| `timeline_mode` | string | `date` (default) or `same_day` |
| `assign_main` | string | Main assignee email |
| `assign_cc` | string | Comma-separated CC emails |
| `assign_to` | string | Legacy display string |
| `start_time` | string | Same-day: `HH:MM` |
| `end_time` | string | Computed end time |
| `end_duration_hours` | number | Same-day duration (1–24) |
| `date_end_slot` | string | `SOD`, `MID`, or `EOD` |
| `reminder_percents` | number[] | Optional: 50, 70, 80, 90, 95 |
| `email_reminders_sent` | number[] | Internal — thresholds already emailed |
| `overdue_last_sent_at` | int | Unix timestamp — last overdue email |
| `timeline_passed_notified` | bool | Legacy overdue flag |
| `{field_key}` | varies | Custom field values per tab definition |

### 10.3 Ticket lifecycle

1. **Create** — `POST /timeline` → assignment email to main + CC
2. **Programming create** — additional questionnaire email to survey team
3. **Update** — `PUT /timeline/{id}` → update email; status change → admin email
4. **Reminders** — cron sends at progress thresholds
5. **Overdue** — cron sends at 100% and hourly until completed/hold
6. **Complete/Hold via link** — public form updates status, admin notified
7. **Delete** — `DELETE /timeline/{id}`

### 10.4 Form validation (frontend)

Central: `validateTimelineItemInput()` in `timeline-utils.ts`

| Rule | Condition |
|------|-----------|
| Main assign | Required non-empty |
| Status | Required |
| Date mode | start_date and due_date required; start ≤ end |
| Same-day mode | start_date, start_time required; duration ≥ 1 hour |

---

## 11. Schedule modes & time windows

### 11.1 Date range mode (default)

- **Start:** `start_date` at 00:00:00
- **End:** `due_date` + end slot:

| Slot | Label | End datetime |
|------|-------|--------------|
| **SOD** | 6:00 PM on end date | due_date 18:00 |
| **MID** | 9:30 PM on end date | due_date 21:30 |
| **EOD** | 3:00 AM next day | due_date + 1 day 03:00 |
| (default) | End of day | due_date 23:59 |

Stored in `custom_fields.date_end_slot`. Default UI selection: **SOD**.

### 11.2 Same day mode

- **Day:** `start_date` (= `due_date`)
- **Start time:** `custom_fields.start_time` (15-min dropdown)
- **Duration:** 1–24 hours via `end_duration_hours`
- End computed and stored in `custom_fields.end_time`
- `timeline_mode: "same_day"`

### 11.3 Impact

Schedule window drives:
- Gantt bar length and position
- Progress % for reminders
- Overdue detection
- Email schedule lines
- Report "time remaining" column

**Files:** `TimelineScheduleFields.tsx`, `timeline-utils.ts`, `api/config/reminders.php` (`getTimelineItemTimeWindow`)

---

## 12. Assignments & assignees

### 12.1 Assignment model

| Role | Field | Email behavior |
|------|-------|----------------|
| **Main assign** | `custom_fields.assign_main` (also in `title`) | **To** on all emails |
| **CC** | `custom_fields.assign_cc` | **Cc** on all emails |
| **Admin** | `status_notify_email` | **To** only on status change |

Admin is **not** CC'd on routine assignment/reminder/overdue emails.

### 12.2 Assignees table

- Managed on **Assignees** page
- Seeded with 7 default AE Research emails
- Auto-created on first API access if missing
- Each assignee gets a **report_url** with 10-year signed token

**Default seed emails:**
- avinash@ae-research.com
- anupam@ae-research.com
- aashish@ae-research.com
- mansiha@ae-research.com
- paritosh@ae-research.com
- shahid@ae-research.com
- projects@ae-research.com

### 12.3 Employee report filtering

- **Main assign only** — CC assignments do not appear on employee personal report
- Matching uses `assign_main`, legacy `assign_to`, and email normalization

---

## 13. Reminders & progress calculation

### 13.1 Thresholds

| Type | Percent | Always? |
|------|---------|---------|
| Progress reminder | **75%** | Yes — every ticket |
| Optional progress | 50, 70, 80, 90, 95 | User selects per ticket |
| Overdue | **100%** | Yes — then hourly repeat |

Stored: `custom_fields.reminder_percents` (optional array only; 75 and 100 are implicit).

### 13.2 Progress formula

```
progress = (now - start) / (end - start) * 100
```

Clamped 0–100+. Based on full datetime window (including SOD/MID/EOD and same-day times).

### 13.3 Cron behavior (`processTimelineReminders`)

Runs every **5 minutes** via Hostinger cron.

**For each active ticket** (not completed, not hold, has start_date, has assignee, **not** `timeline_type = quick`):

1. Compute progress %
2. If progress ≥ 100% (overdue):
   - Send overdue email if never sent OR ≥ 3600 seconds since `overdue_last_sent_at`
   - Mark all reminder thresholds as sent
3. If progress < 100%:
   - Find pending thresholds (progress ≥ threshold AND not in `email_reminders_sent`)
   - Send **highest** pending threshold only (one email per cron run per item)
   - Append threshold to `email_reminders_sent`

**Skipped:** completed, hold, no assignee, invalid time window (end ≤ start)

### 13.4 Hold status

When status = **hold**:
- Cron skips all reminders and overdue emails
- Not counted as Overdue in report
- Email completion link shows blocked message until status changes

### 13.5 Schedule change behavior

When dates/times/slots or reminder settings change on `PUT /timeline/{id}`:

- `resetTimelineReminderStateForScheduleChange()` runs
- Thresholds whose trigger time already passed on the **new** schedule are marked sent (no re-email)
- Only **future** thresholds can fire
- If end moved to future, overdue flags cleared

### 13.6 Debug mode

```
GET /cron/reminders?key={cron_secret}&debug=1
```

Returns per-item diagnostics JSON. **No emails sent.**

---

## 14. Email system

### 14.1 Configuration

**File:** `api/config/config.local.php` → `mail` section

| Key | Purpose |
|-----|---------|
| `enabled` | Master switch (false = skip all sends) |
| `from_email`, `from_name` | From header. Production from address is `projects@dash-bot.net`. |
| `smtp_host` | `smtp.hostinger.com` |
| `smtp_port` | `465` (implicit SSL) |
| `smtp_username` | Full mailbox address, `projects@dash-bot.net` |
| `smtp_password` | Mailbox password. Stored only in `config.local.php`. Never commit it. |
| `app_url` | Base for completion/report links |
| `self_email` | Legacy "Self" assignee target |
| `status_notify_email` | Admin status notifications. Production value is `avinash@ae-research.com`. |
| `user_emails` | Username → email map for employee login |

Sending uses SMTP AUTH LOGIN over `ssl://smtp.hostinger.com:465`. There is no PHP `mail()` fallback. An empty `smtp_password` makes `sendMailMessage()` return false.

The mailbox must exist under Hostinger **Emails → dash-bot.net → Mailboxes**. If that list is empty, SMTP returns `535 5.7.8 authentication failed` and no reminder is sent. See [SMTP mailbox](#35-smtp-mailbox).

### 14.2 Email events

| Event | To | Cc | Admin |
|-------|-----|-----|-------|
| New ticket (not Quick) | Main assign | CC list | No |
| Quick ticket created, edited, or status-changed | Nobody | Nobody | No |
| Ticket updated | Main assign | CC list | No |
| Progress reminder | Main assign | CC list | No |
| Overdue | Main assign | CC list | No |
| **Status changed** | **Admin only** | None | Yes |
| **New Programming ticket** | qazimudassir@outlook.com | insighta1@outlook.com, projects@ae-research.com | No |

### 14.3 Subject line format

```
{Timeline Tab Label} - {Survey Name} - {Project ID} [- suffix]
```

Examples:
- `Programming Timeline - Brand Tracker Q1 - PRJ-001`
- `QC Timeline - Brand Tracker Q1 - PRJ-001 - Reminder — 75% check-in`
- `Questionnaire Required - Brand Tracker Q1` (programming questionnaire only)

### 14.4 Email body contents

- Project title and ID
- Timeline tab name
- Status
- Schedule (formatted range with SOD/MID/EOD labels)
- Description
- **Actions:** link to `/api/timeline/complete?token=...` (Completed / Hold)

### 14.5 Programming questionnaire email

Triggered on **POST /timeline** when `timeline_type === "programming"`.

- Separate from assignment email
- To: qazimudassir@outlook.com
- Cc: insighta1@outlook.com, projects@ae-research.com
- Subject: `Questionnaire Required - {Survey name}`
- Body: ACTION REQUIRED text (request questionnaire from AER team)
- Frontend shows popup: *"Please share the questionnaire with the Bangalore team."*

**File:** `api/config/mailer.php`

---

## 15. Completion link (email status update)

### 15.1 URL

```
{app_url}/api/timeline/complete?token={signed_token}
```

Example: `https://dash-bot.net/project-management/api/timeline/complete?token=...`

### 15.2 Flow

```
Assignee clicks link
    → GET /timeline/complete?token=
    → Verify token (90-day expiry)
    → HTML form: optional comment + [Completed] [Hold]
    → POST with action=completed|hold
    → UPDATE status + append comment to description
    → Admin status-change email (source: email_link)
    → HTML success page
```

### 15.3 Rules

- **Public** — no login required
- Already completed → info page, no re-submit
- Hold → pauses reminders (same as app Hold)
- Invalid/expired token → HTML error page

**Handler:** `handleTimelineCompleteRoute()` in `api/config/mailer.php` (runs before auth in `index.php`)

---

## 16. Employee personal reports

### 16.1 URL format

```
{app_url}/employee/view/?token={employee_report_token}
```

Built by `buildEmployeeReportUrl(email)` in `api/config/auth.php`.

### 16.2 Token

```json
{ "email": "mansiha@ae-research.com", "action": "employee_report", "exp": +10 years }
```

### 16.3 Access requirements

1. Open URL (token in query string)
2. Redirect to login with `?mode=employee`
3. Login with assignee credentials
4. Frontend calls `GET /timeline/employee-report?token=...` with Bearer token
5. Backend verifies URL token email matches logged-in user's assignee email

**Security:** URL alone is insufficient — must authenticate as matching assignee.

### 16.4 Assignees page

Each row has **Copy link** button copying `report_url` from `GET /assignees`.

---

## 17. Report page & filtering

### 17.1 Data source

`GET /timeline/report` returns all items with computed fields:
- `project_code`, `project_title`
- `assign_to` (display)
- `remaining_seconds`
- `progress_percent`

### 17.2 Status filters

| Filter | Includes |
|--------|----------|
| All (active) | in_progress, pending, hold, overdue (excludes completed) |
| In Progress | in_progress + legacy pending |
| Hold | hold |
| Overdue | not completed/hold, past schedule end |
| Completed | completed only |

### 17.3 Timeline filter

Dropdown of tabs that have at least one ticket (or All).

### 17.4 Sort order (All / active view)

1. Overdue first
2. In Progress by least time remaining
3. Hold
4. Completed last

### 17.5 Search

Matches: project title, project ID, assignee, description, timeline labels.

---

## 18. Gantt chart

**Component:** `frontend/src/components/GanttChart.tsx`

- Shows all project timeline items with valid dates
- Color per timeline type (`GANTT_COLORS` in types.ts)
- Today marker (vertical line)
- Week headers
- Tooltip: tab label + formatted schedule range
- Sorted by `sortItemsForGantt()` in timeline-utils

**Tab:** First tab on project detail page (`activeTab: 'gantt'`).

---

## 19. Export (Excel, PDF, CSV)

**Location:** Project detail page — `ExportButtons` component

| Button | Method | Output |
|--------|--------|--------|
| **Excel** | Client (`xlsx` library) | `.xlsx` — project info + all items + custom fields |
| **PDF** | Client (`jspdf` + autotable) | `.pdf` — grouped by timeline type |
| **CSV** | Server `GET /export/excel?project_id=` | `.csv` with UTF-8 BOM |

Server PDF (`/export/pdf`) returns printable HTML attachment (not binary PDF).

---

## 20. Database schema

### 20.1 Tables

#### `projects`
```sql
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
project_id VARCHAR(50) NOT NULL UNIQUE
title VARCHAR(255) NOT NULL
end_date DATE NULL
created_at, updated_at TIMESTAMP
```

#### `timeline_items`
```sql
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
project_id INT UNSIGNED NOT NULL → FK projects(id) ON DELETE CASCADE
timeline_type VARCHAR(50) NOT NULL
title VARCHAR(255) NOT NULL
description TEXT NULL
status ENUM('pending','in_progress','hold','completed') DEFAULT 'pending'
start_date DATE NULL
due_date DATE NULL
sort_order INT UNSIGNED DEFAULT 0
custom_fields JSON NULL
created_at, updated_at TIMESTAMP
```

#### `custom_field_definitions`
```sql
id, timeline_type, field_key, field_label
field_type ENUM('text','number','date','select')
options_json JSON NULL
sort_order
UNIQUE (timeline_type, field_key)
```

#### `assignees`
```sql
id, value (email), sort_order, created_at
UNIQUE (value)
```

### 20.2 Migrations

| File | Purpose |
|------|---------|
| `database/migrations/add_status_hold.sql` | Add `hold` to status ENUM |
| `database/migrations/add_assignees.sql` | Create assignees table + seed |
| `database/migrations/add_ppt_timeline_tab.sql` | PPT custom field definitions |

### 20.3 Runtime migrations (automatic)

| Trigger | Action |
|---------|--------|
| First DB connect | `ensureTimelineHoldStatusEnum()` — adds hold if missing |
| First assignees API call | Creates assignees table + seeds defaults |

**File:** `api/config/database.php`, `api/routes/assignees.php`

---

## 21. API reference (complete)

**Base URLs:**
- Local: `http://localhost:8000`
- Production: `https://dash-bot.net/project-management/api`

**Content-Type:** `application/json` (except completion link = HTML)

**Auth header:** `Authorization: Bearer {token}`

**Global errors:**
- **500** `{ "error": "Database error", "message": "..." }`
- **500** `{ "error": "Server error", "message": "..." }`

---

### GET `/`

API info. No auth.

**Response 200:**
```json
{ "name": "Project Timeline Tracker API", "version": "2.1", "base_path": "/project-management" }
```

---

### POST `/auth/login`

Public.

**Body:**
```json
{
  "username": "Avinash",
  "password": "Avinash@@11##11",
  "login_mode": "main"
}
```

**Response 200:**
```json
{
  "token": "...",
  "user": { "id": 1, "username": "Avinash", "role": "main" }
}
```

**Errors:** 400 (missing fields), 401 (invalid credentials)

---

### GET `/auth/me`

Requires Bearer token.

**Response 200:** `{ "user": { "id", "username", "role" } }`

---

### GET `/projects`

Main auth. List all projects, newest first.

**Response 200:** `{ "projects": [...] }`

---

### POST `/projects`

Main auth.

**Body:** `{ "project_id": "PRJ-001", "title": "Survey Name", "end_date": "2026-12-31" }`

**Response 201:** `{ "project": {...} }`

**Errors:** 400 (validation), 409 (duplicate project_id)

---

### GET `/projects/{id}`

Main auth.

**Response 200:** `{ "project": { ..., "timelines": { "programming": { "label", "count" }, ... } } }`

---

### PUT `/projects/{id}`

Main auth. Body: `{ "title", "end_date" }`.

---

### DELETE `/projects/{id}`

Main auth. Cascades timeline items.

**Response 200:** `{ "message": "Project deleted" }`

---

### GET `/timeline?project_id={id}&type={optional}`

Main auth.

**Response 200:** `{ "items": [...] }`

---

### POST `/timeline`

Main auth. Creates ticket at top of tab.

**Body:**
```json
{
  "project_id": 1,
  "timeline_type": "programming",
  "title": "mansiha@ae-research.com",
  "description": "...",
  "status": "in_progress",
  "start_date": "2026-08-01",
  "due_date": "2026-08-05",
  "custom_fields": { "assign_main": "...", "assign_cc": "...", "date_end_slot": "SOD" }
}
```

**Response 201:**
```json
{
  "item": {...},
  "notifications": { "sent", "failed", "skipped", "recipients" },
  "programming_questionnaire": { "sent", "failed", "recipients" }
}
```

---

### PUT `/timeline/{id}`

Main auth. Partial update. Resets reminder state on schedule change.

**Response 200:** `{ "item": {...}, "notifications": {...} }`

---

### DELETE `/timeline/{id}`

Main auth.

---

### GET `/timeline/report`

Main auth. Global report data.

**Response 200:**
```json
{
  "items": [...],
  "generated_at": "2026-08-05T12:00:00+05:30",
  "total": 42
}
```

---

### GET `/timeline/employee-report?token=...`

Auth (main or employee). Token email must match user.

**Response 200:** `{ "employee_email", "items": [...], "generated_at", "total" }`

---

### GET|POST `/timeline/complete?token=...`

Public. HTML form and status update. See [§15](#15-completion-link-email-status-update).

---

### GET `/custom-fields?timeline_type=`

Main auth.

**Response 200:** `{ "fields": [...] }`

---

### POST `/custom-fields`

Main auth. Create field definition.

---

### DELETE `/custom-fields/{id}`

Main auth.

---

### GET `/export/excel?project_id=` or `/export/csv?project_id=`

Main auth. CSV file download.

---

### GET `/export/pdf?project_id=`

Main auth. HTML attachment with print CSS.

---

### GET `/cron/reminders?key=...`

Public but secret-protected.

**Response 200:** `{ "ok": true, "ran_at", "summary": { "checked", "reminders_sent", "overdue_notified", ... } }`

Add `&debug=1` for diagnostics without sending.

---

### GET `/assignees`

Main auth.

**Response 200:** `{ "assignees": [{ "id", "value", "sort_order", "report_url" }] }`

---

### POST `/assignees`

Main auth. Body: `{ "value": "email@domain.com" }`

---

### DELETE `/assignees/{id}`

Main auth.

---

## 22. Configuration reference

### 22.1 Config file location

**Never commit:** `api/config/config.local.php`

**Templates:**
- `api/config/config.local.example.php` — local dev
- `api/config/config.hostinger.example.php` — production template
- `api/config/config.example.php` — general reference

### 22.2 All config keys

| Key | Type | Description |
|-----|------|-------------|
| `host` | string | MySQL host (usually `localhost`) |
| `database` | string | Database name |
| `username` | string | MySQL user |
| `password` | string | MySQL password |
| `charset` | string | Default `utf8mb4` |
| `base_path` | string | `''` local, `'/project-management'` prod |
| `auth_secret` | string | HMAC signing for all tokens |
| `cron_secret` | string | Cron URL protection |
| `timezone` | string | PHP timezone (default `Asia/Kolkata`) |
| `auth_users` | map | Main login username → password |
| `mail.enabled` | bool | Email master switch |
| `mail.from_email` | string | From address |
| `mail.from_name` | string | From display name |
| `mail.app_url` | string | Frontend base URL |
| `mail.self_email` | string | Self assignee email |
| `mail.status_notify_email` | string | Admin notifications |
| `mail.user_emails` | map | Username → email for employee login |
| `mail.reminder_thresholds` | int[] | Global default (diagnostics; per-item uses 75%) |

### 22.3 Frontend environment

**Local** (`frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BASE_PATH=
```

**Production build:**
```
NEXT_PUBLIC_API_URL=https://dash-bot.net/project-management/api
NEXT_PUBLIC_BASE_PATH=/project-management
```

Set in `frontend/.env.production` or build script env vars.

---

## 23. Local development

### 23.1 Prerequisites

- Node.js 18+
- PHP 8.1+
- MySQL (XAMPP or standalone)

### 23.2 Setup steps

1. Import `database/schema.sql` → creates `project_timeline` database
2. Copy `api/config/config.local.example.php` → `config.local.php` (set MySQL, `base_path = ''`)
3. Copy `frontend/.env.local.example` → `.env.local`
4. `cd frontend && npm install`
5. Start API: `scripts/start-api.bat` (PHP server on port 8000)
6. Start UI: `scripts/start-frontend.bat` (Next dev on port 3000)
7. Open http://localhost:3000
8. Login: `Avinash` / `Avinash@@11##11`

See [SETUP-STEPS.md](./SETUP-STEPS.md) for checklist format.

### 23.3 API dev server

```powershell
cd api
php -S localhost:8000 router.php
```

`router.php` forwards all requests to `index.php`.

---

## 24. Deployment (Hostinger)

### 24.1 Build upload package

```powershell
cd scripts
.\prepare-hostinger-upload.bat
```

This script:
1. Builds frontend with production env vars
2. Deletes and recreates `hostinger-upload/`
3. Copies `frontend/out/` + `api/` files
4. Applies `.htaccess` from `deploy/`

**Do not run this script when `hostinger-upload/api/config/config.local.php` already has the working SMTP password.** The script replaces that file from the example and the live mailbox login stops working. To rebuild by hand: back up `config.local.php`, run `npm run build` in `frontend` with `NEXT_PUBLIC_BASE_PATH=/project-management` and `NEXT_PUBLIC_API_URL=https://dash-bot.net/project-management/api`, copy `frontend/out` onto `hostinger-upload`, then restore `config.local.php`.
5. Seeds `config.local.php` from hostinger example (**overwrite warning** — preserve server secrets)

### 24.2 Upload target

Upload **`hostinger-upload/`** contents to:

```
public_html/project-management/
```

**Live URL:** https://dash-bot.net/project-management

### 24.3 Server config checklist

On server, ensure `api/config/config.local.php` has:
- Correct MySQL credentials
- `base_path` = `'/project-management'`
- Strong `auth_secret` and `cron_secret`
- `mail.app_url` = `https://dash-bot.net/project-management`
- `mail.enabled` = true

### 24.4 What to upload after changes

| Change type | Upload |
|-------------|--------|
| Frontend only | Rebuild → upload `out/` or full bundle |
| API only | Upload `api/` folder |
| Both | Full `hostinger-upload/` |
| Config/secrets | Edit server `config.local.php` only (do not overwrite from template) |
| Schema | Run SQL migration in phpMyAdmin |

### 24.5 Apache rewrite

**`deploy/project-management.htaccess`** — SPA routing for Next static export

**`deploy/api.htaccess`** — Routes API requests to `index.php`

---

## 25. Cron jobs

### 25.1 Reminder cron

**URL:**
```
curl -s "https://dash-bot.net/project-management/api/cron/reminders?key=YOUR_CRON_SECRET"
```

**Schedule:** Every 5 minutes — `*/5 * * * *`

**hPanel:** Cron Jobs → Custom

**Secret:** `cron_secret` in `config.local.php`. The command is also written as a comment at the top of `hostinger-upload/api/config/config.local.php`.

**What a successful run returns:** `ok`, `ran_at`, and `summary` with `checked`, `reminders_sent`, `overdue_notified`, `failed`, `items`, and `errors`. Each failed send includes the SMTP reply, for example `535 5.7.8 authentication failed` when the mailbox does not exist or the password is rejected.

**Quick tickets are excluded.** The SQL adds `timeline_type <> 'quick'`.

### 25.2 Debug (no emails)

```
https://dash-bot.net/project-management/api/cron/reminders?key=SECRET&debug=1
```

Returns JSON with per-item reminder diagnostics, thresholds, and skip reasons.

---

## 26. Security model

### 26.1 Secrets (never commit)

- MySQL password
- `auth_secret`
- `cron_secret`
- `auth_users` passwords

Keep in server `config.local.php` only.

### 26.2 Token security

- HMAC prevents tampering
- Login tokens do not expire. Logout is the only way to end a session.
- Complete tokens scoped to single item_id and expire after 90 days
- Employee report tokens scoped to single email and expire after 10 years

### 26.3 CORS

Allowed origins include localhost:3000 and dash-bot.net. Others get `*`.

### 26.4 Input validation

- Timeline types validated against whitelist + regex
- Status validated against ENUM
- Dates validated as YYYY-MM-DD
- Assignee emails validated on create
- SQL via prepared statements (PDO)

### 26.5 Role separation

Employees cannot access admin API routes (403). Frontend double-guards with MainAuthGuard.

---

## 27. Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| Blank white page | Missing `.htaccess` | Upload `deploy/project-management.htaccess` |
| Login fails (main) | Wrong credentials | Use Avinash/Paritosh with config passwords |
| Login fails (employee) | Not on assignees list | Add email on Assignees page |
| 401 on every API call | Expired token or wrong auth_secret | Re-login; verify server auth_secret |
| Database error 500 | Wrong MySQL creds | Check config.local.php |
| API 404 | base_path mismatch | Must match URL path `/project-management` |
| CSS/JS 404 | Stale build | Rebuild frontend, re-upload `_next/` |
| Double path `/project-management/project-management/` | Using appPath with router.push | Use routerPath for Next router |
| No reminder emails | Cron not set, mail disabled, or SMTP login rejected | Open the cron URL. `failed` plus `535` means the mailbox is missing or the password is wrong. `checked` with `reminders_sent: 0` and no `errors` means nothing is due yet. |
| `535 authentication failed` | `projects@dash-bot.net` mailbox missing or password rejected | Hostinger → Emails → dash-bot.net → Mailboxes. Create the mailbox if the page says "Create your first mailbox". Put that password in `smtp_password`. |
| Emails not delivered | Hostinger mail limits/SPF | Verify from_email domain |
| Device alert never rings | Bell off, permission denied, or the page is closed | Turn the bell on and keep Report or the assignee link open. Alerts do not run in the background. |
| Alert on ticket create | Old frontend build | Re-upload `hostinger-upload`. Creation does not alert. |
| Ticket create 500 | PHP error after insert | Check error logs; mailer.php issues |
| Employee link 403 | Wrong login for token | Login as matching assignee with mode=employee |
| Hold still getting emails | Status not hold in DB | Verify status; cron skips hold |
| PPT tab missing | Old frontend build | Rebuild and re-upload frontend |

---

## 28. Complete file map

### Frontend pages
```
frontend/src/app/
  page.tsx              → redirect to /report/
  layout.tsx            → root layout + Providers
  login/page.tsx        → login form
  report/page.tsx       → global report
  projects/page.tsx     → project list
  project/page.tsx      → project detail + tabs
  employee/page.tsx     → manager employee view
  employee/view/page.tsx → employee read-only report
  assignees/page.tsx    → assignee management
```

### Frontend components
```
frontend/src/components/
  Providers.tsx           App shell + nav
  AuthGuard.tsx           Employee auth
  MainAuthGuard.tsx       Admin auth
  ProjectTable.tsx        Project list UI
  NewProjectModal.tsx     Create project
  EditProjectModal.tsx    Edit project
  AddTimelineItemForm.tsx Create ticket
  TimelineTab.tsx         Ticket list + edit
  TimelineScheduleFields.tsx  Date/same-day schedule
  ReminderTriggerFields.tsx   Reminder % UI
  AssignEmailFields.tsx   Main + CC assign
  GanttChart.tsx          Gantt visualization
  ExportButtons.tsx       Excel/PDF/CSV
  ReportFilters.tsx       Report filter bar
  ReportTimelineEditModal.tsx  Edit from report
  QuickTicketModal.tsx    Create a quick ticket (no email)
  AppNotifications.tsx    Bell, watcher, reminder/overdue alerts
  AssigneeManager.tsx     Assignee CRUD + links
```

### Frontend libraries
```
frontend/src/lib/
  api.ts              API client + token storage
  types.ts            Types, timeline labels, colors
  config.ts           basePath helpers
  timeline-utils.ts   Schedule, reminders, validation
  timeline-tab-defaults.ts  Form defaults per tab
  assignees.ts        Default assignee list
  notify.ts           Ring, vibration, system notifications
  useIdleRefresh.ts   15-minute idle reload
```

### Frontend contexts
```
frontend/src/context/
  AuthContext.tsx       User session
  AssigneeContext.tsx   Assignee list state
```

### API
```
api/
  index.php             Router + auth middleware
  router.php            Dev server entry
  config/
    database.php        PDO + hold migration
    helpers.php         jsonResponse, getAppConfig
    constants.php       TIMELINE_TYPES, validation
    auth.php            Login, tokens, guards
    mailer.php          All email + completion route
    reminders.php       Cron logic, time windows
    config.example.php  Config template
  routes/
    auth.php            /auth/*
    projects.php        /projects/*
    timeline.php        /timeline/*
    assignees.php       /assignees/*
    custom-fields.php   /custom-fields/*
    export.php          /export/*
    cron.php            /cron/*
```

### Database
```
database/
  schema.sql                          Full schema
  migrations/add_status_hold.sql
  migrations/add_assignees.sql
  migrations/add_ppt_timeline_tab.sql
```

### Deploy & scripts
```
deploy/
  project-management.htaccess   SPA routing
  api.htaccess                  API routing
  public_html.htaccess          Root (if needed)

scripts/
  start-api.bat
  start-frontend.bat
  prepare-hostinger-upload.bat
  build-hostinger.bat
```

---

## 29. Documentation maintenance

### When you change the project

1. **[CHANGELOG.md](./CHANGELOG.md)** — add dated entry (required for every change)
2. **[DOCUMENTATION.md](./DOCUMENTATION.md)** — update the relevant section(s)
3. **[SETUP-STEPS.md](./SETUP-STEPS.md)** — update if install/deploy steps change
4. **[README.md](./README.md)** — update if quick-start or links change

### CHANGELOG entry template

```markdown
## YYYY-MM-DD

### Short title
- What changed and why
- Deploy notes (e.g. "re-upload mailer.php", "run migration X")
```

### Sections to update by change type

| Change | Update sections |
|--------|-----------------|
| New timeline tab | §9, §20, constants.php, types.ts, migrations |
| Auth change | §5, §26 |
| Email behavior | §14, §15, §35 |
| Device notifications | §30 |
| Quick tickets | §31 |
| New API endpoint | §21 |
| New page/component | §6, §7, §28 |
| Config key | §22 |
| Deploy process | §24, SETUP-STEPS |

---

## 30. Device notifications

Phone and desktop alerts are separate from email. Email is sent by the PHP cron worker. Device alerts run in the open browser page.

**Files:** `frontend/src/lib/notify.ts`, `frontend/src/components/AppNotifications.tsx`, `frontend/public/sw.js`, `frontend/public/manifest.json`, `frontend/public/icon.png`, `frontend/public/badge.png`

### 30.1 Where the bell appears

| Surface | Who sees it |
|---------|-------------|
| Admin header (Report, Projects, Project, Employee, Assignees) | Main users only |
| Assignee page `/employee/view/?token=` | The logged-in assignee |

The bell is a switch. On is a plain bell. Off is the same bell with a slash. The setting is `localStorage` key `ptt_notices_enabled` (`1` on, `0` off). Turning it on asks the browser for notification permission. The browser permission cannot be revoked from the page. Turning the bell off only stops this app from alerting.

### 30.2 What alerts, and what does not

The watcher polls every **45 seconds**.

| Event | Alert |
|-------|--------|
| Ticket created, including Quick ticket | No |
| Turning the bell on | No on-screen card. Enabling still requests permission. |
| A reminder percent is reached (50, 70, 75, 80, 90, 95, whichever are configured, plus mandatory 75) | Yes. Title `Reminder — {percent}% check-in`. Only the highest newly crossed percent is announced. |
| Schedule reaches 100% | Yes. Title `Schedule ended`. |
| Still overdue | Yes, again every **60 minutes** until the ticket is Completed or Hold |

Hold and Completed tickets are skipped. The first time the page sees a ticket that is already past a percent, that check-in or overdue alert is sent once. Later polls do not repeat it until the next percent or the next hourly overdue.

Admin scope key: `ptt_notice_snapshot_v2_admin_{username}`

Assignee scope key: `ptt_notice_snapshot_v2_link_{username}_{first 16 chars of token}`

### 30.3 Sound and vibration

The ring is four bursts of a square wave at 440 Hz and 480 Hz. The system notification is created with `silent: true` so the phone’s default tone does not play on top of the ring. Vibration pattern is 400 ms, 150 ms gap, 400 ms, 150 ms gap, 700 ms.

The ring can play only while this site’s JavaScript is running. A closed tab or a phone with the browser suspended does not poll and does not ring. iOS usually needs the site added to the Home Screen and notification permission granted.

The service worker is `/project-management/sw.js` with scope `/project-management/`. It calls `skipWaiting` and `clients.claim` so a notification can show without an extra refresh. Tapping the notification focuses an open tab or opens the report.

Icons: `icon.png` (large) and `badge.png` (status bar). Cache-bust query is `?v=4`.

---

## 31. Quick tickets

A Quick ticket is a timeline item that is not attached to a real project tab.

**UI:** Report page → **Quick ticket** → `QuickTicketModal`

**API:** `POST /timeline/quick` (main auth)

**Storage:**

| Field | Value |
|-------|--------|
| Hidden project | `projects.project_id = QUICK`, title `Quick ticket`. Created on the first quick ticket if missing. Hidden from `GET /projects`. |
| `timeline_type` | `quick` |
| `title` | Main assignee email |
| `description` | Optional text from the form |
| `status` | Chosen in the form. Default `in_progress`. |
| Schedule | Same date-range or same-day fields as a normal ticket. End date defaults to today. |
| Reminders | Optional percents plus mandatory 75% and overdue 100% |

**Email:** none. Create, edit, status change, and the reminder cron all skip Quick tickets. `processTimelineReminders` SQL includes `timeline_type <> 'quick'`.

**Device alerts:** same reminder and overdue rules as other tickets. Creating the ticket does not alert.

**After a successful save:** the modal closes and the report reloads. If validation or the API fails, the modal stays open and the error is shown next to **Add quick ticket**.

**Report:** listed with timeline label **Quick**. Clicking the row opens the edit modal. Edit and delete are on the row. A normal ticket’s row click opens that ticket’s project tab instead.

---

## 32. Automatic Tabs Syntax ticket

When a project **end date** is set or changed, `ensureTabsSyntaxFromProjectEnd()` keeps one Tabs Syntax ticket.

| Setting | Value |
|---------|--------|
| Due date | Project end date minus 7 days |
| Start date | Same as the due date |
| End slot | SOD (18:00 Asia/Kolkata) |
| Main assign | `aashish@ae-research.com` |
| CC | `avinash@ae-research.com` |
| Optional reminders | 50 and 90. Mandatory 75% and overdue 100% still apply. |
| Status on create | `in_progress` |
| Marker | `custom_fields.auto_from_project_end = true` |
| Description | `Auto-created from the project end date. Due 7 days before the end date.` |

If that marked ticket does not exist, it is inserted and an assignment email is sent. If it exists and the dates changed, it is updated, reminder state is reset for the new schedule, and an update email is sent with subject suffix `Updated`. If the dates did not change, nothing is written. Other Tabs Syntax tickets on the same project are left alone.

Called from project create/update and from the timeline route when a project end date is saved.

---

## 33. Idle refresh

**File:** `frontend/src/lib/useIdleRefresh.ts`

Used on `/report/` and `/employee/view/`.

If there is no `pointerdown`, `keydown`, `touchstart`, `wheel`, scroll, or throttled `mousemove` for **15 minutes**, the page calls `window.location.reload()`. Any of those events resets the 15-minute timer. Mouse moves are counted at most once every 5 seconds.

The reload does not clear `localStorage`, so notification history and the login token stay. It does not by itself send an email.

---

## 34. Mobile layout and PWA

- Viewport: device width, `viewport-fit: cover`, theme color `#4f46e5`.
- `manifest.json` and the service worker make the site installable.
- Modals that must stay usable on a phone (`QuickTicketModal`, report edit) are full-height sheets. The body scrolls. Cancel and the save button stay in a bar above the system navigation, with safe-area padding.
- Inputs are at least 16px wide on small screens so iOS does not zoom the page.
- Header links wrap or scroll. The report table is `hidden` below the `md` breakpoint and cards are shown instead.
- `html` and `body` use `overflow-y: auto`. A closed edit modal must not set `document.body.style.overflow = hidden`. Only an open sheet locks the page.

---

## 35. SMTP mailbox

Production mail is one Hostinger mailbox.

| Setting | Value |
|---------|--------|
| Address | `projects@dash-bot.net` |
| Host | `smtp.hostinger.com` |
| Port | `465` |
| Security | Implicit SSL |
| Username | The full address |
| Password | `mail.smtp_password` in `api/config/config.local.php` on the server |

The mailbox is created in Hostinger under **Emails → dash-bot.net → Mailboxes**. The password typed there must be the same string as `smtp_password`. Webmail login and SMTP login are the same mailbox password.

If the Mailboxes page says **Create your first mailbox**, SMTP login fails with `535 5.7.8 Error: authentication failed: (reason unavailable)` even when the password in the file is the one you expect. Create `projects` with that password. No file upload is required when the password string does not change.

Admin status mail still goes to `avinash@ae-research.com`. That address is not the SMTP login.

---

## 36. End-to-end behavior index

| Thing | Behavior |
|-------|----------|
| Who can use the admin app | Avinash / `Avinash@@11##11`, Paritosh / `Paritosh@@11##11` |
| Employee password | `{username}@11#11` |
| Session | Stays until Logout |
| Projects | Hidden project `QUICK` is not in the project list |
| Tabs | Programming, Launch, QC, Tabs Syntax, OE Coding, Tabs, Invite, Reminders, PPT, End Date, plus Gantt |
| Date end slots | SOD 18:00, MID 21:30, EOD 03:00 the next day. Timezone Asia/Kolkata. |
| Reminder percents | Optional 50, 70, 80, 90, 95. Mandatory 75. Overdue at 100, then every hour. |
| One cron run | Sends only the highest pending percent, or the overdue email, not every crossed percent at once |
| Quick ticket email | Never |
| Quick ticket device alert on create | Never |
| Quick ticket reminder and overdue alerts | Yes, while the page is open and the bell is on |
| Normal ticket email | Create, edit, reminder, overdue, and status change to the admin |
| Programming ticket | Extra questionnaire email to qazimudassir@outlook.com |
| Project end date | Auto Tabs Syntax ticket, due 7 days earlier, assigned to aashish, CC avinash |
| Report row | Opens that ticket’s tab, except Quick which opens the editor |
| Report and assignee page | Reload after 15 idle minutes |
| Phone ring | Four loud telephone bursts, plus vibration. No on-screen “Notifications on” card. |
| Cron | Every 5 minutes. Debug with `&debug=1` sends nothing. |
| Deploy | Upload the contents of `hostinger-upload` to `public_html/project-management/`. Keep `config.local.php`. |

---

*Project Timeline Tracker · AE Research · https://dash-bot.net/project-management*
