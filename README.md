# Project Timeline Tracker

Runs **locally** and on **Hostinger** at:
**http://dash-bot.net/project-management**

Stack: Next.js + PHP 8.1 + MySQL

---

## Login (no database needed)

Username and password are set in `api/config/config.local.php`:


---

## FRESH SETUP — Step by Step

### Step 1: Create MySQL Database

**On Hostinger (hPanel):**
1. Go to **Databases → MySQL Databases**
2. Create a new database (e.g. `u123456_project`)
3. Create a database user and assign it to the database
4. Open **phpMyAdmin** → select your database
5. Import `database/schema.sql` — **skip** the `CREATE DATABASE` and `USE` lines; run only from `CREATE TABLE` onward

**Local (XAMPP/WAMP/phpMyAdmin):**
1. Import the full `database/schema.sql` file

---

### Step 2: Configure PHP API

**Local:**
```bash
cd api/config
copy config.example.php config.local.php
```
Edit `config.local.php`:
```php
'host' => 'localhost',
'database' => 'project_timeline',
'username' => 'root',
'password' => '',
'base_path' => '',          // empty for local
'users' => [
    '' => '',
],
```

**Hostinger:**
```bash
copy config.hostinger.example.php config.local.php
```
Fill in your Hostinger MySQL credentials and keep:
```php
'base_path' => '/project-management',
'users' => [
    '' => '',
],
```

---

### Step 3: Run Locally

**Terminal 1 — PHP API:**
```bash
cd api
php -S localhost:8000 router.php
```

**Terminal 2 — Next.js:**
```bash
cd frontend
copy .env.local.example .env.local
npm install
npm run dev
```

Open: **http://localhost:3000**  
Login: `` / ``

---

### Step 4: Deploy to Hostinger

**Build frontend for production:**
```bash
cd frontend
npm install
npm run build
```
This uses `.env.production` automatically (`basePath=/project-management`).

**Upload to Hostinger via File Manager or FTP:**

```
public_html/
└── project-management/
    ├── .htaccess                    ← from deploy/project-management.htaccess
    ├── index.html                   ← from frontend/out/
    ├── login/
    ├── project/
    ├── _next/
    └── api/
        ├── .htaccess                ← from deploy/api.htaccess
        ├── index.php
        ├── router.php
        ├── config/
        │   └── config.local.php     ← your Hostinger DB + auth config
        └── routes/ ...
```

**Live URL:** http://dash-bot.net/project-management  
**API URL:** http://dash-bot.net/project-management/api

---

## Folder Structure

```
Project Management/
├── api/                  PHP backend
├── database/schema.sql   Fresh MySQL tables
├── deploy/               Hostinger .htaccess files
└── frontend/             Next.js app
    ├── .env.local        Local dev settings
    └── .env.production   Hostinger build settings
```

---

## Environment Files

| File | Used when | API URL | Base path |
|------|-----------|---------|-----------|
| `.env.local` | `npm run dev` | `http://localhost:8000` | (empty) |
| `.env.production` | `npm run build` | `http://dash-bot.net/project-management/api` | `/project-management` |

---

## Adding More Users

Edit `users` in `api/config/config.local.php`:

```php
'users' => [
    '' => '@11#11',
    'another_user' => 'their_password',
],
```

No database changes needed.
