"""PATCH avatar+cover with a sample image and GET profile.
Usage: python tmp_patch_and_get.py <access_token>
"""
import sys, os, base64, json, requests

if len(sys.argv) < 2:
    print('Usage: python tmp_patch_and_get.py <access_token>')
    sys.exit(1)

token = sys.argv[1]
url = 'http://localhost:8000/api/auth/profile/me/'
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# choose a sample image from repo
sample_paths = [
    os.path.join('media','avatars','user_60','ec875b9662344e9c83f1bacf3b6643e7.jpg'),
    os.path.join('media','avatars','user_59','1151a42ef7db4b918b97e68a656f816a.jpg')
]
img_path = None
for p in sample_paths:
    if os.path.exists(p):
        img_path = p
        break
if not img_path:
    print('No sample image found in repo. Aborting.')
    sys.exit(1)

with open(img_path, 'rb') as f:
    b = f.read()
    data_url = 'data:image/jpeg;base64,' + base64.b64encode(b).decode('ascii')

payload = {'avatar': data_url, 'cover': data_url}
print('PATCHing', url)
resp = requests.patch(url, headers=headers, data=json.dumps(payload), timeout=20)
print('PATCH status', resp.status_code)
try:
    print(json.dumps(resp.json(), indent=2))
except Exception:
    print('PATCH body', resp.text[:1000])

print('\nGETting profile')
r = requests.get(url, headers={'Authorization': f'Bearer {token}'}, timeout=10)
print('GET status', r.status_code)
try:
    print(json.dumps(r.json(), indent=2))
except Exception:
    print('GET body', r.text[:1000])

# list media folders for user if path returned
try:
    pd = r.json()
    for key in ('avatar','cover'):
        v = pd.get(key)
        print(f'{key}:', v)
        if v and v.startswith('http'):
            # map url path to local media
            path = v.split('/media/')[-1] if '/media/' in v else None
            if path:
                local = os.path.join('media', path)
                print('local path exists?', os.path.exists(local), local)
except Exception:
    pass
