from faker import Faker
from decimal import Decimal
from .models import Course, LearningPath, CourseEnroll, Lesson

fake = Faker()

def seed_courses(creators, count=5): # Accept creators list
    courses = []
    for _ in range(count):
        # Pick a random creator from the seeded users to be the instructor
        instructor = fake.random_element(elements=creators)
        
        course = Course.objects.create(
            title=f"Master {fake.word().capitalize()} for Clippers",
            description=fake.paragraph(),
            instructor=instructor, # Assigning the User object
            category=fake.random_element(elements=('editing', 'marketing', 'business')),
            price=Decimal(fake.random_int(min=499, max=2999)),
            original_price=Decimal(3500),
            duration=f"{fake.random_int(5, 15)} hours",
            level='Beginner'
        )
        
        # [NEW] Seed real Lessons for each course
        for i in range(1, 4): # Create 3 lessons per course
            Lesson.objects.create(
                course=course,
                title=f"Module {i}: {fake.sentence(nb_words=3)}",
                video_url="https://supabase.com/test-video.mp4",
                duration="10:00",
                order=i
            )
        
        course.lessons_count = 3
        course.save()
        courses.append(course)
    return courses

def seed_learning_paths(count=3):
    """Creates structured learning paths for the clipper academy."""
    paths = []
    path_titles = [
        "Viral Video Mastery", 
        "Advanced CapCut Techniques", 
        "Monetizing TikTok Clips"
    ]
    
    for i in range(min(count, len(path_titles))):
        path = LearningPath.objects.create(
            title=path_titles[i],
            description=fake.paragraph(nb_sentences=2),
            courses_count=fake.random_int(min=3, max=8),
            duration_str=f"{fake.random_int(10, 40)} hours",
            has_certificate=True
        )
        paths.append(path)
    return paths

# def seed_enrollments(clippers, courses):
#     """Randomly enrolls clippers into courses for UI testing."""
#     for clipper in clippers:
#         # Enroll each clipper in 2 random courses
#         selected_courses = fake.random_elements(elements=courses, length=2, unique=True)
#         for course in selected_courses:
#             CourseEnroll.objects.get_or_create(user=clipper, course=course)

def seed_enrollments(clippers, courses):
    """Populates test enrollments to verify the Clipper Hub UI."""
    for clipper in clippers:
        # Enroll clipper in 1-2 random courses
        for course in fake.random_elements(elements=courses, length=2, unique=True):
            CourseEnroll.objects.get_or_create(user=clipper, course=course)

def seed_lessons_for_courses(courses):
    """Creates actual Lesson objects for each course in the DB."""
    for course in courses:
        for i in range(1, 6): # Create 5 lessons per course
            Lesson.objects.create(
                course=course,
                title=f"Lesson {i}: Pro Editing Mastery",
                video_url="https://supabase.com/storage/v1/test-lesson.mp4",
                duration="12:30",
                order=i
            )
        course.lessons_count = 5
        course.save()