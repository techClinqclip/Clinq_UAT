from faker import Faker
from decimal import Decimal
from .models import Content, Bid, ClipSubmission

fake = Faker()

def seed_marketplace(creators, clippers, count_per_creator=2):
    gigs = []
    # Use valid category choices from the model
    valid_categories = [choice[0] for choice in Content.CATAGORY_CHOICES]
    
    for creator in creators:
        for _ in range(count_per_creator):
            is_biddable = fake.boolean()
            gig = Content.objects.create(
                creator=creator,
                title=fake.catch_phrase(),
                description=fake.paragraph(),
                category=fake.random_element(elements=valid_categories),
                budget=Decimal(fake.random_int(min=1000, max=10000)),
                is_biddable=is_biddable,
                status='available',
                raw_video_url="https://supabase.com/test-video.mp4"
            )
            gigs.append(gig)
    return gigs


def seed_bids(clippers, gigs, bids_per_gig=3):
    """Simulates clippers bidding on biddable marketplace projects."""
    bids = []
    biddable_gigs = [g for g in gigs if g.is_biddable]
    
    for gig in biddable_gigs:
        # Pick random clippers to bid on this specific gig
        potential_clippers = fake.random_elements(elements=clippers, length=bids_per_gig, unique=True)
        
        for clipper in potential_clippers:
            # Ensure bid amount is positive and reasonable
            bid_amount = gig.budget - Decimal(fake.random_int(min=-500, max=500))
            # Ensure minimum bid is at least 10% of budget
            min_bid = gig.budget * Decimal('0.1')
            if bid_amount < min_bid:
                bid_amount = min_bid
            
            bid = Bid.objects.create(
                content=gig,
                clipper=clipper,
                pitch=fake.sentence(nb_words=12),
                bid_amount=bid_amount,
                status=fake.random_element(elements=('pending', 'pending', 'rejected')) # Mostly pending
            )
            bids.append(bid)
    return bids