# Consolidation Implementation Guide: Campaigns & Gigs

## What's Changed

Previously, campaigns and gigs were stored in separate models:
- **Campaign model**: Brand campaigns with fields for reward_per_1k, max_earnings, start/end dates
- **Content model**: Creator gigs with fields for video URLs, highlighting, bidding

Now both are unified in the **Campaign model** with a `type` field to differentiate them.

## Migration Steps

### 1. Run Database Migration
```bash
python manage.py migrate content 0018_consolidate_gigs_campaigns
```

This adds the following fields to the Campaign table:
- `type` (campaign/gig)
- `highlight_type` (for gigs)
- `is_paid_listing` (for gigs)
- `is_biddable` (for gigs)
- `assigned_clipper` (for gigs)
- Video URL fields (raw, proxy, review, final)

### 2. Data Migration (If migrating existing content from old Content model)

The old Content model can be kept for backward compatibility or migrated. Here's how to migrate existing gigs to the new schema:

```python
# Optional: If you want to migrate old Content to Campaign
from content.models import Content, Campaign
from django.utils import timezone

for content in Content.objects.all():
    campaign = Campaign.objects.create(
        type='gig',
        creator=content.creator,
        name=content.title,
        description=content.description,
        category=content.category,
        thumbnail_url=content.thumbnail_url,
        budget=content.budget,
        status='available' if content.status == 'available' else content.status,
        highlight_type=content.highlight_type,
        is_paid_listing=content.is_paid_listing,
        is_biddable=content.is_biddable,
        assigned_clipper=content.assigned_clipper,
        raw_video_url=content.raw_video_url,
        proxy_video_url=content.proxy_video_url,
        review_url=content.review_url,
        final_video_url=content.final_video_url,
        created_at=content.created_at,
    )
```

### 3. Update Frontend API Calls

The API endpoints remain largely the same, but now support both campaigns and gigs:

#### Browsing Marketplace

```javascript
// Get all active campaigns and gigs
GET /api/content/campaigns/?scope=marketplace

// Get only campaigns
GET /api/content/campaigns/?scope=marketplace&type=campaign

// Get only gigs
GET /api/content/campaigns/?scope=marketplace&type=gig
```

#### Brand Dashboard (Campaigns)

```javascript
// List campaigns created by this brand
GET /api/content/campaigns/my-campaigns/

// Create a new campaign
POST /api/content/campaigns/
{
  "name": "Summer Campaign",
  "description": "...",
  "category": "gaming",
  "budget": 5000,
  "rewardPer1k": 10,
  "maxEarnings": 500,
  "platforms": ["instagram", "tiktok"],
  "startDate": "2024-08-15",
  "endDate": "2024-09-15"
}
// type='campaign' is set automatically
```

#### Creator Dashboard (Gigs)

```javascript
// List gigs created by this creator
GET /api/content/campaigns/my-gigs/

// Create a new gig
POST /api/content/campaigns/
{
  "name": "Quick Editing Project",
  "description": "...",
  "category": "entertainment",
  "budget": 200,
  "highlightType": "week",
  "isPaidListing": true,
  "platforms": ["youtube"],
  "isBiddable": false
}
// type='gig' is set automatically
```

#### Clipper Actions (Same for both)

```javascript
// Join a campaign or gig
POST /api/content/campaigns/{id}/join/

// Submit a clip
POST /api/content/campaigns/{id}/submit-clip/
{
  "platform": "instagram",
  "username": "clipper_username",
  "url": "https://instagram.com/p/ABC123"
}
```

### 4. Response Format

All responses now include the `type` field:

```json
{
  "id": 123,
  "type": "campaign",
  "name": "Summer Campaign",
  "creatorEmail": "brand@example.com",
  "brandName": "Nike",
  "description": "...",
  "category": "sports",
  "budget": 5000,
  "status": "active",
  "platforms": ["instagram", "tiktok"],
  "views": 1500,
  "submissions": 45,
  "paidOut": 2000,
  "rewardPer1k": 10,
  "maxEarnings": 500,
  "createdAt": "2024-08-01T10:00:00Z",
  "updatedAt": "2024-08-10T15:30:00Z"
}
```

