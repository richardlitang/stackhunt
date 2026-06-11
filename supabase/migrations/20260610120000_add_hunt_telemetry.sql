create table if not exists hunt_telemetry (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tool_name text not null,
  context_title text,
  queue_item_id uuid references hunt_queue(id) on delete set null,
  success boolean not null,
  duration_ms integer,
  tokens_total integer,
  tokens_research integer,
  tokens_analysis integer,
  retries integer,
  timeout_failures integer,
  estimated_cost_usd numeric(10, 5),
  error_class text
);

create index if not exists hunt_telemetry_created_at_idx on hunt_telemetry (created_at desc);
create index if not exists hunt_telemetry_tool_name_idx on hunt_telemetry (tool_name);

alter table hunt_telemetry enable row level security;
