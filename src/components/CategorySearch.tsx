/**
 * Client-side category search component
 * Filters categories as user types
 */

import { useState, useMemo } from 'react';
import { Search, X, ChevronRight, Package } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Convert kebab-case icon name to PascalCase component name
function getIconComponent(iconName: string | undefined) {
  if (!iconName) return Package;

  // Convert "message-circle" to "MessageCircle"
  const pascalCase = iconName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  const IconComponent = (
    LucideIcons as Record<string, React.ComponentType<{ className?: string }>>
  )[pascalCase];
  return IconComponent || Package;
}

interface Category {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  is_featured?: boolean;
}

interface Props {
  categories: Category[];
}

export default function CategorySearch({ categories }: Props) {
  const [query, setQuery] = useState('');

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!query.trim()) return categories;

    const searchTerm = query.toLowerCase();
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(searchTerm) ||
        cat.description?.toLowerCase().includes(searchTerm)
    );
  }, [categories, query]);

  const featuredCategories = filteredCategories.filter((c) => c.is_featured);
  const otherCategories = filteredCategories.filter((c) => !c.is_featured);

  return (
    <div>
      {/* Search Input */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-zinc-500 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10 bg-zinc-900 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:ring-indigo-500/20"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQuery('')}
              className="absolute right-1 top-1.5 h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        {query && (
          <p className="mt-2 text-sm text-zinc-400">
            {filteredCategories.length}{' '}
            {filteredCategories.length === 1 ? 'category' : 'categories'} found
          </p>
        )}
      </div>

      {/* Featured Categories */}
      {featuredCategories.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-6 text-xl font-semibold text-zinc-100">
            {query ? 'Featured Matches' : 'Popular Categories'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCategories.map((category) => (
              <a
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 transition-all duration-200 hover:border-zinc-700 hover:bg-gradient-to-b hover:from-zinc-800/50 hover:to-zinc-900/50"
              >
                <div className="flex items-start gap-4">
                  {(() => {
                    const IconComponent = getIconComponent(category.icon);
                    return (
                      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800/50 transition group-hover:bg-zinc-800">
                        <IconComponent className="h-6 w-6 text-zinc-400 group-hover:text-zinc-300" />
                      </span>
                    );
                  })()}
                  <div className="flex-1">
                    <h3 className="font-medium text-zinc-100 group-hover:text-white">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end text-sm text-zinc-400 opacity-0 transition group-hover:opacity-100">
                  Explore tools →
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* All Categories */}
      {otherCategories.length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-semibold text-zinc-100">
            {query ? 'Other Matches' : 'All Categories'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {otherCategories.map((category) => (
              <a
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="group flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-800/50"
              >
                {(() => {
                  const IconComponent = getIconComponent(category.icon);
                  return (
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800/50 transition group-hover:bg-zinc-800">
                      <IconComponent className="h-5 w-5 text-zinc-400 group-hover:text-zinc-300" />
                    </span>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-zinc-100 group-hover:text-white">
                    {category.name}
                  </h3>
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-600 transition group-hover:text-zinc-400" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {filteredCategories.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-zinc-600" />
          <h3 className="mt-4 text-lg font-medium text-zinc-100">No categories found</h3>
          <p className="mt-2 text-sm text-zinc-500">Try a different search term</p>
          <Button
            variant="link"
            onClick={() => setQuery('')}
            className="mt-4 text-sm text-hunt-500 hover:text-hunt-600"
          >
            Clear search
          </Button>
        </div>
      )}
    </div>
  );
}
