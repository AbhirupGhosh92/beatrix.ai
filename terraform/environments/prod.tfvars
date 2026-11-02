project_id            = "asterion-453905"
environment           = "prod"
region                = "us-central1"
firestore_location_id = "nam5"
# Placeholders. The real emails are set as the GitHub environment variables TF_ADMIN_EMAILS and
# TF_DEVELOPER_MEMBERS (docs/DEPLOYMENT.md), which replace these in the pipeline.
allowed_admin_emails = [
  "prod-admin@beatrix.ai"
]
