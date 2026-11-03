import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cx, pct, won } from '../../lib/format';

/* 푸터 정책 화면 — 공지사항 · 자주 묻는 질문 · 수수료 안내 · 판매자 이용약관
   실제 features/support (프론트 정적 데이터, API 없음)의 문구를 그대로 옮김 */
const POINT_RATE = 0.05;
const PAYMENT_FEE = 0.022;
const PAYMENT_FEE_LABEL = pct(PAYMENT_FEE, 1);

/* ─────────── 공지사항 ─────────── */
const NOTICES = [
  {
    date: '2026.11.02', tag: '서비스', title: '곳간 오픈 안내',
    body: '작은 가게들의 오픈마켓 곳간이 문을 열었습니다. 동네 공방 · 산지 농부 · 1인 브랜드의 상품을 한 번의 결제로 함께 주문할 수 있어요. 곳간은 팀 프로젝트 시연용 사이트로, 실제 상품 거래와 배송은 이루어지지 않습니다.',
  },
  {
    date: '2026.11.02', tag: '결제', title: '결제는 포트원 테스트 결제로 진행됩니다',
    body: '모든 결제는 포트원(토스페이먼츠) 테스트 채널로 처리됩니다. 결제창에서 실제 카드 정보를 입력해도 실제 출금은 일어나지 않으며, 취소 · 반품 시 환불 역시 테스트 거래로 처리됩니다.',
  },
  {
    date: '2026.11.02', tag: '서비스', title: '시연 데이터는 매일 초기화됩니다',
    body: '시연 환경은 매일 정해진 시각에 다시 만들어지며, 이때 주문 · 리뷰 · 포인트 · 채팅 등 시연 중 만든 데이터가 처음 상태로 돌아갑니다. 중요한 내용은 따로 기록해 두세요.',
  },
  {
    date: '2026.11.01', tag: '정산', title: '판매대금 정산 일정 안내',
    body: '판매대금은 구매확정일을 기준으로 주 1회 정산합니다. 월요일부터 일요일까지 구매확정된 상품주문을 모아 다음 주 목요일에 지급하며, 판매수수료와 결제수수료(2.2%)를 뺀 금액이 지급됩니다. 이용 정지 · 폐점 스토어의 정산은 자동으로 보류됩니다.',
  },
  {
    date: '2026.11.01', tag: '포인트', title: '포인트 적립 정책 안내',
    body: `구매확정 시 실결제금액(포인트 사용분 제외)의 ${pct(POINT_RATE)}가 포인트로 적립되며, 다음 결제부터 1P = 1원으로 사용할 수 있어요. 적립률은 회원등급과 관계없이 같고, 취소 · 반품한 상품주문은 적립되지 않습니다.`,
  },
  {
    date: '2026.10.30', tag: '보안', title: '개인정보 처리 · 보안 안내',
    body: '곳간은 주문 · 배송에 필요한 최소한의 정보만 받습니다. 비밀번호는 인증 서버(Keycloak)가 따로 보관하며, 로그인 토큰은 브라우저 저장소에 남기지 않습니다. 시연 중에는 실제 이름 · 연락처 · 주소 대신 예시 값을 써 주세요.',
  },
];

/* ─────────── 자주 묻는 질문 (구매자 · 판매자 탭) ─────────── */
const FAQ_TABS = [
  {
    key: 'buyer', label: '구매자', items: [
      { cat: '주문/결제', q: '여러 스토어 상품을 한 번에 결제할 수 있나요?', a: '네. 장바구니의 여러 스토어 상품을 한 번에 결제할 수 있어요. 결제는 한 번이지만 배송 · 취소 · 반품은 상품주문 단위로 따로 진행됩니다. 결제는 포트원 테스트 결제라 실제 출금이 일어나지 않아요.' },
      { cat: '배송', q: '배송완료와 구매확정은 언제 되나요?', a: '판매자가 송장을 등록하면 배송중이 되고, 일정 시간이 지나면 자동으로 배송완료로 바뀝니다. 배송완료 후 7일이 지나면 자동으로 구매확정되며, 그 전에 마이페이지에서 직접 구매확정할 수도 있어요.' },
      { cat: '취소/반품/교환', q: '반품 · 교환은 언제까지 신청할 수 있나요?', a: '배송완료 후 7일 이내, 구매확정 전까지 마이페이지 > 주문 · 배송에서 신청할 수 있어요. 결제완료 상태에서는 바로 취소, 배송준비 상태에서는 판매자 승인 후 취소됩니다.' },
      { cat: '취소/반품/교환', q: '반품 배송비는 얼마인가요?', a: '단순 변심 반품은 스토어 기본 배송비의 2배(왕복)를 환불 금액에서 뺍니다. 상품 불량 · 오배송 등 판매자 귀책이면 반품비는 0원이에요.' },
      { cat: '포인트', q: '포인트는 언제 얼마나 쌓이나요?', a: `구매확정 시 실결제금액(포인트 사용분 제외)의 ${pct(POINT_RATE)}가 적립돼요. 취소 · 반품이 끝나면 그 상품주문에 쓴 포인트는 돌려드리고, 취소 · 반품한 상품주문은 적립되지 않아요.` },
      { cat: '등급', q: '회원등급은 어떻게 정해지나요?', a: `누적 구매확정 금액 기준으로 30만원 이상 SILVER, 80만원 이상 GOLD가 됩니다. 적립률은 모든 등급이 ${pct(POINT_RATE)}로 같아요.` },
      { cat: '리뷰', q: '리뷰는 언제 쓸 수 있나요?', a: '구매확정 후 30일 이내에 상품주문 1건당 1개를 쓸 수 있어요. 별점과 사진을 함께 남길 수 있고, 판매자가 답글을 달 수 있어요.' },
      { cat: '채팅', q: '판매자나 운영팀과 대화하고 싶어요.', a: '상품 상세의 "판매자에게 문의"로 스토어와, 고객센터의 "운영팀과 채팅"으로 곳간 운영팀과 실시간으로 이야기할 수 있어요. 대화 내역은 마이페이지 > 채팅에 모여요.' },
    ],
  },
  {
    key: 'seller', label: '판매자', items: [
      { cat: '입점', q: '입점 신청에 어떤 서류가 필요한가요?', a: '사업자등록증 · 통신판매업 신고증 · 정산 계좌 통장 사본 · 대표 상품 사진(3~10장) 4종이 필요해요. 시연용 심사라 서류 진위는 확인하지 않습니다.' },
      { cat: '입점', q: '보완요청이나 반려를 받으면 어떻게 하나요?', a: '보완요청을 받으면 7일 안에 요청받은 서류 · 항목만 고쳐 다시 제출하면 돼요. 반려되면 반려일로부터 30일 동안 다시 신청할 수 없습니다.' },
      { cat: '수수료', q: '수수료는 얼마인가요?', a: `상위 카테고리별 판매수수료(6~11%)와 결제수수료 ${PAYMENT_FEE_LABEL}가 붙어요. 카테고리별 요율은 수수료 안내에서 볼 수 있어요.` },
      { cat: '정산', q: '판매대금은 언제 받나요?', a: '구매확정일 기준으로 월~일 확정분을 모아 다음 주 목요일에 지급해요. 지급액 = 구매확정 매출 − 판매수수료 − 결제수수료(원 단위 내림)입니다. 이용 정지 · 폐점 스토어는 자동으로 지급 보류돼요.' },
      { cat: '상품', q: '상품은 어떻게 등록하나요?', a: '판매자센터 > 상품 관리에서 카테고리 · 가격 · 옵션 · 재고 · 사진을 입력해 등록하면 바로 쇼핑몰에 보여요. 판매중지로 바꾸면 쇼핑몰에서 숨겨집니다.' },
      { cat: '상품', q: '상품이 "강제 판매중지"됐어요.', a: '운영 정책에 맞지 않는 상품은 운영팀이 강제 판매중지할 수 있고, 이때는 판매자가 직접 재개할 수 없어요. 판매자센터의 운영팀 채팅으로 사유를 확인하고 내용을 고쳐 해제를 요청해 주세요.' },
      { cat: '폐점', q: '스토어를 폐점하려면 어떻게 하나요?', a: '진행 중인 주문이 없고 정산이 모두 지급된 뒤에 판매자센터 > 스토어 설정에서 폐점할 수 있어요. 폐점은 되돌릴 수 없고 다시 입점할 수 없습니다.' },
    ],
  },
];

