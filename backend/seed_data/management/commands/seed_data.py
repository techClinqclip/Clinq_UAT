from django.core.management.base import BaseCommand
from accounts.utils import seed_users
from content.utils import seed_marketplace, seed_bids
from earnings.utils import seed_viral_earnings
from courses.utils import seed_courses, seed_learning_paths # Assuming you create this similarly


class Command(BaseCommand):
    help = 'Seeds the entire Clinq Viral Engine with test data'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Users...")
        creators = seed_users(n=5, user_type='creator')
        clippers = seed_users(n=10, user_type='clipper')
        
        self.stdout.write("Seeding Academy (Courses & Paths)...")
        # Pass creators here so courses get an instructor
        courses = seed_courses(creators=creators, count=5) 
        seed_learning_paths(count=3)
        
        self.stdout.write("Seeding Marketplace Gigs...")
        gigs = seed_marketplace(creators, clippers)

        self.stdout.write("Seeding Marketplace Bids...")
        seed_bids(clippers, gigs) 
        
        self.stdout.write("Seeding Viral Earnings...")
        seed_viral_earnings(clippers)
        
        self.stdout.write(self.style.SUCCESS("Clinq Seed Complete!"))