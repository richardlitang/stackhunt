interface ToolPageFaqItemLike {
  question: string;
  answer: string;
  answer_source_url?: string | null;
}

export function buildToolPageFaqItemsView<TItem extends ToolPageFaqItemLike>(
  items: TItem[]
): Array<TItem & { hasSourceLink: boolean }> {
  return items.map((item) => ({
    ...item,
    hasSourceLink: Boolean(item.answer_source_url),
  }));
}
