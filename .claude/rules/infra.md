# Infrastructure Rules

- All infrastructure changes must be made via Terraform files in `terraform/`.
- Never make manual console changes without updating `terraform/`.
- Ensure `terraform/main.tf`, `terraform/variables.tf`, and `terraform/outputs.tf` are updated when new resources, security rules, or permissions are introduced.
- Run `npm run infra:check` to validate infrastructure files and syntax.
