import "server-only";
import { cacheLife } from "next/cache";
import { z } from "zod";
import {
  ProductDetail,
  ProductSummary,
  type ProductListResponse,
} from "./schemas/product";

const DUMMYJSON_URL = "https://dummyjson.com";

// DummyJSON always includes id
const selectFields = (shape: object) =>
  Object.keys(shape).filter((key) => key !== "id").join(",");

const SELECT_FIELDS = selectFields(ProductSummary.shape);
const DETAIL_SELECT_FIELDS = selectFields(ProductDetail.shape);

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
  url.searchParams.set("select", SELECT_FIELDS);

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

// Returns null when DummyJSON has no such product; other failures throw.
export async function fetchProduct(id: number): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("hours");

  const url = new URL(`/products/${id}`, DUMMYJSON_URL);
  url.searchParams.set("select", DETAIL_SELECT_FIELDS);

  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`DummyJSON responded ${res.status}`);
  }

  const parsed = ProductDetail.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error(
      `Unexpected DummyJSON payload: ${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data;
}
