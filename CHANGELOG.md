# ai-sdk-elements

## 0.1.0

### Minor Changes

- [#1](https://github.com/jacobwisniewski/ai-sdk-elements/pull/1) [`4b8a2dd`](https://github.com/jacobwisniewski/ai-sdk-elements/commit/4b8a2dd61e31c7c0ce5548aa0c3ee1919acc5b38) Thanks [@jacobwisniewski](https://github.com/jacobwisniewski)! - Upgrade to Zod 4. Replaces internal Zod schema walker (`_def`, `typeName`, `shape`) with Zod 4's built-in `z.toJSONSchema()` for prompt generation. Prompt now embeds raw JSON Schema per element instead of human-readable field bullets — LLMs understand JSON Schema natively. Removes the `example` field from `ElementDefinition` (breaking). Drops Zod 3 support — peer dependency is now `zod ^4.0`.
