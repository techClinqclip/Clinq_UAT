#!/usr/bin/env python
"""Test settlement logic for manual closures"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from decimal import Decimal
from datetime import date, timedelta
from django.contrib.auth import get_user_model
from content.models import Campaign
from content.serializers import CampaignSerializer

User = get_user_model()

print("=" * 80)
print("Settlement Logic - Manual Close Validation")
print("=" * 80)
print()

# Test 1: Manual close with remaining budget (should require settlement)
print("Test 1: Manual close with remaining budget - SHOULD require settlement")
print("-" * 60)
u1 = User.objects.create_user(email='manual-close-test@test.com', password='pw', type='brand')
c1 = Campaign.objects.create(
    creator=u1,
    name='Manually Closed Campaign',
    description='test',
    category='gaming',
    budget=Decimal('1000.00'),
    reward_per_1k=Decimal('10.00'),
    max_earnings=Decimal('100.00'),
    paid_out=Decimal('600.00'),
    end_date=date.today() + timedelta(days=30),
    status='closed',
    closure_reason='manual',
    type='campaign'
)
serializer = CampaignSerializer(c1)
needs_settlement = serializer.data.get('needsRemainingSettlement')
print(f"Campaign: {c1.name}")
print(f"  Status: {c1.status}, Closure Reason: {c1.closure_reason}")
print(f"  Budget: {c1.budget}, Paid Out: {c1.paid_out}")
print(f"  Remaining: {c1.budget - c1.paid_out}")
print(f"  Needs Settlement: {needs_settlement}")
status1 = "PASS" if needs_settlement else "FAIL"
print(f"  Expected: True, Got: {needs_settlement} - {status1}")
print()

# Test 2: Manual close with no remaining budget (should NOT require settlement)
print("Test 2: Manual close with no remaining budget - should NOT require settlement")
print("-" * 60)
c2 = Campaign.objects.create(
    creator=u1,
    name='Manually Closed - No Remaining',
    description='test',
    category='gaming',
    budget=Decimal('1000.00'),
    reward_per_1k=Decimal('10.00'),
    max_earnings=Decimal('100.00'),
    paid_out=Decimal('1000.00'),
    end_date=date.today() + timedelta(days=30),
    status='closed',
    closure_reason='manual',
    type='campaign'
)
serializer = CampaignSerializer(c2)
needs_settlement = serializer.data.get('needsRemainingSettlement')
print(f"Campaign: {c2.name}")
print(f"  Status: {c2.status}, Closure Reason: {c2.closure_reason}")
print(f"  Budget: {c2.budget}, Paid Out: {c2.paid_out}")
print(f"  Remaining: {c2.budget - c2.paid_out}")
print(f"  Needs Settlement: {needs_settlement}")
status2 = "PASS" if not needs_settlement else "FAIL"
print(f"  Expected: False, Got: {needs_settlement} - {status2}")
print()

# Test 3: Deadline close with remaining budget (should require settlement)
print("Test 3: Deadline close with remaining budget - SHOULD require settlement")
print("-" * 60)
c3 = Campaign.objects.create(
    creator=u1,
    name='Deadline Closed Campaign',
    description='test',
    category='gaming',
    budget=Decimal('1000.00'),
    reward_per_1k=Decimal('10.00'),
    max_earnings=Decimal('100.00'),
    paid_out=Decimal('500.00'),
    end_date=date.today() - timedelta(days=1),
    status='closed',
    closure_reason='deadline',
    type='campaign'
)
serializer = CampaignSerializer(c3)
needs_settlement = serializer.data.get('needsRemainingSettlement')
print(f"Campaign: {c3.name}")
print(f"  Status: {c3.status}, Closure Reason: {c3.closure_reason}")
print(f"  Budget: {c3.budget}, Paid Out: {c3.paid_out}")
print(f"  Remaining: {c3.budget - c3.paid_out}")
print(f"  Needs Settlement: {needs_settlement}")
status3 = "PASS" if needs_settlement else "FAIL"
print(f"  Expected: True, Got: {needs_settlement} - {status3}")
print()

# Test 4: Budget exhausted close (should NOT require settlement)
print("Test 4: Budget exhausted - should NOT require settlement")
print("-" * 60)
c4 = Campaign.objects.create(
    creator=u1,
    name='Budget Exhausted Campaign',
    description='test',
    category='gaming',
    budget=Decimal('1000.00'),
    reward_per_1k=Decimal('10.00'),
    max_earnings=Decimal('100.00'),
    paid_out=Decimal('1000.00'),
    end_date=date.today() + timedelta(days=30),
    status='closed',
    closure_reason='budget',
    type='campaign'
)
serializer = CampaignSerializer(c4)
needs_settlement = serializer.data.get('needsRemainingSettlement')
print(f"Campaign: {c4.name}")
print(f"  Status: {c4.status}, Closure Reason: {c4.closure_reason}")
print(f"  Budget: {c4.budget}, Paid Out: {c4.paid_out}")
print(f"  Remaining: {c4.budget - c4.paid_out}")
print(f"  Needs Settlement: {needs_settlement}")
status4 = "PASS" if not needs_settlement else "FAIL"
print(f"  Expected: False, Got: {needs_settlement} - {status4}")
print()

# Test 5: Creator gig manual close with remaining budget
print("Test 5: Creator gig manual close - SHOULD require settlement")
print("-" * 60)
u2 = User.objects.create_user(email='creator-manual-close@test.com', password='pw', type='creator')
g1 = Campaign.objects.create(
    creator=u2,
    name='Creator Gig Manual Close',
    description='test',
    category='technology',
    budget=Decimal('2000.00'),
    reward_per_1k=Decimal('25.00'),
    max_earnings=Decimal('2000.00'),
    paid_out=Decimal('1200.00'),
    end_date=date.today() + timedelta(days=10),
    status='closed',
    closure_reason='manual',
    type='gig'
)
serializer = CampaignSerializer(g1)
needs_settlement = serializer.data.get('needsRemainingSettlement')
print(f"Creator Gig: {g1.name}")
print(f"  Status: {g1.status}, Closure Reason: {g1.closure_reason}")
print(f"  Budget: {g1.budget}, Paid Out: {g1.paid_out}")
print(f"  Remaining: {g1.budget - g1.paid_out}")
print(f"  Needs Settlement: {needs_settlement}")
status5 = "PASS" if needs_settlement else "FAIL"
print(f"  Expected: True, Got: {needs_settlement} - {status5}")
print()

# Cleanup
c1.delete()
c2.delete()
c3.delete()
c4.delete()
g1.delete()
u1.delete()
u2.delete()

print("=" * 80)
print("All manual close settlement tests completed!")
print("=" * 80)
