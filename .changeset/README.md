# Changesets

This project uses [changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

When making a change, add a changeset file describing the change:

```
pnpm changeset
```

Or create a file manually in `.changeset/` (any name ending in `.md`):

```md
---
"ai-sdk-elements": minor
---

Added support for custom error rendering in elements.
```

The version can be `patch`, `minor`, or `major`.
