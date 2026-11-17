## Decision

Read the URL from the tfvars file in the workflow with `awk` (the same way the region is read) instead of a Terraform output, because a new or changed output would show up in the stage-1 plan and need an apply. Declaring the variable keeps `terraform plan -var-file` free of "undeclared variable" warnings.

## Assumptions

The live prod URL is `https://asterion-ai-backend--asterion-453905.us-central1.hosted.app`, as given by the owner. A wrong value fails the smoke test, which fails closed.
