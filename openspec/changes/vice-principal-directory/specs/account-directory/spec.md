## ADDED Requirements

### Requirement: Filter the existing institutional account directory

The existing account directory SHALL support a trimmed, case-insensitive partial search over display name or username, an optional student/teacher role, and an optional active/inactive account status. Search SHALL be limited to 100 characters. Invalid filters SHALL be rejected by the server. Search wildcard characters SHALL be treated literally and parameters SHALL be bound.

#### Scenario: Combined filtering precedes pagination
- **WHEN** an authorized user supplies search, role and status filters
- **THEN** the server applies every filter before producing a page of at most 50 records
- **AND** the next cursor continues that same filtered result without repeating previous records.

#### Scenario: Preserve existing exact searches
- **WHEN** an existing caller supplies the username parameter
- **THEN** the server retains exact normalized username matching and the existing response shape.

#### Scenario: Reject unauthorized access
- **WHEN** a teacher or student requests the institutional account directory
- **THEN** the server denies access regardless of supplied filters.

### Requirement: Provide clear directory interaction feedback

The Users workspace SHALL provide explicit Search and Clear actions, loading and empty states, and an error state with an explicit retry. Applied filters SHALL remain consistent with pagination. Replaced or unmounted requests SHALL not overwrite the current directory. A successful retry SHALL dismiss the directory error state.

#### Scenario: Clear a filtered result
- **WHEN** the user clears the filters
- **THEN** the search, role and status reset and the first unfiltered page is requested.

### Requirement: Scope accessible button and status feedback

Within the Users workspace, enabled buttons SHALL have distinguishable hover and transient pressed states, selected tabs SHALL retain a persistent selected appearance, and keyboard focus SHALL be blue. Loading controls SHALL be disabled. Active statuses SHALL appear green and inactive statuses red, with textual labels. Reduced-motion settings and light/dark themes SHALL remain supported. These changes SHALL NOT alter global role permissions or unrelated shared workspaces.

#### Scenario: Distinguish focus and account state
- **WHEN** the user focuses the name search or selects an account status
- **THEN** focus is visibly blue, active is green, and inactive is red without relying exclusively on color.
