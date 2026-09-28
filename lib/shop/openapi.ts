import { createDocument } from "zod-openapi";
import { ErrorResponse } from "./schemas/common";
import { ProductListQuery, ProductListResponse } from "./schemas/product";

const errorContent = { "application/json": { schema: ErrorResponse } };

export const openApiDocument = createDocument({
  openapi: "3.1.0",
  info: {
    title: "Shop API",
    version: "0.1.0",
    description:
      "RN 마이그레이션 검증용 API. 에러는 HTTP 상태가 아니라 `code`로 분기한다.",
  },
  tags: [{ name: "products", description: "상품 카탈로그 (DummyJSON 프록시)" }],
  paths: {
    "/api/products": {
      get: {
        operationId: "listProducts",
        tags: ["products"],
        summary: "상품 목록 (offset 페이지네이션)",
        description:
          "무한 스크롤용. 다음 페이지 skip = skip + limit, 그 값이 total 이상이면 마지막 페이지다.",
        requestParams: { query: ProductListQuery },
        responses: {
          "200": {
            description: "상품 목록 페이지",
            content: { "application/json": { schema: ProductListResponse } },
          },
          "400": {
            description: "잘못된 쿼리 파라미터 (VALIDATION_ERROR)",
            content: errorContent,
          },
          "502": {
            description: "DummyJSON 호출 실패 (UPSTREAM_ERROR)",
            content: errorContent,
          },
        },
      },
    },
  },
});
