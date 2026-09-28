import "server-only";
import { cacheLife } from "next/cache";
import { z } from "zod";
import { ProductSummary, type ProductListResponse } from "./schemas/product";

const DUMMYJSON_URL = "https://dummyjson.com";

const SELECT_FIELDS = Object.keys(ProductSummary.shape).filter(
  (key) => key !== "id", // DummyJSON always includes id
);

// Non-strict on purpose: extra upstream fields are ignored, missing ones fail.
const UpstreamProductList = z.object({
  products: z.array(ProductSummary),
  total: z.number().int(),
  skip: z.number().int(),
  limit: z.number().int(),
});


export async function fetchProducts(
  limit: number,
  skip: number,
): Promise<ProductListResponse> {
  "use cache";
  cacheLife("hours");

  const url = new URL("/products", DUMMYJSON_URL);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("skip", String(skip));
  url.searchParams.set("select", SELECT_FIELDS.join(","));

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`DummyJSON responded ${res.status}`);
  }

  const parsed = UpstreamProductList.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error(
      `Unexpected DummyJSON payload: ${z.prettifyError(parsed.error)}`,
    );
  }

  const { products, total } = parsed.data;
  // Echo the requested window rather than DummyJSON's, which clamps `limit`
  // past the end and would make `skip + limit` stop advancing.
  return { items: products, total, skip, limit };
}
