import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Search, Download, Printer } from 'lucide-react';
import { productById } from '../../data/catalog';
import { sellerOrders, trackingOf, FLOW } from '../../data/orders';
import { userById } from '../../data/people';
import { useApp } from '../../lib/store';
import { PageHead, Segments, StatusPill, Checkbox, Modal, KV, Pager } from '../../components/ui';
import { won, ymd, ymdhm, cx, maskName } from '../../lib/format';
import { MY_STORE } from './SellerLayout';

/* 목업용 모듈 상태: 페이지 이동 후에도 처리 결과가 유지되도록 */
let ORDERS = sellerOrders.map((o) => ({ ...o }));

const COURIERS = ['CJ대한통운', '롯데택배', '한진택배', '우체국택배', '로젠택배'];

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
  const list = rows.filter((r) => (tab === '전체' || r.status === tab) && (r.lineId + r.receiver + productById[r.productId].name).includes(q));
  const selRows = rows.filter((r) => sel.has(r.lineId));
  const allOn = list.length > 0 && list.every((r) => sel.has(r.lineId));

  const confirm = () => {
    const ok = selRows.filter((r) => r.status === '결제완료');
    if (!ok.length) return toast('결제완료 상태의 주문만 발주확인할 수 있어요');
    save(rows.map((r) => (sel.has(r.lineId) && r.status === '결제완료' ? { ...r, status: '배송준비' } : r)));
    toast(`${ok.length}건 발주확인 완료 → 배송준비`); setSel(new Set());
  };
  const ship = () => {
    save(rows.map((r) => (sel.has(r.lineId) && r.status === '배송준비' ? { ...r, status: '배송중', invoice: r.invoice || `6512${Math.floor(Math.random() * 1e8)}` } : r)));
    toast(`송장 등록 · 발송처리 완료 (구매자에게 알림톡 발송)`); setSel(new Set()); setInvoiceModal(false);
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
          <select className="field field-sm w-36 h-9"><option>상품주문번호</option><option>구매자명</option><option>상품명</option><option>송장번호</option></select>
          <div className="flex items-center border border-line-2 h-9 px-2.5 flex-1 min-w-[200px] max-w-md bg-white"><Search size={15} className="text-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 px-2 text-[13px] outline-none" placeholder="검색어 입력" /></div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto"><Segments items={TABS} value={tab} onChange={(t) => { setTab(t); setSel(new Set()); }} counts={counts} /></div>

      <div className="panel mt-3">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-line text-[13px]">
          <span className="text-ink-2 mr-2">선택 <b className="num text-ink">{sel.size}</b>건</span>
          <button disabled={!sel.size} onClick={confirm} className="btn btn-ink btn-xs">발주확인</button>
          <button disabled={!sel.size} onClick={() => setInvoiceModal(true)} className="btn btn-line btn-xs">송장 입력 · 발송처리</button>
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
                    <td><div className="flex items-center gap-2.5 min-w-[240px]"><img src={p.images[0]} alt="" className="w-9 h-9 object-cover" /><div><div className="truncate max-w-[240px]">{p.name}</div><div className="text-[11.5px] text-mute">{o.option}</div></div></div></td>
                    <td className="text-right num">{o.qty}</td>
                    <td className="text-right num whitespace-nowrap">{won(o.unitPrice * o.qty)}</td>
                    <td className="whitespace-nowrap">{o.receiver}</td>
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
        <p className="text-[12.5px] text-mute mb-3">배송준비 상태 주문만 발송처리됩니다. 송장번호는 택배사 시스템으로 자동 검증됩니다.</p>
        <table className="tbl">
          <thead><tr><th>상품주문번호</th><th>수령인</th><th>택배사</th><th>송장번호</th></tr></thead>
          <tbody>
            {selRows.map((r) => (
              <tr key={r.lineId} className={cx(r.status !== '배송준비' && 'opacity-40')}>
                <td className="num text-[12px]">{r.lineId}</td><td>{r.receiver}</td>
                <td><select defaultValue={MY_STORE.courier} className="field field-sm w-32">{COURIERS.map((c) => <option key={c}>{c}</option>)}</select></td>
                <td><input className="field field-sm num w-40" defaultValue={r.invoice || ''} placeholder="숫자만 입력" disabled={r.status !== '배송준비'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
    </div>
  );
}

/* ─────────── 주문 상세 ─────────── */
export function SellerOrderDetail() {
  const { lineId } = useParams();
  const { toast } = useApp();
  const o = ORDERS.find((x) => x.lineId === lineId) || ORDERS[0];
  const p = productById[o.productId];
  const buyer = userById[o.buyerId];
  const amount = o.unitPrice * o.qty;
  return (
    <div>
      <PageHead crumbs="주문 · 배송 > 주문 관리" title={<span className="num">{o.lineId}</span>} desc={`주문일시 ${ymdhm(o.date)}`}
        right={<Link to="/seller/orders" className="btn btn-line btn-sm">목록</Link>} />
      <div className="grid xl:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <div className="panel">
            <div className="panel-head"><span className="panel-title">주문 상품</span><StatusPill s={o.status} /></div>
            <div className="p-5 flex gap-4">
              <img src={p.images[0]} alt="" className="w-20 h-24 object-cover" />
              <div className="flex-1 text-[13px]">
                <div className="font-semibold text-[15px]">{p.name}</div>
                <div className="text-mute mt-1">{o.option} · {o.qty}개</div>
                <div className="mt-2 num">{won(o.unitPrice)} × {o.qty} = <b>{won(amount)}</b></div>
              </div>
            </div>
            <div className="px-5 pb-5 flex flex-wrap gap-2">
              {o.status === '결제완료' && <button onClick={() => toast('발주확인 완료')} className="btn btn-ink btn-sm">발주확인</button>}
              {o.status === '배송준비' && <button onClick={() => toast('송장 등록 완료')} className="btn btn-ink btn-sm">송장 입력</button>}
              {['결제완료', '배송준비'].includes(o.status) && <button className="btn btn-line btn-sm">판매취소</button>}
              {o.status === '배송중' && <button className="btn btn-line btn-sm">송장 수정</button>}
              <button className="btn btn-line btn-sm">구매자에게 메시지</button>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title">배송지 정보</span><button className="btn btn-line btn-xs">배송지 수정</button></div>
            <div className="p-5"><KV rows={[['수령인', o.receiver], ['연락처', o.phone], ['주소', o.addr], ['배송메모', o.memo || '-'], ['택배사', o.courier], ['송장번호', o.invoice ? <span className="num">{o.invoice}</span> : '미등록']]} /></div>
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title">처리 이력</span></div>
            <ol className="p-5">
              {trackingOf(o).map((t, i) => (
                <li key={i} className="flex gap-4 text-[13px] py-1.5"><span className="num text-mute w-32 shrink-0">{ymdhm(t.t)}</span><span className={i === 0 ? 'font-semibold' : 'text-ink-2'}>{t.what}</span></li>
              ))}
            </ol>
          </div>
        </div>
        <div className="space-y-4">
          <div className="panel">
            <div className="panel-head"><span className="panel-title">구매자</span></div>
            <div className="p-5 text-[13px] space-y-1.5">
              <div className="flex items-center gap-2.5"><img src={buyer.avatar} alt="" className="w-9 h-9 rounded-full object-cover" /><div><b>{buyer.name}</b> <span className="text-mute">({maskName(buyer.nick)})</span><div className="text-[12px] text-mute">{buyer.grade} · 우리 스토어 구매 {buyer.orders % 7 + 1}회</div></div></div>
            </div>
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

/* ─────────── 취소/반품/교환 ─────────── */
export function SellerClaims() {
  const { toast } = useApp();
  const [rows, setRows] = useState(() => ORDERS.filter((o) => o.claim));
  const [tab, setTab] = useState('처리대기');
  const [reject, setReject] = useState(null);
  const pending = rows.filter((r) => r.status.endsWith('요청'));
  const list = tab === '처리대기' ? pending : rows.filter((r) => !r.status.endsWith('요청'));
  const done = { 취소요청: '취소완료', 반품요청: '반품완료', 교환요청: '배송중' };
  const approve = (r) => { const next = rows.map((x) => (x.lineId === r.lineId ? { ...x, status: done[x.status] } : x)); setRows(next); ORDERS = ORDERS.map((x) => next.find((n) => n.lineId === x.lineId) || x); toast(`${r.status.replace('요청', '')} 승인 처리했어요`); };

  return (
    <div>
      <PageHead title="취소 · 반품 · 교환" desc="요청 접수 후 3영업일 내 미처리 시 곳간 고객센터가 직권 처리하며, 판매자 페널티 점수가 부과됩니다." />
      <Segments items={['처리대기', '처리완료']} value={tab} onChange={setTab} counts={{ 처리대기: pending.length, 처리완료: rows.length - pending.length }} />
      <div className="panel mt-3 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>유형</th><th>상품주문번호</th><th>상품</th><th>구매자</th><th>사유</th><th>요청일</th><th className="text-right">금액</th><th className="text-center">처리</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={8} className="text-center text-mute py-10">처리할 요청이 없습니다.</td></tr>}
            {list.map((r) => {
              const p = productById[r.productId];
              const pastDue = (Date.now() - r.claim.requested) / 864e5 > 2;
              return (
                <tr key={r.lineId}>
                  <td><StatusPill s={r.status} /></td>
                  <td><Link to={`/seller/orders/${r.lineId}`} className="num text-sky hover:underline">{r.lineId}</Link></td>
                  <td className="max-w-[220px] truncate">{p.name}<div className="text-[11.5px] text-mute">{r.option}</div></td>
                  <td>{r.receiver}</td>
                  <td>{r.claim.reason}</td>
                  <td className={cx('num whitespace-nowrap', pastDue && r.status.endsWith('요청') && 'text-rust font-semibold')}>{ymd(r.claim.requested)}{pastDue && r.status.endsWith('요청') && ' (기한임박)'}</td>
                  <td className="text-right num">{won(r.unitPrice * r.qty)}</td>
                  <td>
                    {r.status.endsWith('요청') ? (
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => approve(r)} className="btn btn-ink btn-xs">{r.status === '교환요청' ? '교환 재발송' : '승인'}</button>
                        <button onClick={() => setReject(r)} className="btn btn-line btn-xs">거부</button>
                      </div>
                    ) : <span className="text-mute text-[12px] block text-center">완료</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Modal open={!!reject} onClose={() => setReject(null)} title="요청 거부" width={460}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setReject(null)}>취소</button><button className="btn btn-ink btn-sm" onClick={() => { setReject(null); toast('거부 사유가 구매자에게 전달되었어요'); }}>거부하기</button></>}>
        <label className="label">거부 사유</label>
        <select className="field mb-3"><option>이미 발송된 상품 (반품으로 진행 요청)</option><option>상품 사용 흔적 확인</option><option>반품 기한 경과</option><option>기타</option></select>
        <textarea rows={3} className="field" placeholder="구매자에게 전달할 상세 사유" />
        <p className="text-[12px] text-mute mt-2">거부 시 구매자는 곳간 고객센터에 분쟁 조정을 신청할 수 있습니다.</p>
      </Modal>
    </div>
  );
}
