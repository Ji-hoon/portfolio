# TECH_DECISIONS.md 갱신 지시서

> 대상 문서: `TECH_DECISIONS.md` (v0.1 → v0.2)
> 배경: `next-api`(포트폴리오 저장소)에 무한 스크롤용 `GET /api/products`와 OpenAPI 명세·문서 라우트를 구현했다. 구현 기록은 같은 폴더의 `products-infinite-scroll-api.md`에 있다. 이 문서에는 그 결과를 설계 문서에 반영하기 위한 변경 사항만 정리한다.

## 작업 규칙

- 아래 항목만 고치고, 나머지 문장과 구조는 그대로 둔다.
- 문체는 기존 문서를 따른다(한국어, "~한다" 체, 표와 불릿 위주).
- 상단 상태 줄을 `> 상태: 초안 (v0.2)`로 바꾼다.

## 구현된 사실 (근거)

| 항목 | 값 |
|---|---|
| 엔드포인트 | `GET /api/products?limit&skip`, operationId `listProducts` |
| 쿼리 | `limit` 정수 1–50, 기본 20 / `skip` 정수 0 이상, 기본 0 |
| 응답 | `ProductListResponse { items: ProductSummary[], total, skip, limit }` |
| `ProductSummary` | `{ id, title, price, discountPercentage, rating, thumbnail, brand? }` |
| 업스트림 | DummyJSON `/products`를 `select=`로 필요한 필드만 호출하고 `'use cache'` + `cacheLife('hours')`로 캐시 |
| `skip`/`limit` | DummyJSON이 준 값이 아니라 **요청 값을 그대로 반환**한다(DummyJSON은 끝 페이지에서 `limit`을 잘라 반환함) |
| 끝 페이지 | `skip >= total`이면 `items: []` |
| 에러 | `400 VALIDATION_ERROR`(쿼리 오류), `502 UPSTREAM_ERROR`(네트워크 오류, non-2xx, 페이로드 불일치 모두 포함) |
| 명세 생성 | `zod-openapi` (zod 4 `.meta({ id })`로 컴포넌트 등록) |
| 명세 URL | `/api/openapi.json` (빌드 시 정적 프리렌더) |
| 문서 UI | `/api/docs` (Scalar, `@scalar/nextjs-api-reference`) |
| 코드 위치 | `lib/shop/schemas/`, `lib/shop/dummyjson.ts`, `lib/shop/openapi.ts`, `lib/shop/http.ts`, `app/api/{products,openapi.json,docs}/route.ts` |
| Orval 확인 | `useListProducts`, `ProductListResponse`, `ProductSummary`, `ListProductsParams`가 생성됨. 단, react-query 버전을 감지하지 못하면 **v4용 훅을 생성**함 |

## 섹션별 변경 사항

### 2. 저장소 구성
- 표의 `next-api` 역할 칸 맨 앞에 "상품 목록 프록시,"를 추가한다.

### 3. 데이터 소스 경계
- 표의 첫 행을 두 행으로 나눈다.

| 데이터 | 소스 | 이유 |
|---|---|---|
| 상품 목록 | `next-api` `GET /api/products` (DummyJSON 프록시) | 무한 스크롤 응답 형태를 계약으로 고정하고, RN도 Orval 생성 훅으로 받는다. 필요한 필드만 전달해 payload를 줄인다 |
| 상품 상세, 카테고리 | DummyJSON (`https://dummyjson.com`) | 읽기 전용 카탈로그는 공개 샘플 API로 충분하다. 서버 구축 비용이 없다 |

- **경계 원칙** 문장을 다음으로 바꾼다.
  > **경계 원칙:** 카탈로그 원본은 DummyJSON이다. 클라이언트가 계약으로 소비해야 하는 응답(상품 목록)과 사용자별 상태(장바구니·쿠폰·주문)는 `next-api`가 제공한다.

### 4.1 결정
- 다이어그램의 `API 문서 (Scalar)` 줄을 `API 문서 (Scalar, /api/docs)`로 바꾼다.

