import { fetchProducts } from "@/lib/shop/dummyjson";
import { jsonError, validationError } from "@/lib/shop/http";
import { ProductListQuery } from "@/lib/shop/schemas/product";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = ProductListQuery.safeParse(Object.fromEntries(searchParams));
  if (!query.success) return validationError(query.error);

  try {
    return Response.json(await fetchProducts(query.data.limit, query.data.skip));
  } catch (error) {
    // Network failures, non-2xx and payload drift all surface as the same code.
    const message = error instanceof Error ? error.message : "Upstream failure";
    return jsonError("UPSTREAM_ERROR", 502, message);
  }
}
