-- Remove claim-ledger rows that use community-hedging language
-- while citing first-party official domains for the same item.

begin;

with flagged as (
  select c.id
  from public.claims c
  join public.items i on i.id = c.item_id
  where lower(
    regexp_replace(
      trim(regexp_replace(coalesce(c.value_json->>'text', ''), '\\s+', ' ', 'g')),
      '[\\.\\:\\;\\!\\?…"''`”’\\)\\]]+$',
      '',
      'g'
    )
  ) ~ '^(users report( that)?|community (reports|mentions|consensus (is|suggests)|feedback)|according to (reddit|hn|community)|based on user discussions)'
  and c.source_url is not null
  and regexp_replace(
    split_part(replace(replace(lower(c.source_url), 'https://', ''), 'http://', ''), '/', 1),
    '^www\\.',
    ''
  ) = regexp_replace(
    split_part(replace(replace(lower(coalesce(i.website, '')), 'https://', ''), 'http://', ''), '/', 1),
    '^www\\.',
    ''
  )
)
delete from public.claims c
using flagged
where c.id = flagged.id;

commit;
