## ADDED Requirements

### Requirement: Blog editor for authors
A user holding `blog:write` SHALL be able to list, create, edit, publish, unpublish and delete their own posts at `/blog`. A post SHALL have a title, a Markdown body, images, tags and a draft or published state.

#### Scenario: Create and publish
- **WHEN** an author creates a post with a title and body and publishes it
- **THEN** the post appears in their list as published

#### Scenario: Draft stays private
- **WHEN** an author saves a post as a draft
- **THEN** it appears only in their list (and to the admin) and not on the home page

#### Scenario: Delete
- **WHEN** an author deletes their post
- **THEN** it and its images no longer appear anywhere

#### Scenario: Images and tags
- **WHEN** an author adds an image and tags to a post
- **THEN** the post stores them and the editor shows them again on reopening

### Requirement: Per-author ownership
Every post SHALL belong to the verified account that created it. An author SHALL read, edit and delete only their own posts; a request for another author's post SHALL be answered as not found. The admin SHALL be able to view, edit and delete any author's posts. No other role SHALL. This SHALL be enforced on the server, not only in the UI.

#### Scenario: Author opens another author's post
- **WHEN** an author with `blog:write` who is not admin requests another author's post
- **THEN** the response is not found and no content is returned

#### Scenario: Admin edits another author's post
- **WHEN** the admin opens and saves another author's post
- **THEN** the change is stored and the post keeps its original author

#### Scenario: Listing
- **WHEN** a non-admin author lists posts
- **THEN** only their own posts are returned

### Requirement: Private storage
Posts and images SHALL be stored where browsers have no direct access. Every read and write SHALL pass through the site's server and the private functions, which verify the session.

#### Scenario: Direct access
- **WHEN** a browser requests a stored post or image directly from storage
- **THEN** access is denied

### Requirement: Public home sample
The home page SHALL show a random sample of published posts from all authors as headers (title, date, excerpt, tags). Drafts SHALL never be included. The sample size SHALL come from the blog config. With no published posts, or with the section off, the block SHALL NOT render.

#### Scenario: Random sample
- **WHEN** an anonymous visitor opens `/` and more published posts exist than the sample size
- **THEN** they see that many headers chosen at random, all published

#### Scenario: Nothing to show
- **WHEN** there are no published posts
- **THEN** the home page shows no blog block and no empty frame

### Requirement: Section controlled by config
A config file `blog-config.json`, edited in the admin CMS with the example as per-key fallback, SHALL switch the blog on or off and hold its limits and the roles that hold `blog:write`. An invalid value SHALL be replaced by the example's so the site always works.

#### Scenario: Section off
- **WHEN** the config turns the blog off
- **THEN** `/blog` and its API answer not found for every role and the home block is hidden

#### Scenario: Invalid config
- **WHEN** the stored config has an invalid limit or role list
- **THEN** the example's values are used and the site renders

### Requirement: Limits
Post size, image size, image count per post and tags per post SHALL be bounded by values in the blog config; a request over a limit SHALL be refused with a clear message and store nothing.

#### Scenario: Oversized image
- **WHEN** an author uploads an image over the limit
- **THEN** it is refused and the post is unchanged