### 4.3 `next-api` 쪽 규칙
- "명세 생성" 불릿을 다음으로 바꾼다.
  > 명세 생성: **`zod-openapi`로 확정.** zod 4의 `.meta({ id: 'Cart' })`로 컴포넌트 이름을 등록하므로 별도 레지스트리가 필요 없다. 쿼리 파라미터 스키마는 `requestParams.query`로 풀어서 넣고 id를 달지 않는다.
- 불릿을 하나 추가한다.
  > 명세는 `/api/openapi.json`, 문서는 `/api/docs`에서 제공한다. 명세 원본 코드는 `lib/shop/openapi.ts`, 스키마는 `lib/shop/schemas/`에 둔다.
- 불릿을 하나 추가한다.
  > 각 operation에 `operationId`를 지정한다. Orval 훅 이름이 여기서 정해진다(`listProducts` → `useListProducts`).

### 4.4 `rn-app` 쪽 규칙
- `orval.config.ts` 예시의 `api.output.override`를 다음으로 바꾼다.
  ```ts
  override: {
    mutator: { path: './src/api/client.ts', name: 'apiClient' },
    query: { version: 5 },
  },
  ```
  그 바로 아래에 근거 한 줄을 추가한다.
  > 근거: Orval이 설치된 TanStack Query 버전을 감지하지 못하면 v4용 훅을 생성한다.
- 마지막 불릿("DummyJSON 호출은 명세 밖이므로…")을 다음으로 바꾼다.
  > 상품 목록은 명세에 포함되어 있으므로 생성 훅(`useListProducts`)을 쓴다. 상품 상세·카테고리처럼 DummyJSON을 직접 호출하는 부분은 명세 밖이므로 수동으로 작성한 쿼리 훅을 사용한다.

### 6. API 계약 초안
- 표 맨 위에 행을 추가한다.

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/products` | `?limit=20&skip=0` → `{ items, total, skip, limit }` (구현 완료) |

### 6.1 에러 형식
- 에러 코드 표 맨 아래에 두 행을 추가한다.

| 코드 | HTTP | 의미 |
|---|---|---|
| `VALIDATION_ERROR` | 400 | 요청 파라미터·본문 형식 오류 |
| `UPSTREAM_ERROR` | 502 | DummyJSON 호출 실패 또는 응답 형식 불일치 |

### 8.2 zod 사용 규칙
- "상품 목록처럼 큰 배열은…" 불릿 끝에 다음 문장을 붙인다.
  > 상품 목록은 서버가 이미 필요한 필드만 내려주므로 생성된 스키마로 전체 검증해도 부담이 작다.

### 8.3 무한 스크롤 (메인)
- 첫 불릿을 다음으로 바꾼다.
  > `next-api`의 `GET /api/products`(offset 페이지네이션, `limit` 최대 50)를 사용한다. `useInfiniteQuery`의 `queryFn`에서 Orval이 생성한 `listProducts`를 호출한다.
- 불릿을 하나 추가한다.
  > 응답의 `skip`·`limit`은 요청 값을 그대로 돌려주고, `skip >= total`이면 `items: []`를 반환한다. 따라서 아래 `getNextPageParam`만으로 끝 페이지를 판별할 수 있다.
- `getNextPageParam` 코드는 그대로 둔다.

### 9. 검증 항목
- 체크리스트를 바꾸지 않는다(RN 쪽 검증은 아직 하지 않았다).

### 10. 미정 사항과 향후 과제
- "zod → OpenAPI 생성 라이브러리 확정" 불릿을 삭제한다(4.3에서 확정됨).
- 불릿을 하나 추가한다.
  > **`/api/` 크롤링 차단 여부:** `next-api`가 포트폴리오 사이트와 같은 도메인에서 서비스된다. `app/robots.ts`에 `/api/` disallow를 추가할지 결정해야 한다.

## 완료 확인

- 문서 전체에서 "DummyJSON 호출은 명세 밖"처럼 상품 목록을 DummyJSON 직접 호출로 설명하는 문장이 남아 있지 않은지 검색한다.
- 6장 표, 6.1 표, 4.4 설정 예시가 "구현된 사실" 표와 일치하는지 대조한다.