/* ─────────── 수수료 안내 ─────────── */
const COMMISSION_RATES = [
  { name: '패션의류', rate: 0.11 },
  { name: '신발 · 가방', rate: 0.11 },
  { name: '뷰티', rate: 0.10 },
  { name: '리빙 · 인테리어', rate: 0.09 },
  { name: '식품', rate: 0.07 },
  { name: '디지털 · 가전', rate: 0.06 },
];
const FEE_EXAMPLE = { category: '리빙 · 인테리어', sales: 30000, rate: 0.09 };
const EX = (() => {
  const commission = Math.floor(FEE_EXAMPLE.sales * FEE_EXAMPLE.rate);
  const paymentFee = Math.floor(FEE_EXAMPLE.sales * PAYMENT_FEE);
  return { commission, paymentFee, payout: FEE_EXAMPLE.sales - commission - paymentFee };
})();

/* ─────────── 판매자 이용약관 ─────────── */
const SELLER_TERMS = [
  { title: '목적', body: ['이 약관은 (주)곳간(이하 "회사")이 운영하는 오픈마켓 곳간에서 판매자가 상품을 판매하는 데 필요한 회사와 판매자의 권리 · 의무를 정합니다.'] },
  { title: '정의', body: ['"판매자"란 입점 심사를 거쳐 승인받고 스토어를 운영하는 회원을 말합니다.', '"구매확정"이란 구매자가 직접 확정하거나 배송완료 후 7일이 지나 자동으로 확정된 상태를 말합니다.', '"정산"이란 구매확정된 판매대금에서 수수료를 빼고 판매자에게 지급하는 것을 말합니다.'] },
  { title: '입점 신청과 심사', body: ['입점을 원하는 회원은 사업자등록증 · 통신판매업 신고증 · 정산 계좌 통장 사본 · 대표 상품 사진을 갖춰 신청합니다.', '회사는 신청 내용을 심사해 승인 · 보완요청 · 반려할 수 있습니다. 보완요청을 받은 판매자는 7일 안에 보완해야 합니다.', '반려된 신청자는 반려일로부터 30일 동안 다시 신청할 수 없습니다.'] },
  { title: '판매자의 의무', body: ['판매자는 관계 법령과 이 약관, 회사의 운영 정책을 지켜야 합니다.', '판매자는 주문을 받은 뒤 스토어가 안내한 출고 기준에 맞춰 발송하고, 구매자의 문의와 취소 · 반품 · 교환 요청에 성실히 응해야 합니다.'] },
  { title: '상품 등록 기준', body: ['판매자는 실제 판매할 상품의 정확한 정보(가격 · 옵션 · 재고 · 사진)를 등록해야 합니다.', '법령으로 판매가 금지된 상품, 타인의 권리를 침해하는 상품, 상품 정보와 다른 상품은 등록할 수 없습니다.'] },
  { title: '수수료와 정산', body: ['판매자는 상위 카테고리별 판매수수료와 결제수수료를 회사에 냅니다. 요율은 수수료 안내에 따릅니다.', '회사는 월요일부터 일요일까지 구매확정된 판매대금에서 수수료를 빼고 다음 주 목요일에 지급합니다.', '수수료율은 운영 정책에 따라 바뀔 수 있으며, 변경은 공지 후 적용합니다.'] },
  { title: '판매 제한과 이용 정지', body: ['회사는 이 약관이나 운영 정책을 어긴 상품을 강제 판매중지할 수 있습니다.', '위반이 반복되거나 중대한 경우 회사는 스토어 이용을 정지할 수 있으며, 정지 기간 동안 상품은 쇼핑몰에서 숨겨지고 정산은 보류됩니다.'] },
  { title: '폐점', body: ['판매자는 진행 중인 주문이 없고 정산이 모두 지급된 뒤 스토어를 폐점할 수 있습니다.', '폐점은 되돌릴 수 없으며, 폐점한 판매자는 다시 입점할 수 없습니다.'] },
  { title: '개인정보 보호', body: ['판매자는 주문 처리로 알게 된 구매자의 개인정보를 배송 · 고객 응대 목적으로만 쓰고, 목적을 달성하면 지체 없이 파기해야 합니다.'] },
  { title: '책임 제한', body: ['회사는 통신판매중개자로서 통신판매의 당사자가 아니며, 판매자가 등록한 상품 정보와 거래에 대한 책임은 판매자에게 있습니다.'] },
  { title: '부칙', body: ['이 약관은 2026년 11월 2일부터 적용합니다.'] },
];

