-- Articles foundation + reusable insights

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  summary_markdown text,
  content_markdown text,
  outline jsonb,
  tags text[] not null default '{}',
  source_tool_ids uuid[] not null default '{}',
  source_context_ids uuid[] not null default '{}',
  source_data jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.article_insights (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete set null,
  context_id uuid references public.contexts(id) on delete set null,
  insight_type text not null,
  insight text not null,
  source_url text,
  source_type text check (source_type in ('official','editorial','community')),
  claim_type text check (claim_type in ('fact','opinion')),
  tags text[] not null default '{}',
  confidence numeric,
  created_at timestamptz not null default now()
);

create index if not exists article_insights_item_id_idx on public.article_insights(item_id);
create index if not exists article_insights_context_id_idx on public.article_insights(context_id);
create index if not exists article_insights_type_idx on public.article_insights(insight_type);

alter table public.articles enable row level security;
alter table public.article_insights enable row level security;

create policy "public_read_articles" on public.articles
  for select
  using (status = 'published');

create policy "public_read_article_insights" on public.article_insights
  for select
  using (true);
