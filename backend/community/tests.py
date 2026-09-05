from django.test import TestCase

from accounts.models import CustomUser
from community.models import Discussion
from community.serializers import DiscussionCreateSerializer, DiscussionSerializer


class CommunitySerializerTests(TestCase):
    def test_discussion_serializer_has_user_author_payload(self):
        user = CustomUser.objects.create_user(
            email='clipper.community@example.com',
            password='Password123!',
            type='clipper',
        )
        profile = user.profile
        profile.first_name = 'Clipper'
        profile.last_name = 'User'
        profile.username = 'clipper_user'
        profile.bio = 'Community member'
        profile.save()

        discussion = Discussion.objects.create(
            author=user,
            title='New discussion',
            content='Hello community',
            category='general',
        )

        payload = DiscussionSerializer(discussion).data

        self.assertEqual(payload['author']['id'], user.id)
        self.assertEqual(payload['author']['user_type'], 'clipper')
        self.assertEqual(payload['author']['first_name'], 'Clipper')
        self.assertEqual(payload['author']['last_name'], 'User')
        self.assertEqual(payload['author']['username'], 'clipper_user')

    def test_discussion_create_serializer_normalizes_object_media_payload(self):
        payload = {
            'title': 'A test post',
            'content': 'Hello community',
            'category': 'general',
            'media': {'0': 'https://cdn.example.com/post.png'},
        }

        serializer = DiscussionCreateSerializer(data=payload)

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['media'], ['https://cdn.example.com/post.png'])

    def test_discussion_create_serializer_normalizes_nested_media_objects(self):
        payload = {
            'title': 'A nested media post',
            'content': 'Hello community',
            'category': 'general',
            'media': [
                {'type': 'image', 'url': 'https://cdn.example.com/post.png'},
                {'thumbnail': 'https://cdn.example.com/thumb.png'},
            ],
        }

        serializer = DiscussionCreateSerializer(data=payload)

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['media'], [
            'https://cdn.example.com/post.png',
            'https://cdn.example.com/thumb.png',
        ])
