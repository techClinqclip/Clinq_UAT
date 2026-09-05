import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('Clinq')

# Use Redis as the broker
app.config_from_object('django.conf:settings', namespace='CELERY')

# Automatically discover tasks.py in your apps
app.autodiscover_tasks()