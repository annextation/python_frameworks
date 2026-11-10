SECRET_KEY = "cinema-local-development"
DEBUG = True
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
ROOT_URLCONF = "urls"
INSTALLED_APPS = ["booking"]
MIDDLEWARE = ["django.middleware.csrf.CsrfViewMiddleware"]

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "cinema.db",
        "OPTIONS": {"transaction_mode": "IMMEDIATE", "timeout": 20},
    }
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = "UTC"
