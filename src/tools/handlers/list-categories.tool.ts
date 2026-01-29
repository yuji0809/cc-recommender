/**
 * List Categories Tool
 *
 * Lists all available categories with counts
 */

import type { RecommendationDatabase } from "../../types/domain-types.js";

export type ListCategoriesResult = {
  categories: Array<{
    name: string;
    count: number;
    types: string[];
  }>;
  totalItems: number;
};

/**
 * List all categories
 */
export async function listCategories(
  database: RecommendationDatabase,
): Promise<ListCategoriesResult> {
  const categoryMap = new Map<string, { count: number; types: Set<string> }>();

  for (const item of database.items) {
    const cat = item.category;
    let entry = categoryMap.get(cat);
    if (entry === undefined) {
      entry = { count: 0, types: new Set<string>() };
      categoryMap.set(cat, entry);
    }
    entry.count++;
    entry.types.add(item.type);
  }

  const categories = Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      types: Array.from(data.types),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    categories,
    totalItems: database.items.length,
  };
}
