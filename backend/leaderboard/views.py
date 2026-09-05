from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .models import LeaderboardEntry
from .serializers import LeaderboardEntrySerializer


class LeaderboardViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for leaderboard rankings
    Public read access
    """
    queryset = LeaderboardEntry.objects.select_related(
        'user', 'user__profile'
        )
    serializer_class = LeaderboardEntrySerializer
    permission_classes = [AllowAny]
    
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['category', 'period']
    ordering_fields = ['rank', 'score', 'total_earnings']
    ordering = ['rank']

    @extend_schema(
        summary='List leaderboard rankings',
        description='Get leaderboard rankings. Supports ?category=creators|clippers|brands&period=daily|weekly|monthly|all_time',
        tags=['Leaderboard'],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @extend_schema(
        summary='Get leaderboard entry details',
        tags=['Leaderboard'],
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    def get_queryset(self):
        # 1. Start with the base queryset
        queryset = super().get_queryset()
        
        # 2. Extract params manually to handle the "Calculate if missing" logic
        category = self.request.query_params.get('category', 'creators')
        period = self.request.query_params.get('period', 'weekly')
        
        # 3. Find the latest data for this specific combo
        latest_entry = queryset.filter(
            category=category,
            period=period
        ).order_by('-period_start').first()
        
        # 4. If data exists, filter by that timestamp
        if latest_entry:
            queryset = queryset.filter(
                category=category,
                period=period,
                period_start=latest_entry.period_start
            )
        else:
            # 5. If no rankings exist, calculate them now
            # (Note: In production, this is risky! Better to use a background task)
            LeaderboardEntry.calculate_rankings(category=category, period=period)
            
            # Re-fetch the new latest entry
            latest_entry = queryset.filter(
                category=category,
                period=period
            ).order_by('-period_start').first()
            
            if latest_entry:
                queryset = queryset.filter(
                    category=category,
                    period=period,
                    period_start=latest_entry.period_start
                )
        
        
        return queryset 

    @extend_schema(
        summary='Refresh leaderboard',
        description='Admin endpoint to refresh leaderboard rankings for a category and period',
        tags=['Leaderboard'],
    )
    @action(detail=False, methods=['post'], url_path='refresh')
    def refresh(self, request):
        """
        Admin endpoint to refresh leaderboard rankings
        """
        category = request.data.get('category', 'creators')
        period = request.data.get('period', 'monthly')
        
        try:
            entries = LeaderboardEntry.calculate_rankings(category=category, period=period)
            return Response({
                'message': f'Leaderboard refreshed for {category} - {period}',
                'entries_created': len(entries)
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )