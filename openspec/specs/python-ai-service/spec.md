# python-ai-service Specification

## Purpose
A small private Python service, running on Cloud Run, that will host LangChain and other AI code for the site. This capability covers the scaffold only: its routes, configuration, secret handling and who can call it.

## Requirements

### Requirement: Health and hello routes
The service SHALL answer `GET /health` with HTTP 200 and a hello world route with a greeting, without needing a model API key.

#### Scenario: Health check
- **WHEN** a caller requests `GET /health`
- **THEN** the response is 200

#### Scenario: Hello world without a key
- **WHEN** the model API key is not set and a caller requests the hello route
- **THEN** the response is the greeting and no error

### Requirement: WebSocket greeting and echo
The service SHALL accept WebSocket connections at `/ws`, send a greeting on connect and reply to each text message with an echo of it.

#### Scenario: Connect and echo
- **WHEN** a client connects to `/ws` and sends the text `ping`
- **THEN** it first receives the greeting and then an echo containing `ping`

#### Scenario: Client disconnects
- **WHEN** the client closes the connection
- **THEN** the service ends the session without an error response

### Requirement: Configuration from the environment
The service SHALL read its settings, including the model API key, from environment variables, and SHALL NOT contain a key or other secret value in the repository.

#### Scenario: No key in the repo
- **WHEN** the repository is searched for the model API key value
- **THEN** none is present; only the variable name and an empty example entry exist

### Requirement: Model API key from Secret Manager
In a deployed environment the model API key SHALL reach the service only as an environment variable filled by Cloud Run from a Secret Manager secret. Terraform SHALL create the secret without a value, the user SHALL set the value outside Terraform and the pipeline, and only the service's own runtime account SHALL be able to read it.

#### Scenario: Secret not yet set
- **WHEN** an environment is provisioned and no secret value has been added
- **THEN** infrastructure and the service still deploy, and the hello world routes work

#### Scenario: Value never in state
- **WHEN** the secret value is added or rotated
- **THEN** no Terraform state or plan contains it

### Requirement: Private by default
The service SHALL NOT be invokable by unauthenticated callers. Only the App Hosting service account of the same environment SHALL hold permission to invoke it.

#### Scenario: Anonymous request
- **WHEN** a caller without a Google identity token requests any route
- **THEN** Cloud Run rejects it before it reaches the service

#### Scenario: Other account
- **WHEN** a different service account calls the service
- **THEN** the call is rejected with 403