For gigs, the response includes additional fields:
```json
{
  "id": 456,
  "type": "gig",
  "name": "Quick Edit",
  "highlightType": "week",
  "isPaidListing": true,
  "isBiddable": false,
  "rawVideoUrl": "https://example.com/raw.mp4",
  "proxyVideoUrl": "https://example.com/proxy.mp4",
  "reviewUrl": "https://example.com/review.mp4",
  "finalVideoUrl": "https://example.com/final.mp4"
}
```

## Backend Architecture

### Models
- **Campaign**: Unified model for both campaigns and gigs
  - Uses `type` field to differentiate
  - Contains all fields for both use cases
  - Backward compatible with existing Campaign queries

- **CampaignParticipant**: Tracks clippers who joined
  - Works for both campaign and gig types
  - Same structure, no changes needed

- **CampaignSubmission**: Tracks clip submissions
  - Works for both campaign and gig types
  - Same submission workflow for both

### Views
- **CampaignViewSet**: Handles both campaigns and gigs
  - `perform_create()`: Automatically sets type based on user role
  - `my-campaigns/`: Lists campaigns for brand users
  - `my-gigs/`: Lists gigs for creator users
  - `marketplace`: Lists all active campaigns and gigs

### Serializers
- **CampaignSerializer**: Updated to include all fields
  - Campaign-specific fields are optional for gigs
  - Gig-specific fields are optional for campaigns
  - `type` field is read-only (set automatically)

## User Role Permissions

### Brand Users
- ✅ Can create campaigns (type='campaign')
- ❌ Cannot create gigs
- ✅ Can view/edit their own campaigns
- ✅ Can join gigs as clippers if user_type allows
- ✅ Can browse marketplace

### Creator Users
- ❌ Cannot create campaigns
- ✅ Can create gigs (type='gig')
- ✅ Can view/edit their own gigs
- ✅ Can join campaigns as clippers
- ✅ Can browse marketplace

### Clipper Users (via user_type)
- ❌ Cannot create campaigns or gigs
- ✅ Can join any active campaign or available gig
- ✅ Can submit clips to both campaigns and gigs
- ✅ Can browse marketplace

## Database Query Examples

### Filter by Type
```python
# Get all campaigns
campaigns = Campaign.objects.filter(type='campaign', status='active')

# Get all gigs
gigs = Campaign.objects.filter(type='gig', status='available')

# Get both
all_offerings = Campaign.objects.filter(status__in=['active', 'available'])
```

### Filter by Status
```python
# Active campaigns
active_campaigns = Campaign.objects.filter(type='campaign', status='active')

# Available gigs
available_gigs = Campaign.objects.filter(type='gig', status='available')
```

### User's Content
```python
# User's campaigns
user_campaigns = Campaign.objects.filter(creator=user, type='campaign')

# User's gigs
user_gigs = Campaign.objects.filter(creator=user, type='gig')

# All user's content
user_content = Campaign.objects.filter(creator=user)
```

## Testing Checklist

- [ ] Migration runs successfully
- [ ] Existing campaigns still work
- [ ] Brands can create campaigns
- [ ] Creators can create gigs
- [ ] Clippers can join both campaigns and gigs
- [ ] Clippers can submit clips to both
- [ ] Marketplace shows both active campaigns and available gigs
- [ ] Filtering by type works correctly
- [ ] My-campaigns endpoint shows only campaigns
- [ ] My-gigs endpoint shows only gigs
- [ ] CampaignParticipant works for both types
- [ ] CampaignSubmission works for both types
- [ ] Status transitions work correctly
- [ ] Metrics (views, submissions, paid_out) aggregate correctly

## Rollback Plan

If issues occur, rollback to previous state:

```bash
# Revert migration
python manage.py migrate content 0017_add_pending_earning_to_campaignsubmission

# Keep old Content model working in parallel during transition period
```

## Future Improvements

1. **Soft Delete Content Model**: Keep old Content model for reference but mark as deprecated
2. **API Versioning**: Support /v2/ endpoints with new unified schema
3. **GraphQL**: Add GraphQL API with same unified schema
4. **Bulk Operations**: Add bulk create/update for campaigns and gigs
5. **Advanced Filtering**: Add date range, budget range, platform filtering
