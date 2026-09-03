export type Lang = "ko" | "en";

export type LText = Record<Lang, string>;

export const ui = {
  logo: { ko: "Jihoon Kim", en: "Jihoon Kim" },
  nav: {
    projects: { ko: "Projects", en: "Projects" },
    archives: { ko: "Archives", en: "Archives" },
    contact: { ko: "Contact", en: "Contact" },
  },
  hero: {
    headline: {
      ko: "10+년의 프로덕트 디자인 경험 위에서, ",
      en: "With 10+ years in product design, I’m a ",
    },
    headlineAfterRole: {
      ko: "로서 사용자 경험과 비즈니스 요구사항을 함께 설계하고 구현합니다.",
      en: ", building useful products.",
    },
    currentLabel: {
      ko: "Current :",
      en: "Current :",
    },
    role: {
      ko: "프론트엔드 개발자 · 개발팀",
      en: "Frontend Developer · Dev Team",
    },
    selectedWork: { ko: "Work Experiences :", en: "Work Experiences :" },
    period: {
      ko: "개발경력 2년 · 총 경력 12년+",
      en: "2 yrs in dev · 12+ yrs total",
    },
  },
  sections: {
    projects: {
      title: { ko: "Projects", en: "Projects" },
      description: {
        ko: "주요 프로젝트",
        en: "Selected professional work",
      },
    },
    archives: {
      title: { ko: "Archives", en: "Archives" },
      description: {
        ko: "이전 프로젝트와 디자인 작업 아카이브",
        en: "Past projects and design work",
      },
    },
    contact: {
      title: { ko: "Contact", en: "Contact" },
      description: {
        ko: "",
        en: "",
      },
    },
  },
  detail: {
    back: { ko: "목록으로", en: "Back" },
    duration: { ko: "Duration", en: "Duration" },
    techStack: { ko: "Skills / Tools", en: "Skills / Tools" },
    skills: { ko: "Skills / Tools", en: "Skills / Tools" },
    objectives: { ko: "Objectives", en: "Objectives" },
    accomplishments: { ko: "Key Accomplishment", en: "Key Accomplishment" },
    role: { ko: "Role", en: "Role" },
    relatedLink: { ko: "Related Link", en: "Related Link" },
    details: { ko: "Details", en: "Details" },
    technicalChallenges: {
      ko: "Technical Challenges",
      en: "Technical Challenges",
    },
    architecture: { ko: "Architecture", en: "Architecture" },
    toc: { ko: "목차", en: "Contents" },
    project: { ko: "Project", en: "Project" },
    archive: { ko: "Archive", en: "Archive" },
  },
  more: { ko: "더보기", en: "View all" },
  notFound: {
    message: {
      ko: "요청하신 페이지를 찾을 수 없습니다.",
      en: "The page you are looking for could not be found.",
    },
    home: { ko: "홈으로 돌아가기", en: "Back to home" },
  },
} as const;
