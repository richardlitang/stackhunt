-- Replace SECURITY DEFINER views with SECURITY INVOKER views

create or replace view public.batch_synthesis_status
with (security_invoker=true) as
  select detected_category as category,
    count(*) filter (where (status = 'research_complete'::hunt_queue_status)) as pending_synthesis,
    count(*) filter (where ((status = 'completed'::hunt_queue_status) and (batch_id is not null))) as batch_completed,
    count(*) filter (where ((status = 'completed'::hunt_queue_status) and (batch_id is null))) as individual_completed,
    min(research_completed_at) filter (where (status = 'research_complete'::hunt_queue_status)) as oldest_pending,
    count(*) filter (where ((status = 'research_complete'::hunt_queue_status) and (research_completed_at < (now() - '7 days'::interval)))) as stale_count
   from hunt_queue
  where (detected_category is not null)
  group by detected_category
  order by (count(*) filter (where (status = 'research_complete'::hunt_queue_status))) desc;

create or replace view public.hunt_queue_metrics
with (security_invoker=true) as
  select count(*) filter (where (status = 'pending'::hunt_queue_status)) as pending_count,
    count(*) filter (where (status = 'processing'::hunt_queue_status)) as processing_count,
    count(*) filter (where (status = 'completed'::hunt_queue_status)) as completed_count,
    count(*) filter (where (status = 'failed'::hunt_queue_status)) as failed_count,
    round((((count(*) filter (where (status = 'pending'::hunt_queue_status)))::numeric / (10000)::numeric) * (100)::numeric), 2) as queue_utilization_pct,
        case
            when (count(*) filter (where (status = 'pending'::hunt_queue_status)) >= 9000) then 'CRITICAL'::text
            when (count(*) filter (where (status = 'pending'::hunt_queue_status)) >= 7000) then 'WARNING'::text
            else 'HEALTHY'::text
        end as queue_health
   from hunt_queue;

create or replace view public.tool_category_links
with (security_invoker=true) as
  select id,
    item_id,
    category_id,
    relevance_score,
    created_at
   from item_category_links;

create or replace view public.tools
with (security_invoker=true) as
  select id,
    name,
    slug,
    website,
    logo_path,
    logo_url,
    short_description,
    long_description,
    category_id,
    pricing_type,
    avg_score,
    review_count,
    embedding,
    is_featured,
    is_verified,
    created_at,
    updated_at,
    metadata,
    type,
    video_id,
    video_title,
    data_confidence,
    learning_curve,
    quality_review_needed,
    quality_review_reason,
    quality_review_flagged_at,
    quality_review_completed_at,
    quality_review_result,
    correction_count,
    confirmed_correction_count,
    verdict,
    base_score,
    last_major_update,
    specs,
    base_score_breakdown
   from items;
