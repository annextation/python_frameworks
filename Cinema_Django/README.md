# Cinema Booking — React + Django + SQLite

Use Python 3.11 or 3.12 and Node.js 22.12+ (or Node.js 24 LTS).
Extract the archive and open PowerShell in the folder containing package.json.

## Terminal 1 — backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:5000
```

## Terminal 2 — frontend

From the folder containing package.json:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the URL printed by Vite (usually http://localhost:5173/).
Keep both terminals open. The API runs at http://127.0.0.1:5000/api/health.
Run one version at a time on these ports.

The included SQLite database contains movies and the November 2026 schedule.
It starts with no customer bookings. No PocketBase setup is required.
