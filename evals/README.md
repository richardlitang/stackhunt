# Hunter Eval Harness

Measures analysis-phase output quality against frozen research fixtures.
Run before merging any change to prompts (`src/lib/hunter/services/prompts.ts`,
`src/lib/hunter/prompts/`), the Gemini service, or the analysis phase.

- `npm run eval:capture -- --limit 8` — snapshot `hunt_queue` research checkpoints into `fixtures/`
- `npm run eval:hunter` — replay analysis on every fixture (real Gemini calls, about 1 synthesis call per fixture) and score against `golden/`
- Reports land in `reports/` (gitignored)

A fixture/golden pair is the contract: same research in, output must stay above
the thresholds in `golden/<slug>.json`. Bump prompt versions
(`src/lib/hunter/prompts/registry.ts`) in the same PR as any intentional quality shift,
and update goldens with justification.
