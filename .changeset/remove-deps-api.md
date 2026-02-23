---
"ai-sdk-elements": major
---

Remove `deps` (dependency injection) from public API. The `TDeps` generic and `deps` parameter have been removed from `ElementDefinition`, `createElementStream`, and all related types. Users should manage dependencies via closures when defining elements instead. This simplifies the API and eliminates generic propagation complexity.

**Breaking changes:**

- `ElementDefinition` now has 3 generics instead of 4: `<TName, TInput, TOutput>`
- `enrich` signature changed from `(input, deps, options)` to `(input, options)`
- `createElementStream` no longer accepts a `deps` parameter
- `ElementStreamOptions` no longer has a `deps` property

**Migration:** Instead of passing deps to `createElementStream`, create element factories that close over their dependencies:

```typescript
// Before
const myElement = defineElement({
  name: "my-element",
  schema: z.object({ id: z.string() }),
  enrich: async (input, deps: MyDeps) => deps.api.fetch(input.id),
});
createElementStream({ source, elements: [myElement], deps: { api } });

// After
const createMyElement = (deps: MyDeps) =>
  defineElement({
    name: "my-element",
    schema: z.object({ id: z.string() }),
    enrich: async (input) => deps.api.fetch(input.id),
  });
createElementStream({ source, elements: [createMyElement({ api })] });
```
