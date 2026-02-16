-- Normalize source_type to 'community' for forum/community hostnames.
-- Applies to claim ledger JSON, reviews pros/cons claim arrays, and item specs pros/cons arrays.

begin;

create or replace function public._is_community_source_url(p_url text)
returns boolean
language sql
immutable
as $$
  with host as (
    select lower(regexp_replace(split_part(split_part(coalesce(p_url, ''), '://', 2), '/', 1), '^www\.', '')) as h
  )
  select
    h <> '' and (
      h like 'community.%'
      or h like 'forum.%'
      or h like 'forums.%'
      or h like 'discuss.%'
      or h like 'discourse.%'
      or h like 'talk.%'
      or h in ('reddit.com', 'news.ycombinator.com', 'x.com', 'twitter.com', 'quora.com', 'dev.to', 'indiehackers.com', 'producthunt.com', 'lobste.rs', 'slashdot.org')
      or h like '%.reddit.com'
      or h like '%.news.ycombinator.com'
    )
  from host;
$$;

-- 1) Claim ledger
update public.claims c
set
  value_json = jsonb_set(coalesce(c.value_json, '{}'::jsonb), '{source_type}', to_jsonb('community'::text), true)
where coalesce(c.value_json->>'source_type', '') = 'official'
  and public._is_community_source_url(c.source_url);

-- 2) Reviews pros/cons
update public.reviews r
set
  pros = coalesce(
    (
      select jsonb_agg(
        case
          when jsonb_typeof(elem) = 'object'
            and coalesce(elem->>'source_type', '') = 'official'
            and public._is_community_source_url(elem->>'source_url')
          then jsonb_set(elem, '{source_type}', to_jsonb('community'::text), true)
          else elem
        end
      )
      from jsonb_array_elements(coalesce(r.pros, '[]'::jsonb)) as elem
    ),
    '[]'::jsonb
  ),
  cons = coalesce(
    (
      select jsonb_agg(
        case
          when jsonb_typeof(elem) = 'object'
            and coalesce(elem->>'source_type', '') = 'official'
            and public._is_community_source_url(elem->>'source_url')
          then jsonb_set(elem, '{source_type}', to_jsonb('community'::text), true)
          else elem
        end
      )
      from jsonb_array_elements(coalesce(r.cons, '[]'::jsonb)) as elem
    ),
    '[]'::jsonb
  ),
  updated_at = now()
where
  exists (
    select 1
    from jsonb_array_elements(coalesce(r.pros, '[]'::jsonb)) as elem
    where jsonb_typeof(elem) = 'object'
      and coalesce(elem->>'source_type', '') = 'official'
      and public._is_community_source_url(elem->>'source_url')
  )
  or exists (
    select 1
    from jsonb_array_elements(coalesce(r.cons, '[]'::jsonb)) as elem
    where jsonb_typeof(elem) = 'object'
      and coalesce(elem->>'source_type', '') = 'official'
      and public._is_community_source_url(elem->>'source_url')
  );

-- 3) Item specs pros/cons
update public.items i
set
  specs = jsonb_set(
    jsonb_set(
      coalesce(i.specs, '{}'::jsonb),
      '{pros}',
      coalesce(
        (
          select jsonb_agg(
            case
              when jsonb_typeof(elem) = 'object'
                and coalesce(elem->>'source_type', '') = 'official'
                and public._is_community_source_url(elem->>'source_url')
              then jsonb_set(elem, '{source_type}', to_jsonb('community'::text), true)
              else elem
            end
          )
          from jsonb_array_elements(coalesce(i.specs->'pros', '[]'::jsonb)) as elem
        ),
        '[]'::jsonb
      ),
      true
    ),
    '{cons}',
    coalesce(
      (
        select jsonb_agg(
          case
            when jsonb_typeof(elem) = 'object'
              and coalesce(elem->>'source_type', '') = 'official'
              and public._is_community_source_url(elem->>'source_url')
            then jsonb_set(elem, '{source_type}', to_jsonb('community'::text), true)
            else elem
          end
        )
        from jsonb_array_elements(coalesce(i.specs->'cons', '[]'::jsonb)) as elem
      ),
      '[]'::jsonb
    ),
    true
  ),
  updated_at = now()
where
  exists (
    select 1
    from jsonb_array_elements(coalesce(i.specs->'pros', '[]'::jsonb)) as elem
    where jsonb_typeof(elem) = 'object'
      and coalesce(elem->>'source_type', '') = 'official'
      and public._is_community_source_url(elem->>'source_url')
  )
  or exists (
    select 1
    from jsonb_array_elements(coalesce(i.specs->'cons', '[]'::jsonb)) as elem
    where jsonb_typeof(elem) = 'object'
      and coalesce(elem->>'source_type', '') = 'official'
      and public._is_community_source_url(elem->>'source_url')
  );

drop function public._is_community_source_url(text);

commit;
