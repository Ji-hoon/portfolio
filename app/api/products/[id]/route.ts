import { fetchProduct } from "@/lib/shop/dummyjson";
import { jsonError, validationError } from "@/lib/shop/http";
import { ProductIdParam } from "@/lib/shop/schemas/product";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const param = ProductIdParam.safeParse(await params);
  if (!param.success) return validationError(param.error);

  try {
    const product = await fetchProduct(param.data.id);
    if (!product) {
      return jsonError("NOT_FOUND", 404, `Product ${param.data.id} not found`);
    }
    return Response.json(product);
  } catch (error) {
    // Network failures, non-2xx and payload drift all surface as the same code.
    const message = error instanceof Error ? error.message : "Upstream failure";
    return jsonError("UPSTREAM_ERROR", 502, message);
  }
}
