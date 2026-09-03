import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { WorkItem } from "./content";

export const WORK_PAGE_SIZE = 3;

export interface WorkPage {
  items: WorkItem[];
  nextPage: number | null;
}

/**
 * Shared cache contract: TanStack Query keys/options for the browser cache and
 * `cacheTag` tags for the Next.js server cache. Keep this module free of
 * server-only and client-only imports so both layers can reuse it.
 */
async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
  return res.json();
}

export const workCache = {
  projectsKey: ["works", "projects"] as const,
  archivesKey: ["works", "archives"] as const,
  infiniteListKey: (variant: "projects" | "archives") =>
    ["works", variant, "infinite"] as const,
  itemKey: (id: string) => ["works", "item", id] as const,

  projectsTag: "works:projects",
  archivesTag: "works:archives",
  itemTag: (id: string) => `works:item:${id}`,

  listOptions: (variant: "projects" | "archives") =>
    queryOptions({
      queryKey: ["works", variant] as const,
      queryFn: () => getJson<WorkItem[]>(`/api/${variant}`),
      staleTime: Infinity,
    }),
  infiniteListOptions: (variant: "projects" | "archives") =>
    infiniteQueryOptions({
      queryKey: workCache.infiniteListKey(variant),
      queryFn: ({ pageParam }) =>
        getJson<WorkPage>(
          `/api/${variant}?page=${pageParam}&limit=${WORK_PAGE_SIZE}`,
        ),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
      staleTime: Infinity,
    }),
  itemOptions: (id: string) =>
    queryOptions({
      queryKey: workCache.itemKey(id),
      queryFn: () => getJson<WorkItem>(`/api/works/${id}`),
      staleTime: Infinity,
    }),
};
