# ai-sdk-elements

Reusable "render tools" pattern for Vercel AI SDK v5. LLMs emit `@name{...json...}` markers in text, server enriches them, client renders as React components.

## Structure

Four subpath exports: `.` (core), `./server`, `./react`, `./react/streamdown`. Source in `src/` mirrors this with `core/`, `server/`, `react/`, `react-markdown/` directories. Tests are co-located in `__tests__/`.

## Code Style

- TypeScript strict mode, functional style: `const` only, no `let`, arrow functions, immutability
- No comments unless asked — types are documentation
- React must NOT be imported in `core/` or `server/`

## Commands

- `pnpm build` — tsup (CJS + ESM + DTS)
- `pnpm test` — vitest
- `pnpm type-check` — tsc --noEmit
- `pnpm lint` — oxlint
- `pnpm fmt` / `pnpm fmt:check` — oxfmt
- `pnpm changeset` — add a changeset for version bumps

All must pass before committing. Add a changeset for any public API change or bug fix.

Do NOT run `pnpm build` inside `examples/nextjs/` — Next.js build outputs break `pnpm dev` afterward. Verify example changes with type-check only.

## Environment

- Node 22 via nvm (`source ~/.nvm/nvm.sh && nvm use 22`)
- pnpm 9.x (pnpm 10 has bugs with Node 22/23)
