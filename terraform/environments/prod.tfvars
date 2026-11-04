project_id            = "asterion-453905"
environment           = "prod"
region                = "us-central1"
# The existing prod database was created in us-central1; a location cannot change in place (a different
# value forces replacement, which the plan guard blocks).
firestore_location_id = "us-central1"
