import { HydrationBoundary } from "@tanstack/react-query";
import { getArchives, getProjects } from "@/lib/content";
import { dehydrateWorks } from "@/lib/hydrate";
import { WORK_PAGE_SIZE, workCache } from "@/lib/work-cache";
import WorkSection from "./work-section";

export type WorkListVariant = "projects" | "archives";

export default async function WorkListPage({
  variant,
}: {
  variant: WorkListVariant;
}) {
  const items =
    variant === "projects" ? await getProjects() : await getArchives();
  const queryKey = workCache.infiniteListKey(variant);
  const tag =
    variant === "projects" ? workCache.projectsTag : workCache.archivesTag;
  const firstPage = items.slice(0, WORK_PAGE_SIZE);
  const state = await dehydrateWorks(
    [
      {
        queryKey,
        data: {
          pages: [
            {
              items: firstPage,
              nextPage: firstPage.length < items.length ? 2 : null,
            },
          ],
          pageParams: [1],
        },
      },
    ],
    { tags: [tag] },
  );

  return (
    <HydrationBoundary state={state}>
      <main className="mx-auto w-full max-w-[1200px] px-0 md:px-6 lg:px-6 pb-16 pt-16 md:pb-24 md:pt-24">
        <WorkSection variant={variant} />
      </main>
    </HydrationBoundary>
  );
}
