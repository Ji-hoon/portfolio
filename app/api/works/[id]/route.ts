import { getWorkItem } from "@/lib/content";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/works/[id]">,
) {
  const { id } = await ctx.params;
  const item = await getWorkItem(id);

  if (!item) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(item);
}
