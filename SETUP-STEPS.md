# Project Timeline Tracker — Setup Steps

Works on **LOCAL** (`http://localhost:3000`) and **HOSTINGER** (`https://dash-bot.net/project-management`)

**App login (both environments):** `avinash` / `avinash@11#11`

---

## PART A — LOCAL (your PC)

### A1. Install requirements
- [Node.js](https://nodejs.org) (for frontend)
- [PHP 8.1+](https://windows.php.net/download/) (for API)
- [XAMPP](https://www.apachefriends.org/) or MySQL (for database)

### A2. Create local database
1. Start **XAMPP** → start **MySQL**
2. Open **phpMyAdmin** → http://localhost/phpmyadmin
3. Click **Import** → choose `database/schema.sql` → **Go**
   - This creates database `project_timeline` with all tables

### A3. Configure local API
File already set: `api/config/config.local.php`

```php
'database' => 'project_timeline',
'username' => 'root',
'password' => '',           // XAMPP default
'base_path' => '',          // must be empty for local
```

If you use a different MySQL password, edit `config.local.php`.

### A4. Configure local frontend
File: `frontend/.env.local` (copy from `.env.local.example` if missing)

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
Or manually:
```powershell
cd api
php -S localhost:8000 router.php
```

**Terminal 2 — Frontend:**
```powershell
cd scripts
.\start-frontend.bat
```
Or manually:
```powershell
cd frontend
npm run dev
```

### A7. Open and test
- URL: **http://localhost:3000**
- Login: `avinash` / `avinash@11#11`
- Add a project and test timelines

---

## PART B — HOSTINGER (dash-bot.net)

### B1. Create MySQL database (hPanel)
You already created:
| Item | Value |
|------|-------|
| Database | `u511101901_project_manage` |
| Username | `u511101901_project_manage` |
| Host | `localhost` |
| Password | (your hPanel password) |

### B2. Import tables in phpMyAdmin
1. hPanel → **phpMyAdmin**
2. Select database **`u511101901_project_manage`**
3. Click **Import**
4. Open `database/schema.sql` in a text editor
5. **Delete** these lines at the top:
   ```sql
   CREATE DATABASE IF NOT EXISTS project_timeline ...
   USE project_timeline;
   ```
6. Save and import the rest (starts from `CREATE TABLE projects`)
7. Click **Go** — you should see 3 tables: `projects`, `timeline_items`, `custom_field_definitions`

### B3. Build frontend for Hostinger
```powershell
cd scripts
.\build-hostinger.bat
```
Or manually:
```powershell
cd frontend
npm run build
```
Output is in `frontend/out/`

### B4. Upload files to Hostinger

Use **File Manager** or **FTP**. Upload to `public_html/project-management/`:

```
public_html/
└── project-management/
    ├── .htaccess                 ← copy from deploy/project-management.htaccess
    │
    ├── index.html                ┐
    ├── login/                    │
    ├── project/                  ├── all from frontend/out/
    ├── _next/                    │
    ├── 404.html                  ┘
    │
    └── api/
        ├── .htaccess             ← copy from deploy/api.htaccess
        ├── index.php
        ├── router.php
        ├── config/
        │   ├── database.php
        │   ├── auth.php
        │   ├── helpers.php
        │   ├── constants.php
        │   └── config.local.php  ← IMPORTANT: use Hostinger config (see B5)
        └── routes/
            ├── auth.php
            ├── projects.php
            ├── timeline.php
            ├── custom-fields.php
            └── export.php
```

### B5. API config on Hostinger
Use your final config — file: `api/config/config.hostinger.example.php`

Upload it as: `public_html/project-management/api/config/config.local.php`

```php
'host'     => 'localhost',
'database' => 'u511101901_project_manage',
'username' => 'u511101901_project_manage',
'password' => 'Project_manage!11@11#11',
'base_path' => '/project-management',
```

### B6. Test on Hostinger
1. Open: **https://dash-bot.net/project-management**
2. Login: `avinash` / `avinash@11#11`
3. Add a project — if it works, database is connected

### B7. Troubleshooting Hostinger

| Problem | Fix |
|---------|-----|
| Blank page | Check `.htaccess` is uploaded in `project-management/` |
| Login fails | Check `config.local.php` has correct `users` |
| "Database error" | Check DB name, username, password in `config.local.php` |
| API 404 | Check `api/.htaccess` exists, `base_path` = `/project-management` |
| CSS missing | Re-run `npm run build`, re-upload entire `out/` folder |

---

## Quick reference

| | LOCAL | HOSTINGER |
|---|-------|-----------|
| **App URL** | http://localhost:3000 | https://dash-bot.net/project-management |
| **API URL** | http://localhost:8000 | https://dash-bot.net/project-management/api |
| **Database** | `project_timeline` | `u511101901_project_manage` |
| **config base_path** | `''` (empty) | `'/project-management'` |
| **Frontend env** | `.env.local` | `.env.production` (auto on build) |
| **Start API** | `scripts/start-api.bat` | (Apache on server) |
| **Start frontend** | `scripts/start-frontend.bat` | (static files on server) |

---

## After code changes

**Local:** Just save files — `npm run dev` auto-reloads.

**Hostinger:**
1. `cd frontend && npm run build`
2. Re-upload `frontend/out/` to `public_html/project-management/`
3. If API changed, re-upload `api/` folder too
