-- Remove malformed/truncated claim entries that slipped through earlier ETL runs.
-- Targets:
-- 1) claims.value_json.text
-- 2) reviews.pros / reviews.cons arrays
-- 3) items.specs.pros / items.specs.cons arrays

begin;

create or replace function public._claim_text_is_bad(
  p_text text,
  p_source_type text default null
)
returns boolean
language sql
immutable
as $$
  with normalized as (
    select lower(
      regexp_replace(
        trim(regexp_replace(coalesce(p_text, ''), '\\s+', ' ', 'g')),
        '[\\.\\:\\;\\!\\?…"''`”’\\)\\]]+$',
        '',
        'g'
      )
    ) as t
  )
  select
    t = ''
    or (
      char_length(t) >= 12
      and t ~ '\\m(to|for|with|from|into|onto|on|at|by|of|in|as|than|that|which|who|when|where|if|because|while|and|or|but|via|per)\\M$'
    )
    or (
      coalesce(lower(p_source_type), '') = 'official'
      and t ~ '^(users report( that)?|community (reports|mentions|consensus (is|suggests)|feedback)|according to (reddit|hn|community)|based on user discussions)'
    )
  from normalized;
$$;

-- 1) Remove malformed claim-ledger rows.
delete from public.claims c
where public._claim_text_is_bad(c.value_json->>'text', c.value_json->>'source_type');

-- 2) Clean malformed pros/cons from contextual reviews.
update public.reviews r
set
  pros = coalesce(
    (
      select jsonb_agg(elem)
      from jsonb_array_elements(coalesce(r.pros, '[]'::jsonb)) as elem
      where not public._claim_text_is_bad(
        case
          when jsonb_typeof(elem) = 'object' then elem->>'text'
          when jsonb_typeof(elem) = 'string' then trim(both '"' from elem::text)
          else null
        end,
        case
          when jsonb_typeof(elem) = 'object' then elem->>'source_type'
          else null
        end
      )
    ),
    '[]'::jsonb
  ),
  cons = coalesce(
    (
      select jsonb_agg(elem)
      from jsonb_array_elements(coalesce(r.cons, '[]'::jsonb)) as elem
      where not public._claim_text_is_bad(
        case
          when jsonb_typeof(elem) = 'object' then elem->>'text'
          when jsonb_typeof(elem) = 'string' then trim(both '"' from elem::text)
          else null
        end,
        case
          when jsonb_typeof(elem) = 'object' then elem->>'source_type'
          else null
        end
      )
    ),
    '[]'::jsonb
  ),
  updated_at = now()
where
  exists (
    select 1
    from jsonb_array_elements(coalesce(r.pros, '[]'::jsonb)) as elem
    where public._claim_text_is_bad(
      case
        when jsonb_typeof(elem) = 'object' then elem->>'text'
        when jsonb_typeof(elem) = 'string' then trim(both '"' from elem::text)
        else null
      end,
      case
        when jsonb_typeof(elem) = 'object' then elem->>'source_type'
        else null
      end
    )
  )
  or exists (
    select 1
    from jsonb_array_elements(coalesce(r.cons, '[]'::jsonb)) as elem
    where public._claim_text_is_bad(
      case
        when jsonb_typeof(elem) = 'object' then elem->>'text'
        when jsonb_typeof(elem) = 'string' then trim(both '"' from elem::text)
        else null
      end,
      case
        when jsonb_typeof(elem) = 'object' then elem->>'source_type'
        else null
      end
    )
  );

-- 3) Clean malformed item-level specs pros/cons.
update public.items i
set
  specs = jsonb_set(
    jsonb_set(
      coalesce(i.specs, '{}'::jsonb),
      '{pros}',
      coalesce(
        (
          select jsonb_agg(elem)
          from jsonb_array_elements(coalesce(i.specs->'pros', '[]'::jsonb)) as elem
          where not public._claim_text_is_bad(
            case
              when jsonb_typeof(elem) = 'object' then elem->>'text'
              when jsonb_typeof(elem) = 'string' then trim(both '"' from elem::text)
              else null
            end,
            case
              when jsonb_typeof(elem) = 'object' then elem->>'source_type'
              else null
            end
          )
        ),
        '[]'::jsonb
      ),
      true
    ),
    '{cons}',
    coalesce(
      (
        select jsonb_agg(elem)
        from jsonb_array_elements(coalesce(i.specs->'cons', '[]'::jsonb)) as elem
        where not public._claim_text_is_bad(
          case
            when jsonb_typeof(elem) = 'object' then elem->>'text'
            when jsonb_typeof(elem) = 'string' then trim(both '"' from elem::text)
            else null
          end,
          case
            when jsonb_typeof(elem) = 'object' then elem->>'source_type'
            else null
          end
        )
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
    where public._claim_text_is_bad(
      case
        when jsonb_typeof(elem) = 'object' then elem->>'text'
        when jsonb_typeof(elem) = 'string' then trim(both '"' from elem::text)
        else null
      end,
      case
        when jsonb_typeof(elem) = 'object' then elem->>'source_type'
        else null
      end
    )
  )
  or exists (
    select 1
    from jsonb_array_elements(coalesce(i.specs->'cons', '[]'::jsonb)) as elem
    where public._claim_text_is_bad(
      case
        when jsonb_typeof(elem) = 'object' then elem->>'text'
        when jsonb_typeof(elem) = 'string' then trim(both '"' from elem::text)
        else null
      end,
      case
        when jsonb_typeof(elem) = 'object' then elem->>'source_type'
        else null
      end
    )
  );

drop function public._claim_text_is_bad(text, text);

commit;
