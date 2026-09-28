# 무한 스크롤용 상품 목록 API + OpenAPI 명세/문서 세팅 플랜

## Context

TECH_DECISIONS.md의 검증 플로우 첫 화면(메인, 무한 스크롤)에 필요한 API를 `next-api`(= 이 저장소, Next 16.3 App Router, `cacheComponents: true`)에 만들고, 4장의 계약 전략(zod-first → OpenAPI → Scalar 문서)을 이 엔드포인트 하나로 먼저 끝까지 연결해 둔다. 이후 장바구니·쿠폰 API는 같은 틀에 스키마와 라우트만 추가하면 된다.

**문서와 달라지는 점:** 3장·4.4는 "상품 카탈로그는 RN이 DummyJSON을 직접 호출(명세 밖)"로 되어 있다. 이번 요청대로 API를 구축하면 `next-api`가 DummyJSON을 감싸는 `GET /api/products`를 제공하고, 상품 목록도 명세에 포함된다. 얻는 것은 RN이 목록까지 Orval 생성 훅을 쓸 수 있고, 응답 필드가 계약으로 고정된다는 점이다. 구현 후 TECH_DECISIONS.md 3장 표와 4.4 마지막 줄을 이에 맞게 고친다.

## 결정 사항

- **zod → OpenAPI 라이브러리: `zod-openapi`** (10장 미정 사항 확정). 이 저장소에는 이미 zod 4.4.3이 있고(eslint 경유), `zod-openapi`는 zod 4의 `.meta({ id })`를 그대로 써서 컴포넌트 이름을 등록한다. 별도 registry나 `extendZodWithOpenApi` 패치가 필요 없다. `zod`는 직접 의존성으로 추가한다.
- **문서 UI: `@scalar/nextjs-api-reference`** (4.3 그대로).
- **페이지네이션 계약:** DummyJSON과 같은 offset 방식(`limit`/`skip`)을 쓰고, 응답에 `total`, `skip`, `limit`을 담는다. 그러면 8.3의 `getNextPageParam`(`last.skip + last.limit < last.total`)을 수정 없이 쓸 수 있다.

## API 계약

`GET /api/products?limit=20&skip=0`

| 파라미터 | 규칙 |
|---|---|
| `limit` | 정수, 1–50, 기본값 20 |
| `skip` | 정수, 0 이상, 기본값 0 |

응답 `200 ProductListResponse`:
```json
{ "items": [ProductSummary], "total": 194, "skip": 0, "limit": 20 }
```
`ProductSummary` = `{ id, title, price, discountPercentage, rating, thumbnail, brand? }`. 목록에 필요한 필드만 두고, 업스트림은 DummyJSON `select=`로 받아 payload를 줄인다(8.2의 "큰 배열은 필요한 필드만" 원칙과 맞춘다).

에러(`ErrorResponse { code, message }`, 6.1 형식):
- `400 VALIDATION_ERROR`: 쿼리 파라미터가 잘못됨 (6.1 표에 추가)
- `502 UPSTREAM_ERROR`: DummyJSON 호출 실패 (6.1 표에 추가)

`skip >= total`이면 `items: []`를 그대로 반환한다. 클라이언트 쪽 `getNextPageParam`이 `undefined`를 반환해 빈 페이지를 반복 요청하지 않는다(9장 체크 항목).

## 파일 구성

```
lib/shop/
  schemas/common.ts      ErrorCode enum, ErrorResponse (.meta({ id: 'ErrorResponse' }))
  schemas/product.ts     ProductSummary, ProductListQuery, ProductListResponse (각각 .meta id)
  http.ts                jsonError(code, status, message) 헬퍼, zod 에러 → VALIDATION_ERROR
  dummyjson.ts           'server-only'. fetchProducts({limit, skip}) — 'use cache' + cacheLife('hours')
  openapi.ts             zod-openapi createDocument(): info, servers, paths, tags(['products'])
app/api/products/route.ts       GET: searchParams → ProductListQuery.safeParse → fetchProducts → 응답
app/api/openapi.json/route.ts   GET: Response.json(createDocument(...))
app/api/docs/route.ts           export const GET = ApiReference({ url: '/api/openapi.json' })
```

