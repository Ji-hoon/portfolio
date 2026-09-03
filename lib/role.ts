export const ROLES = ["frontend", "design", "product"] as const;
export type Role = (typeof ROLES)[number];

/** 사이트 공통 title — 역할과 무관하게 고정, layout과 og/twitter가 공유한다. */
export const SITE_TITLE = "Jihoon Kim";

/** 배포 도메인 — metadataBase·canonical·og:url이 공유한다. */
export const SITE_URL = "https://www.jihoonkim.com";

const isRole = (value: unknown): value is Role =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);

/** 진입 `?r=`을 탭 세션 동안 보존하는 키 — layout 인라인 스크립트가 쓰고 Header가 읽는다. */
export const ROLE_STORAGE_KEY = "portfolio-role";

/** 진입 시 `?r=`로 저장된 역할 — 없거나 storage 접근이 막혀 있으면 null. */
export const readStoredRole = (): Role | null => {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(ROLE_STORAGE_KEY);
    return isRole(value) ? value : null;
  } catch {
    return null;
  }
};

/** `?r=` 판별 — 알 수 없는 값·누락은 전부 기본값(frontend)으로 떨어진다. */
export const resolveRole = (raw?: string | string[]): Role => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isRole(value) ? value : "frontend";
};

/** 역할별 meta description — title은 고정, description만 갈린다. */
export const ROLE_DESCRIPTION: Record<Role, string> = {
  frontend:
    "10+년 이상 SaaS/B2B 프로덕트를 개선해 온 디자인 경험과 2년 이상의 프론트엔드 개발 실무 역량을 기반으로 사용자 경험과 비즈니스 요구사항을 함께 설계/구현하는 프론트엔드 개발자입니다.",
  design:
    "10+년 이상 SaaS/B2B 프로덕트를 개선해 온 디자인 경험과 2년 이상의 프론트엔드 개발 실무 역량을 기반으로 사용자 경험과 비즈니스 요구사항을 함께 설계/구현하는 디자인 엔지니어입니다.",
  product:
    "10+년 이상 SaaS/B2B 프로덕트를 개선해 온 디자인 경험과 2년 이상의 프론트엔드 개발 실무 역량을 기반으로 제품 정의부터 배포, AI를 개발 프로세스와 제품에 넣고 운영 경계까지 설계하는 프로덕트 엔지니어입니다.",
};

/**
 * 히어로 회전 슬롯 대신 스크린리더·텍스트 추출에 노출되는 단일 역할 명칭.
 * 회전 슬롯 자체는 세 변형 공통(디자이너 ⇄ 엔지니어)으로 고정이다.
 */
export const ROLE_LABEL: Record<Role, { ko: string; en: string }> = {
  frontend: { ko: "프론트엔드 엔지니어", en: "Frontend Engineer" },
  design: { ko: "디자인 엔지니어", en: "Design Engineer" },
  product: { ko: "프로덕트 엔지니어", en: "Product Engineer" },
};

/**
 * og/twitter 공통 세트 — layout 기본값과 홈 generateMetadata가 공유한다.
 * 페이지에서 openGraph를 정의하면 layout 것과 병합되지 않고 통째로 교체되므로,
 * siteName·locale·type까지 포함한 완전한 세트를 항상 이 헬퍼로 만든다.
 * og/twitter title만 역할 명칭(영문)으로 분기한다 — <title>·og 이미지는 고정.
 */
export const buildSocialMeta = (
  description: string,
  role: Role = "frontend",
) => {
  const title = `${SITE_TITLE} — ${ROLE_LABEL[role].en}`;

  return {
    openGraph: {
      title,
      description,
      siteName: SITE_TITLE,
      locale: "ko_KR",
      type: "website" as const,
    },
    twitter: {
      card: "summary" as const,
      title,
      description,
    },
  };
};
