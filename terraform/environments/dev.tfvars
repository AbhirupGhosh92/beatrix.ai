project_id            = "beatrix-ai-dev"
environment           = "dev"
region                = "us-central1"
firestore_location_id = "nam5"
# Placeholders. The real emails are set as the GitHub environment variables TF_ADMIN_EMAILS and
# TF_DEVELOPER_MEMBERS (docs/DEPLOYMENT.md), which replace these in the pipeline.
allowed_admin_emails = [
  "dev-email@example.com"
]
developer_members = [
  "user:dev-email@example.com"
]
