-- Seed shared review helpfulness signal used by thumbs widgets and Community Signals.
-- This unifies "like/dislike" feedback into the structured user_signals pipeline.

INSERT INTO public.signal_definitions (key, label, category, description)
VALUES (
  'review_helpful',
  'Review Helpful',
  'experience',
  'Reader feedback on whether StackHunt analysis was helpful'
)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO public.signal_options (signal_id, key, label, display_order)
SELECT sd.id, 'yes', 'Yes', 1
FROM public.signal_definitions sd
WHERE sd.key = 'review_helpful'
ON CONFLICT (signal_id, key) DO UPDATE SET
  label = EXCLUDED.label,
  display_order = EXCLUDED.display_order;

INSERT INTO public.signal_options (signal_id, key, label, display_order)
SELECT sd.id, 'partially', 'Partially', 2
FROM public.signal_definitions sd
WHERE sd.key = 'review_helpful'
ON CONFLICT (signal_id, key) DO UPDATE SET
  label = EXCLUDED.label,
  display_order = EXCLUDED.display_order;

INSERT INTO public.signal_options (signal_id, key, label, display_order)
SELECT sd.id, 'no', 'No', 3
FROM public.signal_definitions sd
WHERE sd.key = 'review_helpful'
ON CONFLICT (signal_id, key) DO UPDATE SET
  label = EXCLUDED.label,
  display_order = EXCLUDED.display_order;
