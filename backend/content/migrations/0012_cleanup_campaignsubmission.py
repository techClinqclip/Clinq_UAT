from django.db import migrations


def cleanup_campaignsubmission(apps, schema_editor):
    connection = schema_editor.connection
    cursor = connection.cursor()
    vendor = connection.vendor

    if vendor == 'postgresql':
        # Drop unnecessary columns and indexes/constraints if they exist
        sql = '''
        ALTER TABLE content_campaignsubmission
            DROP COLUMN IF EXISTS reach,
            DROP COLUMN IF EXISTS engagement_rate,
            DROP COLUMN IF EXISTS is_moderated,
            DROP COLUMN IF EXISTS meets_instructions,
            DROP COLUMN IF EXISTS moderation_notes,
            DROP COLUMN IF EXISTS payout_triggered,
            DROP COLUMN IF EXISTS clipper_id,
            DROP COLUMN IF EXISTS project_id;

        -- Drop unique constraint on post_url if leftover from ClipSubmission
        ALTER TABLE content_campaignsubmission DROP CONSTRAINT IF EXISTS content_clipsubmission_post_url_key;

        -- Drop indexes that reference removed columns
        DROP INDEX IF EXISTS content_clipsubmission_post_url_d47b0c29_like;
        DROP INDEX IF EXISTS content_clipsubmission_project_id_c3e09653;
        DROP INDEX IF EXISTS content_clipsubmission_clipper_id_68723049;
        '''
        cursor.execute(sql)

    else:
        # SQLite: recreate table with only desired columns
        # Desired columns: id, participant_id, platform, platform_username, post_url, earning, likes, views, status, created_at
        # SQLite is already running migrations inside a transaction; avoid explicit BEGIN/COMMIT
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS content_campaignsubmission_new (
                id integer PRIMARY KEY,
                participant_id integer,
                platform varchar(20) NOT NULL,
                platform_username varchar(100) NOT NULL DEFAULT '',
                post_url text NOT NULL DEFAULT '',
                earning numeric(10,2) NOT NULL DEFAULT 0,
                likes integer NOT NULL DEFAULT 0,
                views integer NOT NULL DEFAULT 0,
                status varchar(20) NOT NULL DEFAULT 'pending',
                created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        ''')

        # Copy available data from old table into new table, using COALESCE for missing columns
        cursor.execute('''
            INSERT INTO content_campaignsubmission_new (id, participant_id, platform, platform_username, post_url, earning, likes, views, status, created_at)
            SELECT
                id,
                CASE WHEN participant_id IS NOT NULL THEN participant_id ELSE NULL END,
                COALESCE(platform, 'instagram'),
                COALESCE(platform_username, ''),
                COALESCE(post_url, ''),
                COALESCE(earning, 0),
                COALESCE(likes, 0),
                COALESCE(views, 0),
                COALESCE(status, 'pending'),
                COALESCE(created_at, CURRENT_TIMESTAMP)
            FROM content_campaignsubmission;
        ''')

        cursor.execute('DROP TABLE IF EXISTS content_campaignsubmission')
        cursor.execute('ALTER TABLE content_campaignsubmission_new RENAME TO content_campaignsubmission')


def noop_reverse(apps, schema_editor):
    # Irreversible cleanup; no-op on reverse migration
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0011_campaignsubmission'),
    ]

    operations = [
        migrations.RunPython(cleanup_campaignsubmission, reverse_code=noop_reverse),
    ]
