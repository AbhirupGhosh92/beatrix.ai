project_id  = "beatrix-ai-dev"
environment = "dev"
region      = "us-central1"
# The first apply on dev adopted the functions the Firebase CLI deployed and the source bucket (see
# docs/DEPLOYMENT.md); set back to false afterwards. Set it to true again only to adopt resources that exist
# but are not in this state.
adopt_existing_functions = false
