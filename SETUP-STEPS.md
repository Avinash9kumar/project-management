# Project Timeline Tracker — Setup Steps

Quick checklist for **local** and **Hostinger**. Full details: [DOCUMENTATION.md](./DOCUMENTATION.md)

**Login (both environments):** any username; password = `{username}@11#11`  
Example: `avi` / `avi@11#11`

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
- Login: e.g. `avi` / `avi@11#11`
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

### B3. Build & prepare upload
```powershell
cd scripts
.\prepare-hostinger-upload.bat
```

Or manually:
```powershell
cd frontend
npm run build
```
Then copy files per [DOCUMENTATION.md § Deployment](./DOCUMENTATION.md#deployment).

### B4. Upload to Hostinger
Upload **`hostinger-upload/`** to **`public_html/project-management/`**

### B5. API config on server
Ensure `public_html/project-management/api/config/config.local.php` has:
- Correct MySQL password
- `'base_path' => '/project-management'`
- `auth_secret`, `cron_secret`, `mail` settings

Template: `api/config/config.hostinger.example.php`

### B6. Cron job (reminders)
Every **5 minutes**:
```
curl -s "https://dash-bot.net/project-management/api/cron/reminders?key=YOUR_CRON_SECRET"
```

Test diagnostics (no emails):
```
https://dash-bot.net/project-management/api/cron/reminders?key=YOUR_CRON_SECRET&debug=1
```

### B7. Test on Hostinger
1. **https://dash-bot.net/project-management**
2. Login with any username / `{username}@11#11`
3. Add a project — confirms DB connection

### B8. Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page | Check `.htaccess` in `project-management/` |
| Login fails | Password = `{username}@11#11`; check `auth_secret` |
| Database error | Check DB credentials in `config.local.php` |
| API 404 | Check `api/.htaccess`, `base_path` = `/project-management` |
| CSS missing | Re-run build, re-upload `out/` / `_next/` |
| No reminder emails | Set up cron; use `debug=1` URL |

---

## Quick reference

| | LOCAL | HOSTINGER |
|---|-------|-----------|
| **App URL** | http://localhost:3000 | https://dash-bot.net/project-management |
| **API URL** | http://localhost:8000 | https://dash-bot.net/project-management/api |
| **Database** | `project_timeline` | `u511101901_project_manage` |
| **base_path** | `''` | `'/project-management'` |
| **Login** | `{user}` / `{user}@11#11` | same |

---

## After code changes

1. Update **[CHANGELOG.md](./CHANGELOG.md)** and **[DOCUMENTATION.md](./DOCUMENTATION.md)** if behavior changed.
2. **Local:** save files — `npm run dev` auto-reloads.
3. **Hostinger:**
   - Frontend: `npm run build` → re-upload `frontend/out/` (or run `prepare-hostinger-upload.bat`)
   - API: re-upload `api/` if PHP changed
