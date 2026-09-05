import os
import sys

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from accounts.models import Profile
import base64

def find_sample_image():
    candidates = [
        os.path.join('media','avatars','user_60','ec875b9662344e9c83f1bacf3b6643e7.jpg'),
        os.path.join('media','avatars','user_59','1151a42ef7db4b918b97e68a656f816a.jpg'),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def main():
    User = get_user_model()
    user = User.objects.first()
    if not user:
        print('No user found in DB')
        return

    print('Testing with user', user.id, user.email)

    img_path = find_sample_image()
    if not img_path:
        print('No sample image found in repo media folders. Aborting.')
        return

    with open(img_path, 'rb') as f:
        data = f.read()
    data_url = 'data:image/jpeg;base64,' + base64.b64encode(data).decode('ascii')

    client = APIClient()
    client.force_authenticate(user=user)

    payload = {'avatar': data_url, 'cover': data_url}
    print('PATCH /api/auth/profile/me/ ...')
    resp = client.patch('/api/auth/profile/me/', payload, format='json')
    print('PATCH status', resp.status_code)
    try:
        print('PATCH json:', resp.json())
    except Exception:
        print('PATCH response (non-json)')

    print('\nGET /api/auth/profile/me/ ...')
    r = client.get('/api/auth/profile/me/')
    print('GET status', r.status_code)
    try:
        print('GET json:', r.json())
    except Exception:
        print('GET response (non-json)')

    # Inspect Profile row and media files
    try:
        p = Profile.objects.get(user__id=user.id)
        print('\nDB stored avatar:', p.avatar.name if p.avatar else None)
        print('DB stored cover:', p.cover.name if p.cover else None)
        if p.avatar:
            avatar_local = os.path.join('media', p.avatar.name)
            print('avatar file exists:', os.path.exists(avatar_local), avatar_local)
        if p.cover:
            cover_local = os.path.join('media', p.cover.name)
            print('cover file exists:', os.path.exists(cover_local), cover_local)
    except Exception as e:
        print('Error inspecting Profile row:', e)

if __name__ == '__main__':
    main()
