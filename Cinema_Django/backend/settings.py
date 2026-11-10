SECRET_KEY = "cinema-local-development"
DEBUG = True
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
ROOT_URLCONF = "urls"
INSTALLED_APPS = []
MIDDLEWARE = ["django.middleware.csrf.CsrfViewMiddleware"]
