import { myOrders, orderPay, linePoints } from './orders';
import { productById } from './catalog';

/* ─────────── 포인트 내역 (user-service · point_history) ───────────
   type: 적립(구매확정 시 상품주문별 5%) · 사용(주문 결제) · 회수(적립분 회수 — 구매확정 뒤엔 클레임이 없어 목업엔 없음) · 환원(취소/반품 시 사용분)
   주문 데이터(orders.js)에서 계산해 만들고, 잔액은 오래된 순으로 누적 */
export const POINT_TYPES = ['적립', '사용', '회수', '환원'];
const OPENING = 4120;

const rows = [];
[...myOrders].sort((a, b) => a.date - b.date).forEach((o) => {
  const pay = orderPay(o);
  const name = productById[o.items[0].productId].name + (o.items.length > 1 ? ` 외 ${o.items.length - 1}건` : '');
  if (pay.used) rows.push({ date: o.date, type: '사용', desc: `주문 결제 사용 · ${name}`, ref: o.id, amount: -pay.used });
  // 적립: 구매확정된 상품주문만, 구매확정 시각(배송완료 + 3일)에
  o.items.filter((l) => l.status === '구매확정').forEach((l) => {
    rows.push({ date: new Date(l.date.getTime() + (46 + 72) * 36e5), type: '적립', desc: `결제 적립 5% · ${productById[l.productId].name}`, ref: l.lineId, amount: linePoints(o, l).earned });
  });
  o.items.filter((l) => l.status === '취소완료' || l.status === '반품완료').forEach((l) => {
    const lp = linePoints(o, l);
    const t = new Date(l.claim.requested.getTime() + 36e5);
    const what = l.status === '취소완료' ? '취소' : '반품';
    if (lp.used) rows.push({ date: t, type: '환원', desc: `${what} 사용 포인트 환원 · ${productById[l.productId].name}`, ref: l.lineId, amount: lp.used });
  });
});

let bal = OPENING;
rows.sort((a, b) => a.date - b.date).forEach((r) => { bal += r.amount; r.balance = bal; });

export const myPointHistory = rows.reverse().map((r, i) => ({ id: `PH-${String(rows.length - i).padStart(4, '0')}`, ...r }));
export const myPointBalance = bal;
export const pointSum = (type) => myPointHistory.filter((r) => r.type === type).reduce((a, r) => a + Math.abs(r.amount), 0);

/* 관리자 회원 상세용 최근 포인트 내역 (u1 외 회원은 요약 3건) */
export const userPointHistory = (u) => (u.id === 'u1' ? myPointHistory.slice(0, 6) : [
  { id: `${u.id}-3`, date: u.lastLogin, type: '적립', desc: '결제 적립 5%', amount: Math.round(u.spent * 0.002 / 10) * 10 || 0 },
  { id: `${u.id}-2`, date: u.lastLogin, type: '사용', desc: '주문 결제 사용', amount: -Math.min(u.point, 1000) },
  { id: `${u.id}-1`, date: u.joined, type: '적립', desc: '결제 적립 5%', amount: 1500 },
]);
