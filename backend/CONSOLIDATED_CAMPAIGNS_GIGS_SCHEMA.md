# Consolidated Campaigns & Gigs Schema

## Overview
The Campaign model now serves as a unified schema for both brand campaigns and creator gigs. A `type` field is used to differentiate between them.

## Type Field
- `campaign`: Brand-created campaigns (only brands can create)
- `gig`: Creator-created gigs (only creators can create)

## Schema Fields

### Common Fields (Both campaigns and gigs)
- `id`: Primary key
- `type`: 'campaign' or 'gig' 
- `creator`: User who created it (brand for campaigns, creator for gigs)
- `name`: Title of the campaign/gig
- `description`: Full description
- `category`: Content category (gaming, lifestyle, education, etc.)
- `thumbnail_url`: Thumbnail image
- `clipper_requirements`: Requirements for clippers
- `budget`: Total budget
- `platforms`: List of platforms (Instagram, YouTube, TikTok, etc.)
- `status`: Current status (active/paused/inactive/completed/closed/available/claimed/review)
- `views`: Total views count
- `submissions`: Total submissions count
- `paid_out`: Total amount paid out
- `created_at`: Timestamp of creation
- `updated_at`: Last update timestamp

### Campaign-Specific Fields
- `brand_name`: Name of the brand
- `reward_per_1k`: Reward per 1000 views
- `max_earnings`: Maximum earnings per clipper
- `start_date`: Campaign start date
- `end_date`: Campaign end date

### Gig-Specific Fields
- `highlight_type`: Highlighting option (none/day/week/premium)
- `is_paid_listing`: Whether this is a paid listing
- `is_biddable`: Whether clippers can bid on it
- `assigned_clipper`: Optional specific clipper assigned to this gig
- `raw_video_url`: Original video URL
- `proxy_video_url`: Proxy video URL
- `review_url`: Review video URL
- `final_video_url`: Final video URL

## Workflow

### Campaign (Brand)
1. **Create**: POST /api/content/campaigns/ (brand user)
   - Creates a campaign with `type='campaign'`
   - Sets status to 'active'

2. **Marketplace**: GET /api/content/campaigns/?scope=marketplace&type=campaign
   - Lists active campaigns for clippers to browse

3. **Join**: POST /api/content/campaigns/{id}/join/ (clipper)
   - Clipper joins the campaign
   - Creates CampaignParticipant record

4. **Submit**: POST /api/content/campaigns/{id}/submit-clip/ (clipper)
   - Clipper submits their content
   - Creates CampaignSubmission record

5. **Review & Payout**: Managed through dashboard
   - Brand reviews submissions
   - Approves and pays out earnings

### Gig (Creator)
1. **Create**: POST /api/content/campaigns/ (creator user)
   - Creates a gig with `type='gig'`
   - Sets status to 'available'

2. **Marketplace**: GET /api/content/campaigns/?scope=marketplace&type=gig
   - Lists available gigs for clippers to browse

3. **Join**: POST /api/content/campaigns/{id}/join/ (clipper)
   - Clipper joins the gig
   - Creates CampaignParticipant record

4. **Submit**: POST /api/content/campaigns/{id}/submit-clip/ (clipper)
   - Clipper submits their content
   - Creates CampaignSubmission record

5. **Review & Payout**: Managed through dashboard
   - Creator reviews submissions
   - Approves and pays out earnings

## API Endpoints

### Campaign Management
- `GET /api/content/campaigns/` - List campaigns
- `POST /api/content/campaigns/` - Create new campaign/gig
- `GET /api/content/campaigns/{id}/` - Get campaign/gig details
- `PATCH /api/content/campaigns/{id}/` - Update campaign/gig
- `GET /api/content/campaigns/my-campaigns/` - List my campaigns (brand)
- `GET /api/content/campaigns/my-gigs/` - List my gigs (creator)

### Participation
- `POST /api/content/campaigns/{id}/join/` - Join campaign/gig
- `POST /api/content/campaigns/{id}/submit-clip/` - Submit content

### Marketplace
- `GET /api/content/campaigns/?scope=marketplace` - Browse marketplace
- `GET /api/content/campaigns/?scope=marketplace&type=campaign` - Browse only campaigns
- `GET /api/content/campaigns/?scope=marketplace&type=gig` - Browse only gigs

## Status Lifecycle

### Campaign Status
- `active` → `paused` → `active` (brand can pause/resume)
- `active` → `closed` (when budget exhausted or end date passed)
- `completed` (manually marked)

### Gig Status
- `available` (open to submissions)
- `claimed` (assigned to a clipper)
- `review` (under review)
- `completed` (finished)
- `closed` (manually closed)

## Database Indexes
- `(creator, -created_at)`: For listing user's campaigns/gigs
- `(status)`: For filtering by status
- `(type, status)`: For filtering by type and status

## Migration Details
Migration file: `0018_consolidate_gigs_campaigns.py`

New fields added to Campaign model:
- `type` (CharField with choices)
- `highlight_type` (CharField)
- `is_paid_listing` (BooleanField)
- `is_biddable` (BooleanField)
- `assigned_clipper` (ForeignKey)
- `raw_video_url` (URLField)
- `proxy_video_url` (URLField)
- `review_url` (URLField)
- `final_video_url` (URLField)

Status choices updated to support both campaign and gig statuses.
