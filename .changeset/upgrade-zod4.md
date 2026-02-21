---
"ai-sdk-elements": minor
---

Upgrade to Zod 4. Replaces internal Zod schema walker (`_def`, `typeName`, `shape`) with Zod 4's built-in `z.toJSONSchema()` for prompt generation. Field descriptions now include type annotations, enum values, and constraints (min/max/minLength/maxLength). Drops Zod 3 support — peer dependency is now `zod ^4.0`.
