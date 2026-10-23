# Changelog

All notable changes to **Project Timeline Tracker** are documented here.

**Rule:** When you change code, config, or deployment — add a dated entry below and update [DOCUMENTATION.md](./DOCUMENTATION.md) if behavior changed.

Format: `YYYY-MM-DD` — short title, then bullet points.

---

## 2026-10-23

### Documentation covers the current app
- **DOCUMENTATION.md** now includes device notifications, Quick tickets, the automatic Tabs Syntax ticket, 15-minute idle refresh, mobile/PWA layout, the Hostinger SMTP mailbox, and a full behavior index.
- Login tokens are documented as never expiring. Quick tickets are documented as email-free. The reminder cron is documented as skipping `timeline_type = quick`.
- Deploy notes warn that `prepare-hostinger-upload.bat` replaces `config.local.php`.

---

## 2026-08-05

### Complete documentation rewrite
- **DOCUMENTATION.md** expanded to full reference: architecture, auth (main + employee), all pages/components, API endpoints, database, emails, reminders, cron, deployment, security, troubleshooting, file map.
- **README.md** and **SETUP-STEPS.md** updated for current auth model and PPT tab.

---

## 2026-06-21

### Programming — questionnaire email
- Subject: `Questionnaire Required - {Survey name}` only.
- Body: **ACTION REQUIRED** text only (no project/timeline details).

### Reminders — schedule edit behavior
- Editing timeline dates/times or reminder settings no longer re-sends past % reminders.
- Only **remaining** (future) reminder thresholds are sent after a schedule change.

### Email — admin on status change only
- Avinash/admin is **no longer CC'd** on assignment, reminder, or overdue emails.
- Admin is notified **only when ticket status changes** (app or email link).

### Completion link — Completed or Hold
- Email status link page offers **Mark as Completed** and **Mark as Hold**.

### Report — Hold filter
- **Hold** status chip added to report filters.

### Email — subject line order
- All timeline emails: **Tab title · Survey name · Project ID** (then optional suffix e.g. reminder type).

### Report — completed filter
- Default **All** view no longer lists completed tickets (they drop off when marked done).
- **Completed** status chip and green banner show all finished tickets when selected.

### Overdue emails — hourly repeat
- After a ticket passes its schedule end, overdue email sends immediately, then **every hour** until **Completed** or **Hold**.
- Tracked in `custom_fields.overdue_last_sent_at`.

### Status — Hold
- Ticket status dropdown: **In Progress**, **Hold**, **Completed** (legacy **Pending** still shown when editing old tickets).
- **Hold** pauses all reminder and overdue emails; email completion link is blocked until status changes.
- Hold tickets are excluded from **Overdue** report counts.
- Database: run `database/migrations/add_status_hold.sql` on existing installs.

### Programming tab — questionnaire workflow
- On **new Programming ticket**, popup: *"Please share the questionnaire with the Bangalore team."*
- Separate email to **qazimudassir@outlook.com** (Cc: **insighta1@outlook.com**, **projects@ae-research.com**) with full ticket details and request to ask AER team for questionnaire.

---

## 2026-06-20

### Email — completion via link
- When a ticket is marked **completed via the email link**, status notification goes **only to admin** (`avinash@ae-research.com`).
- Assignee and CC list do **not** receive that completion email.

### Authentication
- Generic login: any username works; password = `{username}@11#11`.
- No user list in config; no auth database table.
- Removed password hint from login page UI.

### Email — admin CC on all timeline mail
- Admin (`avinash@ae-research.com`) is CC'd on **every** timeline email (new task, edit, reminders, overdue).
- Single email per event: **To** = main assignee, **Cc** = ticket CC list + admin.

### Reminders — per-ticket configuration
- Optional extra reminders: **50%, 70%, 80%, 90%, 95%** (checkboxes).
- **Always sent on every ticket:** 75% progress + 100% overdue.
- Reminder UI compacted (pill toggles, collapsible schedule preview).
- Stored in `custom_fields.reminder_percents` (optional array).

### Timeline — date mode end time slots
- **Date** timeline end date supports: **SOD** (6 PM), **MID** (9:30 PM), **EOD** (next day 3 AM).
- Stored in `custom_fields.date_end_slot`.
- Affects reminders, overdue, Gantt, and email schedule lines.

### Report & filters
- Report page: status filters (All, Pending, In Progress, Overdue, Completed).
- Timeline tab filter on Report.
- Overdue banner and clear-all filters UX.

### Employee report
- New **Employee** nav page: filter by assignee; shows **main assign only** (not CC).

### Assignees
- Assignee list managed on **Assignees** page (database table).
- **Self** removed from assignment UI; legacy Self maps to admin email in PHP.

---

## Earlier baseline (v2.x)

- Multi-tab timelines per project (Programming, Launch, QC, etc.).
- Date range vs same-day schedule modes.
- Gantt chart view.
- Excel/PDF export.
- Email assignment with completion link.
- Cron-based reminder processing.
- Custom fields per timeline type.
