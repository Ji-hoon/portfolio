"use client";

import { useSyncExternalStore } from "react";
import { readStoredRole, type Role } from "./role";

// 진입 역할은 하이드레이션 전에 layout 인라인 스크립트가 한 번 쓰고 나면 문서
// 로드 없이는 바뀌지 않는다 — 구독할 변화가 없으므로 no-op subscribe.
const subscribeToNothing = () => () => {};
const getServerSnapshot = () => null;

/** 진입 `?r=`로 저장된 역할 — 서버 렌더·storage 차단 환경에서는 null. */
export function useEntryRole(): Role | null {
  return useSyncExternalStore(
    subscribeToNothing,
    readStoredRole,
    getServerSnapshot,
  );
}

/** 진입 역할을 내부 링크에 되붙이는 쿼리 조각 — 역할이 없으면 빈 문자열. */
export const roleQuery = (role: Role | null) => (role ? `?r=${role}` : "");
