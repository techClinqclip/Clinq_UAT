# Clinq Deployment Requirements

## 1. Application Components

- Frontend: React 19 + Vite 8, built as static files and served from `frontend/dist`.
- Backend: Django 5.2 REST API served by Gunicorn using `core.wsgi:application`.
- Database: PostgreSQL 15 or a compatible managed PostgreSQL service.
- Cache and background jobs: Redis plus a Celery worker.
- File storage and authentication: Supabase Storage and Supabase Auth.
- Video processing: FFmpeg must be installed on the backend/worker runtime.
- Email: SMTP provider for OTP and notification emails.

## 2. Recommended Production Services

At minimum, provision:

1. One web/API runtime for Django and Gunicorn.
2. One Celery worker runtime using the same backend code and environment.
3. One managed PostgreSQL database.
4. One Redis instance.
5. One frontend static hosting service or Nginx server.
6. A Supabase project with Auth and the `ClinqBucket` storage bucket configured.
7. An SMTP account/provider.

The API and Celery worker may share a server initially, but they should remain separate processes. Redis is required for the configured Celery broker/result backend and is also used by application rate limiting when enabled.

## 3. Runtime Versions

- Python 3.11 recommended (Python 3.10+ is supported by the current setup).
- Node.js 22 LTS recommended, with npm 10+.
- PostgreSQL 15 or newer.
- Redis 7 or newer.
- FFmpeg 5+ recommended.
- Linux runtime recommended for production.

Install backend packages with:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Install and build the frontend with:

```bash
cd frontend
npm ci
npm run build
```

## 4. Production Environment Variables

Create these in the backend secret manager/environment. Do not commit them to Git.

### Required backend variables

```env
SECRET_KEY=<long-random-production-secret>
DEBUG=False
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
ALLOWED_HOSTS=api.example.com
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://clinq.defite.in
CSRF_TRUSTED_ORIGINS=https://clinq.defite.in
FRONTEND_URL=https://clinq.defite.in
REDIS_URL=redis://<redis-host>:6379/0
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=<server-side-supabase-key>
SUPABASE_ANON_KEY=<supabase-anon-key>
```

### Required email variables

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=<smtp-host>
EMAIL_PORT=587
EMAIL_HOST_USER=<smtp-user>
EMAIL_HOST_PASSWORD=<smtp-password-or-app-password>
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=<verified-sender-email>
```

### Frontend build-time variables

These must be available while running `npm run build`:

```env
VITE_API_BASE_URL=https://api.example.com
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_OAUTH_REDIRECT_URL=https://clinq.defite.in/auth/callback
VITE_GOOGLE_CLIENT_ID=<google-oauth-client-id>
```

Only public values should use the `VITE_` prefix. Never expose `SUPABASE_KEY`, a Supabase service-role key, SMTP credentials, or `SECRET_KEY` in frontend variables.

## 5. Production Processes

### Render deployment

This repository includes `render.yaml` for Render Blueprint deployment. In Render, choose **New > Blueprint**, select this repository and the `main` branch, then review the services before applying:

- `clinq-api`: Dockerized Django/Gunicorn API
- `clinq-worker`: Celery worker
- `clinq-postgres`: PostgreSQL database
- `clinq-redis`: Redis-compatible key-value store
- `clinq-frontend`: React/Vite static site

Set the `sync: false` variables in the Render dashboard when prompted. In particular, set the frontend `VITE_API_BASE_URL` to the deployed API URL, for example `https://clinq-api.onrender.com`, and set the Supabase and SMTP values. Add `clinq.defite.in` as a custom domain for `clinq-frontend`, then complete the DNS records shown by Render.

Run database migrations before accepting traffic:

```bash
cd backend
python manage.py migrate
python manage.py collectstatic --noinput
```

Start the API:

```bash
gunicorn core.wsgi:application --bind 0.0.0.0:8000
```

Start the background worker:

```bash
celery -A core worker --loglevel=INFO
```

Put Nginx, a cloud load balancer, or the hosting provider's HTTPS proxy in front of the API and frontend. Configure `/media/` and `/static/` handling explicitly; local disk should not be treated as durable storage in a multi-instance deployment.

## 6. Supabase and OAuth Setup

- Create/configure the Supabase project.
- Enable the required authentication providers, including Google if social login is used.
- Configure Supabase Auth redirect URLs for the production frontend callback URL.
- Create the `ClinqBucket` storage bucket and apply the intended upload/read policies.
- Add the production API and frontend URLs to all CORS and OAuth allowlists.
- Configure Google Cloud OAuth authorized JavaScript origins and redirect URIs to match the production frontend.

## 7. Database and Operations

- Use managed PostgreSQL backups and point-in-time recovery where available.
- Run migrations as a release step, not on every web request.
- Persist or externally store uploaded media; the current Django `media/` directory is local to the runtime.
- Configure log collection, error monitoring, health checks, and HTTPS certificate renewal.
- Add domain-specific monitoring for Celery failures, Redis availability, email delivery, Supabase storage, and database connection errors.

## 8. Current Repository Blockers / Required Cleanup

- `backend/docker-compose.yml` references a backend `Dockerfile`, but no `backend/Dockerfile` is currently present. Docker deployment needs that file added or the deployment must use a platform build configuration.
- `backend/core/settings.py` currently has development fallbacks for `DEBUG`, `SECRET_KEY`, CORS, and SMTP credentials. Production deployment must override these values and the hardcoded credentials must be removed and rotated.
- The root `README.md` contains unresolved Git merge-conflict markers. Resolve them before using it as the official deployment guide.
- The backend settings do not define a production `STATIC_ROOT`; configure it before relying on `collectstatic` and a separate static-file server.
- Run `python manage.py check --deploy` in the production-like environment and fix every warning before release.

## 9. Release Acceptance Checklist

- [ ] Production secrets stored in the hosting provider's secret manager.
- [ ] `DEBUG=False`, restrictive hosts, CORS, and CSRF origins verified.
- [ ] PostgreSQL connectivity and migrations verified.
- [ ] Redis connectivity and Celery worker verified.
- [ ] FFmpeg installed and video-processing task verified.
- [ ] Supabase Auth, Storage, bucket policies, and OAuth redirects verified.
- [ ] SMTP OTP delivery verified.
- [ ] Frontend built with production API and OAuth URLs.
- [ ] HTTPS, static files, media storage, backups, logs, and health checks verified.
- [ ] Smoke-tested registration, login, file upload, background processing, and payout-related workflows.