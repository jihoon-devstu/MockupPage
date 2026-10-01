import { products, productById, stores, storeById, catById, PAYMENT_FEE } from './catalog';
import { users } from './people';
import { seeded, pick, daysAgo, salePrice } from '../lib/format';

/* ─────────── 주문 상태 흐름 ───────────
   결제완료 → 배송준비(발주확인) → 배송중(송장등록) → 배송완료 → 구매확정(수동 or 배송완료 7일 후 자동)
   클레임: 취소요청 → 취소완료 / 반품요청 → 반품완료 / 교환요청 → 교환완료
   ※ 정산은 '구매확정'된 주문상품만 대상 */
export const FLOW = ['결제완료', '배송준비', '배송중', '배송완료', '구매확정'];
export const CLAIMS = ['취소요청', '취소완료', '반품요청', '반품완료', '교환요청'];

export const STATUS_TONE = {
  결제완료: 'sky', 배송준비: 'amber', 배송중: 'moss', 배송완료: 'ink', 구매확정: 'mute',
  취소요청: 'rust', 취소완료: 'mute', 반품요청: 'rust', 반품완료: 'mute', 교환요청: 'rust',
};

const COURIER_PREFIX = { CJ대한통운: '6512', 롯데택배: '2470', 우체국택배: '6091', 한진택배: '5309' };
const invoiceOf = (store, rnd) => `${COURIER_PREFIX[store.courier] || '7000'}${String(Math.floor(rnd() * 1e8)).padStart(8, '0')}`;

/* 배송 추적 이력 (마이페이지 주문상세 / 판매자 주문상세 공용) */
export function trackingOf(line) {
  const base = line.date;
  const at = (h) => new Date(base.getTime() + h * 36e5);
  const steps = [{ t: at(0), where: '곳간', what: '결제가 완료되었습니다' }];
  const idx = FLOW.indexOf(line.status);
  if (idx >= 1 || CLAIMS.includes(line.status)) steps.push({ t: at(3), where: storeById[line.storeId].name, what: '판매자가 주문을 확인했습니다' });
  if (idx >= 2) {
    steps.push({ t: at(26), where: '성수 집배점', what: '상품을 인수했습니다' });
    steps.push({ t: at(31), where: '곤지암 Hub', what: '간선 상차' });
    steps.push({ t: at(40), where: '서울성동 대리점', what: '배송 출발 (배송기사 김○○ 010-****-2231)' });
  }
  if (idx >= 3) steps.push({ t: at(46), where: '서울성동 대리점', what: '배송 완료 (문 앞)' });
  if (idx >= 4) steps.push({ t: at(46 + 24 * 3), where: '곳간', what: '구매가 확정되었습니다' });
  return steps.reverse();
}

/* ─────────── 내 주문 (구매자 u1) ─────────── */
const L = (o) => {
  const p = productById[o.productId];
  return { qty: 1, ...o, storeId: p.storeId, unitPrice: salePrice(p), courier: storeById[p.storeId].courier };
};

