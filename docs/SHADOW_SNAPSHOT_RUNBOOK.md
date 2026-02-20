# Shadow Snapshot Runbook

Purpose: run `/best` + `/compare` snapshot compilers in shadow mode before public cutover.

## 1) Compile Draft Snapshots

Dry compile top contexts + derived compare pairs:

```bash
npm run qa:compile-shadow-snapshots -- --contexts=20 --pairs=30
```

Targeted compile:

```bash
npm run qa:compile-shadow-snapshots -- --context-slugs=crm-for-startups,crm-for-small-business --compare-pairs=pipedrive-vs-copper,hubspot-vs-pipedrive
```

## 2) Measure Parity

Best parity against draft snapshots:

```bash
npm run qa:diff-runtime-snapshot -- --sample=50 --status=draft
```

Compare winner parity against draft snapshots:

```bash
npm run qa:diff-compare-snapshot -- --sample=50 --status=draft
```

## 3) Publish (Controlled)

Dry run publish candidates:

```bash
npm run qa:publish-shadow-snapshots
```

Apply bounded publish:

```bash
npm run qa:publish-shadow-snapshots -- --apply --best-limit=10 --compare-limit=10
```

Publish only promotes drafts where `snapshot_json.publish_gate.pass = true`.

## 4) Rollback

If a published snapshot is wrong:

1. Recompile a fresh draft for the affected context/pair.
2. Publish the corrected draft.
3. If immediate suppression is required, set the bad row back to `draft` in `best_snapshots`/`compare_snapshots` via admin SQL.

## 5) Operational Guards

- Keep apply batch sizes small (`<=10`) until parity is stable.
- Run parity reports after each publish batch.
- Keep public serving on runtime paths until readiness checklist is fully green.
