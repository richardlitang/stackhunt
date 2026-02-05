# Testing Quickstart

Default sequence for most changes:

```bash
npm run typecheck
npm run build
npm run test
```

When to run only a subset:
- Docs or copy-only changes: skip tests, call it out.
- UI-only changes: `npm run build` is the minimum.
- Script-only changes: `npm run typecheck` + targeted script run if applicable.
