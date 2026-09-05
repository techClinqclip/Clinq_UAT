"""Test GET /api/auth/profile/me/ with Authorization header and Origin header.
Usage: python tmp_test_get.py <access_token>
"""
import sys
import requests

def main():
    if len(sys.argv) < 2:
        print('Usage: python tmp_test_get.py <access_token>')
        return
    token = sys.argv[1]
    url = 'http://localhost:8000/api/auth/profile/me/'
    headers = {
        'Authorization': f'Bearer {token}',
        'Origin': 'http://localhost:5173'
    }
    try:
        resp = requests.get(url, headers=headers, timeout=10)
    except Exception as e:
        print('request error', repr(e))
        return
    print('status', resp.status_code)
    print('headers:', dict(resp.headers))
    try:
        print('body:', resp.json())
    except Exception:
        print('body text:', resp.text[:1000])

if __name__ == '__main__':
    main()
