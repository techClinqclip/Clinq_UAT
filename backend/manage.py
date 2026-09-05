#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
# APMinSight auto-instrumentation breaks some local dev environments.
# Enable it only when explicitly requested.
if os.getenv("ENABLE_APMINSIGHT", "").lower() in {"1", "true", "yes"}:
    from apminsight import initialize_agent

    initialize_agent({
        "license_key" : os.getenv("APMINSIGHT_LICENSE_KEY", "in_f419a525151d411f86974a28ae84af86"),
        "appname" : os.getenv("APMINSIGHT_APPNAME", "Clinq"),
        "exporter_status_port" : os.getenv("APMINSIGHT_EXPORTER_STATUS_PORT", "20021"),
        "exporter_data_port" : os.getenv("APMINSIGHT_EXPORTER_DATA_PORT", "20022"),
    })


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
