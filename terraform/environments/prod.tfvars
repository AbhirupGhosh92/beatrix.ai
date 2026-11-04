# firestore_location_id matches the existing prod database (us-central1). A Firestore location cannot
# change in place: a different value forces replacement, which the plan guard blocks.
project_id            = "asterion-453905"
environment           = "prod"
region                = "us-central1"
firestore_location_id = "us-central1"
