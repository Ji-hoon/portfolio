import type { Metadata } from "next";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { getArchives, getProjects } from "@/lib/content";
import { dehydrateWorks } from "@/lib/hydrate";
import { workCache } from "@/lib/work-cache";
import { ROLE_DESCRIPTION, resolveRole } from "@/lib/role";
import Hero, { SrRole } from "@/components/hero";
import WorkSection from "@/components/work-section";
import Contact from "@/components/contact";

const TITLE = "Jihoon Kim";

export async function generateMetadata({
  searchParams,
}: PageProps<"/">): Promise<Metadata> {
  const description = ROLE_DESCRIPTION[resolveRole((await searchParams).r)];

  return {
    description,
    openGraph: { title: TITLE, description },
    twitter: { card: "summary", title: TITLE, description },
  };
}

/** searchParams는 여기서만 await — sr 텍스트 한 조각 밖은 정적 셸로 남는다. */
async function ResolvedSrRole({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  return <SrRole role={resolveRole((await searchParams).r)} />;
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const [projects, archives] = await Promise.all([
    getProjects(),
    getArchives(),
  ]);

  const state = await dehydrateWorks(
    [
      { queryKey: workCache.projectsKey, data: projects },
      { queryKey: workCache.archivesKey, data: archives },
    ],
    { tags: [workCache.projectsTag, workCache.archivesTag] },
  );

  return (
    <HydrationBoundary state={state}>
      <main className="mx-auto w-full max-w-[1200px] px-0 md:px-6 lg:px-6 md:px-6 lg:px-6">
        <Hero
          roleText={
            <Suspense fallback={null}>
              <ResolvedSrRole searchParams={searchParams} />
            </Suspense>
          }
        />
        <WorkSection variant="projects" preview />
        <WorkSection variant="archives" preview />
        <Contact />
      </main>
    </HydrationBoundary>
  );
}
