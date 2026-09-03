import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import {
  defaultShouldDehydrateQuery,
  QueryClient,
  type DehydratedState,
  type QueryKey,
} from "@tanstack/react-query";

type HydratedQuery = {
  queryKey: QueryKey;
  data: unknown;
};

type HydrationOptions = {
  tags: string[];
};

/**
 * Prerenderable replacement for TanStack Query's `dehydrate()`. The stock
 * `dehydrate()` reads `Date.now()` and breaks Cache Components prerendering,
 * so the timestamp is cached under the same tags as the data reads: when a
 * mutation invalidates those tags, data and timestamp advance together.
 * (Pattern from `next/dist/docs` — client-side-data-fetching/tanstack-query.)
 */
async function getHydrationUpdatedAt(tags: string[]) {
  "use cache";
  cacheTag(...tags);
  cacheLife("work");
  return Date.now();
}

export async function dehydrateWorks(
  queries: HydratedQuery[],
  options: HydrationOptions,
): Promise<DehydratedState> {
  const updatedAt = await getHydrationUpdatedAt(options.tags);

  const queryClient = new QueryClient();

  for (const query of queries) {
    queryClient.setQueryData(query.queryKey, query.data, { updatedAt });
  }

  return {
    mutations: [],
    queries: queryClient
      .getQueryCache()
      .getAll()
      .filter((query) => defaultShouldDehydrateQuery(query))
      .map((query) => ({
        dehydratedAt: updatedAt,
        queryHash: query.queryHash,
        queryKey: query.queryKey,
        state: query.state,
        ...(query.meta ? { meta: query.meta } : {}),
      })),
  };
}
