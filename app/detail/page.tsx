import { Suspense } from "react";
import { notFound } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";
import { getWorkItem } from "@/lib/content";
import { dehydrateWorks } from "@/lib/hydrate";
import { workCache } from "@/lib/work-cache";
import DetailView from "@/components/detail-view";

/**
 * Detail page addressed by query string (`/detail?id=...`).
 *
 * `searchParams` is runtime data, so it resolves inside <Suspense>: the page
 * shell (header/footer/skeleton) is prerendered at build time as static HTML,
 * and the item content — served from the `use cache` data layer — streams in.
 * The data itself stays static (SSG groundwork): swap `lib/content.ts` for a
 * real backend later without touching this page.
 */
export default function DetailPage(props: PageProps<"/detail">) {
  return (
    <div className="pb-16">
      <Suspense fallback={<DetailSkeleton />}>
        {props.searchParams.then(({ id }) => (
          <DetailData id={typeof id === "string" ? id : ""} />
        ))}
      </Suspense>
    </div>
  );
}

async function DetailData({ id }: { id: string }) {
  const item = await getWorkItem(id);
  if (!item) notFound();

  const state = await dehydrateWorks(
    [{ queryKey: workCache.itemKey(id), data: item }],
    { tags: [workCache.itemTag(id)] },
  );

  return (
    <HydrationBoundary state={state}>
      <DetailView id={id} />
    </HydrationBoundary>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] animate-pulse px-0 md:px-6 lg:px-6 pt-8 md:pt-16">
      <div className="h-4 w-24 bg-surface" />
      <div className="mb-12 mt-8 space-y-3 md:mb-16">
        <div className="h-4 w-32 bg-surface" />
        <div className="h-14 max-w-2xl bg-surface md:h-20" />
      </div>
      <div className="aspect-video min-[641px]:aspect-[48/9] min-[961px]:aspect-[64/9] w-full bg-surface" />
    </div>
  );
}
