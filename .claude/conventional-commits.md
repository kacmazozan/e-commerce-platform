# Conventional Commits

Full spec: https://www.conventionalcommits.org/en/v1.0.0/

## Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- Subject line ≤ 72 chars, lowercase, no trailing period
- Body only when the _why_ isn't obvious from the subject
- No `Co-Authored-By: Claude` trailers

## Types

| Type       | When to use                                     |
| ---------- | ----------------------------------------------- |
| `feat`     | New feature or endpoint                         |
| `fix`      | Bug fix                                         |
| `refactor` | Code change that is neither a fix nor a feature |
| `test`     | Adding or updating tests                        |
| `docs`     | Documentation only                              |
| `style`    | Formatting, whitespace — no logic change        |
| `chore`    | Build scripts, deps, config                     |
| `perf`     | Performance improvement                         |

## Scope (optional)

Use the affected module or area in parentheses:

```
feat(notifications): add clear-all endpoint and UI button
fix(discount-management): preserve cross-page selection
chore(deps): upgrade react-router to v7
```

## Breaking changes

Add `!` after type/scope, and a `BREAKING CHANGE:` footer:

```
feat(auth)!: replace session tokens with JWT

BREAKING CHANGE: existing sessions are invalidated on deploy
```

## Examples

```
feat(sales-manager): add category filter and product search
fix(cart): prevent duplicate upsert on concurrent requests
test(notifications): add unit tests for clear-all handler
refactor(checkout): extract stock lock logic into helper
docs(api): document wishlist response shape
```
