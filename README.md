# Clinq Frontend/Backend

This repository contains the Clinq full-stack application:

- `backend/` — Django REST API and business logic
- `frontend/` — React + Vite UI

## Prerequisites

<<<<<<< HEAD
- Python 3.10+ (Python 3.11 recommended)
- Node.js 20.19+ or 22.12+ / npm 10+ (Node 22 LTS or 24 LTS recommended)
=======
- Python 3.11+ (or compatible Python 3.x)
- Node 18+ / npm 10+
>>>>>>> c5f093941fb5ef9dc0c908f24541365f4ba9f83b
- Redis (optional for Celery/background workers)
- PostgreSQL or any database supported by `DATABASE_URL`

## Backend Setup

1. Open a terminal and go to the backend folder:

```powershell
cd backend
```

<<<<<<< HEAD
2. Create and activate a virtual environment with a supported Python version:

```powershell
py -3.10 -m venv .venv
=======
2. Create and activate a virtual environment:

```powershell
python -m venv .venv
>>>>>>> c5f093941fb5ef9dc0c908f24541365f4ba9f83b
.\.venv\Scripts\Activate.ps1
```

3. Install Python dependencies:

```powershell
pip install -r requirements.txt
```

4. Create a `.env` file in `backend/` with the required environment variables.
   Example values:

```env
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOW_ALL_ORIGINS=True
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
REDIS_URL=redis://localhost:6379/0
SUPABASE_URL=https://your-supabase-url
SUPABASE_KEY=your-supabase-key
SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=http://localhost:8000
VITE_OAUTH_REDIRECT_URL=http://localhost:5173
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=you@example.com
EMAIL_HOST_PASSWORD=your-email-password
DEFAULT_FROM_EMAIL=you@example.com
```

5. Run migrations:

```powershell
python manage.py migrate
```

6. Start the Django development server:

```powershell
python manage.py runserver
```

7. (Optional) Start Celery if you need background task processing:

```powershell
celery -A core worker --loglevel=INFO
```

8. (Optional) Verify Redis is reachable:

```powershell
redis-cli PING
```

## Frontend Setup

1. Open another terminal and go to the frontend folder:

```powershell
cd frontend
```

<<<<<<< HEAD
2. Ensure you are using a supported Node.js version (`20.19+` or `22.12+`; `22 LTS` or `24 LTS` recommended):

```powershell
node -v
```

3. Install dependencies:
=======
2. Install dependencies:
>>>>>>> c5f093941fb5ef9dc0c908f24541365f4ba9f83b

```powershell
npm install
```

<<<<<<< HEAD
4. Create a `.env` file in `frontend/` if needed:
=======
3. Create a `.env` file in `frontend/` if needed:
>>>>>>> c5f093941fb5ef9dc0c908f24541365f4ba9f83b

```env
VITE_API_BASE_URL=http://localhost:8000
```

<<<<<<< HEAD
5. Start the Vite development server:
=======
4. Start the Vite development server:
>>>>>>> c5f093941fb5ef9dc0c908f24541365f4ba9f83b

```powershell
npm run dev
```

<<<<<<< HEAD
6. Open the application in your browser at:
=======
5. Open the application in your browser at:
>>>>>>> c5f093941fb5ef9dc0c908f24541365f4ba9f83b

```text
http://localhost:5173
```

## Running the Project

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

If your frontend is configured with `VITE_API_BASE_URL=http://localhost:8000`, it will call the backend automatically.

## Notes

- Use the backend `.env` file for database credentials, API keys, and email settings.
- `CORS_ALLOWED_ORIGINS` should include the frontend origin used by Vite.
- If you change ports, update `VITE_API_BASE_URL` accordingly.
- For production, make sure `DEBUG=False` and use a strong `SECRET_KEY`.
