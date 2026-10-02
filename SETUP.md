# Manifest — Setup Guide

## What this app needs to run

- **Node.js** 20+ (installer handles this)
- **PostgreSQL** 15+ (installer handles this)
- A **.env** file with `DATABASE_URL` and `SESSION_SECRET`

---

## Quick start (manual, any OS)

### 1. Install PostgreSQL
Download from https://www.postgresql.org/download/ and install with default settings.

### 2. Create the database and user
Open **pgAdmin** or **psql** and run:
```sql
CREATE USER manifest_app WITH PASSWORD 'changeme';
CREATE DATABASE manifest OWNER manifest_app;
```

### 3. Configure the app
```bash
cp .env.example .env
```
Edit `.env`:
```
DATABASE_URL="postgresql://manifest_app:changeme@localhost:5432/manifest"
SESSION_SECRET="paste-a-random-string-here"
```
Generate a random secret:  
- Windows: `[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))`  
- Mac/Linux: `openssl rand -base64 32`

### 4. Install dependencies & set up the database
```bash
npm install
npm run db:setup
```
This runs `prisma migrate deploy` (creates tables) then seeds the first users.

**Default credentials (change these!):**
| Role  | Username | Password     |
|-------|----------|--------------|
| Admin | admin    | manifest2024 |
| Staff | staff    | staff2024    |

### 5. Build & start
```bash
npm run build
npm start
```
App runs at **http://localhost:3000**

---

## Windows — Automated installer

Run `install.ps1` as Administrator. It will:
1. Install Node.js (via winget)
2. Install PostgreSQL (via winget)
3. Create the database and user
4. Generate a random SESSION_SECRET
5. Install dependencies and set up the database
6. Register Manifest as a Windows Service (auto-starts on boot)
7. Create a desktop shortcut

After install, other computers on the same network visit:
```
http://<server-ip>:3000
```
Find the server IP: open Command Prompt → `ipconfig` → look for "IPv4 Address".

For a friendly name like `http://inventory.local`, ask your IT person to set a
static IP for the server machine and add a hostname to the router's DNS.

---

## Adding users

Currently there's no in-app user management UI. To add a new user, run:
```bash
# Admin user
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const p = new PrismaClient();
p.user.create({ data: { username: 'newuser', passwordHash: await bcrypt.hash('password123', 10), role: 'staff' } })
  .then(() => { console.log('Done'); p.\$disconnect(); });
"
```
Or use **Prisma Studio** for a GUI:
```bash
npm run db:studio
```

---

## Upgrading

```bash
git pull           # or copy new files
npm install        # picks up any new dependencies
npm run db:migrate # applies any new database migrations
npm run build
# Restart the Windows Service, or: npm start
```

---

## Backups

The entire database is in PostgreSQL. Back it up with:
```bash
pg_dump -U manifest_app manifest > backup.sql
```
Restore:
```bash
psql -U manifest_app manifest < backup.sql
```

### Scheduled Excel backup to Google Drive

Under **Settings** in the app, an admin can turn on a daily backup and choose
where it goes:
- **Google Drive** — reuses the same service account as the Google Sheets
  export; see `GOOGLE_DRIVE_FOLDER_ID` in `.env.example` for setup.
- **A folder on this PC** — written straight to a local folder you type in
  (e.g. `C:\ManifestBackups`). Useful since scheduled backups run with no
  browser open, so there's nothing to click "download" on.
- **Full database backup** — an extra checkbox, only available alongside the
  local-folder option, that also runs `pg_dump` and saves a complete `.sql`
  dump of every table (not just Products/Clients) next to the Excel file.

Both destinations can be on at the same time, or just one. There's also a
"Download Excel now" button that skips all of that and downloads the file
straight to your browser on demand.

The app needs to be running at the scheduled time for the daily backup to
fire (it is, since it runs as a Windows Service).
