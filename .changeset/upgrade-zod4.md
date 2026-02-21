---
"ai-sdk-elements": minor
---

Upgrade to Zod 4. Replaces internal Zod schema walker (`_def`, `typeName`, `shape`) with Zod 4's built-in `z.toJSONSchema()` for prompt generation. Prompt now embeds raw JSON Schema per element instead of human-readable field bullets — LLMs understand JSON Schema natively. Removes the `example` field from `ElementDefinition` (breaking). Drops Zod 3 support — peer dependency is now `zod ^4.0`.
