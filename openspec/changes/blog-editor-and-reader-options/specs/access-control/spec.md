## MODIFIED Requirements

### Requirement: Published blog posts are public to read
The read-only page of a published blog post and the public data it needs SHALL be readable without a session, and only for published posts. Every other blog route SHALL keep requiring `blog:write`, except the public headers feed that the home page needs, which returns published headers only. No public response SHALL include a draft, an author email or another author's private data, and the public routes SHALL answer not found while the blog is off. The former public route that served uploaded post images SHALL answer not found.

#### Scenario: Anonymous reads a published post
- **WHEN** a request without a session asks for a published post's page
- **THEN** it is served

#### Scenario: Anonymous asks for a draft or an editor route
- **WHEN** a request without a session asks for a draft, `/blog`, or any other blog API (except the public headers feed)
- **THEN** a draft is answered not found, `/blog` is redirected to `/` and the API is answered 401

#### Scenario: Blog off
- **WHEN** the blog is switched off
- **THEN** the public post page is answered not found

#### Scenario: Former image route
- **WHEN** a request asks for an uploaded post image route that existed before this change
- **THEN** it is answered not found
