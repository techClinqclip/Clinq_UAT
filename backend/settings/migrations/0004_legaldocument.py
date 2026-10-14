from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('settings', '0003_resourcesampletemplate_supabase_storage'),
    ]

    operations = [
        migrations.CreateModel(
            name='LegalDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(choices=[('privacy_policy', 'Privacy Policy'), ('terms_conditions', 'Terms & Conditions')], max_length=64, unique=True)),
                ('document_url', models.CharField(blank=True, max_length=500)),
                ('filename', models.CharField(blank=True, max_length=255)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='updated_legal_documents', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Legal Document',
                'verbose_name_plural': 'Legal Documents',
            },
        ),
    ]
