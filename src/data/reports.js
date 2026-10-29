import { reviews } from './reviews';
import { daysAgo } from '../lib/format';

/* 신고 (admin-service report) — 사유 코드는 backend docs/api/admin.md 신고 사유 표와 같다 (대상마다 고를 수 있는 사유가 다름) */
export const REPORT_REASONS = {
  REVIEW: [
    { code: 'SPAM', label: '광고 · 도배' },
    { code: 'ABUSE', label: '욕설 · 비방' },
    { code: 'FALSE_INFO', label: '허위 · 구매와 무관한 리뷰' },
    { code: 'PRIVACY', label: '개인정보 노출' },
    { code: 'OBSCENE', label: '음란 · 부적절한 사진' },
    { code: 'ETC', label: '기타' },
  ],
  USER: [
    { code: 'FRAUD', label: '거래 사기 · 결제 도용 의심' },
    { code: 'ABUSE', label: '욕설 · 비방' },
    { code: 'SPAM', label: '광고 · 도배' },
    { code: 'ETC', label: '기타' },
  ],
};
// 판매자 "관리자 검토 요청" — 판매자 리뷰 화면에서 이 코드로 신고 (내 스토어 리뷰만)
export const SELLER_REQUEST = 'SELLER_REQUEST';

export const REPORT_REASON_LABEL = {
  ...Object.fromEntries([...REPORT_REASONS.REVIEW, ...REPORT_REASONS.USER].map((r) => [r.code, r.label])),
  [SELLER_REQUEST]: '판매자 검토 요청',
};

/* ─────────── 신고 목업 데이터 (관리자 신고 관리 · 회원 상세) ───────────
   - 대상(리뷰 · 회원)별로 신고를 묶는다 — 같은 대상의 처리 대기 신고는 한 번에 처리 (admin.md 2~4절)
   - 신고 상태: OPEN 처리대기 · RESOLVED 조치완료 · DISMISSED 기각 / 조치: BLIND · UNBLIND · SUSPEND · UNSUSPEND · DISMISS
   - summary = 신고 당시 대상 요약 (리뷰 본문 · 회원 이름) */
const FLAG_CODE = { '광고/홍보성 내용': 'SPAM', '욕설/비방': 'ABUSE', '상품과 무관한 내용': 'FALSE_INFO', '개인정보 노출': 'PRIVACY' };
let rid = 100;
let aid = 10;
const rep = (reasonCode, at, { status = 'OPEN', detail = null, role = 'BUYER', by = 3 } = {}) =>
  ({ reportId: ++rid, reasonCode, detail, status, createdAt: at, reporterRole: role, reporterId: by });
const act = (action, reason, reportCount, at, suspendDays = null) => ({ moderationActionId: ++aid, action, reason, reportCount, createdAt: at, suspendDays });

const reviewTargets = reviews.filter((r) => r.flag).map((r, i) => {
  const code = FLAG_CODE[r.flag] ?? 'ETC';
  if (r.blinded) {
    return {
      targetType: 'REVIEW', targetId: r.id, summary: r.body,
      reports: [rep(code, daysAgo(12 + i, 3), { status: 'RESOLVED', by: 5 }), rep(code, daysAgo(11 + i), { status: 'RESOLVED', by: 8 })],
      actions: [act('BLIND', r.blindReason, 2, daysAgo(10 + i))],
    };
  }
  return {
    targetType: 'REVIEW', targetId: r.id, summary: r.body,
    reports: [rep(code, daysAgo(1, 4), { by: 2 }), rep('SELLER_REQUEST', daysAgo(0, 6), { role: 'SELLER', by: 1, detail: '배송 관련 불만이라 상품 리뷰와 무관해요' })],
    actions: [],
  };
});
const extra = reviews.find((r) => !r.flag && r.photos.length);

export const REPORT_TARGETS = [
  ...reviewTargets,
  {
    targetType: 'REVIEW', targetId: extra.id, summary: extra.body,
    reports: [rep('OBSCENE', daysAgo(0, 2), { by: 12, detail: '사진이 상품과 관계없어요' })], actions: [],
  },
  {
    targetType: 'USER', targetId: 'u11', summary: '오준서 (블랙컨슈머아님)',
    reports: [
      rep('ETC', daysAgo(24), { status: 'RESOLVED', role: 'SELLER', by: 1, detail: '같은 내용의 허위 리뷰를 여러 상품에 반복 작성' }),
      rep('ABUSE', daysAgo(22), { status: 'RESOLVED', by: 6 }),
      rep('SPAM', daysAgo(21), { status: 'RESOLVED', by: 10 }),
    ],
    actions: [act('SUSPEND', '허위 리뷰 / 리뷰 어뷰징', 3, daysAgo(20), 30)],
  },
  {
    targetType: 'USER', targetId: 'u4', summary: '최유나 (유나)',
    reports: [rep('FRAUD', daysAgo(0, 9), { role: 'SELLER', by: 6, detail: '같은 날 다른 카드로 결제 · 취소를 여러 번 반복' })], actions: [],
  },
  {
    targetType: 'USER', targetId: 'u7', summary: '강민호 (민호)',
    reports: [rep('ABUSE', daysAgo(5), { status: 'DISMISSED', by: 14 })],
    actions: [act('DISMISS', '스토어 톡 내용 확인 — 정책 위반 아님', 1, daysAgo(4))],
  },
];

/** 목록 행 — 처리 대기 수 · 사유별 개수 · 최근 신고 · 마지막 조치 */
export const reportRow = (t) => ({
  ...t,
  openCount: t.reports.filter((r) => r.status === 'OPEN').length,
  totalCount: t.reports.length,
  reasonCounts: t.reports.reduce((a, r) => ({ ...a, [r.reasonCode]: (a[r.reasonCode] || 0) + 1 }), {}),
  lastReportedAt: new Date(Math.max(...t.reports.map((r) => r.createdAt.getTime()))),
  lastAction: t.actions.at(-1) ?? null,
});
