import { getArchives } from "@/lib/content";
import { WORK_PAGE_SIZE } from "@/lib/work-cache";

export async function GET(request: Request) {
  const archives = await getArchives();
  const url = new URL(request.url);
  if (!url.searchParams.has("page")) return Response.json(archives);

  const page = Math.max(Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1, 1);
  const start = (page - 1) * WORK_PAGE_SIZE;
  const items = archives.slice(start, start + WORK_PAGE_SIZE);

  return Response.json({
    items,
    nextPage: start + WORK_PAGE_SIZE < archives.length ? page + 1 : null,
  });
}
