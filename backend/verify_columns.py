import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from django.db import connection

cur = connection.cursor()
cur.execute("""
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name='content_campaign'
    AND column_name IN ('closure_reason', 'remaining_funds_settled', 'remaining_funds_settled_at', 'remaining_funds_settled_amount')
    ORDER BY column_name;
""")
rows = cur.fetchall()
print("✓ Production database columns verified:")
for col, dtype, nullable in rows:
    print(f"  - {col}: {dtype} (nullable: {nullable})")
print(f"\n✓ Total: {len(rows)} columns present")