// 펼치기 목록 — 공지사항 · 자주 묻는 질문 공용 (고객센터 FAQ 목록과 같은 모양)
function AccordionList({ items }) {
  const [open, setOpen] = useState(-1);
  return (
    <ul className="border-t border-line">
      {items.map((it, i) => (
        <li key={it.key} className="border-b border-line">
          <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center gap-4 py-5 text-left">
            <span className="w-24 shrink-0 text-[12px] text-mute num">{it.side}</span>
            <span className="flex-1 font-medium">{it.title}</span>
            <ChevronDown size={18} className={cx('transition-transform shrink-0', open === i && 'rotate-180')} />
          </button>
          {open === i && <p className="pb-5 pl-28 pr-6 text-[14px] text-ink-2 leading-relaxed">{it.body}</p>}
        </li>
      ))}
    </ul>
  );
}

/* /notice */
export function Notice() {
  return (
    <div className="max-w-[860px] mx-auto px-4 md:px-6 pt-10">
      <div className="eyebrow">Notice</div>
      <h1 className="mt-2 text-[28px] font-bold tracking-tight">공지사항</h1>
      <p className="mt-2 mb-6 text-[13px] text-ink-2">곳간 이용 · 결제 · 정산 정책 안내입니다.</p>
      <AccordionList items={NOTICES.map((n) => ({ key: n.title, side: n.date, title: `[${n.tag}] ${n.title}`, body: n.body }))} />
    </div>
  );
}

/* /faq */
export function Faq() {
  const [tab, setTab] = useState(FAQ_TABS[0].key);
  const current = FAQ_TABS.find((t) => t.key === tab);
  return (
    <div className="max-w-[860px] mx-auto px-4 md:px-6 pt-10">
      <div className="eyebrow">FAQ</div>
      <h1 className="mt-2 text-[28px] font-bold tracking-tight">자주 묻는 질문</h1>
      <div role="tablist" className="mt-6 flex gap-1.5 py-4">
        {FAQ_TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={cx('h-8 px-4 text-[13px] border', tab === t.key ? 'border-ink bg-ink text-white' : 'border-line-2 text-ink-2 hover:border-ink')}>{t.label}</button>
        ))}
      </div>
      <AccordionList key={tab} items={current.items.map((f) => ({ key: f.q, side: f.cat, title: f.q, body: f.a }))} />
      <p className="mt-8 text-[13px] text-ink-2">
        찾는 답이 없으면 <Link to="/help" className="underline">고객센터</Link>에서 운영팀과 채팅으로 물어보세요.
        {tab === 'seller' && <> 요율은 <Link to="/fees" className="underline">수수료 안내</Link>에서 볼 수 있어요.</>}
      </p>
    </div>
  );
}

