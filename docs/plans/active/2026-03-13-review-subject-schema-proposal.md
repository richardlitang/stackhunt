# Review Subject Schema Proposal (Phase 1)

Last verified: 2026-03-13

## Goal

Define a canonical `review_subject` contract so each tool review is tied to one explicit subject scope, then use that contract to prevent ambiguous parent hunts from entering the pipeline without scope.

## Proposed Tables

### `review_subjects`

Canonical subject records linked to an `item`.

- `id uuid primary key`
- `item_id uuid not null references items(id) on delete cascade`
- `subject_type text not null check (subject_type in ('product','product_surface','plan_family','deployment_mode'))`
- `subject_key text not null`
- `display_name text not null`
- `entity_scope text check (entity_scope in ('core','copilot','actions','enterprise_cloud','enterprise_server'))`
- `is_primary boolean not null default false`
- `parent_subject_id uuid references review_subjects(id) on delete set null`
- `status text not null default 'active' check (status in ('active','deprecated'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints and indexes:

- unique `(item_id, subject_key)`
- partial unique `(item_id)` where `is_primary = true`
- index on `(item_id, status)`
- index on `entity_scope`

### `review_subject_aliases`

Maps ambiguous naming patterns to canonical subjects.

- `id uuid primary key`
- `review_subject_id uuid not null references review_subjects(id) on delete cascade`
- `alias text not null`
- `alias_type text not null check (alias_type in ('tool_name','slug','query_scope','legacy_scope'))`
- `created_at timestamptz not null default now()`

Constraints:

- unique `(review_subject_id, alias)`

### `review_subject_relationships`

Models relationship axes between subjects.

- `id uuid primary key`
- `from_subject_id uuid not null references review_subjects(id) on delete cascade`
- `to_subject_id uuid not null references review_subjects(id) on delete cascade`
- `relationship_type text not null check (relationship_type in ('product','product_surface','suite_member','compare_to','plan_family'))`
- `created_at timestamptz not null default now()`

Constraints:

- unique `(from_subject_id, to_subject_id, relationship_type)`
- check `from_subject_id <> to_subject_id`

## Migration Sketch (Not Applied Yet)

```sql
-- 1) Canonical subject records
create table if not exists review_subjects (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  subject_type text not null check (subject_type in ('product','product_surface','plan_family','deployment_mode')),
  subject_key text not null,
  display_name text not null,
  entity_scope text check (entity_scope in ('core','copilot','actions','enterprise_cloud','enterprise_server')),
  is_primary boolean not null default false,
  parent_subject_id uuid references review_subjects(id) on delete set null,
  status text not null default 'active' check (status in ('active','deprecated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, subject_key)
);

create unique index if not exists review_subjects_one_primary_per_item
  on review_subjects (item_id)
  where is_primary = true;

create index if not exists review_subjects_item_status_idx
  on review_subjects (item_id, status);

create index if not exists review_subjects_entity_scope_idx
  on review_subjects (entity_scope);

-- 2) Alias mapping for ambiguous naming
create table if not exists review_subject_aliases (
  id uuid primary key default gen_random_uuid(),
  review_subject_id uuid not null references review_subjects(id) on delete cascade,
  alias text not null,
  alias_type text not null check (alias_type in ('tool_name','slug','query_scope','legacy_scope')),
  created_at timestamptz not null default now(),
  unique (review_subject_id, alias)
);

create index if not exists review_subject_aliases_alias_idx
  on review_subject_aliases (alias);

-- 3) Subject relationships
create table if not exists review_subject_relationships (
  id uuid primary key default gen_random_uuid(),
  from_subject_id uuid not null references review_subjects(id) on delete cascade,
  to_subject_id uuid not null references review_subjects(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('product','product_surface','suite_member','compare_to','plan_family')),
  created_at timestamptz not null default now(),
  unique (from_subject_id, to_subject_id, relationship_type),
  check (from_subject_id <> to_subject_id)
);

create index if not exists review_subject_relationships_from_idx
  on review_subject_relationships (from_subject_id, relationship_type);
```

## Rollout Notes

1. Keep current lane outputs (`subject_profile`) as interim source of truth until `review_subjects` is backfilled.
2. Backfill primary rows from existing `items` + latest published review scope metadata.
3. Enforce preflight scope requirements in CLI and queue insertion before switching route/data reads to `review_subjects`.

## Verification

- `npm run test -- tests/lib/hunter-analysis-schema.test.ts`
- `npm run test -- tests/lib/hunter-subject-preflight.test.ts`
- `npm run typecheck`
