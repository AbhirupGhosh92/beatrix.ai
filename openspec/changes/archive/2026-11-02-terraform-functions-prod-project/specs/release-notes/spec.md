# Spec Delta

## MODIFIED Requirements

### Requirement: Release branch publishes a GitHub release
A successful prod run SHALL cut the release for its `version`, only after the prod stages and the smoke test succeeded: the branch `release/<version>` and the tag `v<version>` at the deployed commit, and a GitHub release marked Latest whose body is `RELEASE_NOTES.md` at that commit. Pushing a release branch SHALL NOT publish a release.

#### Scenario: Release branch pushed
- **WHEN** a prod run for version `1.2.1` succeeds on a commit whose `RELEASE_NOTES.md` is non-empty
- **THEN** the branch `release/1.2.1` exists at that commit, and a release `v1.2.1` marked Latest exists with those notes as its body

#### Scenario: Prod run fails
- **WHEN** a prod run fails before or at the smoke test
- **THEN** no branch, tag or release is created or updated

#### Scenario: Notes missing
- **WHEN** a prod run starts and the commit has no `RELEASE_NOTES.md` or it is empty
- **THEN** the run fails before any plan and no release is cut

#### Scenario: Branch exists at another commit
- **WHEN** `release/1.2.1` or the tag `v1.2.1` already exists at a different commit
- **THEN** the run fails before any plan and nothing is changed

#### Scenario: Re-run for the same commit
- **WHEN** a prod run for the same commit and version runs again
- **THEN** the existing release is updated and no second branch, tag or release is created

#### Scenario: Push without deploy
- **WHEN** a release branch is pushed and no prod run is started
- **THEN** no release is created
