# fix_views2.py - Fix the truncated content/views.py file
import os

views_dir = os.path.join(os.path.dirname(__file__), 'content')
path = os.path.join(views_dir, 'views.py')

with open(path, 'r') as f:
    content = f.read()

print(f"Original length: {len(content)}")
print(f"Ends with: {repr(content[-200:])}")

# The file should end with the `like` action. Check if it already has it.
if 'def like(self' in content:
    print("File already has 'like' method - no fix needed")
elif 'Profile.objects.create(user=content.assigned_clipper)' in content:
    # Append the rest of the method
    append = """

            Profile.objects.filter(user=content.assigned_clipper).update(
                total_earnings=F('total_earnings') + transaction.amount,
                clips_completed=F('clips_completed') + 1
            )

        return Response({
            "status": "success",
            "message": "Success! Funds released to the clipper's wallet",
            "transaction_id": transaction.id,
            "amount": str(transaction.amount),
            "clipper_id": content.assigned_clipper.id
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        content = self.get_object()
        user = request.user
        if content.likes.filter(id=user.id).exists():
            content.likes.remove(user)
            liked = False
        else:
            content.likes.add(user)
            liked = True
        return Response({'liked': liked, 'likesCount': content.likes.count()})
"""
    content += append
    with open(path, 'w') as f:
        f.write(content)
    print(f"Fixed! New length: {len(content)}")
else:
    print("Unexpected file content cannot fix automatically")
    # Print what we have at the end
    lines = content.split('\n')
    print(f"Total lines: {len(lines)}")
    print(f"Last 5 lines:")
    for l in lines[-5:]:
        print(f"  {repr(l)}")
