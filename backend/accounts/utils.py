from faker import Faker
from .models import CustomUser

fake = Faker()

def seed_users(n=10, user_type='clipper'):
    users = []
    for _ in range(n):
        user = CustomUser.objects.create_user(
            email=fake.unique.email(),
            password='password123',
            type=user_type
        )
        # Profile is created automatically via your signal
        users.append(user)
    return users