export const myOrders = [
  {
    id: '2026093014582201', date: daysAgo(0, 18), userId: 'u1',
    payment: { method: '신용카드', detail: '현대카드 (일시불)', coupon: 0, point: 0 },
    items: [
      L({ lineId: '2026093014582201-1', productId: 'p601', option: '로얄과 (S~M)', qty: 2, status: '결제완료', date: daysAgo(0, 18) }),
      L({ lineId: '2026093014582201-2', productId: 'p701', option: '핸드드립', status: '결제완료', date: daysAgo(0, 18) }),
    ],
  },
  {
    id: '2026092809114007', date: daysAgo(2, 6), userId: 'u1',
    payment: { method: '곳간페이', detail: '국민은행 계좌', coupon: 5000, point: 2000 },
    items: [
      L({ lineId: '2026092809114007-1', productId: 'p101', option: '오트밀 / M', status: '배송중', date: daysAgo(2, 6), invoice: '651248820193' }),
      L({ lineId: '2026092809114007-2', productId: 'p102', option: '샌드 / M', status: '배송준비', date: daysAgo(2, 6) }),
    ],
  },
  {
    id: '2026092419502215', date: daysAgo(6, 3), userId: 'u1',
    payment: { method: '신용카드', detail: '신한카드 (3개월 무이자)', coupon: 0, point: 0 },
    items: [L({ lineId: '2026092419502215-1', productId: 'p501', option: '전구색 2700K', status: '배송완료', date: daysAgo(6, 3), invoice: '530981200477' })],
  },
  {
    id: '2026091711220098', date: daysAgo(14), userId: 'u1',
    payment: { method: '카카오페이', detail: '카카오페이 머니', coupon: 0, point: 1000 },
    items: [
      L({ lineId: '2026091711220098-1', productId: 'p401', option: '재유', qty: 2, status: '구매확정', date: daysAgo(14), invoice: '651200917732', reviewed: false }),
      L({ lineId: '2026091711220098-2', productId: 'p404', option: '', status: '구매확정', date: daysAgo(14), invoice: '651200917732', reviewed: true }),
    ],
  },
  {
    id: '2026090820013311', date: daysAgo(23), userId: 'u1',
    payment: { method: '신용카드', detail: '삼성카드 (일시불)', coupon: 0, point: 0 },
    items: [L({ lineId: '2026090820013311-1', productId: 'p203', option: '오트 / M', status: '반품요청', date: daysAgo(23), invoice: '247001931255', claim: { type: '반품', reason: '사이즈가 맞지 않음 (단순변심)', fee: 6000, requested: daysAgo(2) } })],
  },
  {
    id: '2026082913400871', date: daysAgo(33), userId: 'u1',
    payment: { method: '네이버페이', detail: '네이버페이 포인트', coupon: 0, point: 0 },
    items: [L({ lineId: '2026082913400871-1', productId: 'p302', option: '내추럴 / 240', status: '취소완료', date: daysAgo(33), claim: { type: '취소', reason: '다른 상품 잘못 주문', fee: 0, requested: daysAgo(33) } })],
  },
  {
    id: '2026081002210045', date: daysAgo(52), userId: 'u1',
    payment: { method: '신용카드', detail: '현대카드 (일시불)', coupon: 2000, point: 0 },
    items: [
      L({ lineId: '2026081002210045-1', productId: 'p801', option: '1+1', status: '구매확정', date: daysAgo(52), invoice: '247009915520', reviewed: true }),
      L({ lineId: '2026081002210045-2', productId: 'p903', option: '600mm', status: '구매확정', date: daysAgo(52), invoice: '651299001834', reviewed: false }),
    ],
  },
];

export const orderTotal = (o) => o.items.reduce((a, l) => a + l.unitPrice * l.qty, 0);
export const shipFeeFor = (store, subtotal) => (store.freeOver && subtotal >= store.freeOver ? 0 : store.shipFee);

/* ─────────── 판매자 주문 (s1: 오롯이 리넨) — 상품주문 단위 ─────────── */
const rnd = seeded(77);
const buyers = users.filter((u) => u.status === '정상');
const ADDR = ['서울 마포구 월드컵북로 21', '경기 성남시 분당구 판교역로 166', '서울 송파구 올림픽로 300', '부산 수영구 광안해변로 219', '대구 수성구 동대구로 123', '인천 연수구 송도과학로 32', '광주 서구 상무중앙로 61', '서울 은평구 연서로 365'];

