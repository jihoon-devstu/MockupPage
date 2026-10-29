import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, Download, ExternalLink, ChevronRight, MessagesSquare } from 'lucide-react';
import { stores, storeById, catById, categories, products, productsOfStore, productById, PAYMENT_FEE } from '../../data/catalog';
import { users, userById, GRADES, nextGrade } from '../../data/people';
import { userPointHistory } from '../../data/points';
import { settlements } from '../../data/orders';
import { reviews, reviewsOfStore, ratingSummary } from '../../data/reviews';
import { REPORT_TARGETS, REPORT_REASON_LABEL, reportRow } from '../../data/reports';
import { useApp } from '../../lib/store';
import { PageHead, Segments, StatusPill, Modal, KV, Kpi, Checkbox, Stars, Pill, GradeBadge } from '../../components/ui';
import { won, comma, ymd, ymdhm, pct, cx, shortWon } from '../../lib/format';
import { ChatInbox, OpenChatButton } from '../../components/Chat';

/* ─────────── 스토어 관리 ─────────── */
export function AdminStores() {
  const [tab, setTab] = useState('전체');
  const [q, setQ] = useState('');
  const T = ['전체', '운영중', '정지'];
  const counts = Object.fromEntries(T.map((t) => [t, t === '전체' ? stores.length : stores.filter((s) => s.status === t).length]));
  const list = stores.filter((s) => (tab === '전체' || s.status === tab) && (s.name + s.owner + s.bizNo).includes(q));
  return (
    <div>
      <PageHead title="스토어 관리" desc="입점 승인된 스토어 목록 · 등급은 최근 3개월 거래액과 페널티 점수로 매월 1일 갱신" right={<button className="btn btn-line btn-sm"><Download size={14} /> 엑셀</button>} />
      <div className="flex flex-wrap gap-3 items-center">
        <Segments items={T} value={tab} onChange={setTab} counts={counts} />
        <div className="flex items-center border border-line-2 h-9 px-2.5 ml-auto w-full sm:w-64 bg-white"><Search size={15} className="text-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="스토어명 · 대표자 · 사업자번호" className="flex-1 px-2 text-[13px] outline-none" /></div>
      </div>
      <div className="panel mt-3 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>스토어</th><th>대표자</th><th>사업자번호</th><th>등급</th><th>평점</th><th>입점일</th><th>상태</th></tr></thead>
          <tbody>
            {list.map((s) => {
              const sum = ratingSummary(reviewsOfStore(s.id));
              return (
                <tr key={s.id}>
                  <td><Link to={`/admin/stores/${s.id}`} className="flex items-center gap-2 font-semibold hover:underline"><span className="w-7 h-7 text-white text-[12px] font-bold flex items-center justify-center" style={{ background: s.color }}>{s.name[0]}</span>{s.name}</Link></td>
                  <td>{s.owner}</td>
                  <td className="num text-ink-2">{s.bizNo}</td>
                  <td>{s.grade}</td>
                  <td>{sum.total ? `★ ${sum.avg.toFixed(1)} (${sum.total})` : <span className="text-mute">리뷰 없음</span>}</td>
                  <td className="num text-ink-2">{ymd(s.since)}</td>
                  <td><StatusPill s={s.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminStoreDetail() {
  const { id } = useParams();
  const { toast } = useApp();
  const s = storeById[id] || stores[0];
  const [status, setStatus] = useState(s.status);
  const [modal, setModal] = useState(false);
  const ss = settlements.filter((x) => x.storeId === s.id);
  const prods = productsOfStore(s.id);
  const sum = ratingSummary(reviewsOfStore(s.id));
  const c = catById[s.cat];
  return (
    <div>
      <PageHead crumbs="판매자 > 스토어 관리" title={s.name} desc={`${c.name} · ${s.owner} · 입점 ${ymd(s.since)}`}
        right={<><Link to={`/store/${s.id}`} className="btn btn-line btn-sm">쇼핑몰에서 보기 <ExternalLink size={13} /></Link>
          <OpenChatButton basePath="/admin/chats" by="ADMIN" request={{ type: 'SELLER_SUPPORT', storeId: s.id, context: { type: 'STORE', id: s.id } }}>판매자와 상담</OpenChatButton>{s.status !== '폐점' && <button onClick={() => setModal(true)} className="btn btn-ink btn-sm">상태 변경</button>}</>} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi label="8주 거래액" value={shortWon(ss.reduce((a, x) => a + x.gross, 0))} unit="원" />
        <Kpi label="8주 수수료 수익" value={comma(ss.reduce((a, x) => a + x.commission, 0) / 10000)} unit="만원" sub={`판매수수료 ${pct(c.commission)}`} />
        <Kpi label="평균 평점" value={sum.avg.toFixed(2)} sub={`리뷰 ${sum.total}건`} />
        <Kpi label="페널티 점수" value={s.id === 's5' ? '7' : '0'} unit="/ 10점" sub="10점 도달 시 판매 제한" />
      </div>
      <div className="grid xl:grid-cols-[1fr_380px] gap-4 mt-4">
        <div className="space-y-4">
          <div className="panel overflow-x-auto">
            <div className="panel-head"><span className="panel-title">등록 상품 {prods.length}</span></div>
            <table className="tbl">
              <thead><tr><th>상품</th><th className="text-right">판매가</th><th className="text-right">재고</th><th className="text-right">판매량</th><th>상태</th><th /></tr></thead>
              <tbody>
                {prods.map((p) => (
                  <tr key={p.id}>
                    <td><div className="flex items-center gap-2.5"><img src={p.images[0]} alt="" className="w-9 h-9 object-cover" />{p.name}</div></td>
                    <td className="text-right num">{comma(p.price)}</td><td className="text-right num">{p.stock}</td><td className="text-right num">{comma(p.sold)}</td>
                    <td><StatusPill s={p.status} /></td>
                    <td><button onClick={() => toast('상품을 강제 판매중지했어요 (판매자에게 사유 통보)')} className="btn btn-ghost btn-xs text-rust">강제중지</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel overflow-x-auto">
            <div className="panel-head"><span className="panel-title">정산 이력</span><Link to="/admin/settlements" className="text-[12px] text-mute">정산 관리</Link></div>
            <table className="tbl">
              <thead><tr><th>기간</th><th className="text-right">매출</th><th className="text-right">수수료</th><th className="text-right">지급액</th><th>지급일</th><th>상태</th></tr></thead>
              <tbody>{ss.map((x) => <tr key={x.id}><td className="num">{ymd(x.start)} ~ {ymd(x.end).slice(5)}</td><td className="text-right num">{comma(x.gross)}</td><td className="text-right num">{comma(x.commission + x.pgFee)}</td><td className="text-right num font-semibold">{comma(x.payout)}</td><td className="num">{ymd(x.pay)}</td><td><StatusPill s={x.status} /></td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <div className="panel">
            <img src={s.cover} alt="" className="w-full h-28 object-cover" />
            <div className="p-5"><KV rows={[['상태', <StatusPill s={status} />], ['등급', s.grade], ['사업자번호', s.bizNo], ['연락처', s.phone], ['이메일', s.email], ['배송', `${s.courier} · ${won(s.shipFee)}`]]} /></div>
          </div>
          <div className="panel p-5">
            <div className="panel-title mb-2">관리 메모</div>
            <ul className="text-[12.5px] text-ink-2 space-y-1.5">
              <li><span className="num text-mute">2026.09.12</span> 추석 기획전 참여 확정</li>
              {s.id === 's5' && <li><span className="num text-mute">2026.09.25</span> 반품 미처리 3건 → 정산 보류 / 운영 정지</li>}
              <li><span className="num text-mute">{ymd(s.since)}</span> 입점 승인</li>
            </ul>
          </div>
        </div>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="스토어 상태 변경" width={460}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setModal(false)}>취소</button><button className="btn btn-ink btn-sm" onClick={() => { setModal(false); toast(`스토어 상태: ${status}`); }}>변경</button></>}>
        <Segments items={['운영중', '정지']} value={status} onChange={setStatus} />
        <div className="mt-4 text-[13px] text-ink-2 bg-cream p-3 leading-relaxed">
          {status === '운영중' && '스토어와 판매중 상품이 쇼핑몰에 노출됩니다.'}
          {status === '정지' && '상품이 쇼핑몰에서 즉시 숨겨지고 새 스토어 톡이 막힙니다. 지급예정 정산은 자동 보류되고, 해제하면 자동 보류만 풀립니다(직접 건 보류는 그대로).'}
        </div>
        <label className="label mt-4">사유 (스토어 이력에 기록)</label><textarea rows={3} maxLength={255} className="field" />
      </Modal>
    </div>
  );
}

/* ─────────── 상담함 (판매자 운영 상담 · 고객센터 1:1 상담, 관리자 전원 공용) ─────────── */
export function AdminChats() {
  return (
    <>
      <PageHead title="상담함" desc="판매자 · 고객 상담을 관리자 전원이 함께 봅니다. 답변은 '곳간 운영팀' 이름으로 나갑니다." />
      <ChatInbox kind="admin" basePath="/admin/chats" />
    </>
  );
}

/* ─────────── 정산 관리 ─────────── */
const WEEKS = [...new Set(settlements.map((s) => s.start.getTime()))];
const DAY = 864e5;
// 정산 주차 = 월 ~ 일, API 는 ISO 주차("2026-W39")
const isoWeek = (monday) => {
  const thu = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3);
  const jan4 = new Date(thu.getFullYear(), 0, 4);
  const firstThu = new Date(thu.getFullYear(), 0, 4 + 3 - ((jan4.getDay() + 6) % 7));
  return `${thu.getFullYear()}-W${String(1 + Math.round((thu - firstThu) / (7 * DAY))).padStart(2, '0')}`;
};
const SETTLE_ACTOR = { SYSTEM: '자동', ADMIN: '곳간 운영팀' };

/** 정산 상세 (실제 SettlementDetailBody 와 같은 칸) — 목업은 정산서에서 건별 상품주문 · 상태 이력을 만들어 보여 준다 */
function settlementDetail(s) {
  const ps = productsOfStore(s.storeId);
  const n = Math.max(1, s.orders);
  const unit = Math.round(s.gross / n / 10) * 10;
  const items = Array.from({ length: n }, (_, i) => {
    const p = ps[i % ps.length];
    const amount = i === n - 1 ? s.gross - unit * (n - 1) : unit;
    const confirmedAt = new Date(s.start.getTime() + (i % 7) * DAY + 10 * 36e5);
    const carriedOver = i < (s.carriedOver || 0);
    const mm = String(confirmedAt.getMonth() + 1).padStart(2, '0');
    const dd = String(confirmedAt.getDate()).padStart(2, '0');
    return {
      orderItemId: `${s.id}-${i}`, productName: p.name, orderNo: `2026${mm}${dd}-${String(120 + i * 7).padStart(6, '0')}-01`,
      confirmedAt: carriedOver ? new Date(confirmedAt.getTime() - 7 * DAY) : confirmedAt, amount, rate: s.rate,
      payout: Math.round(amount * (1 - s.rate - PAYMENT_FEE)), carriedOver,
    };
  });
  const aggregatedAt = new Date(s.end.getTime() + DAY + 3 * 36e5);
  const history = [{ at: aggregatedAt, from: null, to: '지급예정', actor: 'SYSTEM', reason: null }];
  if (s.status === '지급보류') history.push({ at: new Date(aggregatedAt.getTime() + 36e5), from: '지급예정', to: '지급보류', actor: 'ADMIN', reason: s.holdReason });
  if (s.status === '지급완료') history.push({ at: s.pay, from: '지급예정', to: '지급완료', actor: 'ADMIN', reason: null });
  return { ...s, storeName: storeById[s.storeId].name, week: isoWeek(s.start), items, history };
}

function SettlementDetailBody({ d }) {
  return (
    <div className="text-[14px]">
      <div className="text-[13px] text-mute mb-3">대상기간 {ymd(d.start)} ~ {ymd(d.end)} · {d.status === '지급완료' ? '지급일' : '지급 예정일'} {ymd(d.pay)}</div>
      <div className="border-t border-ink num">
        {[['구매확정 매출', d.gross], ['판매수수료 (카테고리별)', -d.commission], ['결제수수료 (2.2%)', -d.pgFee]].map(([k, v]) => (
          <div key={k} className="flex justify-between py-2.5 border-b border-line"><span className="font-sans text-ink-2">{k}</span><span>{v < 0 ? '−' : ''}{won(Math.abs(v))}</span></div>
        ))}
        <div className="flex justify-between py-3 text-[17px] font-bold"><span className="font-sans">정산금액</span><span>{won(d.payout)}</span></div>
      </div>
      <div className="mt-2 max-h-56 overflow-y-auto border-t border-line">
        <table className="tbl text-[12.5px]">
          <thead><tr><th>상품주문</th><th>구매확정</th><th className="text-right">금액</th><th className="text-right">수수료율</th><th className="text-right">정산</th></tr></thead>
          <tbody>
            {d.items.map((i) => (
              <tr key={i.orderItemId}>
                <td><div className="font-medium">{i.productName}</div><div className="text-[11px] text-mute num">{i.orderNo}{i.carriedOver && ' · 이월'}</div></td>
                <td className="num text-ink-2 whitespace-nowrap">{ymd(i.confirmedAt)}</td>
                <td className="text-right num">{comma(i.amount)}</td>
                <td className="text-right num">{pct(i.rate, 1)}</td>
                <td className="text-right num font-semibold">{comma(i.payout)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3"><KV rows={[['지급 계좌', d.bank], ...(d.holdReason ? [['보류 사유', d.holdReason]] : [])]} /></div>
      <ol className="mt-3 space-y-1.5 text-[12.5px]">
        {d.history.map((h, idx) => (
          <li key={`${h.at.getTime()}-${idx}`} className="flex items-center gap-1.5 flex-wrap">
            <span className="num text-mute">{ymdhm(h.at)}</span>
            {h.from && <><StatusPill s={h.from} /><span className="text-mute">→</span></>}<StatusPill s={h.to} />
            <span className="text-ink-2">{SETTLE_ACTOR[h.actor] ?? h.actor}{h.reason && ` · ${h.reason}`}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AdminSettlements() {
  const { toast } = useApp();
  const [week, setWeek] = useState(WEEKS[0]);
  const [rows, setRows] = useState(settlements);
  const [sel, setSel] = useState(new Set());
  const [hold, setHold] = useState(null);
  const [holdOpen, setHoldOpen] = useState(false); // 선택 건 보류 사유 입력
  const [holdReason, setHoldReason] = useState('');
  const [detail, setDetail] = useState(null); // 지급 전 확인 — 건별 상품주문 · 이력
  const [q, setQ] = useState('');
  const weekRows = rows.filter((s) => s.start.getTime() === week);
  const list = weekRows.filter((s) => (storeById[s.storeId].name + s.status).includes(q));
  const tot = (k) => weekRows.reduce((a, s) => a + s[k], 0);
  const payable = weekRows.filter((s) => s.status === '지급예정');
  const selected = () => [...sel].filter((id) => payable.some((p) => p.id === id));
  const pay = () => {
    const ids = selected();
    setRows(rows.map((s) => (ids.includes(s.id) ? { ...s, status: '지급완료' } : s)));
    toast(`${ids.length}건 지급 실행 (펌뱅킹 이체 요청)`); setSel(new Set());
  };
  const holdSelected = () => {
    const ids = selected();
    setRows(rows.map((s) => (ids.includes(s.id) ? { ...s, status: '지급보류', holdReason: holdReason.trim() } : s)));
    toast(`${ids.length}건 지급보류 처리`); setSel(new Set()); setHoldOpen(false); setHoldReason('');
  };
  const releaseHold = () => {
    setRows(rows.map((s) => (s.id === hold.id ? { ...s, status: '지급예정', holdReason: null } : s)));
    setHold(null); toast('보류 해제 → 지급예정으로 변경');
  };
  const aggregate = () => {
    const w = isoWeek(new Date(week));
    toast(`${w} 집계 — 새 정산서 0 · 다시 계산 ${weekRows.length} · 자동 보류 ${weekRows.filter((s) => s.status === '지급보류').length} · 이월 ${weekRows.reduce((a, s) => a + (s.carriedOver || 0), 0)}건`);
  };
  const d = detail && settlementDetail(detail);
  return (
    <div>
      <PageHead title="정산 관리" desc="구매확정일 기준 주간 정산 · 지급액 = 구매확정 매출 − 판매수수료(카테고리별) − 결제수수료(2.2%) · 환불은 구매확정 전에 끝나 정산에 들어오지 않음"
        right={<button className="btn btn-line btn-sm"><Download size={14} /> 정산 명세 엑셀</button>} />
      <div className="panel p-4 flex flex-wrap items-center gap-3">
        <span className="text-[13px] font-semibold">정산 주차</span>
        <select value={week} onChange={(e) => { setWeek(Number(e.target.value)); setSel(new Set()); }} className="field field-sm h-9 w-auto">
          {WEEKS.map((w) => <option key={w} value={w}>{ymd(new Date(w))} ~ {ymd(new Date(w + 6 * DAY)).slice(5)} (지급 {ymd(new Date(w + 10 * DAY)).slice(5)})</option>)}
        </select>
        <button onClick={aggregate} className="btn btn-line btn-sm ml-auto">이 주차 지금 집계</button>
        <span className="text-[11.5px] text-mute w-full sm:w-auto">자동 집계: 매주 월 03:00 · 클러스터 기동 시 지난주 — 여러 번 눌러도 스토어 × 주차 1건</span>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
        <Kpi label="구매확정 매출" value={shortWon(tot('gross'))} unit="원" />
        <Kpi label="판매수수료 (플랫폼 수익)" value={comma(tot('commission') / 10000)} unit="만원" />
        <Kpi label="결제수수료 (PG)" value={comma(tot('pgFee') / 10000)} unit="만원" />
        <Kpi label="판매자 지급 총액" value={shortWon(tot('payout'))} unit="원" sub={`${weekRows.length}개 스토어`} />
      </div>
      <div className="panel mt-4">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-line text-[13px]">
          <Checkbox checked={payable.length > 0 && payable.every((s) => sel.has(s.id))} onChange={(on) => setSel(on ? new Set(payable.map((s) => s.id)) : new Set())} label="지급 대기 전체" className="mr-2" />
          <span className="text-ink-2 mr-2">선택 <b className="num text-ink">{sel.size}</b>건</span>
          <button disabled={!sel.size} onClick={pay} className="btn btn-ink btn-xs">지급 실행</button>
          <button disabled={!sel.size} onClick={() => setHoldOpen(true)} className="btn btn-line btn-xs">지급 보류</button>
          <span className="text-mute">지급 대기 {payable.length}건 · {won(payable.reduce((a, s) => a + s.payout, 0))}</span>
          <div className="flex items-center border border-line-2 h-8 px-2.5 ml-auto w-full sm:w-56 bg-white"><Search size={14} className="text-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="스토어 · 상태" className="flex-1 px-2 text-[13px] outline-none" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr>
              <th className="w-10" />
              <th>스토어</th><th className="text-right">건수</th><th className="text-right">구매확정 매출</th><th className="text-right">수수료율</th><th className="text-right">판매수수료</th><th className="text-right">결제수수료</th><th className="text-right">지급액</th><th>상태</th><th />
            </tr></thead>
            <tbody>
              {list.map((s) => {
                const st = storeById[s.storeId];
                return (
                  <tr key={s.id}>
                    <td>{s.status === '지급예정' && <Checkbox checked={sel.has(s.id)} onChange={() => { const n = new Set(sel); n.has(s.id) ? n.delete(s.id) : n.add(s.id); setSel(n); }} />}</td>
                    <td><Link to={`/admin/stores/${st.id}`} className="font-semibold hover:underline">{st.name}</Link><div className="text-[11px] text-mute num">{s.id}</div></td>
                    <td className="text-right num">{s.orders}{s.carriedOver > 0 && <div className="text-[11px] text-mute">이월 {s.carriedOver}</div>}</td>
                    <td className="text-right num">{comma(s.gross)}</td>
                    <td className="text-right num">{pct(s.rate)}</td>
                    <td className="text-right num">{comma(s.commission)}</td>
                    <td className="text-right num">{comma(s.pgFee)}</td>
                    <td className="text-right num font-bold">{comma(s.payout)}</td>
                    <td><StatusPill s={s.status} /></td>
                    <td>
                      <span className="inline-flex gap-1">
                        <button onClick={() => setDetail(s)} className="btn btn-line btn-xs">상세</button>
                        {s.status === '지급보류' && <button onClick={() => setHold(s)} className="btn btn-line btn-xs">사유</button>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={!!d} onClose={() => setDetail(null)} title={`정산 상세 · ${d ? `${d.storeName} ${d.week}` : ''}`} width={600}
        footer={d && (
          <OpenChatButton basePath="/admin/chats" by="ADMIN" request={{ type: 'SELLER_SUPPORT', storeId: d.storeId, context: { type: 'SETTLEMENT', id: d.id } }}>
            <MessagesSquare size={14} /> 판매자와 상담
          </OpenChatButton>
        )}>
        {d && <SettlementDetailBody d={d} />}
      </Modal>
      <Modal open={!!hold} onClose={() => setHold(null)} title="지급 보류 사유" width={440}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setHold(null)}>닫기</button><button className="btn btn-ink btn-sm" onClick={releaseHold}>보류 해제</button></>}>
        <p className="text-[14px]">{hold?.holdReason}</p>
      </Modal>
      <Modal open={holdOpen} onClose={() => setHoldOpen(false)} title={`선택 ${sel.size}건 지급 보류`} width={440}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setHoldOpen(false)}>닫기</button><button className="btn btn-ink btn-sm" disabled={!holdReason.trim()} onClick={holdSelected}>보류</button></>}>
        <textarea value={holdReason} onChange={(e) => setHoldReason(e.target.value)} placeholder="보류 사유 (판매자 정산 화면에 표시)" rows={3} className="field w-full" />
      </Modal>
    </div>
  );
}

/* ─────────── 회원 관리 ─────────── */
// 회원 상태는 정상 · 이용정지 뿐 (휴면 없음). 주문 수는 order 데이터라 회원 목록 · 상세에 없음
export function AdminUsers() {
  const [tab, setTab] = useState('전체');
  const [grade, setGrade] = useState('전체');
  const [q, setQ] = useState('');
  const T = ['전체', '정상', '이용정지'];
  const G = ['전체', ...GRADES.map((g) => g.id)];
  const counts = Object.fromEntries(T.map((t) => [t, t === '전체' ? users.length : users.filter((u) => u.status === t).length]));
  const gCounts = Object.fromEntries(G.map((g) => [g, g === '전체' ? users.length : users.filter((u) => u.grade === g).length]));
  const list = users.filter((u) => (tab === '전체' || u.status === tab) && (grade === '전체' || u.grade === grade) && (u.name + u.email).includes(q));
  return (
    <div>
      <PageHead title="회원 관리" desc="회원등급은 누적 구매확정 금액 기준 (NORMAL · SILVER 30만원 · GOLD 80만원) · 포인트 적립률 5%" />
      <div className="flex flex-wrap gap-3 items-center">
        <Segments items={T} value={tab} onChange={setTab} counts={counts} />
        <Segments items={G} value={grade} onChange={setGrade} counts={gCounts} />
        <div className="flex items-center border border-line-2 h-9 px-2.5 ml-auto w-full sm:w-64 bg-white"><Search size={15} className="text-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · 이메일" className="flex-1 px-2 text-[13px] outline-none" /></div>
      </div>
      <div className="panel mt-3 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>회원</th><th>이메일</th><th>등급</th><th className="text-right">누적 구매확정</th><th className="text-right">보유 포인트</th><th>가입일</th><th>최근 접속</th><th>상태</th></tr></thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td><Link to={`/admin/users/${u.id}`} className="flex items-center gap-2 font-semibold hover:underline"><img src={u.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />{u.name}</Link></td>
                <td className="text-ink-2">{u.email}</td>
                <td><GradeBadge grade={u.grade} /></td>
                <td className="text-right num">{comma(u.spent)}</td>
                <td className="text-right num">{comma(u.point)}P</td>
                <td className="num text-ink-2">{ymd(u.joined)}</td>
                <td className="num text-ink-2">{ymd(u.lastLogin)}</td>
                <td><StatusPill s={u.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const SUSPEND_DURATIONS = [{ value: '7', label: '7일', days: 7 }, { value: '30', label: '30일', days: 30 }, { value: 'permanent', label: '영구', days: null }];
const SUSPEND_REASONS = ['허위 리뷰 / 리뷰 어뷰징', '결제 도용 의심', '욕설 · 비방'];

export function AdminUserDetail() {
  const { id } = useParams();
  const u = userById[id] || users[0];
  return <UserDetailBody key={u.id} u={u} />; // key: 다른 회원으로 이동하면 모달 상태 초기화
}

function UserDetailBody({ u: initial }) {
  const { toast } = useApp();
  const [u, setU] = useState(initial);
  const [modal, setModal] = useState(null);
  const [duration, setDuration] = useState(SUSPEND_DURATIONS[0].value);
  const [reason, setReason] = useState(SUSPEND_REASONS[0]);
  const [releaseReason, setReleaseReason] = useState('');
  const urev = reviews.filter((r) => r.userId === u.id).slice(0, 5);
  const next = nextGrade(u.spent);
  const ph = userPointHistory(u);
  const moderation = REPORTS.find((t) => t.targetType === 'USER' && t.targetId === u.id); // 이 회원이 받은 신고 · 신고 관리에서 한 조치
  const suspended = u.status === '이용정지';
  const confirm = () => {
    if (suspended) {
      setU({ ...u, status: '정상', suspendedUntil: null }); setReleaseReason(''); toast('이용정지를 해제했어요');
    } else {
      const days = SUSPEND_DURATIONS.find((d) => d.value === duration).days;
      setU({ ...u, status: '이용정지', suspendedUntil: days ? new Date(Date.now() + days * DAY) : null }); toast(`${days ? `${days}일` : '영구'} 이용정지했어요`);
    }
    setModal(null);
  };
  return (
    <div>
      <PageHead crumbs="회원 · 콘텐츠 > 회원 관리" title={<span className="flex items-center gap-2">{u.name} <GradeBadge grade={u.grade} /></span>} desc={`${u.email} · 가입 ${ymd(u.joined)}`}
        right={<button onClick={() => setModal('ban')} className={cx('btn btn-sm', suspended ? 'btn-ink' : 'btn-line text-rust')}>{suspended ? '정지 해제' : '이용 정지'}</button>} />
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <Kpi label="회원등급" value={u.grade} sub={next ? `${next.id}까지 ${won(next.min - u.spent)}` : '최고 등급'} />
        <Kpi label="누적 구매확정 금액" value={comma(u.spent)} unit="원" />
        <Kpi label="보유 포인트" value={comma(u.point)} unit="P" sub="적립률 5% (실결제금액 기준)" />
      </div>
      <div className="grid xl:grid-cols-[360px_1fr] gap-4 mt-4">
        <div className="panel">
          <div className="p-5 flex items-center gap-3 border-b border-line"><img src={u.avatar} alt="" className="w-12 h-12 rounded-full object-cover" /><div><b>{u.name}</b> <span className="text-mute text-[13px]">({u.nick})</span><div><StatusPill s={u.status} /></div></div></div>
          <div className="p-5"><KV rows={[
            ['회원번호', u.id.toUpperCase()], ['휴대폰', u.phone], ['회원등급', <GradeBadge grade={u.grade} />], ['최근 접속', ymdhm(u.lastLogin)],
            ...(suspended ? [['정지 기간', u.suspendedUntil ? `${ymdhm(u.suspendedUntil)}까지` : '영구']] : []),
            ['마케팅 수신', '동의 (2025.03.02)'],
          ]} /></div>
          {u.memo && <div className="mx-5 mb-5 bg-rust-soft text-rust text-[13px] p-3">{u.memo}</div>}
        </div>
        <div className="space-y-4">
          <div className="panel">
            <div className="panel-head"><span className="panel-title">포인트 내역</span><span className="text-[12px] text-mute">최근 {ph.length}건</span></div>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>일자</th><th>구분</th><th>내용</th><th className="text-right">포인트</th></tr></thead>
                <tbody>
                  {ph.map((r) => (
                    <tr key={r.id}>
                      <td className="num text-ink-2">{ymd(r.date)}</td>
                      <td><StatusPill s={r.type} /></td>
                      <td>{r.desc}</td>
                      <td className={cx('text-right num font-semibold', r.amount < 0 && 'text-rust')}>{r.amount > 0 ? '+' : ''}{comma(r.amount)}P</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title">작성 리뷰</span></div>
            {urev.length === 0 && <div className="py-10 text-center text-mute text-sm">작성한 리뷰가 없습니다.</div>}
            {urev.map((r) => (
              <div key={r.id} className="px-5 py-3.5 border-b border-line last:border-0 text-[13px]">
                <div className="flex items-center gap-2"><Stars value={r.rating} size={11} /><span className="text-mute">{ymd(r.date)} · {productById[r.productId].name}</span>{r.blinded && <Pill tone="rust">블라인드</Pill>}</div>
                <p className="mt-1 text-ink-2">{r.body}</p>
              </div>
            ))}
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title">받은 신고 · 제재 이력</span><span className="text-[11.5px] text-mute">신고 관리에서 처리한 조치</span></div>
            {!moderation && <div className="py-8 text-center text-mute text-sm">받은 신고가 없습니다.</div>}
            {moderation?.actions.map((a) => (
              <div key={`a${a.moderationActionId}`} className="px-5 py-2.5 border-b border-line text-[13px]"><Pill tone={a.action === 'SUSPEND' ? 'rust' : 'mute'}>{REPORT_ACTION_LABEL[a.action]}</Pill> <span className="text-ink-2">{a.reason}</span>{a.action === 'SUSPEND' && <span className="text-mute"> · {a.suspendDays ? `${a.suspendDays}일` : '영구'}</span>}<div className="text-[11.5px] text-mute num">{ymdhm(a.createdAt)} · 신고 {a.reportCount}건</div></div>
            ))}
            {moderation?.reports.map((r) => (
              <div key={`r${r.reportId}`} className="px-5 py-2.5 border-b border-line last:border-0 text-[13px]">{REPORT_REASON_LABEL[r.reasonCode] ?? r.reasonCode}{r.detail && <span className="text-ink-2"> — {r.detail}</span>}<div className="text-[11.5px] text-mute num">{ymdhm(r.createdAt)} · 신고자 #{r.reporterId}</div></div>
            ))}
          </div>
        </div>
      </div>
      <Modal open={modal === 'ban'} onClose={() => setModal(null)} title={suspended ? '이용 정지 해제' : '이용 정지'} width={440}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setModal(null)}>취소</button><button className="btn btn-ink btn-sm" onClick={confirm} disabled={suspended && !releaseReason.trim()}>확인</button></>}>
        {suspended ? (
          <>
            <label className="label">해제 사유</label>
            <textarea rows={3} maxLength={255} className="field" placeholder="해제 사유를 입력해주세요 (필수)" value={releaseReason} onChange={(e) => setReleaseReason(e.target.value)} />
          </>
        ) : (
          <>
            <label className="label">정지 기간</label>
            <select className="field mb-3" value={duration} onChange={(e) => setDuration(e.target.value)}>
              {SUSPEND_DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <label className="label">사유</label>
            <select className="field" value={reason} onChange={(e) => setReason(e.target.value)}>
              {SUSPEND_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            <p className="mt-2 text-[12px] text-mute">정지하면 로그인 · 토큰 재발급이 막히고, 기간 정지는 끝나는 시각에 자동 해제돼요.</p>
          </>
        )}
      </Modal>
    </div>
  );
}

/* ─────────── 신고 관리 ─────────── */
// 리뷰 · 회원 신고를 대상별로 묶어 처리 (블라인드 · 이용정지 · 해제 · 기각) — 실제 ReportModeration.jsx · admin.md 2~4절
export let REPORTS = REPORT_TARGETS.map((t) => ({ ...t }));
const REPORT_TABS = ['처리 대기', '처리 완료', '전체'];
const REPORT_TYPES = ['전체', '리뷰', '회원'];
const TARGET_LABEL = { REVIEW: '리뷰', USER: '회원' };
const REPORT_STATUS_TONE = { OPEN: 'amber', RESOLVED: 'moss', DISMISSED: 'mute' };
const REPORT_STATUS_LABEL = { OPEN: '처리대기', RESOLVED: '조치완료', DISMISSED: '기각' };
const REPORT_ACTIONS = {
  REVIEW: [{ value: 'BLIND', label: '블라인드' }, { value: 'UNBLIND', label: '블라인드 해제' }, { value: 'DISMISS', label: '기각 (조치 없음)' }],
  USER: [{ value: 'SUSPEND', label: '이용정지' }, { value: 'UNSUSPEND', label: '정지 해제' }, { value: 'DISMISS', label: '기각 (조치 없음)' }],
};
const REPORT_ACTION_LABEL = { BLIND: '블라인드', UNBLIND: '블라인드 해제', SUSPEND: '이용정지', UNSUSPEND: '정지 해제', DISMISS: '기각' };
const inReportTab = (t, tab) => (tab === '처리 대기' ? t.openCount > 0 : tab === '처리 완료' ? t.openCount === 0 : true);
const reasonText = (counts) => Object.entries(counts).map(([code, n]) => `${REPORT_REASON_LABEL[code] ?? code} ${n}`).join(' · ');

export function AdminReports() {
  const [tab, setTab] = useState('처리 대기');
  const [type, setType] = useState('전체');
  const [q, setQ] = useState('');
  const [target, setTarget] = useState(null);
  const [, refresh] = useState(0);
  const rowsAll = REPORTS.map(reportRow).filter((t) => type === '전체' || TARGET_LABEL[t.targetType] === type);
  const counts = Object.fromEntries(REPORT_TABS.map((x) => [x, rowsAll.filter((t) => inReportTab(t, x)).length]));
  const list = rowsAll.filter((t) => inReportTab(t, tab) && ((t.summary ?? '') + reasonText(t.reasonCounts)).includes(q))
    .sort((a, b) => b.lastReportedAt - a.lastReportedAt);
  const open = target && REPORTS.find((t) => t.targetType === target.type && t.targetId === target.id);
  return (
    <div>
      <PageHead title="신고 관리" desc="회원 · 리뷰 신고를 대상별로 모아 처리 · 판매자의 리뷰 검토 요청도 여기로 · 신고가 쌓여도 자동 블라인드는 하지 않음" />
      <div className="flex flex-wrap gap-3 items-center">
        <Segments items={REPORT_TABS} value={tab} onChange={setTab} counts={counts} />
        <Segments items={REPORT_TYPES} value={type} onChange={setType} />
        <div className="flex items-center border border-line-2 h-9 px-2.5 ml-auto w-full sm:w-64 bg-white"><Search size={15} className="text-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="내용 · 사유" className="flex-1 px-2 text-[13px] outline-none" /></div>
      </div>
      <div className="panel mt-3 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>대상</th><th>내용 (신고 당시)</th><th>신고 사유</th><th className="text-right">처리 대기</th><th>최근 신고</th><th>마지막 조치</th><th /></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7} className="text-center text-mute py-10">해당하는 신고가 없습니다.</td></tr>}
            {list.map((t) => (
              <tr key={`${t.targetType}-${t.targetId}`}>
                <td className="whitespace-nowrap"><Pill tone="line">{TARGET_LABEL[t.targetType]}</Pill></td>
                <td className="max-w-[360px]"><p className="line-clamp-2">{t.summary || <span className="text-mute">-</span>}</p><div className="text-[11px] text-mute num">#{t.targetId}</div></td>
                <td className="text-[12.5px] text-ink-2">{reasonText(t.reasonCounts)}</td>
                <td className="text-right num"><b className={t.openCount ? 'text-point' : 'text-mute'}>{t.openCount}</b><span className="text-mute"> / {t.totalCount}</span></td>
                <td className="num text-ink-2 whitespace-nowrap">{ymdhm(t.lastReportedAt)}</td>
                <td>{t.lastAction ? REPORT_ACTION_LABEL[t.lastAction.action] : <span className="text-mute">-</span>}</td>
                <td><button onClick={() => setTarget({ type: t.targetType, id: t.targetId })} className="btn btn-line btn-xs">{t.openCount ? '처리' : '보기'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={!!open} onClose={() => setTarget(null)} title={open ? `${TARGET_LABEL[open.targetType]} 신고 #${open.targetId}` : ''} width={640}>
        {open && <ReportDetailBody key={`${open.targetType}-${open.targetId}`} d={open} onDone={() => { setTarget(null); refresh((n) => n + 1); }} />}
      </Modal>
    </div>
  );
}

// 대상 현재 값 · 신고 목록 · 조치 이력 · 처리 폼 — 처리하면 그 대상의 처리 대기 신고를 한 번에 닫는다
function ReportDetailBody({ d, onDone }) {
  const { toast } = useApp();
  const actions = REPORT_ACTIONS[d.targetType];
  const [action, setAction] = useState(actions[0].value);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(SUSPEND_DURATIONS[0].value);
  const review = d.targetType === 'REVIEW' ? reviews.find((r) => r.id === d.targetId) : null;
  const user = d.targetType === 'USER' ? userById[d.targetId] : null;

  const submit = () => {
    const openReports = d.reports.filter((r) => r.status === 'OPEN');
    const days = action === 'SUSPEND' ? SUSPEND_DURATIONS.find((x) => x.value === duration).days : null;
    const status = action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED';
    // 목업: 대상 서비스 값도 함께 바꾼다 (리뷰 블라인드 · 회원 상태)
    if (review && action === 'BLIND') Object.assign(review, { blinded: true, blindReason: reason.trim() });
    if (review && action === 'UNBLIND') Object.assign(review, { blinded: false, blindReason: null });
    if (user && action === 'SUSPEND') Object.assign(user, { status: '이용정지', suspendedUntil: days ? new Date(Date.now() + days * DAY) : null });
    if (user && action === 'UNSUSPEND') Object.assign(user, { status: '정상', suspendedUntil: null });
    const updated = {
      ...d,
      reports: d.reports.map((r) => (r.status === 'OPEN' ? { ...r, status } : r)),
      actions: [...d.actions, { moderationActionId: Date.now(), action, reason: reason.trim(), reportCount: openReports.length, createdAt: new Date(), suspendDays: days }],
    };
    REPORTS = REPORTS.map((t) => (t === d ? updated : t));
    toast(`${REPORT_ACTION_LABEL[action]} 처리 · 신고 ${openReports.length}건 닫음`);
    onDone();
  };

  return (
    <div className="text-[13.5px] space-y-4">
      <div className="bg-cream p-3">
        {review && (
          <KV rows={[['리뷰', review.body],
            ...(review.photos.length ? [['사진', <div className="flex flex-wrap gap-1.5">{review.photos.map((u) => <img key={u} src={u} alt="리뷰 사진" className="w-14 h-14 object-cover bg-white" />)}</div>]] : []),
            ['별점 · 상품', `${review.rating}점 · ${productById[review.productId].name}`], ['상태', review.blinded ? `블라인드 (${review.blindReason ?? ''})` : '노출 중']]} />
        )}
        {user && (
          <KV rows={[['회원', <Link to={`/admin/users/${user.id}`} className="hover:underline">{user.name} ({user.nick})</Link>], ['이메일', user.email], ['상태', user.status]]} />
        )}
      </div>

      <div>
        <div className="font-semibold mb-1">신고 {d.reports.length}건</div>
        <ul className="max-h-44 overflow-y-auto border-t border-line">
          {d.reports.map((r) => (
            <li key={r.reportId} className="py-2 border-b border-line flex gap-2 items-start">
              <Pill tone={REPORT_STATUS_TONE[r.status]}>{REPORT_STATUS_LABEL[r.status]}</Pill>
              <div className="flex-1">
                <div>{REPORT_REASON_LABEL[r.reasonCode] ?? r.reasonCode}{r.detail && <span className="text-ink-2"> — {r.detail}</span>}</div>
                <div className="text-[11.5px] text-mute num">{ymdhm(r.createdAt)} · {r.reporterRole === 'SELLER' ? '판매자' : '구매자'} #{r.reporterId}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {d.actions.length > 0 && (
        <div>
          <div className="font-semibold mb-1">조치 이력</div>
          <ol className="space-y-1 text-[12.5px]">
            {d.actions.map((a) => (
              <li key={a.moderationActionId} className="text-ink-2"><span className="num text-mute">{ymdhm(a.createdAt)}</span> · <b>{REPORT_ACTION_LABEL[a.action]}</b>{a.action === 'SUSPEND' && ` (${a.suspendDays ? `${a.suspendDays}일` : '영구'})`} · {a.reason} · 신고 {a.reportCount}건</li>
            ))}
          </ol>
        </div>
      )}

      <div className="border-t border-ink pt-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <button key={a.value} onClick={() => setAction(a.value)} className={`btn btn-sm ${action === a.value ? 'btn-ink' : 'btn-line'}`}>{a.label}</button>
          ))}
          {action === 'SUSPEND' && (
            <select value={duration} onChange={(e) => setDuration(e.target.value)} className="field field-sm h-9 w-auto">
              {SUSPEND_DURATIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          )}
        </div>
        <textarea rows={2} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} className="field"
          placeholder={action === 'DISMISS' ? '기각 사유 (예: 정책 위반 아님)' : '처리 사유 (대상 서비스에도 기록됨)'} />
        <div className="flex justify-end">
          <button disabled={!reason.trim()} onClick={submit} className="btn btn-ink btn-sm">{REPORT_ACTION_LABEL[action]} 처리</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── 카테고리 · 수수료 ─────────── */
// 카테고리는 삭제하지 않고 사용 중지만 (store · settlement 가 category_id 를 참조)
export function AdminCategories() {
  const { toast } = useApp();
  const [open, setOpen] = useState(() => new Set([categories[0].id]));
  const [edit, setEdit] = useState(null);
  const [inactive, setInactive] = useState(() => new Set());
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleActive = (key) => {
    const off = !inactive.has(key);
    setInactive((s) => { const n = new Set(s); off ? n.add(key) : n.delete(key); return n; });
    toast(off ? '사용 중지했어요' : '사용으로 바꿨어요');
  };
  const prodCount = (cid, sub) => products.filter((p) => p.cat === cid && (!sub || p.sub === sub)).length;
  const ActiveBtn = ({ k }) => <button onClick={() => toggleActive(k)} className="btn btn-ghost btn-xs">{inactive.has(k) ? '사용' : '사용 중지'}</button>;
  return (
    <div>
      <PageHead title="카테고리 · 수수료" desc="상위 / 하위 2단계 카테고리 · 판매자는 상품 등록 시 이 목록에서만 선택합니다 · 수수료율 변경은 판매자 공지 후 7일 뒤 적용"
        right={<>
          <button onClick={() => setEdit({ mode: 'new', parent: '' })} className="btn btn-line btn-sm">+ 상위 카테고리</button>
          <button onClick={() => toast('변경 사항이 2026.10.08부터 적용 예약되었어요')} className="btn btn-ink btn-sm">수수료 변경 예약</button>
        </>} />
      <div className="flex gap-2 mb-3 text-[12.5px]">
        <button onClick={() => setOpen(new Set(categories.map((c) => c.id)))} className="btn btn-line btn-xs">모두 펼치기</button>
        <button onClick={() => setOpen(new Set())} className="btn btn-line btn-xs">모두 접기</button>
      </div>
      <div className="panel overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>카테고리</th><th>코드</th><th className="text-right">상품</th><th className="text-right">스토어</th><th className="w-36">판매수수료</th><th className="text-right">결제수수료</th><th className="text-right">합계</th><th className="text-center">관리</th></tr></thead>
          <tbody>
            {categories.map((c) => {
              const on = open.has(c.id);
              return [
                <tr key={c.id} className={cx('bg-cream/60', inactive.has(c.id) && 'opacity-60')}>
                  <td>
                    <button onClick={() => toggle(c.id)} className="flex items-center gap-1.5 font-semibold">
                      <ChevronRight size={14} className={cx('transition-transform', on && 'rotate-90')} />
                      {c.name} <span className="text-[11px] text-mute font-normal">하위 {c.subs.length}</span>
                    </button>
                  </td>
                  <td className="font-mono text-[11.5px] text-mute">{c.id}</td>
                  <td className="text-right num">{prodCount(c.id)}</td>
                  <td className="text-right num">{stores.filter((s) => s.cat === c.id).length}</td>
                  <td><div className="flex items-center gap-1"><input className="field field-sm num w-20" defaultValue={(c.commission * 100).toFixed(1)} /> %</div></td>
                  <td className="text-right num">{pct(PAYMENT_FEE, 1)}</td>
                  <td className="text-right num font-semibold">{pct(c.commission + PAYMENT_FEE, 1)}</td>
                  <td><div className="flex gap-1 justify-center"><button onClick={() => setEdit({ mode: 'new', parent: c.id })} className="btn btn-line btn-xs">하위 추가</button><button onClick={() => setEdit({ mode: 'edit', parent: '', name: c.name })} className="btn btn-line btn-xs">수정</button><ActiveBtn k={c.id} /></div></td>
                </tr>,
                ...(on ? c.subs.map((s) => (
                  <tr key={`${c.id}-${s}`} className={cx(inactive.has(`${c.id}/${s}`) && 'opacity-60')}>
                    <td className="pl-10 text-ink-2"><span className="text-line-2 mr-1.5">└</span>{s}</td>
                    <td className="font-mono text-[11.5px] text-mute">{c.id}/{s}</td>
                    <td className="text-right num">{prodCount(c.id, s)}</td>
                    <td className="text-right text-mute">-</td>
                    <td className="text-[12.5px] text-mute">상위와 동일 ({pct(c.commission)})</td>
                    <td className="text-right num text-mute">{pct(PAYMENT_FEE, 1)}</td>
                    <td className="text-right num text-mute">{pct(c.commission + PAYMENT_FEE, 1)}</td>
                    <td><div className="flex gap-1 justify-center"><button onClick={() => setEdit({ mode: 'edit', parent: c.id, name: s })} className="btn btn-line btn-xs">수정</button><ActiveBtn k={`${c.id}/${s}`} /></div></td>
                  </tr>
                )) : []),
              ];
            })}
          </tbody>
        </table>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.mode === 'edit' ? '카테고리 수정' : '카테고리 추가'} width={440}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setEdit(null)}>취소</button><button className="btn btn-ink btn-sm" onClick={() => { setEdit(null); toast('저장했어요'); }}>저장</button></>}>
        {edit && (
          <div className="space-y-3">
            <div>
              <label className="label">상위 카테고리</label>
              {/* 상위 · 하위 이동은 안 됨(수수료 기준이 바뀜) → 수정할 때는 고정 */}
              <select className="field" defaultValue={edit.parent} disabled={edit.mode === 'edit'}>
                <option value="">없음 (상위 카테고리로 등록)</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="label">카테고리명</label><input className="field" defaultValue={edit.name || ''} placeholder="예: 셔츠" /></div>
            {edit.mode === 'new' && !edit.parent && <div><label className="label">판매수수료 (%)</label><input className="field num" placeholder="예: 10.0 — 오늘부터 적용" /></div>}
            <div><label className="label">노출 순서</label><input className="field num" placeholder="비우면 맨 뒤" /></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

