import { z } from "zod";

export const PRODUCT_LIST_MAX_LIMIT = 50;

export const ProductSummary = z
  .object({
    id: z.number().int(),
    title: z.string(),
    price: z.number(),
    discountPercentage: z.number(),
    rating: z.number(),
    thumbnail: z.url(),
    brand: z.string().optional(),
  })
  .meta({ id: "ProductSummary" });
export type ProductSummary = z.infer<typeof ProductSummary>;

export const ProductDetail = ProductSummary.extend({
  description: z.string(),
  category: z.string(),
  images: z.array(z.url()),
  stock: z.number().int(),
  availabilityStatus: z.string().optional(),
  shippingInformation: z.string().optional(),
  warrantyInformation: z.string().optional(),
  returnPolicy: z.string().optional(),
}).meta({ id: "ProductDetail" });
export type ProductDetail = z.infer<typeof ProductDetail>;

export const ProductIdParam = z.object({
  id: z.coerce.number().int().min(1).meta({ description: "Product id" }),
});
export type ProductIdParam = z.infer<typeof ProductIdParam>;

// Query strings arrive as text, so coerce before range checks.
export const ProductListQuery = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(PRODUCT_LIST_MAX_LIMIT)
      .default(20)
      .meta({ description: `Page size (1–${PRODUCT_LIST_MAX_LIMIT})` }),
    skip: z.coerce
      .number()
      .int()
      .min(0)
      .default(0)
      .meta({ description: "Number of items to skip (offset)" }),
  });
export type ProductListQuery = z.infer<typeof ProductListQuery>;

export const ProductListResponse = z
  .object({
    items: z.array(ProductSummary),
    total: z.number().int(),
    skip: z.number().int(),
    limit: z.number().int(),
  })
  .meta({ id: "ProductListResponse" });
export type ProductListResponse = z.infer<typeof ProductListResponse>;
