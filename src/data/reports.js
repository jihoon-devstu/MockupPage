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
