# Testing Quickstart

Last verified: 2026-03-05

Default sequence for most changes:

```bash
npm run typecheck
npm run build
npm run test
```

Before push:

```bash
npm run qa:prepush
```

Optional one-time setup to enforce this automatically on each `git push`:

```bash
npm run hooks:install
```

`qa:prepush` includes lint/format and tool-page helper import checks for changed files in the branch:

- `npm run qa:tool-page-imports`
- `npm run format:check:changed`
- `npm run lint:changed`

When to run only a subset:

- Docs or copy-only changes: skip tests, call it out.
- UI-only changes: `npm run build` is the minimum.
- Script-only changes: `npm run typecheck` + targeted script run if applicable.
