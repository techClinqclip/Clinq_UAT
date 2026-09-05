import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
User = get_user_model()
user = User.objects.first()
print('user', user.email if user else None, 'id', user.id if user else None)
if user:
    token = RefreshToken.for_user(user)
    print('access', str(token.access_token))