- 기존 라우트 패턴을 따른다: `app/api/projects/route.ts`처럼 `Response.json` 사용, `@/` 경로 별칭 사용.
- 업스트림 응답도 zod로 파싱한다(비엄격). DummyJSON 필드가 바뀌면 `UPSTREAM_ERROR`로 드러난다.
- `'use cache'`는 `lib/content.ts`가 이미 쓰는 Cache Components 방식을 따른다. 인자(limit, skip)가 캐시 키가 된다. 요청 쿼리 파싱은 캐시 밖(라우트 핸들러)에서 한다. 구현 전에 `node_modules/next/dist/docs/`의 route handler 문서와 `use cache` 문서를 확인한다(AGENTS.md 지침).
- 명세의 `operationId`는 `listProducts`로 지정한다. 이 이름이 Orval 훅 이름(`useListProducts`)이 된다.
- `app/robots.ts`에 `disallow: "/api/"`를 추가할지는 선택 사항이다(포트폴리오 사이트와 같은 도메인에 올라가기 때문).

## 의존성

```
npm i zod zod-openapi @scalar/nextjs-api-reference
```

## 검증

1. `npm run dev` (포트 4000) 실행 후:
   - `curl 'localhost:4000/api/products?limit=5&skip=0'`: `items` 5개, `total`, `skip`, `limit`이 있는지 확인
   - `?skip=190&limit=20`: 마지막 페이지(4개), `?skip=500`: `items: []`
   - `?limit=0`, `?limit=abc`: `400 { code: "VALIDATION_ERROR" }`
2. `curl localhost:4000/api/openapi.json`: `components.schemas`에 `ProductSummary`, `ProductListResponse`, `ErrorResponse`가 이름 있는 컴포넌트로 들어 있는지, 400/502 응답이 연결되어 있는지 확인
3. 브라우저에서 `localhost:4000/api/docs`를 열어 Scalar 화면에서 "Try it"으로 실제 호출
4. 계약 소비 확인(RN 저장소 없이): scratchpad에서 `npx orval --input http://localhost:4000/api/openapi.json`(react-query 클라이언트)을 실행해 `useListProducts`와 `ProductListResponse` 타입이 생성되는지 확인
5. `npm run lint`, `npm run build` 통과 확인 (Cache Components 빌드 에러 여부 포함)
6. TECH_DECISIONS.md 3장, 4.4, 6.1(에러 코드 2개), 10장(라이브러리 확정)을 갱신

## 구현 결과 (2026-09-28)

- 검증 1~3, 5 통과: `limit=3`이면 3개, `skip=190`이면 4개(total 194), `skip=500`이면 `items: []`, `limit=0`·`limit=abc`이면 400 `VALIDATION_ERROR`, `/api/docs`가 200 HTML을 반환. 빌드 결과 `/api/products`는 동적(ƒ), `/api/openapi.json`·`/api/docs`는 정적(○)으로 프리렌더된다.
- 검증 4 통과: Orval이 `useListProducts`, `ProductListResponse`, `ProductSummary`, `ListProductsParams`를 생성한다.
  - **rn-app 주의:** Orval이 설치된 TanStack Query 버전을 감지하지 못하면 v4용 훅을 만든다. `orval.config.ts`에 `override.query.version: 5`를 넣어야 한다.
- 계획과 달라진 점:
  - `ProductListQuery`에는 컴포넌트 id를 달지 않았다. 쿼리 파라미터로 풀어서 들어가므로 이름 있는 컴포넌트로 만들 필요가 없다.
  - 업스트림 실패는 종류(네트워크 오류, non-2xx, 페이로드 불일치)와 상관없이 모두 502 `UPSTREAM_ERROR`로 응답한다.
  - 응답의 `skip`·`limit`은 DummyJSON이 준 값이 아니라 요청한 값을 그대로 돌려준다. DummyJSON은 끝 페이지에서 `limit`을 잘라서 반환하기 때문이다.
- 남은 작업: TECH_DECISIONS.md 갱신(3장, 4.4, 6.1 에러 코드 2개, 10장). 이 문서는 이 저장소에 없다.
