import { openApiDocument } from "@/lib/shop/openapi";

export async function GET() {
  return Response.json(openApiDocument);
}
