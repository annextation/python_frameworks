# Cinema Booking

Учебное приложение для бронирования мест в кинотеатре. Интерфейс написан на React и TypeScript, API на Flask. Фильмы, сеансы, залы и брони хранятся в `backend/cinema.db`.

## Запуск на Windows

Нужны Python 3.11 и Node.js 24. Из папки `cinema-booking` открой два окна PowerShell.

**Сервер**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m flask --app app run
```

**Интерфейс**

```powershell
npm.cmd ci
npm.cmd run dev
```

Открой http://localhost:5173. Vite перенаправляет запросы `/api` во Flask на порту 5000. База уже содержит каталог и расписание. На странице фильма отображаются будущие сеансы.
