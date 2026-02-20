import { supabase } from '@/lib/supabase';

function normalizeAlias(input: string): string {
  return input.trim().toLowerCase();
}

export async function resolveCanonicalItemSlugByAlias(alias: string): Promise<string | null> {
  const normalized = normalizeAlias(alias);
  if (!normalized) return null;

  const { data: itemDirect } = await supabase
    .from('items')
    .select('slug')
    .eq('slug', normalized)
    .maybeSingle();

  if (itemDirect?.slug) return itemDirect.slug;

  const { data: aliasRow } = await supabase
    .from('item_aliases')
    .select('item:items(slug)')
    .eq('alias_normalized', normalized)
    .maybeSingle();

  const item = aliasRow?.item as { slug?: string } | null | undefined;
  return item?.slug || null;
}

