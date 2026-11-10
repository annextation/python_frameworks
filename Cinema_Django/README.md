# Cinema Booking — React + Django + SQLite

Use Python 3.11 or 3.12 and Node.js 22.12+ (or Node.js 24 LTS).
Extract the archive and open PowerShell in the folder containing package.json.

## Terminal 1 — backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
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

The application uses Django ORM models in backend/booking/models.py.
The included cinema.db already contains the catalog and schedule.
Migrations in booking/migrations describe the database schema.
All API database operations use Django ORM and transaction.atomic().

