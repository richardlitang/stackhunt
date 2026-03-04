interface Identifiable {
  id: string;
}

export function orderToolPageAlternativesByIds<T extends Identifiable>(
  alternatives: T[] | null | undefined,
  orderedIds: string[]
): T[] {
  if (!alternatives || alternatives.length === 0 || orderedIds.length === 0) {
    return [];
  }

  const alternativeById = new Map(alternatives.map((item) => [item.id, item]));
  return orderedIds
    .map((id) => alternativeById.get(id))
    .filter((item): item is T => Boolean(item));
}
