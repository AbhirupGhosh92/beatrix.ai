## ADDED Requirements

### Requirement: Home shows random published blog headers
The public home page SHALL include a block of randomly chosen published blog headers when the blog is on and at least one published post exists; see the `blog` capability. It SHALL NOT change the product page content for anonymous visitors otherwise.

#### Scenario: Blog on with posts
- **WHEN** an anonymous visitor opens `/` and published posts exist
- **THEN** the block shows the configured number of random headers

#### Scenario: Blog off
- **WHEN** the blog is switched off in the config
- **THEN** `/` renders exactly as before, without the block
