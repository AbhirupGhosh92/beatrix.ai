## ADDED Requirements

### Requirement: Blog write permission
The policy SHALL define a permission `blog:write`. The roles that hold it SHALL come from the blog config and default to `admin` only. The `admin` role SHALL always hold it, whatever the config says, so a config mistake cannot lock the owner out. `/blog` and `/api/blog` SHALL require it, and the blog routes SHALL answer not found for every role while the blog is switched off in the config, after the permission check.

#### Scenario: Admin only by default
- **WHEN** a `user-advanced` user opens `/blog` with the default config
- **THEN** they are redirected (page) or refused (API) as for any route they lack the permission for

#### Scenario: Access widened by config
- **WHEN** the config adds `user-advanced` to the roles holding `blog:write`
- **THEN** a `user-advanced` user can open `/blog` and manage their own posts only

#### Scenario: Admin removed from the list
- **WHEN** the config's role list does not include `admin`
- **THEN** the admin still holds `blog:write`

#### Scenario: Unreadable config
- **WHEN** the blog config cannot be read
- **THEN** the blog stays closed and only the admin role's default permission applies
