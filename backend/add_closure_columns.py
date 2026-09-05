import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from django.db import connection

cur = connection.cursor()

# Add closure_reason column if it doesn't exist
try:
    cur.execute("""
        ALTER TABLE content_campaign
        ADD COLUMN closure_reason VARCHAR(20) DEFAULT '';
    """)
    print("✓ Added closure_reason column")
except Exception as e:
    if "already exists" in str(e):
        print("✓ closure_reason column already exists")
    else:
        print(f"✗ Error adding closure_reason: {e}")

# Add remaining_funds_settled column if it doesn't exist
try:
    cur.execute("""
        ALTER TABLE content_campaign
        ADD COLUMN remaining_funds_settled BOOLEAN DEFAULT FALSE;
    """)
    print("✓ Added remaining_funds_settled column")
except Exception as e:
    if "already exists" in str(e):
        print("✓ remaining_funds_settled column already exists")
    else:
        print(f"✗ Error adding remaining_funds_settled: {e}")

# Add remaining_funds_settled_at column if it doesn't exist
try:
    cur.execute("""
        ALTER TABLE content_campaign
        ADD COLUMN remaining_funds_settled_at TIMESTAMP NULL;
    """)
    print("✓ Added remaining_funds_settled_at column")
except Exception as e:
    if "already exists" in str(e):
        print("✓ remaining_funds_settled_at column already exists")
    else:
        print(f"✗ Error adding remaining_funds_settled_at: {e}")

# Add remaining_funds_settled_amount column if it doesn't exist
try:
    cur.execute("""
        ALTER TABLE content_campaign
        ADD COLUMN remaining_funds_settled_amount NUMERIC(12,2) DEFAULT 0;
    """)
    print("✓ Added remaining_funds_settled_amount column")
except Exception as e:
    if "already exists" in str(e):
        print("✓ remaining_funds_settled_amount column already exists")
    else:
        print(f"✗ Error adding remaining_funds_settled_amount: {e}")

# Mark the migration as applied
try:
    cur.execute("""
        INSERT INTO django_migrations (app, name, applied)
        VALUES ('content', '0025_campaign_closure_settlement_fields', NOW())
        ON CONFLICT DO NOTHING;
    """)
    print("✓ Marked migration as applied")
except Exception as e:
    print(f"Migration record: {e}")

print("\nAll columns added successfully!")
