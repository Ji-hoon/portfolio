import { extname } from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import type { LText } from "./i18n";
import { getAssetsBucket } from "./supabase";
import { workCache } from "./work-cache";

export type WorkType = "project" | "archive";
export type WorkCategory = "Development" | "Product Design" | "UI/UX Design";

export interface ArchitectureNode {
  title: LText;
  description: LText;
}

export interface ArchitectureDiagram {
  overview: string;
  nodes: ArchitectureNode[];
}

export interface ArchitectureContent {
  image: string;
  ko: ArchitectureDiagram;
  en: ArchitectureDiagram;
}

export interface WorkItem {
  id: string;
  type: WorkType;
  category: WorkCategory;
  year: string;
  /** Optional normalized start date for entries whose display date is coarse. */
  sortDate?: string;
  /** Optional because some archive entries are intentionally text-only. */
  image?: string;
  subImages?: string[];
  title: LText;
  summary: LText;
  duration: LText;
  /** Tech stack for projects, skills for archives. */
  stack: string[];
  objectives?: {
    title: LText;
    description: { ko: string[]; en: string[] };
  };
  accomplishments: { ko: string[]; en: string[] };
  role: LText;
  relatedLink: string | null;
  details: { ko: string[]; en: string[] };
  technicalChallenges?: { ko: string[]; en: string[] };
  architecture?: ArchitectureContent;
}

const PORTFOLIO_URL =
  "https://stellar-rook-e9e.notion.site/Frontend-Developer-73de57518b094030bf50ea12721c51b6";

const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".svg",
  ".webp",
]);

// Must stay well above the "work" cacheLife profile's `expire` (3 days, see
// next.config.ts) so URLs frozen in the cache never outlive their signature.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

async function getAssetImages(id: string): Promise<string[]> {
  const bucket = getAssetsBucket();

  const { data: entries, error: listError } = await bucket.list(id, {
    limit: 100,
  });
  if (listError) {
    throw new Error(`Storage list("${id}") failed: ${listError.message}`);
  }

  const names = (entries ?? [])
    .filter(
      (entry) =>
        entry.id !== null && // folders are listed with id: null
        IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()),
    )
    .map((entry) => entry.name)
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );

  if (names.length === 0) return [];

  const paths = names.map((name) => `${id}/${name}`);
  const { data: signed, error: signError } = await bucket.createSignedUrls(
    paths,
    SIGNED_URL_TTL_SECONDS,
  );
  if (signError) {
    throw new Error(`Storage sign("${id}") failed: ${signError.message}`);
  }

  const byPath = new Map(signed.map((entry) => [entry.path, entry]));
  return paths.map((path) => {
    const entry = byPath.get(path);
    if (!entry || entry.error || !entry.signedUrl) {
      throw new Error(
        `Failed to sign "${path}": ${entry?.error ?? "missing from response"}`,
      );
    }
    return entry.signedUrl;
  });
}

async function resolveAssetImages(item: WorkItem): Promise<WorkItem> {
  const assetImages = await getAssetImages(item.id);
  if (assetImages.length === 0) return item;

  return {
    ...item,
    image: assetImages[0],
    subImages: assetImages.slice(1),
  };
}

/**
 * Content sourced from example/re_15_260824.html (resume) and
 * example/Portfolio-2023-Jihoon-Kim-compressed.pdf. Work images live in a
 * private Supabase Storage bucket at `{id}/{name}.webp` (uploaded from the
 * gitignored `asset-src/assets/{id}` staging tree via `npm run upload-assets`)
 * and are resolved to signed URLs per revalidation; entries without a matching
 * bucket folder keep their manually configured image fallback. The accessors
 * are `use cache` async functions on the "work" cacheLife profile, which must
 * expire before the signed URLs do (see next.config.ts).
 */
