import type { Metadata } from "next";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { getArchives, getProjects } from "@/lib/content";
import { dehydrateWorks } from "@/lib/hydrate";
import { workCache } from "@/lib/work-cache";
import { ROLE_DESCRIPTION, buildSocialMeta, resolveRole } from "@/lib/role";
import Hero, { RoleSlot } from "@/components/hero";
import WorkSection from "@/components/work-section";
import Contact from "@/components/contact";

export async function generateMetadata({
  searchParams,
}: PageProps<"/">): Promise<Metadata> {
  const description = ROLE_DESCRIPTION[resolveRole((await searchParams).r)];
  const social = buildSocialMeta(description);

  return {
    description,
    // 역할 변형은 쿼리 파라미터일 뿐이므로 색인은 기본 URL 하나로 통합한다
    alternates: { canonical: "/" },
    openGraph: { ...social.openGraph, url: "/" },
    twitter: social.twitter,
  };
}

/** searchParams는 여기서만 await — 역할 슬롯 한 조각 밖은 정적 셸로 남는다. */
async function ResolvedRoleSlot({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  return <RoleSlot role={resolveRole((await searchParams).r)} />;
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
          roleSlot={
            <Suspense fallback={<RoleSlot role="frontend" />}>
              <ResolvedRoleSlot searchParams={searchParams} />
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
