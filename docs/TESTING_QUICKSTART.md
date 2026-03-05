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

Hook setup for autonomous agent push batches:

```bash
npm run hooks:install
```

Note: `npm install` also runs `prepare`, which installs the managed pre-push hook automatically in git clones.

`qa:prepush` includes lint/format and tool-page helper import checks for changed files in the branch:

- `npm run qa:tool-page-imports`
  - verifies `build/derive/apply/get/is/has ToolPage*` helpers used in `src/pages/tool/[slug].astro` are imported or locally declared before call sites
- `npm run qa:tool-page-call-shapes`
  - rejects malformed wrapper calls like `buildToolPage*FromRoute({ buildToolPage*... })`
- `npm run qa:tool-page-tdz`
  - blocks known tool-page temporal dead zone regressions in prep/review evidence wiring
- `npm run qa:tool-page-map`
  - fails when `docs/TOOL_PAGE_ORCHESTRATION_MAP.md` no longer matches current route composition
- `npm run format:check:changed`
- `npm run lint:strict`

When to run only a subset:

- Docs or copy-only changes: skip tests, call it out.
- UI-only changes: `npm run build` is the minimum.
- Script-only changes: `npm run typecheck` + targeted script run if applicable.
