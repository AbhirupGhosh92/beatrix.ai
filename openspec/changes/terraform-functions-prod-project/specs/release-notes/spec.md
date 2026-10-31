# Spec Delta

## MODIFIED Requirements

### Requirement: Release branch publishes a GitHub release
A successful prod deploy of `release/<major.minor[.patch]>` (or a `v<major.minor.patch>` tag) SHALL create or update the tag `v<version>` and a GitHub release marked Latest whose body is the ref's `RELEASE_NOTES.md`. Pushing a release branch alone SHALL NOT publish a release. The deploy SHALL fail before applying when `RELEASE_NOTES.md` is missing or empty.

#### Scenario: Release branch pushed
- **WHEN** a prod deploy of `release/1.2.1` finishes its smoke test with a non-empty `RELEASE_NOTES.md`
- **THEN** a release `v1.2.1` marked Latest exists with those notes as its body

#### Scenario: Prod deploy fails
- **WHEN** a prod deploy fails before or at the smoke test
- **THEN** no release is created or updated

#### Scenario: Notes missing
- **WHEN** a prod deploy starts and the ref has no `RELEASE_NOTES.md` or it is empty
- **THEN** the run fails before the plan is applied and no release is created

#### Scenario: Push without deploy
- **WHEN** a release branch is pushed and no prod deploy is run
- **THEN** no release is created
