# Spec Delta

## Purpose
Provides a minimal, private Python service that later AI code can build on, with a WebSocket endpoint and its API key supplied from Secret Manager instead of the repository.

## ADDED Requirements

### Requirement: Health and hello endpoints
The service SHALL answer `GET /health` with status 200 and a JSON body saying it is healthy, and SHALL answer a hello world route with a greeting.

#### Scenario: Health check
- **WHEN** a caller requests `GET /health`
- **THEN** the response is 200 with a healthy status

#### Scenario: Hello
- **WHEN** a caller requests the hello route
- **THEN** the response contains a greeting

### Requirement: WebSocket hello
The service SHALL accept WebSocket connections at `/ws`, send a greeting when a connection opens, and reply to every text message with the same text prefixed by an acknowledgement, until the client closes.

#### Scenario: Greeting
- **WHEN** a client opens a WebSocket to `/ws`
- **THEN** it receives a greeting message

#### Scenario: Echo
- **WHEN** the client sends "ping"
- **THEN** it receives a reply that contains "ping"

#### Scenario: Client closes
- **WHEN** the client closes the connection
- **THEN** the service ends the session without an error

### Requirement: Configuration from the environment
The service SHALL read its settings, including the model API key, only from environment variables and SHALL start and serve hello world when the key is absent. The repository SHALL contain no secret value, only an example file with placeholder names.

#### Scenario: No key
- **WHEN** the service starts without the API key variable
- **THEN** it serves `/health` and `/ws` normally

#### Scenario: Key present
- **WHEN** the API key variable is set
- **THEN** the service can read it, and no endpoint or log line returns its value

### Requirement: Private service
The deployed service SHALL accept requests only from the App Hosting service account and SHALL refuse every other caller, including anonymous requests. The API key SHALL reach it only from Secret Manager, readable by the service's own account and no one else.

#### Scenario: Anonymous request
- **WHEN** an unauthenticated caller requests the service URL
- **THEN** the request is refused before it reaches the application

#### Scenario: Authorized caller
- **WHEN** the App Hosting service account calls the service with its identity token
- **THEN** the request is served
