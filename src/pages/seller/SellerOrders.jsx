import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Search, Download, Printer } from 'lucide-react';
import { productById } from '../../data/catalog';
import { sellerOrders, FLOW } from '../../data/orders';
import { userById } from '../../data/people';
import { useApp } from '../../lib/store';
import { PageHead, Segments, StatusPill, Checkbox, Modal, KV, Pager } from '../../components/ui';
import { won, comma, ymd, ymdhm, cx } from '../../lib/format';
import { MY_STORE } from './SellerLayout';

/* 목업용 모듈 상태: 페이지 이동 후에도 처리 결과가 유지되도록 */
let ORDERS = sellerOrders.map((o) => ({ ...o }));

const COURIERS = ['CJ대한통운', '롯데택배', '한진택배', '우체국택배', '로젠택배'];
const demoInvoice = () => `6512${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
// 일괄 처리 결과 요약 — "2건 발주확인 완료" / "2건 발주확인 완료 · 1건 실패 (표에서 사유 확인)" (실제 sellerBulk.bulkSummary)
const bulkSummary = (action, ok, failed = 0) => {
  const done = ok ? `${ok}건 ${action} 완료` : `${action}하지 못했어요`;
  return failed ? `${done} · ${failed}건 실패 (표에서 사유 확인)` : done;
};

/* ─────────── 주문 관리 ─────────── */
export function SellerOrderList() {
  const { toast } = useApp();
  const [sp] = useSearchParams();
  const [rows, setRows] = useState(ORDERS);
  const [tab, setTab] = useState(sp.get('s') || '전체');
  const [sel, setSel] = useState(new Set());
  const [q, setQ] = useState('');
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [range, setRange] = useState('1개월');

  const save = (next) => { ORDERS = next; setRows(next); };
  const TABS = ['전체', ...FLOW];
  const counts = Object.fromEntries(TABS.map((t) => [t, t === '전체' ? rows.length : rows.filter((r) => r.status === t).length]));
  // 검색칸 하나 — 상품주문번호 · 구매자 · 수령인 · 상품명 · 송장번호
  const hay = (r) => [r.lineId, userById[r.buyerId]?.name, r.receiver, productById[r.productId].name, r.invoice].join(' ');
  const list = rows.filter((r) => (tab === '전체' || r.status === tab) && hay(r).includes(q.trim()));
  const selRows = rows.filter((r) => sel.has(r.lineId));
  const allOn = list.length > 0 && list.every((r) => sel.has(r.lineId));

  // 선택한 것 중 그 상태인 것만 처리 → 결과 요약 토스트
  const bulk = (from, to, action, extra = () => ({})) => {
    const ok = selRows.filter((r) => r.status === from);
    save(rows.map((r) => (sel.has(r.lineId) && r.status === from ? { ...r, status: to, ...extra(r) } : r)));
    toast(bulkSummary(action, ok.length)); setSel(new Set());
  };
  const confirm = () => {
    if (!selRows.some((r) => r.status === '결제완료')) return toast('결제완료 상태의 주문만 발주확인할 수 있어요');
    bulk('결제완료', '배송준비', '발주확인');
  };
  const ship = () => {
    if (!selRows.some((r) => r.status === '배송준비')) return toast('배송준비 상태의 주문만 발송처리할 수 있어요');
    bulk('배송준비', '배송중', '발송처리', (r) => ({ invoice: r.invoice || demoInvoice() }));
    setInvoiceModal(false);
  };
  const deliver = () => {
    if (!selRows.some((r) => r.status === '배송중')) return toast('배송중 상태의 주문만 배송완료 처리할 수 있어요');
    bulk('배송중', '배송완료', '배송완료 처리');
  };

  return (
    <div>
      <PageHead title="주문 관리" desc="결제완료 → 발주확인(배송준비) → 송장등록(배송중) → 배송완료 → 구매확정(자동 7일)"
        right={<button className="btn btn-line btn-sm"><Download size={14} /> 엑셀 다운로드</button>} />

      <div className="panel p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-[13px] font-semibold w-14">조회기간</span>
          <div className="flex">{['오늘', '1주일', '1개월', '3개월'].map((r, i) => <button key={r} onClick={() => setRange(r)} className={cx('h-9 px-3 text-[13px] border border-line-2', i && '-ml-px', range === r && 'bg-ink text-white border-ink relative')}>{r}</button>)}</div>
          <input type="date" defaultValue="2026-09-01" className="field field-sm w-36 h-9" /> ~ <input type="date" defaultValue="2026-10-01" className="field field-sm w-36 h-9" />
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-[13px] font-semibold w-14">검색</span>
          <div className="flex items-center border border-line-2 h-9 px-2.5 w-full sm:w-96 bg-white"><Search size={15} className="text-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 px-2 text-[13px] outline-none" placeholder="상품주문번호 · 구매자 · 수령인 · 상품명 · 송장번호" /></div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto"><Segments items={TABS} value={tab} onChange={(t) => { setTab(t); setSel(new Set()); }} counts={counts} /></div>

      <div className="panel mt-3">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-line text-[13px]">
          <span className="text-ink-2 mr-2">선택 <b className="num text-ink">{sel.size}</b>건</span>
          <button disabled={!sel.size} onClick={confirm} className="btn btn-ink btn-xs">발주확인</button>
          <button disabled={!sel.size} onClick={() => setInvoiceModal(true)} className="btn btn-line btn-xs">송장 입력 · 발송처리</button>
          <button disabled={!sel.size} onClick={deliver} className="btn btn-line btn-xs">배송완료 처리</button>
          <button disabled={!sel.size} onClick={() => toast('주문 취소 처리 (구매자 환불)')} className="btn btn-line btn-xs">판매취소</button>
          <button disabled={!sel.size} onClick={() => toast('발송지연 안내가 구매자에게 발송되었어요')} className="btn btn-line btn-xs">발송지연 안내</button>
          <button disabled={!sel.size} className="btn btn-ghost btn-xs ml-auto"><Printer size={13} /> 송장 출력</button>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-10"><Checkbox checked={allOn} onChange={(on) => setSel(on ? new Set(list.map((r) => r.lineId)) : new Set())} /></th>
                <th>상품주문번호</th><th>주문일시</th><th>상태</th><th>상품 / 옵션</th><th className="text-right">수량</th><th className="text-right">결제금액</th><th>구매자</th><th>택배사 / 송장</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => {
                const p = productById[o.productId];
                return (
                  <tr key={o.lineId} className={cx(sel.has(o.lineId) && '[&>td]:bg-cream')}>
                    <td><Checkbox checked={sel.has(o.lineId)} onChange={() => { const n = new Set(sel); n.has(o.lineId) ? n.delete(o.lineId) : n.add(o.lineId); setSel(n); }} /></td>
                    <td><Link to={`/seller/orders/${o.lineId}`} className="num text-sky hover:underline whitespace-nowrap">{o.lineId}</Link></td>
                    <td className="num text-ink-2 whitespace-nowrap">{ymdhm(o.date)}</td>
                    <td><StatusPill s={o.status} /></td>
                    <td><div className="flex items-center gap-2.5 min-w-[240px]"><img src={p.images[0]} alt="" className="w-9 h-9 object-cover" /><div><div className="truncate max-w-[240px]">{p.name}</div><div className="text-[11.5px] text-mute">{o.option || '단일상품'}</div></div></div></td>
                    <td className="text-right num">{o.qty}</td>
                    <td className="text-right num whitespace-nowrap">{won(o.unitPrice * o.qty)}</td>
                    <td className="whitespace-nowrap">{userById[o.buyerId]?.name ?? o.receiver}</td>
                    <td className="whitespace-nowrap text-[12px]">{o.invoice ? <><div>{o.courier}</div><div className="num text-mute">{o.invoice}</div></> : <span className="text-mute">-</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pager total={2} className="py-4" />
      </div>

      <Modal open={invoiceModal} onClose={() => setInvoiceModal(false)} title={`송장 입력 · 발송처리 (${selRows.length}건)`} width={680}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setInvoiceModal(false)}>취소</button><button className="btn btn-ink btn-sm" onClick={ship}>발송처리</button></>}>
        <p className="text-[12.5px] text-mute mb-3">배송준비 상태 주문만 발송처리됩니다. 송장번호를 비우면 데모용 송장번호가 자동으로 붙어요.</p>
        <table className="tbl">
          <thead><tr><th>상품주문번호</th><th>수령인</th><th>택배사</th><th>송장번호</th></tr></thead>
          <tbody>
            {selRows.map((r) => (
              <tr key={r.lineId} className={cx(r.status !== '배송준비' && 'opacity-40')}>
                <td className="num text-[12px]">{r.lineId}</td><td>{r.receiver}</td>
                <td><select defaultValue={MY_STORE.courier} className="field field-sm w-32" disabled={r.status !== '배송준비'}>{COURIERS.map((c) => <option key={c}>{c}</option>)}</select></td>
                <td><input className="field field-sm num w-40" defaultValue={r.invoice || ''} placeholder="숫자만 입력 (비우면 자동)" disabled={r.status !== '배송준비'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
    </div>
  );
}

/* 처리 이력 — 주문 접수 · 결제 완료 · 발송 · 배송완료 · 구매확정 (실제 orderView.trackingOf: 상품주문 시각 필드로 최신 단계부터) */
const DELIVERED = ['배송완료', '구매확정', '반품요청', '반품완료', '교환요청', '교환완료'];
function historyOf(o) {
  const at = (h) => new Date(o.date.getTime() + h * 36e5);
  return [
    o.status === '구매확정' && { at: at(46 + 72), what: '구매확정되었습니다' },
    DELIVERED.includes(o.status) && { at: at(46), what: '배송이 완료되었습니다' },
    o.invoice && { at: at(26), what: `상품이 발송되었습니다 (${o.courier} ${o.invoice})` },
    { at: at(0), what: '결제가 완료되었습니다' },
    { at: o.date, what: '주문이 접수되었습니다' },
  ].filter(Boolean);
}

/* ─────────── 주문 상세 ─────────── */
export function SellerOrderDetail() {
  const { lineId } = useParams();
  const { toast } = useApp();
  const [, refresh] = useState(0);
  const [shipForm, setShipForm] = useState(null); // 송장 입력 중이면 { courier, invoice }
  const o = ORDERS.find((x) => x.lineId === lineId) || ORDERS[0];
  const p = productById[o.productId];
  const buyer = userById[o.buyerId];
  const amount = o.unitPrice * o.qty;
  const update = (patch, msg) => { ORDERS = ORDERS.map((x) => (x.lineId === o.lineId ? { ...x, ...patch } : x)); refresh((n) => n + 1); toast(msg); };
  const ship = () => { update({ status: '배송중', courier: shipForm.courier, invoice: shipForm.invoice.trim() || demoInvoice() }, bulkSummary('발송처리', 1)); setShipForm(null); };
  return (
    <div>
      <PageHead crumbs="주문 · 배송 > 주문 관리" title={<span className="num">{o.lineId}</span>} desc={`주문일시 ${ymdhm(o.date)} · 주문번호 ${o.orderId}`}
        right={<Link to="/seller/orders" className="btn btn-line btn-sm">목록</Link>} />
      <div className="grid xl:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <div className="panel">
            <div className="panel-head"><span className="panel-title">주문 상품</span><StatusPill s={o.status} /></div>
            <div className="p-5 flex gap-4">
              <img src={p.images[0]} alt="" className="w-20 h-24 object-cover" />
              <div className="flex-1 text-[13px]">
                <div className="font-semibold text-[15px]">{p.name}</div>
                <div className="text-mute mt-1">{o.option || '단일상품'} · {o.qty}개</div>
                <div className="mt-2 num">{won(o.unitPrice)} × {o.qty} = <b>{won(amount)}</b></div>
              </div>
            </div>
            <div className="px-5 pb-5 flex flex-wrap gap-2">
              {o.status === '결제완료' && <button onClick={() => update({ status: '배송준비' }, bulkSummary('발주확인', 1))} className="btn btn-ink btn-sm">발주확인</button>}
              {o.status === '배송준비' && !shipForm && <button onClick={() => setShipForm({ courier: MY_STORE.courier, invoice: '' })} className="btn btn-ink btn-sm">송장 입력</button>}
              {o.status === '배송중' && <button onClick={() => update({ status: '배송완료' }, bulkSummary('배송완료 처리', 1))} className="btn btn-ink btn-sm">배송완료 처리</button>}
              {['결제완료', '배송준비'].includes(o.status) && <button className="btn btn-line btn-sm">판매취소</button>}
              {o.status === '배송중' && <button className="btn btn-line btn-sm">송장 수정</button>}
              <button className="btn btn-line btn-sm">구매자에게 메시지</button>
            </div>
            {shipForm && (
              <div className="px-5 pb-5 flex flex-wrap items-center gap-2 text-[13px]">
                <select value={shipForm.courier} onChange={(e) => setShipForm({ ...shipForm, courier: e.target.value })} className="field field-sm w-32">{COURIERS.map((c) => <option key={c}>{c}</option>)}</select>
                <input value={shipForm.invoice} onChange={(e) => setShipForm({ ...shipForm, invoice: e.target.value })} className="field field-sm num w-48" placeholder="송장번호 (비우면 자동)" />
                <button onClick={ship} className="btn btn-ink btn-sm">발송처리</button>
                <button onClick={() => setShipForm(null)} className="btn btn-ghost btn-sm">취소</button>
              </div>
            )}
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title">배송지 정보</span><button className="btn btn-line btn-xs">배송지 수정</button></div>
            <div className="p-5"><KV rows={[['수령인', o.receiver], ['연락처', o.phone], ['주소', o.addr], ['배송메모', o.memo || '-'], ['택배사', o.invoice ? o.courier : '-'], ['송장번호', o.invoice ? <span className="num">{o.invoice}</span> : '미등록']]} /></div>
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title">처리 이력</span></div>
            <ol className="p-5">
              {historyOf(o).map((t, i) => (
                <li key={t.what} className="flex gap-4 text-[13px] py-1.5"><span className="num text-mute w-32 shrink-0">{ymdhm(t.at)}</span><span className={i === 0 ? 'font-semibold' : 'text-ink-2'}>{t.what}</span></li>
              ))}
            </ol>
          </div>
        </div>
        <div className="space-y-4">
          <div className="panel">
            <div className="panel-head"><span className="panel-title">구매자</span></div>
            <div className="p-5 text-[13px]"><b>{buyer?.name ?? o.receiver}</b></div>
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title">정산 예정</span></div>
            <div className="p-5 text-[13px] space-y-2 num">
              <div className="flex justify-between"><span className="text-ink-2 font-sans">결제금액</span>{won(amount)}</div>
              <div className="flex justify-between"><span className="text-ink-2 font-sans">판매수수료 (11%)</span>−{won(amount * 0.11)}</div>
              <div className="flex justify-between"><span className="text-ink-2 font-sans">결제수수료 (2.2%)</span>−{won(amount * 0.022)}</div>
              <div className="flex justify-between border-t border-line pt-2 font-bold text-[14px]"><span className="font-sans">정산 예정액</span>{won(amount * (1 - 0.132))}</div>
              <p className="text-[11.5px] text-mute font-sans">구매확정 후 다음 주 목요일 지급</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── 취소/반품/교환 ───────────
   실제 SellerClaimList · claimView 와 같은 흐름
   - 취소: 자동 처리 (판매자 할 일 없음) — 진행 중이면 '취소중'
   - 반품: 요청 → 승인(수거 요청) → 수거 완료 · 환불 → 반품완료
   - 교환: 요청 → 승인 → 수거 완료 → 재배송 송장 → (주문 관리 배송완료 또는 자동) 교환완료 */
const STEP_LABEL = { REQUESTED: '요청', APPROVED: '승인', COLLECTED: '수거완료', RESHIPPED: '재배송중', REJECTED: '거부', WITHDRAWN: '철회', COMPLETED: '완료' };
const OPEN_STEPS = ['REQUESTED', 'APPROVED', 'COLLECTED', 'RESHIPPED'];
const SELLER_FAULT = ['상품 불량 · 파손', '오배송'];
const REJECT_REASONS = ['상품 사용 흔적 확인', '반품 기한 경과', '구성품 누락', '기타'];

const claimStatusLabel = (c) => (c.type === '취소' && c.step === 'APPROVED' ? '취소중' : `${c.type}${STEP_LABEL[c.step]}`);
function nextAction(c) {
  if (c.type === '취소') return null;
  if (c.step === 'REQUESTED') return { action: 'approve', label: '승인 (수거 요청)', rejectable: true };
  if (c.step === 'APPROVED') return { action: 'collect', label: c.type === '반품' ? '수거 완료 · 환불' : '수거 완료' };
  if (c.step === 'COLLECTED' && c.type === '교환') return { action: 'reship', label: '재배송 송장' };
  return null;
}
function claimProgress(c) {
  switch (c.step) {
    case 'REQUESTED': return '판매자 확인 중이에요.';
    case 'APPROVED': return c.type === '취소' ? '환불을 처리하고 있어요.' : '승인되었어요. 상품을 회수하고 있어요.';
    case 'COLLECTED': return c.type === '반품' ? '회수 완료 — 환불을 처리하고 있어요.' : '회수 완료 — 곧 같은 옵션으로 다시 보내 드려요.';
    case 'RESHIPPED': return '교환 상품을 다시 보냈어요. 배송완료되면 교환이 끝나요.';
    case 'REJECTED': return `판매자가 거부했어요 — ${c.rejectReason ?? ''}`.trim();
    case 'WITHDRAWN': return '요청을 철회했어요.';
    default: return `${c.type} 처리가 끝났어요.`;
  }
}
// 환불액 — 신청 때 계산된 금액 (반품 배송비 차감 포함) · 사용 포인트는 환원
function claimMoney(r) {
  const amount = r.unitPrice * r.qty;
  const used = r.usedPoint || 0;
  const fee = r.claim.type === '반품' && !SELLER_FAULT.includes(r.claim.reason) ? (MY_STORE.shipFee || 3000) * 2 : 0;
  return { amount, restorePoint: used, refund: Math.max(0, amount - used - fee) };
}
// 목업 데이터의 주문 상태 → 클레임 단계 (진행 중 요청은 단계를 고루 섞어 보여 준다)
const toClaim = (o, i) => {
  const type = o.claim.type;
  let step = o.status.endsWith('완료') ? 'COMPLETED' : 'REQUESTED';
  if (type === '취소' && step === 'REQUESTED') step = 'APPROVED';
  if (type !== '취소' && step === 'REQUESTED') step = ['REQUESTED', 'APPROVED', type === '교환' ? 'COLLECTED' : 'REQUESTED'][i % 3];
  return { ...o, claim: { ...o.claim, step } };
};
let CLAIMS = ORDERS.filter((o) => o.claim).map(toClaim);

export function SellerClaims() {
  const { toast } = useApp();
  const [rows, setRows] = useState(CLAIMS);
  const [tab, setTab] = useState('처리대기');
  const [type, setType] = useState('전체');
  const [detail, setDetail] = useState(null);
  const [reject, setReject] = useState(null);
  const [rejectForm, setRejectForm] = useState({ reason: REJECT_REASONS[0], text: '' });
  const [reship, setReship] = useState(null);
  const [reshipForm, setReshipForm] = useState({ courier: MY_STORE.courier, invoice: '' });
  const view = (r) => ({ type: r.claim.type, step: r.claim.step, rejectReason: r.claim.rejectReason });
  const byType = type === '전체' ? rows : rows.filter((r) => r.claim.type === type);
  const pending = byType.filter((r) => OPEN_STEPS.includes(r.claim.step));
  const list = tab === '처리대기' ? pending : byType.filter((r) => !OPEN_STEPS.includes(r.claim.step));
  const typeCounts = { 전체: rows.length, 취소: 0, 반품: 0, 교환: 0 };
  rows.forEach((r) => { typeCounts[r.claim.type] += 1; });

  const setStep = (r, claim, status) => {
    const next = rows.map((x) => (x.lineId === r.lineId ? { ...x, status: status ?? x.status, claim: { ...x.claim, ...claim } } : x));
    CLAIMS = next; setRows(next); setDetail(null);
    if (status) ORDERS = ORDERS.map((x) => (x.lineId === r.lineId ? { ...x, status } : x));
  };
  const act = (r, action) => {
    if (action === 'approve') { setStep(r, { step: 'APPROVED' }); toast('승인했어요. 상품을 회수해 주세요'); }
    if (action === 'collect') {
      if (r.claim.type === '교환') { setStep(r, { step: 'COLLECTED' }); toast('수거 완료 — 재배송 송장을 입력해 주세요'); }
      else { setStep(r, { step: 'COMPLETED' }, '반품완료'); toast(`반품 완료 — ${won(claimMoney(r).refund)} 환불했어요`); }
    }
    if (action === 'reship') { setReshipForm({ courier: MY_STORE.courier, invoice: '' }); setReship(r); setDetail(null); }
  };
  const submitReject = () => {
    const reason = rejectForm.text.trim() ? `${rejectForm.reason} — ${rejectForm.text.trim()}` : rejectForm.reason;
    setStep(reject, { step: 'REJECTED', rejectReason: reason }); setReject(null);
    toast('거부 사유가 구매자에게 전달되었어요');
  };
  const submitReship = () => {
    setStep(reship, { step: 'RESHIPPED', reshipCourier: reshipForm.courier, reshipInvoice: reshipForm.invoice.trim() || demoInvoice() }); setReship(null);
    toast('재배송 송장을 등록했어요. 배송완료되면 교환이 끝나요');
  };
  const detailNext = detail && nextAction(view(detail));

  return (
    <div>
      <PageHead title="취소 · 반품 · 교환" desc="요청 접수 후 3영업일 내 처리해주세요. 반품은 수거 완료 시 결제 취소 → 재고 복원 → 구매자 포인트 환원 · 회수가 함께 진행됩니다." />
      <div className="flex flex-wrap gap-2">
        <Segments items={['처리대기', '처리완료']} value={tab} onChange={setTab} counts={{ 처리대기: pending.length, 처리완료: byType.length - pending.length }} />
        <Segments items={['전체', '취소', '반품', '교환']} value={type} onChange={setType} counts={typeCounts} />
      </div>
      <div className="panel mt-3 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>상태</th><th>유형</th><th>상품주문번호</th><th>상품</th><th>구매자</th><th>사유</th><th>요청일</th><th className="text-right">금액</th><th className="text-center">처리</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={9} className="text-center text-mute py-10">처리할 요청이 없습니다.</td></tr>}
            {list.map((r) => {
              const p = productById[r.productId];
              const next = nextAction(view(r));
              const pastDue = r.claim.step === 'REQUESTED' && (Date.now() - r.claim.requested) / 864e5 > 2;
              return (
                <tr key={r.lineId}>
                  <td><StatusPill s={claimStatusLabel(view(r))} /></td>
                  <td className="font-semibold">{r.claim.type}</td>
                  <td><Link to={`/seller/orders/${r.lineId}`} className="num text-sky hover:underline whitespace-nowrap">{r.lineId}</Link></td>
                  <td className="max-w-[220px] truncate">{p.name}<div className="text-[11.5px] text-mute">{r.option || '단일상품'}</div></td>
                  <td>{userById[r.buyerId]?.name ?? r.receiver}</td>
                  <td>{r.claim.reason}</td>
                  <td className={cx('num whitespace-nowrap', pastDue && 'text-rust font-semibold')}>{ymd(r.claim.requested)}{pastDue && ' (기한임박)'}</td>
                  <td className="text-right num">{won(r.unitPrice * r.qty)}</td>
                  <td>
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => setDetail(r)} className="btn btn-line btn-xs">상세</button>
                      {next && <button onClick={() => act(r, next.action)} className="btn btn-ink btn-xs whitespace-nowrap">{next.label}</button>}
                      {next?.rejectable && <button onClick={() => setReject(r)} className="btn btn-line btn-xs">거부</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail && (() => {
        const m = claimMoney(detail);
        const p = productById[detail.productId];
        const c = detail.claim;
        const invoice = c.reshipInvoice ? `${c.reshipCourier} ${c.reshipInvoice} (재배송)` : detail.invoice ? `${detail.courier} ${detail.invoice}` : null;
        return (
          <Modal open onClose={() => setDetail(null)} title={`${c.type} 요청 상세`} width={560}
            footer={detailNext ? <>
              {detailNext.rejectable && <button className="btn btn-line btn-sm" onClick={() => { setReject(detail); setDetail(null); }}>거부</button>}
              <button className="btn btn-ink btn-sm" onClick={() => act(detail, detailNext.action)}>{detailNext.label}</button>
            </> : <button className="btn btn-line btn-sm" onClick={() => setDetail(null)}>닫기</button>}>
            <div className="flex gap-3 pb-4 border-b border-line text-[13px]">
              <img src={p.images[0]} alt="" className="w-14 h-16 object-cover" />
              <div className="flex-1"><div className="font-semibold">{p.name}</div><div className="text-mute">{detail.option || '단일상품'} · {detail.qty}개</div><div className="num text-mute">{detail.lineId}</div></div>
              <StatusPill s={claimStatusLabel(view(detail))} />
            </div>
            <div className="mt-4"><KV rows={[['유형', c.type], ['사유', c.reason], ['요청일', ymd(c.requested)], ['구매자', userById[detail.buyerId]?.name ?? detail.receiver], ['진행', claimProgress(view(detail))], ['송장', invoice ? <span className="num">{invoice}</span> : '-']]} /></div>
            {c.type !== '교환' && (
              <div className="mt-4 bg-cream p-4 text-[13px] space-y-1.5">
                <div className="flex justify-between"><span className="text-ink-2">상품 결제금액</span><span className="num">{won(m.amount)}</span></div>
                <div className="flex justify-between"><span className="text-ink-2">구매자 사용 포인트 환원</span><span className="num text-moss">+{comma(m.restorePoint)}P</span></div>
                <div className="flex justify-between font-bold border-t border-line-2 pt-1.5"><span>결제수단 환불액 (부분 취소)</span><span className="num">{won(m.refund)}</span></div>
              </div>
            )}
            <p className="text-[12px] text-mute mt-2">{c.type === '교환' ? '교환은 결제 · 재고 변동 없이 회수 확인 후 같은 옵션으로 재배송합니다.' : '환불액은 신청 때 계산된 금액(반품 배송비 차감 포함)이에요. 판매자 정산에서는 해당 상품주문이 제외됩니다.'}</p>
          </Modal>
        );
      })()}

      <Modal open={!!reject} onClose={() => setReject(null)} title="요청 거부" width={460}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setReject(null)}>취소</button><button className="btn btn-ink btn-sm" onClick={submitReject}>거부하기</button></>}>
        <label className="label">거부 사유</label>
        <select value={rejectForm.reason} onChange={(e) => setRejectForm({ ...rejectForm, reason: e.target.value })} className="field mb-3">{REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}</select>
        <textarea rows={3} value={rejectForm.text} onChange={(e) => setRejectForm({ ...rejectForm, text: e.target.value })} maxLength={400} className="field" placeholder="구매자에게 전달할 상세 사유" />
        <p className="text-[12px] text-mute mt-2">거부 사유는 구매자의 취소 · 반품 · 교환 내역에 표시됩니다.</p>
      </Modal>

      <Modal open={!!reship} onClose={() => setReship(null)} title="교환 재배송 송장" width={460}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setReship(null)}>취소</button><button className="btn btn-ink btn-sm" onClick={submitReship}>등록</button></>}>
        <label className="label">택배사</label>
        <select value={reshipForm.courier} onChange={(e) => setReshipForm({ ...reshipForm, courier: e.target.value })} className="field mb-3">{COURIERS.map((c) => <option key={c}>{c}</option>)}</select>
        <label className="label">송장번호</label>
        <input value={reshipForm.invoice} onChange={(e) => setReshipForm({ ...reshipForm, invoice: e.target.value })} className="field num" placeholder="숫자만 입력 (비우면 자동)" />
        <p className="text-[12px] text-mute mt-2">재배송이 배송완료되면(주문 관리의 배송완료 또는 자동) 교환이 끝나요.</p>
      </Modal>
    </div>
  );
}