/* /fees */
export function Fees() {
  return (
    <div className="max-w-[860px] mx-auto px-4 md:px-6 pt-10">
      <div className="eyebrow">Fees</div>
      <h1 className="mt-2 text-[28px] font-bold tracking-tight">수수료 안내</h1>
      <p className="mt-2 text-[13px] text-ink-2">판매수수료는 상품의 상위 카테고리 요율을 따르고, 결제수수료 {PAYMENT_FEE_LABEL}가 별도로 붙습니다.</p>

      <h2 className="mt-10 text-[18px] font-bold border-b border-ink pb-3">카테고리별 판매수수료</h2>
      <table className="tbl w-full mt-2">
        <thead><tr><th className="text-left">상위 카테고리</th><th className="text-right">판매수수료</th><th className="text-right">결제수수료</th></tr></thead>
        <tbody>
          {COMMISSION_RATES.map((c) => (
            <tr key={c.name}><td>{c.name}</td><td className="text-right num">{pct(c.rate)}</td><td className="text-right num">{PAYMENT_FEE_LABEL}</td></tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-10 text-[18px] font-bold border-b border-ink pb-3">정산 방식</h2>
      <ul className="mt-4 space-y-2 text-[14px] text-ink-2 leading-relaxed">
        <li>· 지급액 = 구매확정 매출 − 판매수수료 − 결제수수료 (각 수수료는 원 단위 내림)</li>
        <li>· 주 1회 정산 — 월요일부터 일요일까지 구매확정된 상품주문을 모아 다음 주 목요일에 지급</li>
        <li>· 이용 정지 · 폐점 스토어의 정산은 자동으로 지급 보류</li>
      </ul>

      <div className="mt-6 border border-ink p-6">
        <div className="eyebrow">Example</div>
        <div className="mt-1.5 font-bold">{FEE_EXAMPLE.category} 상품 {won(FEE_EXAMPLE.sales)} 구매확정</div>
        <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-2 text-[14px]">
          <dt className="text-ink-2">구매확정 매출</dt><dd className="num text-right">{won(FEE_EXAMPLE.sales)}</dd>
          <dt className="text-ink-2">판매수수료 ({pct(FEE_EXAMPLE.rate)})</dt><dd className="num text-right">− {won(EX.commission)}</dd>
          <dt className="text-ink-2">결제수수료 ({PAYMENT_FEE_LABEL})</dt><dd className="num text-right">− {won(EX.paymentFee)}</dd>
          <dt className="font-bold border-t border-line pt-2">지급액</dt><dd className="num text-right font-bold border-t border-line pt-2">{won(EX.payout)}</dd>
        </dl>
      </div>

      <p className="mt-6 text-[13px] text-mute">수수료율은 운영 정책에 따라 바뀔 수 있으며, 변경은 공지 후 적용합니다. 자세한 기준은 <Link to="/terms/seller" className="underline">판매자 이용약관</Link>을 확인해 주세요.</p>
    </div>
  );
}

/* /terms/seller */
export function SellerTerms() {
  return (
    <div className="max-w-[860px] mx-auto px-4 md:px-6 pt-10">
      <div className="eyebrow">Terms</div>
      <h1 className="mt-2 text-[28px] font-bold tracking-tight">판매자 이용약관</h1>
      <p className="mt-4 border border-point p-4 text-[13px] text-point">팀 프로젝트 시연용 문서로 법적 효력이 없습니다.</p>
      <ol className="mt-8 space-y-8">
        {SELLER_TERMS.map((t, i) => (
          <li key={t.title}>
            <h2 className="text-[16px] font-bold">제{i + 1}조 ({t.title})</h2>
            <ol className="mt-2 space-y-1.5 text-[14px] text-ink-2 leading-relaxed">
              {t.body.map((b, k) => <li key={b}>{t.body.length > 1 && `${k + 1}. `}{b}</li>)}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}