function genStoreOrders(storeId, count, seedDays = 20) {
  const list = [];
  const ps = products.filter((p) => p.storeId === storeId && p.status !== '판매중지');
  const store = storeById[storeId];
  for (let i = 0; i < count; i++) {
    const p = pick(rnd, ps);
    const d = Math.floor((i / count) * seedDays);
    const date = daysAgo(d, Math.floor(rnd() * 22));
    let status;
    if (d === 0) status = pick(rnd, ['결제완료', '결제완료', '배송준비']);
    else if (d <= 2) status = pick(rnd, ['결제완료', '배송준비', '배송준비', '배송중', '취소요청']);
    else if (d <= 5) status = pick(rnd, ['배송중', '배송완료', '배송완료', '반품요청']);
    else if (d <= 9) status = pick(rnd, ['배송완료', '구매확정', '구매확정', '교환요청']);
    else status = pick(rnd, ['구매확정', '구매확정', '구매확정', '반품완료', '취소완료']);
    const b = pick(rnd, buyers);
    const qty = rnd() < 0.8 ? 1 : 2;
    const no = `2026${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(10000000 + Math.floor(rnd() * 8.9e7)).slice(0, 8)}`;
    list.push({
      lineId: `${no}-1`, orderId: no, date, storeId, productId: p.id,
      option: p.options.map((o) => pick(rnd, o.values)).join(' / '),
      qty, unitPrice: salePrice(p), status, courier: store.courier,
      invoice: ['배송중', '배송완료', '구매확정', '반품요청', '반품완료', '교환요청'].includes(status) ? invoiceOf(store, rnd) : null,
      buyerId: b.id, receiver: b.name, phone: b.phone.replace(/-(\d{4})-/, '-****-'),
      addr: pick(rnd, ADDR), memo: pick(rnd, ['문 앞에 놓아주세요', '부재 시 경비실', '', '배송 전 연락 부탁드립니다', '']),
      claim: CLAIMS.includes(status)
        ?{ reason: pick(rnd, ['단순 변심', '사이즈 맞지 않음', '상품 불량 (오염)', '배송 지연']), requested: daysAgo(Math.max(0, d - 1)) }
        : null,
    });
  }
  return list.sort((a, b) => b.date - a.date);
}

export const sellerOrders = genStoreOrders('s1', 42, 24);

/* ─────────── 정산 ───────────
   - 정산 기준: 구매확정일
   - 주기: 주 1회 (월~일 구매확정분) → 다음 주 목요일 지급
   - 지급액 = 구매확정 매출 − 환불 − 판매수수료(카테고리) − 결제수수료(2.2%) */
const POP = { s1: 1.0, s2: 2.4, s3: 1.6, s4: 0.55, s5: 0.4, s6: 2.9, s7: 0.9, s8: 1.2, s9: 0.7 };
const srnd = seeded(9);
const WEEKS = 8;
// 2026-09-21(월) ~ 09-27(일) 이 가장 최근 마감 주차
const weekStart = (k) => new Date(2026, 8, 21 - 7 * k);

export const settlements = [];
for (const s of stores) {
  const cat = catById[s.cat];
  for (let k = 0; k < WEEKS; k++) {
    const start = weekStart(k);
    const end = new Date(start.getTime() + 6 * 864e5);
    const pay = new Date(end.getTime() + 4 * 864e5);
    const gross = Math.round((2600000 + srnd() * 2400000) * POP[s.id] / 100) * 100;
    const refund = Math.round(gross * (srnd() * 0.05) / 100) * 100;
    const net = gross - refund;
    const commission = Math.round(net * cat.commission);
    const pgFee = Math.round(net * PAYMENT_FEE);
    let status = k === 0 ? '지급예정' : '지급완료';
    if (s.id === 's5' && k <= 1) status = '지급보류';
    settlements.push({
      id: `ST-${s.id.toUpperCase()}-${String(start.getMonth() + 1).padStart(2, '0')}${String(start.getDate()).padStart(2, '0')}`,
      storeId: s.id, start, end, pay, orders: Math.round(gross / 52000),
      gross, refund, commission, pgFee, rate: cat.commission,
      payout: net - commission - pgFee, status,
      holdReason: status === '지급보류' ? '스토어 휴면 전환 및 미처리 반품 3건 — 처리 완료 시 지급' : null,
      bank: s.id === 's1' ? '기업은행 010-****-8812 (주)오롯이' : '등록 계좌',
    });
  }
}
// 이번 주(9/28~10/4) 집계중 금액 (판매자 대시보드용)
export const pendingThisWeek = { s1: { confirmed: 1840200, expected: 2310000 } };

/* ─────────── 대시보드 시계열 ─────────── */
const drnd = seeded(31);
export const dailySales = (scale, days = 30) =>
  Array.from({ length: days }, (_, i) => {
    const date = daysAgo(days - 1 - i);
    const dow = date.getDay();
    const weekend = dow === 0 || dow === 6 ? 1.25 : 1;
    const trend = 0.85 + (i / days) * 0.3;
    const amount = Math.round(scale * weekend * trend * (0.75 + drnd() * 0.5) / 100) * 100;
    return { date, amount, orders: Math.max(1, Math.round(amount / 54000)) };
  });

export const sellerDaily = dailySales(420000);
export const platformDaily = dailySales(18600000);