const items: WorkItem[] = [
  {
    id: "project-01",
    type: "project",
    category: "Development",
    year: "2026",
    image: "https://picsum.photos/seed/assistant/1600/1000?grayscale",
    subImages: [
      "https://picsum.photos/seed/assistant-workflow/1600/1000?grayscale",
      "https://picsum.photos/seed/assistant-ui/1600/1000?grayscale",
    ],
    title: {
      ko: "ERP AI 어시스턴트",
      en: "ERP AI Assistant",
    },
    summary: {
      ko: "ERP 업무를 대화로 수행하는 사내 AI 어시스턴트",
      en: "In-house AI assistant that runs ERP tasks through conversation",
    },
    duration: { ko: "2026.07 — 2026.08", en: "2026.07 — 2026.08" },
    stack: [
      "LLM",
      "RAG",
      "React",
      "Astryx Design System",
      "TypeScript",
      "Streaming UX",
      "Factory Pattern",
      "MySQL",
      "Embeddings",
    ],
    accomplishments: {
      ko: [
        "사용자 질문을 알려준다·찾아준다·만들어준다 세 유형으로 나누고 유형별 답변 형태와 UI 패턴을 규정 — 대화가 자유서술로 흩어지지 않는 구조 확보",
        "등록·지시 계열은 대화 중 실행하지 않고 확인 카드에서 멈추도록 설계 — 확인 없이 실행되는 경로를 전 기능에서 제거",
        "어시스턴트 권한을 화면 권한에 종속시키고 개인정보를 답변에서 제외 — 대화가 권한 우회 경로가 되지 않도록 설계",
        "창 닫기와 생성 중지를 분리한 스트리밍 UX — 닫아도 서버는 끝까지 생성하고 완료 시 플로팅 버튼 뱃지로 알림",
      ],
      en: [
        "Split user questions into three types — inform, find, create — and defined answer formats and UI patterns per type, keeping conversations from dissolving into free-form text",
        "Create/command requests never execute mid-conversation: they stop at a confirmation card, removing every unconfirmed execution path",
        "Scoped assistant permissions to screen permissions and excluded personal data from answers, so conversation cannot become a permission bypass",
        "Streaming UX that separates closing the window from stopping generation — the server finishes generating and a floating-button badge notifies on completion",
      ],
    },
    role: {
      ko: "기획·설계 주도, AI 에이전트 협업 구현",
      en: "Led product definition & architecture; built with AI agents",
    },
    relatedLink: null, //PORTFOLIO_URL,
    details: {
      ko: [
        "화면을 찾아 들어가 하던 일을 문장으로 요청하는 것을 제품 정의로 잡았습니다. 기능 범위와 상호작용 패턴, 아키텍처 방향과 운영 경계를 정의하고 구현은 AI 에이전트와의 협업으로 진행했습니다.",
        "UI는 Astryx Design System을 기반으로 구현하여 공통 컴포넌트와 디자인 규칙을 일관되게 적용했습니다.",
        "조회 결과는 표와 엑셀 내보내기, 등록 요청은 확인 카드, 값이 빠진 요청은 선택지 되묻기로 답변 형태를 고정했습니다. 확인 카드에 적힌 값만 실행 값으로 인정하고, 수정 요청 시 이전 카드는 자동 취소되며, 다건에 영향을 주는 작업은 대상 건수를 필수로 표기하고 대상이 0건이면 카드를 생성하지 않습니다.",
        "진입점은 홈 입력칸·플로팅 버튼·추천 작업 칩 세 곳으로 나누되 하나의 대화 상태를 공유하도록 했습니다. 홈 입력은 새 대화를 시작하고, 플로팅 버튼은 마지막 대화를 이어받으며, 어시스턴트 권한이 없으면 진입점 자체를 렌더링하지 않습니다.",
        "모델·벤더 교체를 전제로 어시스턴트 클래스 구조를 팩토리 패턴으로 지정해 생성 지점을 한 곳으로 모았습니다. 답할 수 없는 주제는 서버가 고정 문구로 담당 화면을 안내하고, 사용량은 화면 표시값과 차단 판정 기준을 일치시켰습니다.",
      ],
      en: [
        "The product definition: instead of navigating to a screen, you ask for the task in a sentence. I defined the feature scope, interaction patterns, architecture direction, and operational boundaries, and implemented it in collaboration with AI agents.",
        "The UI was built on the Astryx Design System, applying its shared components and design rules consistently across the assistant experience.",
        "Answer formats are fixed per type: query results render as tables with Excel export, create requests stop at a confirmation card, and requests with missing values ask back with options. Only values on the card count as execution values, edit requests auto-cancel the previous card, bulk operations must state the affected count, and zero-target requests produce no card.",
        "The three entry points — home input, floating button, and suggested-work chips — share one conversation state. Home input starts a new conversation, the floating button resumes the last one, and none of the entry points render without assistant permission.",
        "The assistant class structure uses a factory pattern for model/vendor swaps. Server-owned fixed messages guide unsupported topics back to the responsible screen, and the usage display shares its measure with the blocking rule.",
      ],
    },
    technicalChallenges: {
      ko: [
        "한 턴을 트리거·RAG·펑션콜링 세 레이어로 분리했습니다. 워커가 수명과 예산을 관리하고, RAG가 근거를 찾고, 펑션콜링이 조회나 변이 제안으로 바꾸도록 경계를 나눠 한 레이어의 실패가 전체 턴 실패로 번지지 않게 했습니다.",
        "스트리밍은 meta → block_start → block_delta → tool_status/block → 완성 block → done 순서의 SSE 계약으로 고정했습니다. 15초 heartbeat와 버퍼링 방지 헤더를 적용하고, 화면을 닫는 detach와 생성을 멈추는 cancel을 분리했습니다.",
        // "부가 기술로 전용 벡터DB 없이 MySQL 8 ngram FULLTEXT와 인메모리 코사인 검색을 RRF(k=60)로 융합했습니다. 768차원 임베딩은 L2 정규화해 저장하고, 헤딩 경계·약 800토큰 기준으로 문서를 멱등 적재했습니다.",
        "검색 레이어는 전용 벡터 DB나 Redis 같은 인프라를 추가하지 않고 MySQL 8 의 ngram FULLTEXT 와 인메모리 코사인이라는 두 검색 축을 rank 기반 RRF로 융합했습니다.",
        "문서 외부 전송은 allowlist 기반 fail-closed 정책으로 제한하고, 임베딩 워커는 모델·차원·task type·조성 버전 fingerprint가 바뀐 청크만 재처리하도록 구성했습니다.",
      ],
      en: [
        "Each turn is split into trigger, RAG, and function-calling layers. A worker owns lifecycle and budget, RAG retrieves grounding, and function calling turns the request into reads or mutation proposals, keeping failures isolated by boundary.",
        "Streaming follows a fixed SSE contract — meta → block_start → block_delta → tool_status/block → final block → done. A 15-second heartbeat and buffering-prevention headers keep the stream reliable, while closing the UI (detach) remains separate from stopping generation (cancel).",
        "As an additional capability, MySQL 8 ngram FULLTEXT and in-memory cosine search are fused with rank-only RRF (k=60), without a dedicated vector DB. 768-dimensional embeddings are L2-normalized, and documents are idempotently ingested at heading boundaries with an approximately 800-token ceiling.",
        "External document transfer is restricted by an allowlist with a fail-closed default, while the embedding worker fingerprints model, dimension, task type, and composition version so only changed chunks are reprocessed.",
      ],
    },
    architecture: {
      image: "/architecture/project-01.svg",
      ko: {
        overview:
          "사용자 요청을 안전한 실행 제안으로 바꾸고, 스트리밍 응답으로 다시 전달하는 세 단계 구조입니다.",
        nodes: [
          {
            title: { ko: "Trigger", en: "Trigger" },
            description: {
              ko: "의도·필수값·권한 확인",
              en: "Intent, required values, permission",
            },
          },
          {
            title: { ko: "RAG", en: "RAG" },
            description: {
              ko: "사내 문서에서 근거 검색",
              en: "Retrieve internal grounding",
            },
          },
          {
            title: { ko: "Function calling", en: "Function calling" },
            description: {
              ko: "조회 또는 변이 제안 생성",
              en: "Create read or mutation proposal",
            },
          },
          {
            title: { ko: "SSE UI", en: "SSE UI" },
            description: {
              ko: "확인 카드·결과·완료 알림",
              en: "Confirmation, result, completion",
            },
          },
        ],
      },
      en: {
        overview:
          "A three-stage structure turns a user request into a safe execution proposal and delivers the result through streaming.",
        nodes: [
          {
            title: { ko: "Trigger", en: "Trigger" },
            description: {
              ko: "의도·필수값·권한 확인",
              en: "Intent, required values, permission",
            },
          },
          {
            title: { ko: "RAG", en: "RAG" },
            description: {
              ko: "사내 문서에서 근거 검색",
              en: "Retrieve internal grounding",
            },
          },
          {
            title: { ko: "Function calling", en: "Function calling" },
            description: {
              ko: "조회 또는 변이 제안 생성",
              en: "Create read or mutation proposal",
            },
          },
          {
            title: { ko: "SSE UI", en: "SSE UI" },
            description: {
              ko: "확인 카드·결과·완료 알림",
              en: "Confirmation, result, completion",
            },
          },
        ],
      },
    },
  },
  {
    id: "project-02",
    type: "project",
    category: "Development",
    year: "2026",
    image: "https://picsum.photos/seed/e2edash/1600/1000?grayscale",
    subImages: [
      "https://picsum.photos/seed/e2edash-results/1600/1000?grayscale",
      "https://picsum.photos/seed/e2edash-run/1600/1000?grayscale",
    ],
    title: {
      ko: "AI 에이전트 E2E 테스트 자동화 대시보드",
      en: "AI Agent E2E Test Automation Dashboard",
    },
    summary: {
      ko: "AI 에이전트가 E2E 테스트를 수행하고 결과를 시각화하는 내부 도구",
      en: "Internal tool where AI agents run E2E tests and visualize results",
    },
    duration: { ko: "2026.06 — 2026.08", en: "2026.06 — 2026.08" },
    stack: [
      "Playwright (MCP)",
      "AI Agent",
      "React",
      "TypeScript",
      "Google Sheets",
    ],
    accomplishments: {
      ko: [
        "테스트 레벨과 케이스 실행 레벨을 분리한 상태 모델을 정의하고 상태별 허용 조작을 규칙으로 고정 — 잘못된 시점의 조작으로 인한 비정상 종료 경로를 설계 단계에서 차단",
        "MCP 에이전트 동시 실행 값을 바꿔가며 반복 측정, 실행 시간 개선이 멈추는 동시 실행 값 2를 최적값으로 확정",
        "토큰 예산 부족으로 장시간 테스트가 실패하는 현상을 사용량 기반 자동 일시중지·재개 구조로 전환 — 사람이 지켜보지 않아도 테스트 완주",
        "Google Sheets 테스트 케이스를 SSOT로 두는 동기화 구조 설계 — 코드 배포 없이 케이스만 동기화하여 갱신",
      ],
      en: [
        "Defined a state model separating test level and case-execution level, with allowed operations fixed per state — blocking abnormal-termination paths from mistimed operations at the design stage",
        "Repeatedly measured MCP agent concurrency values and fixed 2 as optimal, the point where execution-time gains stop",
        "Long runs failing on token budget were converted to usage-based automatic pause/resume — tests now finish without a human watching",
        "Designed a sync structure with Google Sheets test cases as the SSOT — cases update without a code deploy",
      ],
    },
    role: {
      ko: "요구사항 정의·우선순위 판단, LLM 기반 코드 생성 파이프라인 구축",
      en: "Defined requirements & priorities; built the LLM-based codegen pipeline",
    },
    relatedLink: null, //PORTFOLIO_URL,
    details: {
      ko: [
        "운영 중인 ERP 서비스의 E2E 테스트를 AI 에이전트가 자동 수행하고, 결과 시각화와 리포트 웹훅 발행까지 담당하는 내부 도구와 워크플로우를 구축했습니다.",
        "요구사항 정의와 개선 우선순위 판단을 직접 맡고 LLM 기반 코드 생성 파이프라인을 구축하여, 약 2개월 만에 프로덕션 서비스의 안정성을 검증하는 내부 도구로 운영 중입니다.",
        "테스트 상태는 idle·in-progress·pause·resume·terminating, 케이스 실행 상태는 idle·in-progress·done으로 분리했고, 각 상태에서 전체 중단·전체/청크 재개·청크/단일 케이스 재실행 등 허용되는 조작을 규칙으로 고정했습니다.",
        "토큰 예산과 429 응답을 세션 단위로 감시해 자동 일시중지·재개하고, OAuth 만료·배터리 전원·종료 웹훅까지 운영 가드로 포함했습니다. 커밋 분석 기준 테스트 케이스는 78건에서 342건으로 확장되었고, 최신 실행에서 342/342 통과를 기록했습니다.",
        "검증은 단순 클릭 성공 여부가 아니라 케이스당 최대 1개의 상태변경 API 호출과 응답 코드·알림 문구를 evidence로 확인하도록 구성했습니다. 엑셀 양식 22종의 업로드 경로까지 포함해 실제 업무 회귀를 검증합니다.",
      ],
      en: [
        "Built an internal tool and workflow where AI agents automatically run E2E tests against the production ERP service, visualize results, and publish report webhooks.",
        "I owned requirements and improvement priorities and built an LLM-based code-generation pipeline; within about two months it became the internal tool verifying production stability.",
        "Test states (idle·in-progress·pause·resume·terminating) are separated from case-execution states (idle·in-progress·done), with allowed operations — stop all, resume all/chunk, rerun chunk/single case — fixed as rules per state.",
        "Session-level token-budget and 429 monitoring enables automatic pause/resume, with OAuth-expiry, battery-power, and shutdown-webhook safeguards for unattended operation. The test set grew from 78 to 342 cases and the latest run reached 342/342 passes.",
        "Validation checks more than a click success: each case verifies at most one state-changing API call plus response code and alert text as evidence. It also covers upload paths for 22 spreadsheet formats to exercise real operational regressions.",
      ],
    },
    technicalChallenges: {
      ko: [
        "제품 앱과 분리된 Express 워커가 파일 잡 큐를 감시하고 headless Claude 에이전트를 실행합니다. 에이전트는 Playwright MCP로 실제 브라우저를 조작하고, 케이스 결과를 JSON으로 기록해 대시보드와 리포트 웹훅이 같은 결과를 사용하도록 했습니다.",
        "토큰 예산과 429 응답을 세션 단위로 감시해 자동 일시중지·재개하고, OAuth 만료·배터리 전원·종료 웹훅까지 운영 가드로 포함했습니다.",
      ],
      en: [
        "A separate Express worker watches a file-backed job queue and launches headless Claude agents. Agents operate a real browser through Playwright MCP and write JSON results, giving the dashboard and report webhook one source of truth.",
        "Session-level token-budget and 429 monitoring enables automatic pause/resume, with OAuth-expiry, battery-power, and shutdown-webhook safeguards for unattended operation.",
      ],
    },
    architecture: {
      image: "/architecture/project-02.svg",
      ko: {
        overview:
          "파일 기반 큐를 중심으로 에이전트 실행, 결과 저장, 시각화와 리포트를 분리한 비동기 테스트 파이프라인입니다.",
        nodes: [
          {
            title: { ko: "Google Sheets", en: "Google Sheets" },
            description: { ko: "테스트 케이스 SSOT", en: "Test-case SSOT" },
          },
          {
            title: { ko: "File job queue", en: "File job queue" },
            description: {
              ko: "실행 요청과 재개 상태 관리",
              en: "Manage jobs and resume state",
            },
          },
          {
            title: { ko: "Express worker", en: "Express worker" },
            description: {
              ko: "Claude + Playwright MCP 실행",
              en: "Run Claude + Playwright MCP",
            },
          },
          {
            title: { ko: "JSON result", en: "JSON result" },
            description: {
              ko: "대시보드·웹훅 공통 결과",
              en: "Shared dashboard/webhook result",
            },
          },
        ],
      },
      en: {
        overview:
          "An asynchronous test pipeline separates agent execution, result storage, visualization, and reporting around a file-backed queue.",
        nodes: [
          {
            title: { ko: "Google Sheets", en: "Google Sheets" },
            description: { ko: "테스트 케이스 SSOT", en: "Test-case SSOT" },
          },
          {
            title: { ko: "File job queue", en: "File job queue" },
            description: {
              ko: "실행 요청과 재개 상태 관리",
              en: "Manage jobs and resume state",
            },
          },
          {
            title: { ko: "Express worker", en: "Express worker" },
            description: {
              ko: "Claude + Playwright MCP 실행",
              en: "Run Claude + Playwright MCP",
            },
          },
          {
            title: { ko: "JSON result", en: "JSON result" },
            description: {
              ko: "대시보드·웹훅 공통 결과",
              en: "Shared dashboard/webhook result",
            },
          },
        ],
      },
    },
  },
  {
    id: "project-03",
    type: "archive",
    category: "Development",
    year: "2026",
    sortDate: "2026.04",
    image: "https://picsum.photos/seed/viterebuild/1600/1000?grayscale",
    subImages: [
      "https://picsum.photos/seed/viterebuild-architecture/1600/1000?grayscale",
      "https://picsum.photos/seed/viterebuild-review/1600/1000?grayscale",
    ],
    title: {
      ko: "레거시 ERP 프론트엔드 Vite 리빌딩",
      en: "Legacy ERP Frontend Rebuild with Vite",
    },
    summary: {
      ko: "레지스트리 기반 Feature-driven React SPA로 마스터 도메인 30화면 구현",
      en: "Built 30 master-domain screens as a registry-driven, feature-driven React SPA",
    },
    duration: { ko: "2026.04 — 2026.06", en: "2026.04 — 2026.06" },
    stack: [
      "React",
      "TypeScript",
      "Vite",
      "Feature-Sliced Design",
      "Radix UI",
      "vanilla-extract",
      "Zustand",
      "TanStack Query",
      "AG Grid",
    ],
    accomplishments: {
      ko: [
        "동적 라우트와 레지스트리 조합으로 마스터 도메인 30화면을 실 API에 연결 — 새 화면을 컴포넌트 추가가 아닌 registry 행 등록으로 확장",
        "FSD 6레이어 단방향 의존과 3계층 상태 모델(Zustand·React Context·TanStack Query)을 확정해 화면·피처·서버 상태의 책임을 분리",
        "Radix UI·vanilla-extract·Tailwind v4·AG Grid를 조합한 디자인 시스템과 공통 CRUD 패턴 구축 — 반복 화면의 구현 기준을 통일",
        "planner·admin·implementer·검증·리뷰어 등 AI 에이전트 7종과 plan/results/done/rules 문서 라이프사이클을 확립 — 구현과 검증을 분리",
      ],
      en: [
        "Connected 30 master-domain screens to real APIs through one dynamic route and registry composition — new screens scale by registering a row instead of adding bespoke wiring",
        "Established six-layer FSD with one-way dependencies and a three-layer state model (Zustand, React Context, TanStack Query), separating screen, feature, and server responsibilities",
        "Combined Radix UI, vanilla-extract, Tailwind v4, and AG Grid into shared design and CRUD patterns, giving repetitive screens one implementation baseline",
        "Established a seven-agent pipeline — planner, admin, implementer, verifiers, reviewer, and auditor — with a plan/results/done/rules documentation lifecycle",
      ],
    },
    role: {
      ko: "프론트엔드 아키텍처·레지스트리 설계, AI 에이전트 개발 파이프라인 구축",
      en: "Designed the frontend architecture and registry; built the AI-agent development pipeline",
    },
    relatedLink: null, // PORTFOLIO_URL,
    details: {
      ko: [
        "MoviqAI 플랫폼용 엔터프라이즈 React SPA를 Vite 기반으로 구축했습니다. 2026년 4월 14일부터 6월 4일까지 83개 커밋으로 현재 src 58,453줄·449파일 규모를 만들었습니다.",
        "라우팅은 `/app/:screenUrl/:tabUrl` 단일 동적 라우트로 두고 `renderKey = {screenUrl}_{tabUrl}`를 기준으로 renderer·API·grid·labeling 레지스트리를 조회합니다. 새 화면을 레지스트리 행 등록으로 확장하는 OCP 구조입니다.",
        "FSD 6레이어(app → pages → widgets/features → entities → shared), Zustand 5·React Context·TanStack Query 5의 3계층 상태, Radix UI와 vanilla-extract 기반 디자인 시스템을 문서로 확정했습니다.",
        "마스터 사용자·파트너·권한·설정·창고·기사 영역 30화면을 실 API로 구현했습니다. 입고 일부는 filter/toolbar/table 스텁 상태이고 출고·재고 도메인은 아직 시작하지 않았으며, 테스트는 공통 훅·유틸·shared UI 중심 34파일·461케이스입니다.",
        "AI 에이전트 7종의 역할과 검증 게이트, 306편의 plan/results/done/rules 문서 라이프사이클을 확립했습니다. code-verifier는 소스 수정 없이 테스트만 작성하고, code-reviewer와 registry-auditor가 품질과 정합성을 분리 검증합니다.",
      ],
      en: [
        "Built an enterprise React SPA for the MoviqAI platform on Vite. Across 83 commits from April 14 to June 4, 2026, it reached 58,453 source lines across 449 files.",
        "Routing uses one dynamic `/app/:screenUrl/:tabUrl` route. A `renderKey = {screenUrl}_{tabUrl}` resolves renderer, API, grid, and labeling registries, so a new screen is a registry row rather than bespoke wiring — an OCP-oriented structure.",
        "Documented six-layer FSD (`app → pages → widgets/features → entities → shared`), three-layer state (Zustand 5, React Context, TanStack Query 5), and a Radix UI + vanilla-extract design system.",
        "Implemented 30 master-domain screens for users, partners, permissions, settings, warehouses, and drivers against real APIs. Parts of inbound remain filter/toolbar/table stubs, outbound and inventory have no domain yet, and testing centers on shared hooks, utilities, and UI: 34 files and 461 cases.",
        "Established roles and verification gates for seven AI agents alongside a 306-document plan/results/done/rules lifecycle. The code verifier writes tests without changing source, while the reviewer and registry auditor independently check quality and consistency.",
      ],
    },
    technicalChallenges: {
      ko: [
        "URL과 탭을 하나의 renderKey로 합성하고 renderer·API·grid·labeling 레지스트리를 함께 조회했습니다. 등록 누락으로 조용히 실패하지 않도록 registry-auditor를 별도 에이전트로 두었습니다.",
        "전역 Zustand, 피처 Context, 서버 TanStack Query를 분리하고 화면 전환 시 screenKey 기반 스토어를 재생성했습니다. Table과 도메인 간 이벤트는 타입드 이벤트 채널로 연결했습니다.",
        "Radix Popover와 AG Grid portal 셀 에디터의 충돌, vanilla-extract 토큰과 Tailwind `@theme` 간 two-file sync 제약을 규칙화해 구현 선택의 변동을 줄였습니다.",
        "AI 생성 코드의 속도를 통제하기 위해 plan → implementation → validation → review 게이트와 18개 규칙을 운영하고, 리뷰 2회 실패 시 사람에게 에스컬레이션하도록 했습니다.",
      ],
      en: [
        "Composed URL and tab into one renderKey and resolved renderer, API, grid, and labeling registries together. A dedicated registry auditor prevents silent failures from missing registrations.",
        "Separated global Zustand, feature Context, and server TanStack Query, recreating screen stores by screenKey. Typed event channels connect tables and domains without prop drilling.",
        "Formalized the Radix Popover/AG Grid portal-editor interaction and the two-file sync constraint between vanilla-extract tokens and Tailwind `@theme`, reducing implementation drift.",
        "Controlled AI-generated code velocity with plan → implementation → validation → review gates and 18 rules, escalating to a human after two failed reviews.",
      ],
    },
    architecture: {
      image: "/architecture/project-03.svg",
      ko: {
        overview:
          "동적 라우트가 레지스트리에서 화면 조립 정보를 조회하고, FSD 계층과 3계층 상태 모델을 통해 실 API와 공통 UI를 연결하는 React SPA 구조입니다.",
        nodes: [
          {
            title: { ko: "Dynamic route", en: "Dynamic route" },
            description: {
              ko: "screen·tab URL을 renderKey로 합성",
              en: "Compose screen/tab URL into renderKey",
            },
          },
          {
            title: { ko: "Registry", en: "Registry" },
            description: {
              ko: "화면·API·grid·labeling 조립 정보",
              en: "Screen, API, grid, labeling composition",
            },
          },
          {
            title: { ko: "FSD + state", en: "FSD + state" },
            description: {
              ko: "6레이어와 3계층 상태 분리",
              en: "Six layers and three state tiers",
            },
          },
          {
            title: { ko: "React SPA", en: "React SPA" },
            description: {
              ko: "공통 UI에서 실 API 화면으로 연결",
              en: "Connect shared UI to real API screens",
            },
          },
        ],
      },
      en: {
        overview:
          "A dynamic route reads screen composition from registries, then connects real APIs and shared UI through FSD layers and a three-tier state model.",
        nodes: [
          {
            title: { ko: "Dynamic route", en: "Dynamic route" },
            description: {
              ko: "screen·tab URL을 renderKey로 합성",
              en: "Compose screen/tab URL into renderKey",
            },
          },
          {
            title: { ko: "Registry", en: "Registry" },
            description: {
              ko: "화면·API·grid·labeling 조립 정보",
              en: "Screen, API, grid, labeling composition",
            },
          },
          {
            title: { ko: "FSD + state", en: "FSD + state" },
            description: {
              ko: "6레이어와 3계층 상태 분리",
              en: "Six layers and three state tiers",
            },
          },
          {
            title: { ko: "React SPA", en: "React SPA" },
            description: {
              ko: "공통 UI에서 실 API 화면으로 연결",
              en: "Connect shared UI to real API screens",
            },
          },
        ],
      },
    },
  },
  {
    id: "project-04",
    type: "project",
    category: "Development",
    year: "2024-2026",
    image: "https://picsum.photos/seed/logimateerp/1600/1000?grayscale",
    subImages: [
      "https://picsum.photos/seed/logimateerp-design-system/1600/1000?grayscale",
      "https://picsum.photos/seed/logimateerp-cs/1600/1000?grayscale",
    ],
    title: {
      ko: "MoviqAI ERP",
      en: "MoviqAI ERP",
    },
    summary: {
      ko: "택배·주문·재고 등 물류 운영을 위한 Fulfillment ERP 웹 서비스",
      en: "Fulfillment ERP web service for parcels, orders and inventory",
    },
    duration: { ko: "2024.07 — 진행 중", en: "2024.07 — Ongoing" },
    stack: ["React", "TypeScript", "Storybook", "Figma", "Custom Hooks"],
    accomplishments: {
      ko: [
        "화면마다 누적된 UI 구현 편차를 정리하기 위해 리뉴얼 시안을 직접 작업하고 Storybook·Figma로 컴포넌트 기준을 단일화 — 스펙 합의 단계 단축",
        "목록 조회·클라이언트 데이터 필터의 화면별 중복 로직을 공통 커스텀 훅으로 추출 — 수정 지점을 한 곳으로 축소하여 유지보수 난이도 개선",
        "레거시 JS → TS 점진적 마이그레이션 — 강하게 결합된 Presenter/Container 패턴을 함수형 컴포넌트와 커스텀 훅 패턴으로 단계별 전환",
        "LLM과 Cursor로 랜딩페이지·내부 CS 관리 도구를 기획부터 배포까지 단독 구현, 현재까지 정상 운영 중",
      ],
      en: [
        "To resolve accumulated UI variance across screens, produced the renewal design myself and unified component standards with Storybook·Figma — shortening spec agreement",
        "Extracted per-screen duplicated list-query and client-side filter logic into shared custom hooks — one place to change, easier maintenance",
        "Gradual JS → TS migration — converting tightly coupled Presenter/Container patterns to function components with custom hooks, step by step",
        "Built the landing page and internal CS admin solo with LLM tooling and Cursor, from planning to deployment — still in healthy operation",
      ],
    },
    role: {
      ko: "프론트엔드 개발 · 개발팀",
      en: "Frontend Developer · Dev Team",
    },
    relatedLink: "https://main1.moviqai.com",
    details: {
      ko: [
        "택배, 주문, 재고 관리 등 물류 운영을 위한 Fulfillment 기능을 제공하는 ERP 웹 서비스입니다. Home-in Fulfillment System(ERP)의 프론트엔드를 담당하며, AI 에이전트를 개발 프로세스에 편입시키고 제품에 AI 어시스턴트를 도입하는 작업을 주도하고 있습니다.",
        "Storybook·Figma 기반 자체 디자인 시스템을 구축·운영하고, 조회 UI 내부 입력 핸들링 로직을 커스텀 훅으로 공통화하여 코드 퀄리티를 개선했습니다. 디자이너 출신의 관점으로 리뉴얼을 고도화하며 스펙 합의 단계를 줄였습니다.",
        "레거시 ERP 프론트엔드 리빌딩, AI 에이전트 E2E 테스트 자동화 대시보드 구축, 사내 AI 어시스턴트 및 문서 검색 계층 도입을 요구사항 정의부터 구현까지 주도했습니다.",
      ],
      en: [
        "An ERP web service providing fulfillment features — parcels, orders, inventory — for logistics operations. I own the frontend of the Home-in Fulfillment System (ERP), and lead bringing AI agents into the dev process and an AI assistant into the product.",
        "Built and operate an in-house design system on Storybook·Figma, and improved code quality by extracting input-handling logic in query UIs into shared custom hooks. A designer's perspective drove the renewal and shortened spec agreement.",
        "Led the legacy frontend rebuild, the AI-agent E2E test automation dashboard, and the in-house AI assistant with its document search layer — from requirements definition to implementation.",
      ],
    },
    technicalChallenges: {
      ko: [
        "화면마다 달랐던 입력·조회 로직과 Presenter/Container 결합을 공통 커스텀 훅과 함수형 컴포넌트로 점진적으로 분리했습니다.",
        "디자인 변경이 개발 화면마다 다르게 해석되지 않도록 Figma와 Storybook을 기준점으로 삼아 UI 스펙과 구현을 함께 관리했습니다.",
      ],
      en: [
        "Gradually separated inconsistent per-screen input/query logic and tightly coupled Presenter/Container code into shared custom hooks and function components.",
        "Used Figma and Storybook as shared references so design changes would not be interpreted differently across implementation screens.",
      ],
    },
    architecture: {
      image: "/architecture/project-04.svg",
      ko: {
        overview:
          "디자인 기준을 공통 컴포넌트로 구현하고, 커스텀 훅을 거쳐 물류 업무 화면에 연결하는 구조입니다.",
        nodes: [
          {
            title: { ko: "Figma", en: "Figma" },
            description: {
              ko: "화면·상호작용 스펙",
              en: "Screen and interaction specs",
            },
          },
          {
            title: { ko: "Storybook", en: "Storybook" },
            description: {
              ko: "공통 UI 컴포넌트 기준",
              en: "Shared UI component reference",
            },
          },
          {
            title: { ko: "Custom hooks", en: "Custom hooks" },
            description: {
              ko: "조회·입력 상태 공통화",
              en: "Share query and input state",
            },
          },
          {
            title: { ko: "ERP screens", en: "ERP screens" },
            description: {
              ko: "주문·재고·택배 운영",
              en: "Parcel, order, inventory ops",
            },
          },
        ],
      },
      en: {
        overview:
          "Design standards become shared components, pass through custom hooks, and connect to logistics operations screens.",
        nodes: [
          {
            title: { ko: "Figma", en: "Figma" },
            description: {
              ko: "화면·상호작용 스펙",
              en: "Screen and interaction specs",
            },
          },
          {
            title: { ko: "Storybook", en: "Storybook" },
            description: {
              ko: "공통 UI 컴포넌트 기준",
              en: "Shared UI component reference",
            },
          },
          {
            title: { ko: "Custom hooks", en: "Custom hooks" },
            description: {
              ko: "조회·입력 상태 공통화",
              en: "Share query and input state",
            },
          },
          {
            title: { ko: "ERP screens", en: "ERP screens" },
            description: {
              ko: "주문·재고·택배 운영",
              en: "Parcel, order, inventory ops",
            },
          },
        ],
      },
    },
  },
  {
    id: "project-06",
    type: "archive",
    category: "Development",
    year: "2024",
    image: "/assets/project-06/01.webp",
    subImages: [
      "/assets/project-06/02.webp",
      "/assets/project-06/03.webp",
      "/assets/project-06/04.webp",
    ],
    title: {
      ko: "가계부를 부탁해!",
      en: "Save Budget",
    },
    summary: {
      ko: "지출과 자산을 함께 관리하는 개인용 반응형 웹 애플리케이션",
      en: "Responsive personal web application for managing expenses and assets",
    },
    duration: { ko: "2024.01 — 2024.03", en: "2024.01 — 2024.03" },
    stack: [
      "React",
      "TypeScript",
      "Node.js",
      "Express",
      "MongoDB",
      "Vite",
      "TanStack Query",
      "Recoil",
      "React Router",
      "Styled-components",
      "Nivo",
    ],
    accomplishments: {
      ko: [
        "클라이언트와 서버를 하나의 모놀리식 리포지토리로 구성하고, 서비스 요구사항에 맞춰 API와 데이터 스키마 설계",
        "TanStack Query의 infiniteQuery로 지출 내역 무한 스크롤과 데이터 상태를 구현하고 fetchStatus·hasNextPage 기반 loader UI 구성",
        "date-fns·react-day-picker로 기간별 지출 조회를 제공하고, Nivo로 자산 등록·조회·수정 및 그래프 시각화 구현",
        "Mustache·Nodemailer 기반 멤버 초대 이메일, React Portal 기반 재사용 dropdown·modal, Media Query 기반 반응형 UX 구현",
      ],
      en: [
        "Built client and server in one monolithic repository and designed the APIs and data schema around the service requirements",
        "Implemented an expense-history infinite scroll with TanStack Query infiniteQuery and loader UI based on fetchStatus and hasNextPage",
        "Added date-range filtering with date-fns and react-day-picker, plus asset creation, editing, and chart visualization with Nivo",
        "Implemented member-invite emails with Mustache and Nodemailer, reusable dropdowns and modals with React Portal, and responsive UX with media queries",
      ],
    },
    role: {
      ko: "개인 프로젝트 · 단독 개발",
      en: "Personal project · solo development",
    },
    relatedLink: "https://savebudget.app",
    details: {
      ko: [
        "가계부를 부탁해!는 지출과 자산을 함께 관리하는 개인 프로젝트입니다. 클라이언트와 서버를 하나의 모놀리식 리포지토리로 구성하고, 프로젝트 요구사항을 충족하는 API와 데이터 스키마를 직접 설계했습니다.",
        "React Router로 페이지 라우팅과 navigate·redirect를 구현하고, TanStack Query 커스텀 훅의 infiniteQuery로 지출 내역을 필요한 구간씩 불러왔습니다. fetchStatus와 hasNextPage를 사용해 로딩 상태와 다음 데이터 존재 여부도 화면에 반영했습니다.",
        "date-fns와 react-day-picker로 특정 기간의 지출을 조회하고, Nivo 차트로 자산을 그래프 형태로 확인·수정할 수 있도록 구성했습니다. 멤버 초대는 Mustache 이메일 템플릿과 Nodemailer로 처리했습니다.",
        "페이지별 Open Graph 메타데이터, React Portal 기반 dropdown·modal, Desktop과 Mobile을 함께 고려한 반응형 UX까지 구현했습니다. 구현 과정은 개발 블로그의 TanStack Query 무한 스크롤 글로도 정리했습니다.",
      ],
      en: [
        "Save Budget is a personal project for managing expenses and assets. Client and server live in one monolithic repository, with the APIs and data schema designed around the product requirements.",
        "React Router handles routing, navigation, and redirects, while custom TanStack Query hooks use infiniteQuery to load expense history in the ranges the UI needs. fetchStatus and hasNextPage also drive the loading and continuation states.",
        "date-fns and react-day-picker provide date-range filtering, while Nivo visualizes assets as editable charts. Member invitations are sent through Mustache email templates and Nodemailer.",
        "The project also includes page-level Open Graph metadata, reusable dropdown and modal UI through React Portal, and responsive UX for desktop and mobile. The implementation is documented in a dev-blog post about TanStack Query infinite scroll.",
      ],
    },
    technicalChallenges: {
      ko: [
        "거래 데이터가 누적될수록 전체 목록 조회 비용이 커지는 문제를 TanStack Query infiniteQuery 기반 무한 스크롤로 전환하고, fetchStatus·hasNextPage에 따라 로더를 제어했습니다.",
        "서버 데이터와 화면 상태를 분리하고 mutation 이후 캐시를 무효화해, 사용자가 직접 새로고침하지 않아도 여러 화면의 목록을 동기화했습니다.",
        "클라이언트와 서버가 한 리포지토리에서 함께 동작하는 모놀리식 구조에서 API·스키마·라우팅·인증 경계를 분리해 기능이 커져도 각 책임을 추적할 수 있도록 했습니다.",
        "기간 필터, 자산 차트, 멤버 초대처럼 서로 다른 UI 흐름을 공통 상태·Portal 컴포넌트·반응형 규칙으로 묶어 Desktop과 Mobile에서 같은 도메인 상태를 유지했습니다.",
      ],
      en: [
        "As transactions accumulated, full-list queries became expensive, so the list moved to TanStack Query infiniteQuery with loader states driven by fetchStatus and hasNextPage.",
        "Separated server data from view state and invalidated the cache after mutations, keeping lists synchronized without a manual refresh.",
        "In a monolithic client/server repository, separated API, schema, routing, and authentication boundaries so each responsibility remained traceable as the feature set grew.",
        "Unified different UI flows — date filters, asset charts, and member invitations — through shared state, Portal components, and responsive rules across desktop and mobile.",
      ],
    },
    architecture: {
      image: "/architecture/project-06.svg",
      ko: {
        overview:
          "모놀리식 리포지토리 안에서 React 클라이언트와 Express API를 연결하고, TanStack Query로 필요한 지출 구간만 이어 받아 렌더링합니다.",
        nodes: [
          {
            title: { ko: "React client", en: "React client" },
            description: {
              ko: "Router·반응형 UI·Portal",
              en: "Router, responsive UI, Portal",
            },
          },
          {
            title: { ko: "TanStack Query", en: "TanStack Query" },
            description: {
              ko: "infiniteQuery·캐시 상태",
              en: "infiniteQuery and cache state",
            },
          },
          {
            title: { ko: "Express API", en: "Express API" },
            description: {
              ko: "지출·자산·멤버 API",
              en: "Expense, asset, and member APIs",
            },
          },
          {
            title: { ko: "Node API → MongoDB", en: "Node API → MongoDB" },
            description: {
              ko: "거래·자산 데이터 저장",
              en: "Store transaction and asset data",
            },
          },
        ],
      },
      en: {
        overview:
          "A monolithic repository connects the React client and Express API, while TanStack Query loads and renders only the next needed expense range.",
        nodes: [
          {
            title: { ko: "React client", en: "React client" },
            description: {
              ko: "Router·반응형 UI·Portal",
              en: "Router, responsive UI, Portal",
            },
          },
          {
            title: { ko: "TanStack Query", en: "TanStack Query" },
            description: {
              ko: "infiniteQuery·캐시 상태",
              en: "infiniteQuery and cache state",
            },
          },
          {
            title: { ko: "Express API", en: "Express API" },
            description: {
              ko: "지출·자산·멤버 API",
              en: "Expense, asset, and member APIs",
            },
          },
          {
            title: { ko: "Node API → MongoDB", en: "Node API → MongoDB" },
            description: {
              ko: "거래·자산 데이터 저장",
              en: "Store transaction and asset data",
            },
          },
        ],
      },
    },
  },
  {
    id: "project-07",
    type: "project",
    category: "Development",
    year: "2025",
    /* year(표기)만 2025 — 정렬은 sortDate 기준이라 기존 자리를 지킨다 */
    sortDate: "2024.06",
    image: "https://picsum.photos/seed/ftfsite/1600/1000?grayscale",
    subImages: [
      "https://picsum.photos/seed/ftfsite-landing/1600/1000?grayscale",
      "https://picsum.photos/seed/ftfsite-admin/1600/1000?grayscale",
    ],
    title: {
      ko: "랜딩페이지 & CS 운영 도구",
      en: "Landing Page & CS Operations",
    },
    summary: {
      ko: "랜딩페이지와 CS 문의·답변을 하나의 운영 파이프라인으로 연결",
      en: "Connected the landing page and CS intake-to-reply loop in one pipeline",
    },
    duration: { ko: "2024 — 운영 중", en: "2024 — In operation" },
    stack: ["LLM", "Cursor", "Full-stack", "Vercel", "Deployment"],
    accomplishments: {
      ko: [
        "회사 소개·솔루션 홍보 랜딩에 도입문의, 고객지원, CS 답변 기능을 확장하여 하나의 저장소에서 운영",
        "데이터베이스 없이 Google Sheets·Supabase Storage·Slack·Gmail을 연결해 문의 접수부터 답변까지 구현",
        "Slack의 ‘답변하기’ 링크에서 관리자 화면을 열고 시트 갱신과 고객 메일 회신으로 이어지는 루프 구성",
      ],
      en: [
        "Extended a company and solution marketing landing page into one repository that also handles inquiries, support, and CS replies",
        "Connected Google Sheets, Supabase Storage, Slack, and Gmail without a database, covering intake through reply",
        "Built a loop where Slack’s ‘Reply’ link opens the admin screen, then updates the sheet and sends the customer email",
      ],
    },
    role: {
      ko: "기획부터 배포까지 바이브코딩으로 단독 진행",
      en: "Solo vibe coding, from planning to deployment",
    },
    relatedLink: "https://ftf.co.kr",
    details: {
      ko: [
        "이 프로젝트는 회사 소개·솔루션 홍보용 랜딩페이지로 시작했지만, 이후 도입문의·고객지원·CS 답변을 처리하는 사내 운영 도구까지 같은 저장소 안에서 확장되었습니다. 방문자용 화면과 운영자용 화면은 목적과 권한을 분리하되 하나의 서비스 운영 흐름으로 연결했습니다.",
        "애플리케이션 자체에는 데이터베이스를 두지 않고 Google Sheets를 문의 이력의 원본으로 사용했습니다. 첨부파일은 Supabase Storage에 저장하고 Slack으로 담당자에게 알림을 보내며, 서버의 Route Handler가 네 개 외부 SaaS를 오케스트레이션하는 구조입니다.",
        "사내 앱의 질문 접수는 CORS로 허용된 외부 서버에서 시작해 파일 저장, 접수번호 채번과 시트 기록, Slack Block Kit 알림으로 이어집니다. 담당자는 Slack 메시지의 ‘답변하기’ 버튼으로 관리자 화면을 열고, 답변 제출 시 시트의 처리 정보와 첨부 링크를 갱신한 뒤 고객에게 메일을 보냅니다.",
      ],
      en: [
        "The project started as a company and solution marketing landing page, then expanded in the same repository into an internal tool for inquiries, support, and CS replies. Visitor and operator surfaces have different purposes and permissions, while remaining one operational service.",
        "The application has no database of its own: Google Sheets is the source of truth for inquiry history, Supabase Storage holds attachments, Slack notifies operators, and Gmail sends replies. Route Handlers orchestrate the four external SaaS services.",
        "An inquiry starts in an internal app allowed through CORS, then moves through file storage, sheet recording with a generated sequence number, and a Slack Block Kit notification. The operator opens the admin screen from Slack’s ‘Reply’ button; submitting a reply updates the sheet and attachment links before emailing the customer.",
      ],
    },
    technicalChallenges: {
      ko: [
        "CS 관리자 화면에 조회 API를 두지 않고 Slack 버튼 URL의 쿼리스트링에 접수번호·연락처·문의 내용·카테고리를 담았습니다. 서버 컴포넌트는 searchParams를 ReplyForm의 초기값으로 전달하여 별도 조회 계층 없이 답변 흐름을 완성합니다.",
        "접수 파이프라인을 파일 저장 → 시트 기록·채번 → Slack 알림으로 나누고, 첨부파일은 5MB와 확장자 검사를 거치도록 했습니다. 답변 시에는 선택 첨부파일을 reply- 접두로 다시 저장하고 시트의 처리 상태·답변·첨부 열을 갱신합니다.",
        "generateCsSeq는 시트에서 같은 날짜·카테고리의 마지막 순번을 찾아 증가시키는 방식이라 동시 접수 시 경합 가능성이 있고, A1:Z1000 범위에 의존합니다. 또한 관리자 URL에 개인정보가 포함되고 인증 계층이 없어 Slack 채널 접근 전제에 보안이 의존합니다.",
      ],
      en: [
        "The CS admin has no inquiry lookup API. Inquiry number, contact details, content, and category are encoded in the Slack button URL query string, and the server component passes searchParams directly into ReplyForm as initial values.",
        "The intake pipeline is split into file storage, sheet recording and sequence generation, then Slack notification, with a 5MB and extension check for uploads. Optional reply attachments are stored with a reply- prefix, while the sheet’s status, reply, and attachment columns are updated on submission.",
        "generateCsSeq reads the sheet to increment the last sequence for the same date and category, leaving a race condition under concurrent intake and a fixed A1:Z1000 range. The admin URL also contains personal data and has no authentication layer, so access depends on the Slack-channel boundary.",
      ],
    },
    architecture: {
      image: "/architecture/project-07.svg",
      ko: {
        overview:
          "외부 앱의 질문 접수부터 Slack을 통한 담당자 답변, 시트 갱신과 고객 메일 회신까지의 CS 루프를 서버 라우트와 외부 SaaS로 연결했습니다.",
        nodes: [
          {
            title: { ko: "사내 앱에서 질문 접수", en: "Inquiry intake" },
            description: {
              ko: "CORS · userId · category · content · 첨부",
              en: "CORS · userId · category · content · attachments",
            },
          },
          {
            title: {
              ko: "Next.js Route Handlers",
              en: "Next.js Route Handlers",
            },
            description: {
              ko: "파일 저장·시트 기록·Slack 알림",
              en: "File storage · sheet record · Slack alert",
            },
          },
          {
            title: { ko: "Slack 메시지", en: "Slack message" },
            description: {
              ko: "Block Kit · 답변하기 URL · 쿼리스트링",
              en: "Block Kit · Reply URL · query string",
            },
          },
          {
            title: { ko: "CS 답변 루프", en: "CS reply loop" },
            description: {
              ko: "관리자 폼 → 시트 갱신 → 고객 메일",
              en: "Admin form → sheet update → customer email",
            },
          },
        ],
      },
      en: {
        overview:
          "The CS loop connects inquiry intake from an internal app to an operator reply in Slack, a sheet update, and a customer email through Route Handlers and external SaaS.",
        nodes: [
          {
            title: { ko: "사내 앱에서 질문 접수", en: "Inquiry intake" },
            description: {
              ko: "CORS · userId · category · content · 첨부",
              en: "CORS · userId · category · content · attachments",
            },
          },
          {
            title: {
              ko: "Next.js Route Handlers",
              en: "Next.js Route Handlers",
            },
            description: {
              ko: "파일 저장·시트 기록·Slack 알림",
              en: "File storage · sheet record · Slack alert",
            },
          },
          {
            title: { ko: "Slack 메시지", en: "Slack message" },
            description: {
              ko: "Block Kit · 답변하기 URL · 쿼리스트링",
              en: "Block Kit · Reply URL · query string",
            },
          },
          {
            title: { ko: "CS 답변 루프", en: "CS reply loop" },
            description: {
              ko: "관리자 폼 → 시트 갱신 → 고객 메일",
              en: "Admin form → sheet update → customer email",
            },
          },
        ],
      },
    },
  },
  {
    id: "project-08",
    type: "archive",
    category: "Development",
    year: "2023",
    image: "https://picsum.photos/seed/kakaoauth/1600/1000?grayscale",
    subImages: [
      "https://picsum.photos/seed/kakaoauth-login/1600/1000?grayscale",
      "https://picsum.photos/seed/kakaoauth-api/1600/1000?grayscale",
    ],
    title: {
      ko: "엘리스트랙 SW엔지니어 트랙 프로젝트",
      en: "Elice SW Engineer Track Project",
    },
    summary: {
      ko: "React, TypeScript, Node.js, MongoDB 기반 교육 과정과 팀 프로젝트 수행",
      en: "Coursework and a team project using React, TypeScript, Node.js, and MongoDB",
    },
    duration: { ko: "2023.09 — 2023.12", en: "2023.09 — 2023.12" },
    stack: [
      "React",
      "TypeScript",
      "Node.js",
      "Express.js",
      "MongoDB",
      "Kakao API",
      "GCP VM",
    ],
    accomplishments: {
      ko: [
        "팀 전원이 의존하는 사용자·관리자 인증 API를 먼저 맡아 GCP VM 배포까지 담당",
        "회원가입 플로우를 간소화하기 위해 카카오 API 기반 소셜 로그인을 구현하고, 장소 검색·태깅 시스템·공통 UI를 구현",
      ],
      en: [
        "First owned the user/admin auth API that the whole team depended on, then handled deployment to a GCP VM",
        "Implemented Kakao API social login to simplify sign-up, along with place search, tagging, and shared UI",
      ],
    },
    role: {
      ko: "팀 프로젝트 — 인증 API·소셜 로그인·배포 담당",
      en: "Team project — auth API, social login, and deployment",
    },
    relatedLink: "https://youtu.be/vghjojw3kCY",
    details: {
      ko: [
        "엘리스트랙 SW엔지니어 트랙 7기에서 React, TypeScript, Node.js, MongoDB 기반 교육 과정을 수강하며 팀 프로젝트를 진행했습니다.",
        "팀 전원이 의존하는 사용자·관리자 인증 API를 먼저 맡아 GCP VM 배포까지 담당했습니다. 회원가입 플로우를 간소화하기 위해 카카오 API 기반 소셜 로그인을 구현하고, 장소 검색·태깅 시스템·공통 UI도 구현했습니다.",
        "카카오 인증 구현 과정은 개발 블로그에 정리했습니다.",
      ],
      en: [
        "During the 7th Elice SW Engineer Track, I completed coursework on React, TypeScript, Node.js, and MongoDB while working on a team project.",
        "I first owned the user/admin auth API that the whole team depended on and handled deployment to a GCP VM. To simplify sign-up, I implemented Kakao API social login along with place search, tagging, and shared UI.",
        "The Kakao auth implementation is written up on my dev blog.",
      ],
    },
    technicalChallenges: {
      ko: [
        "사용자와 관리자 권한을 나누면서 팀 전체가 의존하는 인증 API의 계약을 안정적으로 유지해야 했습니다.",
        "카카오 OAuth와 자체 JWT 인증 흐름을 연결하고, 로컬 개발 환경과 GCP VM 배포 환경에서 동일하게 동작하도록 구성했습니다.",
      ],
      en: [
        "The auth API contract had to remain stable while separating user and admin permissions for the whole team to depend on.",
        "Connected Kakao OAuth with the application's JWT flow and kept behavior consistent between local development and deployment on a GCP VM.",
      ],
    },
    architecture: {
      image: "/architecture/project-08.svg",
      ko: {
        overview:
          "React 클라이언트와 Node.js API를 기반으로 인증·소셜 로그인·장소 검색·태깅 기능을 구현하고 GCP VM에 배포한 팀 프로젝트입니다.",
        nodes: [
          {
            title: { ko: "React client", en: "React client" },
            description: {
              ko: "로그인·장소 검색·공통 UI",
              en: "Login, place search, and shared UI",
            },
          },
          {
            title: { ko: "Express API", en: "Express API" },
            description: {
              ko: "사용자·관리자 인증·태깅",
              en: "User/admin auth and tagging",
            },
          },
          {
            title: { ko: "Kakao API", en: "Kakao API" },
            description: {
              ko: "소셜 로그인 구현",
              en: "Implement social login",
            },
          },
          {
            title: { ko: "MongoDB + GCP VM", en: "MongoDB + GCP VM" },
            description: {
              ko: "데이터 저장·서비스 배포",
              en: "Store data and deploy service",
            },
          },
        ],
      },
      en: {
        overview:
          "A team project built with a React client and Node.js API, implementing auth, social login, place search, and tagging before deployment to a GCP VM.",
        nodes: [
          {
            title: { ko: "React client", en: "React client" },
            description: {
              ko: "로그인·장소 검색·공통 UI",
              en: "Login, place search, and shared UI",
            },
          },
          {
            title: { ko: "Express API", en: "Express API" },
            description: {
              ko: "사용자·관리자 인증·태깅",
              en: "User/admin auth and tagging",
            },
          },
          {
            title: { ko: "Kakao API", en: "Kakao API" },
            description: {
              ko: "소셜 로그인 구현",
              en: "Implement social login",
            },
          },
          {
            title: { ko: "MongoDB + GCP VM", en: "MongoDB + GCP VM" },
            description: {
              ko: "데이터 저장·서비스 배포",
              en: "Store data and deploy service",
            },
          },
        ],
      },
    },
  },
  {
    id: "archive-01",
    type: "archive",
    category: "Product Design",
    year: "2022 — 2023",
    sortDate: "2022.01",
    image: "/assets/archive-01/01.webp",
    title: {
      ko: "MiriCanvas",
      en: "MiriCanvas",
    },
    summary: {
      ko: "디자인 툴의 유료 요금제 전환을 위한 가입·구독 경험 개선",
      en: "Improved sign-up and subscription experiences for a design tool's paid conversion",
    },
    duration: { ko: "2022 — 2023", en: "2022 — 2023" },
    stack: ["Product Design", "UI Design", "UX Design", "Web", "Design Tool"],
    objectives: {
      title: {
        ko: "성공적인 유료 요금제로의 전환",
        en: "A successful transition to paid plans",
      },
      description: {
        ko: [
          "미리캔버스는 22년 5월 일반 고객들을 대상으로 한 구독 요금제를 공개했습니다. 그동안 무료로 사용하던 수백만 명의 고객들 중 더 많은 고객들을 유료 요금제로 전환시키기 위해 구독 및 업그레이드 정책, 요구사항 작성과 화면 디자인을 담당하였으며, 구독 요금제 론칭 이후에도 회원 가입 전환율, 구독 전환율, 해지율 등 다양한 지표 개선을 위한 작업들도 꾸준히 진행하며 긍정적인 지표 변화에 기여하고 있습니다.",
          "정책과 요구사항 작성 전 경쟁사 및 시트 수 단위 과금 정책을 시행하고 있는 서비스들에 대한 데스크 리서치를 수행하고, 구독 및 과금에 대한 정책 그리고 화면 단위의 상세 요구사항을 작성하여 개발을 위한 커뮤니케이션도 직접 진행했습니다.",
        ],
        en: [
          "MiriCanvas launched subscription plans for general customers in May 2022. To convert more of the millions of customers who had used the service for free to paid plans, I owned subscription and upgrade policies, requirements writing, and screen design. After the launch, I continued improving metrics such as sign-up conversion, subscription conversion, and churn, contributing to positive changes in those indicators.",
          "Before writing the policies and requirements, I conducted desk research on competitors and services using sheet-based or unit-based pricing. I then defined subscription and billing policies, wrote detailed screen-level requirements, and handled the development communication directly.",
        ],
      },
    },
    accomplishments: {
      ko: [
        "소셜 로그인 중심의 가입 경험을 개선하여 회원가입 전환율을 높이는 UI 작업 진행",
        "구독 신청 단계를 4단계에서 2단계로 축소하고 간편결제를 제공하여 신청 완료율 개선",
        "해지 시 할인 혜택을 안내하는 단계를 추가하여 구독 해지율 감소에 기여",
      ],
      en: [
        "Improved the sign-up UI around social login to increase registration conversion",
        "Reduced subscription checkout from four steps to two and added simple payments, improving completion",
        "Added a discount offer at cancellation to reduce subscription churn",
      ],
    },
    role: {
      ko: "Product Designer",
      en: "Product Designer",
    },
    relatedLink: "https://miricanvas.com", //PORTFOLIO_URL,
    details: {
      ko: [
        "미리캔버스의 유료 요금제 전환을 목표로 가입, 구독 신청, 결제, 해지 경험을 개선한 프로젝트입니다.",
        "정책과 요구사항을 정리하고 화면 단위의 상세 요구사항을 작성하여 개발 커뮤니케이션까지 직접 진행했습니다.",
      ],
      en: [
        "A project improving sign-up, subscription, payment, and cancellation experiences to support MiriCanvas paid-plan conversion.",
        "I documented policies and requirements at screen level and carried the work through development communication.",
      ],
    },
  },
  {
    id: "archive-02",
    type: "archive",
    category: "Product Design",
    year: "2020",
    image: "/assets/archive-02/01.webp",
    subImages: ["/assets/archive-02/02.webp", "/assets/archive-02/03.webp"],
    title: {
      ko: "Tradipod",
      en: "Tradipod",
    },
    summary: {
      ko: "전통 공예 작품과 작가를 소개하고 판매하는 글로벌 모바일 웹",
      en: "Global mobile web service for discovering and selling traditional crafts",
    },
    duration: { ko: "2020.12", en: "2020.12" },
    stack: [
      "UI/UX Design",
      "BI Design",
      "Mobile Web",
      "Design System",
      "Sketch",
      "InVision",
      "Zeplin",
    ],
    objectives: {
      title: {
        ko: "전통과 현대적 감성의 조합",
        en: "Combining tradition with a modern sensibility",
      },
      description: {
        ko: [
          "트래디팟은 한국의 전통 공예 문화·작품들을 더 많은 사람들에게 알리고, 판매까지 도와줄 수 있는 글로벌 플랫폼을 목표로 시작했습니다. 그렇기에 전통이라는 다소 고리타분하고 다가가기 어려운 콘텐츠를 누구나 쉽게 접근할 수 있도록 현대적 감성과 세련된 취향을 표방할 수 있는 세련되고 간결한 인터페이스를 만들었습니다.",
        ],
        en: [
          "Tradipod began as a global platform to introduce Korean traditional craft culture and artworks to more people and help them reach a purchase. To make a tradition that could feel old-fashioned or difficult to approach accessible to everyone, I created a refined and concise interface with a modern sensibility and polished taste.",
        ],
      },
    },
    accomplishments: {
      ko: [
        "브랜드 아이디어부터 구현·런칭까지 서비스에 필요한 전체 디자인 산출물 제작",
        "Zeplin으로 컴포넌트 가이드와 디자인 시스템을 구축해 개발 협업의 일관성과 효율 개선",
        "InVision 또는 HTML·jQuery 프로토타입으로 서비스 플로우와 인터랙션을 검증",
      ],
      en: [
        "Created the full set of design deliverables from brand ideation through implementation and launch",
        "Built and maintained a component guide and design system in Zeplin for consistent, efficient collaboration",
        "Delivered service-flow and interaction prototypes with InVision or HTML and jQuery",
      ],
    },
    role: {
      ko: "UI/UX 디자이너",
      en: "UI/UX Designer",
    },
    relatedLink: null, // PORTFOLIO_URL,
    details: {
      ko: [
        "작가 정보, 작품, 스토리, 경매 콘텐츠를 담아 전통 공예를 소개하고 판매하는 글로벌 플랫폼 Tradipod의 Mobile Web UI Design을 담당했습니다.",
        "서비스의 성격을 표현하기 위한 콘셉트 설정부터 Sketch를 활용한 BI·UI 디자인, InVision을 활용한 UI flow 설계까지 진행해 구성원 간 서비스 이해와 의사결정을 도왔습니다.",
        "개발에 필요한 컴포넌트 가이드를 작성해 Zeplin으로 공유하고, 디자인과 개발이 같은 기준으로 진행되도록 협업 체계를 정리했습니다.",
      ],
      en: [
        "Tradipod is a global platform for introducing and selling traditional crafts through artist information, artworks, stories, and auction content. I worked on its mobile web UI design.",
        "I shaped the concept, designed the BI and UI in Sketch, and mapped the service flow in InVision to build shared understanding and speed up decisions.",
        "I documented the component guide for development and shared it through Zeplin so design and implementation could follow the same system.",
      ],
    },
  },
  {
    id: "archive-03",
    type: "archive",
    category: "Product Design",
    year: "2016",
    image: "/assets/archive-03/01.webp",
    subImages: [
      "/assets/archive-03/02.webp",
      "/assets/archive-03/03.webp",
      "/assets/archive-03/04.webp",
      "/assets/archive-03/05.webp",
      "/assets/archive-03/06.webp",
      "/assets/archive-03/07.webp",
      "/assets/archive-03/08.webp",
      "/assets/archive-03/09.webp",
      "/assets/archive-03/10.webp",
      "/assets/archive-03/11.webp",
      "/assets/archive-03/12.webp",
      "/assets/archive-03/13.webp",
      "/assets/archive-03/14.webp",
    ],
    title: {
      ko: "JANDI",
      en: "JANDI",
    },
    summary: {
      ko: "아시아 시장을 타깃으로 한 기업용 메시징 플랫폼의 UI/UX 설계",
      en: "UI/UX design for an enterprise messaging platform targeting Asia",
    },
    duration: { ko: "2016.04", en: "2016.04" },
    stack: [
      "UI/UX Design",
      "Web",
      "Responsive",
      "Prototyping",
      "UI Development",
      "JavaScript",
      "jQuery",
    ],
    objectives: {
      title: {
        ko: "직관적인 사용자 경험을 제공",
        en: "Delivering an intuitive user experience",
      },
      description: {
        ko: [
          "잔디는 실시간 채팅을 기반으로 협업을 도와주는 생산성 툴입니다. 사용자들을 위한 직관적이고 유용한 기능들을 찾고, 인터페이스를 지속적으로 업데이트하고 개선하며 사용자 경험을 증대시켰습니다.",
        ],
        en: [
          "JANDI is a productivity tool that supports collaboration through real-time chat. I identified intuitive and useful features for users, then continuously updated and improved the interface to enhance the user experience.",
        ],
      },
    },
    accomplishments: {
      ko: [
        "JANDI 랜딩 페이지와 웹 애플리케이션의 UI 디자인 및 개선 작업을 주도",
        "Chat-View 웹 프로토타입과 애니메이션을 직접 구현해 사용자 경험과 의사결정 속도 개선",
        "JANDI Component Generator 같은 실험적 도구를 제작해 컴포넌트 기반 제품 완성도 향상",
      ],
      en: [
        "Led UI design and improvements for the JANDI landing page and web application",
        "Built a Chat-View web prototype and animations to improve the experience and speed up product decisions",
        "Created experimental tools such as the JANDI Component Generator to raise the quality of the product system",
      ],
    },
    role: {
      ko: "UI/UX 디자이너",
      en: "UI/UX Designer",
    },
    relatedLink: "https://jandi.com", //PORTFOLIO_URL,
    details: {
      ko: [
        "JANDI는 아시아 시장을 타깃으로 한 기업용 메시징 플랫폼입니다. JANDI 웹 애플리케이션의 인터페이스 디자인과 개선 작업, 랜딩 페이지의 서브 페이지와 애니메이션 구현을 담당했습니다.",
        "JavaScript와 jQuery를 사용해 웹 프로토타입을 직접 구현하며 빠른 의사결정 프로세스를 지원했고, 컴포넌트 생성기와 같은 실험적인 작업을 통해 제품의 완성도를 높이는 방법을 탐색했습니다.",
      ],
      en: [
        "JANDI is an enterprise messaging platform targeting the Asian market. I worked on the web application's interface design and improvements, including landing-page subpages and animations.",
        "I built web prototypes directly with JavaScript and jQuery to support faster decisions, and explored experimental tools such as a component generator to improve product quality.",
      ],
    },
  },
  {
    id: "archive-04",
    type: "archive",
    category: "UI/UX Design",
    year: "2015",
    image: "/assets/archive-04/01.webp",
    subImages: [
      "/assets/archive-04/02.webp",
      "/assets/archive-04/03.webp",
      "/assets/archive-04/04.webp",
      "/assets/archive-04/05.webp",
      "/assets/archive-04/06.webp",
      "/assets/archive-04/07.webp",
      "/assets/archive-04/08.webp",
    ],
    title: {
      ko: "IUEditor",
      en: "IUEditor",
    },
    summary: {
      ko: "Mac OS X용 드래그 앤 드롭 기반 웹 에디터의 인터페이스 설계",
      en: "Interface design for a drag-and-drop web editor on Mac OS X",
    },
    duration: { ko: "2015.07", en: "2015.07" },
    stack: [
      "Interface Design",
      "Interaction Design",
      "Mac OS X",
      "Web Editor",
      "Widget Prototype",
      "Documentation",
    ],
    accomplishments: {
      ko: [
        "Mac OS X용 드래그 앤 드롭 기반 웹 에디터의 인터페이스 정보 구조와 디자인 설계",
        "샘플 웹페이지와 위젯 프로토타입을 제작해 에디터의 활용 방식 구체화",
        "튜토리얼·매뉴얼 페이지와 브로슈어·마케팅 자료까지 제품 커뮤니케이션 전반 제작",
      ],
      en: [
        "Designed the interface information architecture and visual system for a drag-and-drop web editor on Mac OS X",
        "Created sample web pages and widget prototypes to demonstrate how the editor could be used",
        "Produced tutorials, manuals, brochures, and marketing materials across the product communication system",
      ],
    },
    role: { ko: "UI/UX 디자이너", en: "UI/UX Designer" },
    relatedLink: null, // PORTFOLIO_URL,
    details: {
      ko: [
        "IUEditor는 Mac OS X용 드래그 앤 드롭 기반 웹 에디터 프로그램입니다. 소프트웨어의 인터페이스 정보 구조와 디자인을 중심으로 샘플 웹페이지, 위젯 프로토타입, 브로슈어와 마케팅 자료를 제작했습니다.",
        "사용자가 기능을 이해하고 활용할 수 있도록 튜토리얼과 매뉴얼 페이지까지 직접 구성해 제품 경험과 안내 체계를 함께 설계했습니다.",
      ],
      en: [
        "IUEditor is a drag-and-drop interaction-based web editor for Mac OS X. I focused on the software's interface and interaction design, while also creating sample web pages, widget prototypes, brochures, and marketing materials.",
        "I also created the tutorials and manual pages so the product's feature education and overall guidance system were designed as part of the experience.",
      ],
    },
  },
  {
    id: "archive-05",
    type: "archive",
    category: "UI/UX Design",
    year: "2014",
    image: "/assets/archive-05/01.webp",
    subImages: [
      "/assets/archive-05/02.webp",
      "/assets/archive-05/03.webp",
      "/assets/archive-05/04.webp",
      "/assets/archive-05/05.webp",
      "/assets/archive-05/06.webp",
      "/assets/archive-05/07.webp",
    ],
    title: {
      ko: "Bargain Hunter",
      en: "Bargain Hunter",
    },
    summary: {
      ko: "국내 쇼퍼를 위한 위치 기반 핫딜 모바일 서비스",
      en: "Location-based hot-deal mobile service for South Korean shoppers",
    },
    duration: { ko: "2014.06", en: "2014.06" },
    stack: [
      "UI/UX Design",
      "Mobile App",
      "Location-Based Service",
      "Motion Design",
      "Prototyping",
    ],
    accomplishments: {
      ko: [
        "사용자 주변의 한정 기간 핫딜 정보를 제공하는 위치 기반 서비스의 핵심 사용자 흐름 설계",
        "온보딩·프로필·기간 설정·위치 정보 등 서브 페이지 디자인 담당",
        "온보딩 애니메이션과 모션 프로토타입을 제작해 초기 경험을 구체화",
      ],
      en: [
        "Designed the core user flows for a location-based service delivering limited-time hot deals nearby",
        "Designed subpages including onboarding, profile, date-range, and location-information screens",
        "Created the onboarding animation and motion prototypes to make the initial experience tangible",
      ],
    },
    role: { ko: "UI/UX 디자이너", en: "UI/UX Designer" },
    relatedLink: null, // PORTFOLIO_URL,
    details: {
      ko: [
        "Bargain Hunter는 국내 쇼퍼를 위한 위치 기반 모바일 애플리케이션입니다. 사용자의 현재 위치 주변에서 제한된 기간 동안 제공되는 핫딜 정보를 확인할 수 있도록 설계했습니다.",
        "실제 개발까지 진행되었지만 출시되지는 않았으며, 온보딩·프로필·기간 설정·위치 정보 등 서브 페이지 디자인과 모션 프로토타입 작성을 담당했습니다.",
      ],
      en: [
        "Bargain Hunter is a location-based mobile application for South Korean shoppers. It surfaces nearby hot deals available for a limited period.",
        "The product reached development but was not released. I was responsible for subpage design — including onboarding, profile, date-range, and location screens — and motion prototyping.",
      ],
    },
  },
  /* 주석처리(미노출)
  {
    id: "archive-06",
    type: "archive",
    category: "UI/UX Design",
    year: "Past",
    image: "https://picsum.photos/seed/munnwebstore/1600/1000?grayscale",
    subImages: [
      "https://picsum.photos/seed/munnwebstore-home/1600/1000?grayscale",
      "https://picsum.photos/seed/munnwebstore-product/1600/1000?grayscale",
    ],
    title: {
      ko: "MUNN Web Store",
      en: "MUNN Web Store",
    },
    summary: {
      ko: "웹 스토어의 사용자 경험과 화면 디자인",
      en: "User experience and web design for an online store",
    },
    duration: { ko: "이전 프로젝트", en: "Past project" },
    stack: ["Web Design", "E-commerce"],
    accomplishments: {
      ko: ["웹 스토어의 주요 화면과 구매 경험을 설계"],
      en: ["Designed key screens and purchase experience for the web store"],
    },
    role: { ko: "Web Design", en: "Web Design" },
    relatedLink: null, //PORTFOLIO_URL,
    details: {
      ko: ["2023 포트폴리오에 수록된 과거 프로젝트입니다."],
      en: ["A past project included in the 2023 portfolio."],
    },
  },
  */
  {
    id: "archive-07",
    type: "archive",
    category: "UI/UX Design",
    year: "2013",
    image: "/assets/archive-07/01.webp",
    subImages: [
      "/assets/archive-07/02.webp",
      "/assets/archive-07/03.webp",
      "/assets/archive-07/04.webp",
      "/assets/archive-07/05.webp",
      "/assets/archive-07/06.webp",
      "/assets/archive-07/07.webp",
      "/assets/archive-07/08.webp",
      "/assets/archive-07/09.webp",
      "/assets/archive-07/10.webp",
      "/assets/archive-07/11.webp",
      "/assets/archive-07/12.webp",
      "/assets/archive-07/13.webp",
      "/assets/archive-07/14.webp",
      "/assets/archive-07/15.webp",
    ],
    title: {
      ko: "BBZ10 Music App",
      en: "BBZ10 Music App",
    },
    summary: {
      ko: "소셜 기능을 결합한 BlackBerry Z10용 뮤직 플레이어 콘셉트",
      en: "BlackBerry Z10 music player concept with integrated social features",
    },
    duration: { ko: "2013.06", en: "2013.06" },
    stack: [
      "UI Design",
      "Mobile App",
      "BlackBerry Z10",
      "Interaction Design",
      "Social Music",
    ],
    accomplishments: {
      ko: [
        "기존 플레이어에 소셜 네트워크 서비스를 결합한 새로운 음악 감상 경험 구상",
        "세 가지 메뉴 구조와 스와이프 제스처를 중심으로 간결한 사용자 흐름 설계",
        "음악을 언제든 친구와 공유할 수 있는 소셜 인터랙션 방향 제안",
      ],
      en: [
        "Explored a new listening experience by combining a music player with a social network service",
        "Designed a simple flow around three menus and swipe gestures",
        "Proposed social interactions that let users share music with friends at any time",
      ],
    },
    role: { ko: "UI 디자이너", en: "UI Designer" },
    relatedLink: null, // PORTFOLIO_URL,
    details: {
      ko: [
        "BlackBerry Z10을 위한 뮤직 플레이어 애플리케이션 콘셉트 디자인입니다. 소셜 네트워크 서비스를 포함한 새로운 음악 플레이어를 구상하고, 세 가지 메뉴와 스와이프 제스처로 쉽게 사용할 수 있는 흐름을 설계했습니다.",
        "사용자가 음악을 감상하는 동시에 친구와 곡을 공유할 수 있도록 소셜 기능을 제품 경험의 일부로 제안했습니다.",
      ],
      en: [
        "A concept design for a music player application on BlackBerry Z10. I imagined a new player with a social network service and designed an easy-to-use flow around three menus and swipe gestures.",
        "The concept made social sharing part of the listening experience, allowing users to share music with friends at any time.",
      ],
    },
  },
  {
    id: "archive-08",
    type: "archive",
    category: "UI/UX Design",
    year: "2012",
    image: "/assets/archive-08/01.webp",
    subImages: [
      "/assets/archive-08/02.webp",
      "/assets/archive-08/03.webp",
      "/assets/archive-08/04.webp",
      "/assets/archive-08/05.webp",
      "/assets/archive-08/06.webp",
      "/assets/archive-08/07.webp",
      "/assets/archive-08/08.webp",
      "/assets/archive-08/09.webp",
    ],
    title: {
      ko: "PRISM UX",
      en: "PRISM UX",
    },
    summary: {
      ko: "독일 시장을 위한 차세대 홈 미디어 서버 셋톱박스 UX",
      en: "Next-generation home media server set-top box UX for the German market",
    },
    duration: { ko: "2012.06", en: "2012.06" },
    stack: [
      "UI/UX Design",
      "Interaction Design",
      "Motion Design",
      "Prototyping",
      "Set-top Box",
      "TV",
    ],
    accomplishments: {
      ko: [
        "독일 소비자 가전 시장을 타깃으로 한 차세대 홈 미디어 서버 인터페이스의 전체 디자인 프로세스 참여",
        "N-screen·검색 연관 콘텐츠·4튜너 녹화를 중심으로 셋톱박스 인터랙션과 화면 설계",
        "인터랙션·모션 디자인, 프로토타이핑, 애니메이션 가이드를 통해 실제 구현까지 연결",
      ],
      en: [
        "Participated in the end-to-end design process for a next-generation home media server interface targeting the German consumer-electronics market",
        "Designed set-top box interactions and screens around N-screen, search-related content, and four-tuner recording",
        "Connected the concept to implementation through interaction and motion design, prototyping, and animation guidelines",
      ],
    },
    role: {
      ko: "인터랙션·모션 디자이너",
      en: "Interaction & Motion Designer",
    },
    relatedLink: null, // PORTFOLIO_URL,
    details: {
      ko: [
        "PRISM UX는 독일 소비자 가전 시장을 위해 디자인한 차세대 셋톱박스 인터페이스입니다. 타깃 제품인 홈 미디어 서버는 N-screen, 검색 연관 콘텐츠, 4튜너 녹화 기능을 제공합니다.",
        "콘셉트부터 실제 개발 구현까지 전체 디자인 프로세스에 참여했으며, 인터랙션 디자인·모션 디자인·프로토타이핑과 애니메이션 가이드에 집중했습니다. 프로젝트는 IF Design 2015 Communication Design 수상작으로 소개되었습니다.",
      ],
      en: [
        "PRISM UX is an interface for a next-generation set-top box designed for the German consumer-electronics market. The target home media server provides N-screen, search-related content, and four-tuner recording.",
        "I participated in the full design process from concept through implementation, focusing on interaction design, motion design, prototyping, and animation guidelines. The project was recognized with an iF Design 2015 Communication Design award.",
      ],
    },
  },
];

export async function getProjects(): Promise<WorkItem[]> {
  "use cache";
  cacheLife("work");
  cacheTag(workCache.projectsTag);
  const resolved = await Promise.all(
    items.filter((item) => item.type === "project").map(resolveAssetImages),
  );
  return resolved.sort(byNewest);
}

export async function getArchives(): Promise<WorkItem[]> {
  "use cache";
  cacheLife("work");
  cacheTag(workCache.archivesTag);
  const resolved = await Promise.all(
    items.filter((item) => item.type === "archive").map(resolveAssetImages),
  );
  return resolved.sort(byNewest);
}

function byNewest(a: WorkItem, b: WorkItem) {
  return getStartDate(b) - getStartDate(a);
}

function getStartDate(item: WorkItem) {
  const match = (item.sortDate ?? item.duration.ko).match(
    /20\d{2}(?:\.\d{2})?/,
  );
  return match ? Number(match[0].replace(".", "")) : 0;
}

export async function getWorkItem(id: string): Promise<WorkItem | null> {
  "use cache";
  cacheLife("work");
  cacheTag(workCache.itemTag(id));
  const item = items.find((item) => item.id === id);
  return item ? await resolveAssetImages(item) : null;
}
