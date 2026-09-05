import os

path = os.path.join(os.path.dirname(__file__), 'content', 'views.py')
with open(path, 'r') as f:
    content = f.read()

print(f"File length: {len(content)}")
print(f"Last 150 chars: {repr(content[-150:])}")

# Check if the file is truncated at the broken line
if 'status=status.H' in content and 'HTTPS' not in content and 'HTTP_' not in content:
    print("Truncation detected! Fixing...")
    # Fix the truncated line
    content = content.replace('status=status.H', 'status=status.HTTP_400_BAD_REQUEST)')
    
    # Append the rest of the approve_submission method and like action
    append = """
            transaction.status = 'completed'
            transaction.save()

            from accounts.models import Profile
            try:
                Profile.objects.select_for_update().get(user=content.assigned_clipper)
            except Profile.DoesNotExist:
                Profile.objects.create(user=content.assigned_clipper)

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
    print(f"Fixed! New file length: {len(content)}")
else:
    print("File seems complete or different truncation.")
