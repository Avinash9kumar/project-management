# Project Timeline Tracker — Setup Steps

Quick checklist for **local** and **Hostinger**. Full details: [DOCUMENTATION.md](./DOCUMENTATION.md)

---

## Login credentials

### Main app (admin)
| Username | Password |
|----------|----------|
| Avinash | `Avinash@@11##11` |
| Paritosh | `Paritosh@@11##11` |

Access: Report, Projects, Employee, Assignees

### Employee personal links
- **Username:** email local part (e.g. `mansiha` for `mansiha@ae-research.com`)
- **Password:** `{username}@11#11` (e.g. `mansiha@11#11`)
- Must be on the Assignees list
- Access: read-only personal report at `/employee/view/?token=...`

---

## PART A — LOCAL (your PC)

### A1. Install requirements
- [Node.js](https://nodejs.org) (frontend)
- [PHP 8.1+](https://windows.php.net/download/) (API)
- [XAMPP](https://www.apachefriends.org/) or MySQL (database)

### A2. Create local database
1. Start **XAMPP** → start **MySQL**
2. Open **phpMyAdmin** → http://localhost/phpmyadmin
3. **Import** → `database/schema.sql` → **Go**
   - Creates database `project_timeline` with all tables

### A3. Configure local API
Copy `api/config/config.local.example.php` → `api/config/config.local.php`

```php
'database' => 'project_timeline',
'username' => 'root',
'password' => '',           // XAMPP default
'base_path' => '',          // must be empty for local
```

### A4. Configure local frontend
Copy `frontend/.env.local.example` → `frontend/.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BASE_PATH=
```

### A5. Install frontend packages (once)
```powershell
cd frontend
npm install
```

### A6. Start the app (2 terminals)

**Terminal 1 — API:**
```powershell
cd scripts
.\start-api.bat
```

**Terminal 2 — Frontend:**
```powershell
cd scripts
.\start-frontend.bat
```

### A7. Open and test
- URL: **http://localhost:3000**
- Login: `Avinash` / `Avinash@@11##11`
- Add a project and test timelines

---

## PART B — HOSTINGER (dash-bot.net)

### B1. MySQL database (hPanel)
| Item | Value |
|------|-------|
| Database | `u511101901_project_manage` |
| Username | `u511101901_project_manage` |
| Host | `localhost` |

### B2. Import tables in phpMyAdmin
1. Select database **`u511101901_project_manage`**
2. Import `database/schema.sql` — **skip** `CREATE DATABASE` and `USE` lines on Hostinger
3. Confirm tables: `projects`, `timeline_items`, `custom_field_definitions`, `assignees`

### B3. Run migrations (existing installs only)

If upgrading an older database, run these in phpMyAdmin:

| File | When needed |
|------|-------------|
| `database/migrations/add_status_hold.sql` | Hold status not in ENUM |
| `database/migrations/add_assignees.sql` | Assignees table missing |
| `database/migrations/add_ppt_timeline_tab.sql` | PPT tab custom fields |

### B4. Build & prepare upload
```powershell
cd scripts
.\prepare-hostinger-upload.bat
```

**Warning:** This overwrites `hostinger-upload/api/config/config.local.php` from the example template. Preserve your server secrets after upload.

### B5. Upload to Hostinger
Upload **`hostinger-upload/`** to **`public_html/project-management/`**

### B6. API config on server
Ensure `public_html/project-management/api/config/config.local.php` has:
- Correct MySQL password
- `'base_path' => '/project-management'`
- `auth_secret`, `cron_secret`, `auth_users`, `mail` settings
- `mail.smtp_host` = `smtp.hostinger.com`, `mail.smtp_port` = `465`
- `mail.smtp_username` = `projects@dash-bot.net`
- `mail.smtp_password` = the password of that mailbox

The mailbox must exist: Hostinger → **Emails** → **dash-bot.net** → **Mailboxes** → create `projects` if the page says “Create your first mailbox”.

Template: `api/config/config.hostinger.example.php`

### B7. Cron job (reminders)
Every **5 minutes**:
```
curl -s "https://dash-bot.net/project-management/api/cron/reminders?key=YOUR_CRON_SECRET"
```

Test diagnostics (no emails):
```
https://dash-bot.net/project-management/api/cron/reminders?key=YOUR_CRON_SECRET&debug=1
```

### B8. Test on Hostinger
1. **https://dash-bot.net/project-management**
2. Login with `Avinash` / `Avinash@@11##11`
3. Add a project — confirms DB connection
4. Open a project — confirm PPT tab appears after Reminders
5. Turn the notification bell on. Reminder and overdue alerts ring only while Report or an assignee link stays open. Creating a ticket does not ring.
6. Full behavior of every screen, email, and alert is in [DOCUMENTATION.md](./DOCUMENTATION.md).

### B9. Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page | Check `.htaccess` in `project-management/` |
| Login fails (main) | Use Avinash or Paritosh with config passwords |
| Login fails (employee) | Add email on Assignees page; use `{user}@11#11` |
| Database error | Check DB credentials in `config.local.php` |
| API 404 | Check `api/.htaccess`, `base_path` = `/project-management` |
| CSS missing | Re-run build, re-upload `out/` / `_next/` |
| No reminder emails | Set up cron; use `debug=1` URL. `535 authentication failed` means the `projects@dash-bot.net` mailbox is missing or the SMTP password does not match. |
| Quick ticket sent an email | Old API upload | Re-upload `api/routes/timeline.php` and `api/config/reminders.php`. Quick tickets never email. |

---

## Quick reference

| | LOCAL | HOSTINGER |
|---|-------|-----------|
| **App URL** | http://localhost:3000 | https://dash-bot.net/project-management |
| **API URL** | http://localhost:8000 | https://dash-bot.net/project-management/api |
| **Database** | `project_timeline` | `u511101901_project_manage` |
| **base_path** | `''` | `'/project-management'` |
| **Main login** | Avinash / Avinash@@11##11 | same |
| **Employee login** | `{user}` / `{user}@11#11` | same |

---

## After code changes

1. Update **[CHANGELOG.md](./CHANGELOG.md)** and **[DOCUMENTATION.md](./DOCUMENTATION.md)** if behavior changed.
2. **Local:** save files — `npm run dev` auto-reloads.
3. **Hostinger:**
   - Frontend: `npm run build` → re-upload `frontend/out/` (or run `prepare-hostinger-upload.bat`)
   - API: re-upload `api/` if PHP changed
   - Schema: run migration SQL in phpMyAdmin
