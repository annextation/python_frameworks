# Cinema Booking — React + FastAPI + SQLite

Use Python 3.11 or 3.12 and Node.js 22.12+ (or Node.js 24 LTS).
Open PowerShell in the project root, which contains backend and frontend.

## Terminal 1 — backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 5000
```

## Terminal 2 — frontend

Open a second PowerShell in the project root:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open the URL printed by Vite (usually http://localhost:5173/).
Keep both terminals open. The API runs at http://127.0.0.1:5000/api/health.
Run one version at a time on these ports.

The included SQLite database contains movies and the November 2026 schedule.
The database is stored at backend/data/cinema.db. No PocketBase setup is required.

## Add movies

Before starting Uvicorn, set a private admin key in the backend PowerShell:

```powershell
$env:CINEMA_ADMIN_TOKEN = 'replace-with-your-own-key'
```

Start both servers, open the frontend at /admin, enter the same key and fill
in the movie form. The movie appears in the catalog. Adding showtimes is a
separate operation and is not part of this form.

## Database access

The existing SQLite database is accessed through SQLAlchemy ORM.
backend/services/models.py maps movies, cinemas, halls, sessions, bookings
and booked seats to Python classes. database.py configures ORM sessions,
foreign keys and write transactions. cinema.py uses ORM select/add/delete
operations. SQLite transaction and foreign-key configuration remain in
database.py. Installing requirements.txt includes SQLAlchemy.

## Admin key configuration

backend/.env contains CINEMA_ADMIN_TOKEN and is loaded automatically at server
startup. The .env file is excluded from Git. For a fresh checkout, copy
backend/.env.example to backend/.env and set your key there.
Existing environment variables take precedence over .env.
Restart the backend after changing the file.
