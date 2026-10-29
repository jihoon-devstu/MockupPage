import { useState } from 'react';
import { Download, Lock, MessagesSquare, Search } from 'lucide-react';
import { productById, catById, productsOfStore, PAYMENT_FEE } from '../../data/catalog';
import { reviewsOfStore, ratingSummary, qnaWriter } from '../../data/reviews';
import { settlements, pendingThisWeek } from '../../data/orders';
import { useApp } from '../../lib/store';
import { PageHead, Segments, Stars, StatusPill, Modal, Kpi, KV, Pill, HBars } from '../../components/ui';
import { won, comma, ymd, ymdhm, cx, pct, salePrice } from '../../lib/format';
import { MY_STORE, myStoreQna } from './SellerLayout';
import { ChatInbox, OpenChatButton } from '../../components/Chat';

/* ─────────── 리뷰 관리 ─────────── */
const REPLY_MAX = 1000;
// 답글 칸 — 답글이 있으면 보여 주고 "수정"으로 다시 연다. 블라인드된 리뷰엔 답글 불가 (실제 SellerReviewList.ReplyBox)
function ReplyBox({ r, onSubmit }) {
  const [editing, setEditing] = useState(!r.reply);
  const [draft, setDraft] = useState(r.reply ?? '');
  if (r.blinded) return <p className="text-[12px] text-mute">블라인드된 리뷰에는 답글을 달 수 없어요</p>;
  if (!editing) {
    return <div className="bg-cream p-4 text-[13px]"><div className="text-[11.5px] text-mute mb-1">내 답글</div><p className="text-ink-2 whitespace-pre-line">{r.reply}</p><button onClick={() => { setDraft(r.reply); setEditing(true); }} className="mt-2 text-[12px] text-mute underline">수정</button></div>;
  }
  const content = draft.trim();
  return (
    <div>
      <textarea rows={3} value={draft} maxLength={REPLY_MAX} onChange={(e) => setDraft(e.target.value)} className="field text-[13px]" placeholder="고객에게 답글을 남겨주세요" />
      <div className="flex justify-between items-center mt-2">
        <button onClick={() => setDraft(r.rating >= 4 ? '소중한 후기 감사합니다! 다음에도 만족하실 수 있도록 준비하겠습니다.' : '불편을 드려 죄송합니다. 말씀해주신 부분 꼭 개선하겠습니다.')} className="text-[12px] text-sky">자주 쓰는 답글</button>
        <div className="flex gap-1.5">
          {r.reply && <button onClick={() => setEditing(false)} className="btn btn-ghost btn-xs">취소</button>}
          <button disabled={!content} onClick={() => { onSubmit(r.id, content); setEditing(false); }} className="btn btn-ink btn-xs">{r.reply ? '저장' : '등록'}</button>
        </div>
      </div>
    </div>
  );
}

export function SellerReviews() {
  const { toast } = useApp();
  const all = reviewsOfStore(MY_STORE.id);
  const [rows, setRows] = useState(all);
  const [tab, setTab] = useState('전체');
  const [prod, setProd] = useState('all');
  const [flagTarget, setFlagTarget] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const sum = ratingSummary(all);
  const list = rows.filter((r) =>
    (prod === 'all' || r.productId === prod) &&
    (tab === '전체' || (tab === '답글 미작성' && !r.reply && !r.blinded) || (tab === '1~2점' && r.rating <= 2) || (tab === '포토' && r.photos.length)));
  const prods = [...new Set(all.map((r) => r.productId))];
  const byProduct = prods.map((pid) => {
    const s = ratingSummary(all.filter((r) => r.productId === pid));
    return { label: productById[pid].name, value: s.avg, note: `${s.total}건` };
  }).sort((a, b) => b.value - a.value);

  return (
    <div>
      <PageHead title="리뷰 관리" desc="답글은 쇼핑몰 상품 상세에 공개됩니다. 판매자는 리뷰를 삭제할 수 없으며, 운영 정책 위반 리뷰는 관리자가 블라인드 처리합니다." />
      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        <div className="panel p-5 text-center">
          <div className="text-[13px] text-mute">스토어 평균 평점</div>
          <div className="text-[44px] font-bold num leading-none mt-2">{sum.avg.toFixed(2)}</div>
          <Stars value={sum.avg} size={16} className="mt-2" />
          <ul className="mt-5 space-y-1.5 text-[12px] text-left">
            {sum.dist.map((d) => (
              <li key={d.star} className="flex items-center gap-2"><span className="w-6">{d.star}점</span><span className="flex-1 h-1.5 bg-sand"><span className="block h-full bg-ink" style={{ width: `${(d.count / sum.total) * 100}%` }} /></span><span className="w-7 text-right num text-mute">{d.count}</span></li>
            ))}
          </ul>
        </div>
        <div className="panel p-5">
          <div className="panel-title mb-4">상품별 평균 평점</div>
          <HBars rows={byProduct} format={(v) => `★ ${v.toFixed(2)}`} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-4 items-center">
        <Segments items={['전체', '답글 미작성', '1~2점', '포토']} value={tab} onChange={setTab}
          counts={{ 전체: rows.length, '답글 미작성': rows.filter((r) => !r.reply && !r.blinded).length, '1~2점': rows.filter((r) => r.rating <= 2).length, 포토: rows.filter((r) => r.photos.length).length }} />
        <select value={prod} onChange={(e) => setProd(e.target.value)} className="field field-sm h-9 w-auto ml-auto">
          <option value="all">전체 상품</option>{prods.map((id) => <option key={id} value={id}>{productById[id].name}</option>)}
        </select>
      </div>

      <div className="panel mt-3 divide-y divide-line">
        {list.map((r) => {
          const p = productById[r.productId];
          return (
            <div key={r.id} className="p-5 grid md:grid-cols-[1fr_340px] gap-5">
              <div>
                <div className="flex items-center gap-2 text-[12px] flex-wrap">
                  <Stars value={r.rating} size={12} /><b className="text-[13px]">{r.rating}.0</b>
                  <span className="text-mute">{r.writer} · {ymd(r.date)} · {p.name} ({r.option || '단일상품'})</span>
                  {r.blinded && <Pill tone="rust">블라인드</Pill>}
                  {!r.blinded && r.flag && <Pill tone="amber">검토 요청됨</Pill>}
                  {!r.blinded && !r.flag && (
                    <button onClick={() => { setFlagTarget(r); setFlagReason(''); }} className="ml-auto text-[12px] text-mute underline">관리자 검토 요청</button>
                  )}
                </div>
                {r.title && <p className="mt-2 text-[14px] font-semibold">{r.title}</p>}
                <p className="mt-1 text-[13.5px] text-ink-2 leading-relaxed">{r.body}</p>
                {r.photos.length > 0 && <div className="mt-2 flex gap-1.5">{r.photos.map((src) => <img key={src} src={src} alt="" className="w-20 h-20 object-cover" />)}</div>}
              </div>
              <div>
                <ReplyBox key={`${r.id}-${r.reply ?? ''}`} r={r} onSubmit={(id, content) => { setRows(rows.map((x) => (x.id === id ? { ...x, reply: content } : x))); toast('답글을 등록했어요'); }} />
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!flagTarget} onClose={() => setFlagTarget(null)} title="관리자 검토 요청"
        footer={<>
          <button onClick={() => setFlagTarget(null)} className="btn btn-ghost btn-sm">취소</button>
          <button disabled={!flagReason.trim()} onClick={() => { setRows(rows.map((x) => (x.id === flagTarget.id ? { ...x, flag: flagReason.trim() } : x))); setFlagTarget(null); toast('검토 요청을 보냈어요. 관리자가 확인 후 블라인드 여부를 결정합니다'); }} className="btn btn-ink btn-sm">요청</button>
        </>}>
        <p className="text-[13px] text-ink-2">판매자는 리뷰를 삭제하거나 가릴 수 없습니다. 욕설 · 광고 · 허위 사실 등 정책 위반이 의심되면 사유를 적어 관리자에게 검토를 요청하세요.</p>
        <textarea rows={3} value={flagReason} onChange={(e) => setFlagReason(e.target.value)} className="field text-[13px] mt-3" placeholder="예: 상품과 무관한 광고성 내용" />
      </Modal>
    </div>
  );
}

/* ─────────── 상품 문의 ─────────── */
// 실제 review/components/SellerQnaList.jsx — 표(상태 · 상품 · 문의·답변 · 작성자 · 작성일), 답변은 등록 뒤에도 "수정"으로 다시 열어 덮어씀
const ANSWER_MAX = 1000;
function AnswerBox({ q, onSubmit }) {
  const [editing, setEditing] = useState(!q.a);
  const [draft, setDraft] = useState(q.a ?? '');
  if (!editing) {
    return (
      <div className="mt-2 text-[14px] text-ink-2 bg-cream p-3">
        <p className="whitespace-pre-line"><b className="mr-2 text-point">A</b>{q.a}</p>
        <button onClick={() => { setDraft(q.a); setEditing(true); }} className="mt-1 text-[12px] text-mute underline">수정</button>
      </div>
    );
  }
  const content = draft.trim();
  return (
    <div className="mt-3 flex gap-2">
      <input value={draft} maxLength={ANSWER_MAX} onChange={(e) => setDraft(e.target.value)} className="field" placeholder="답변을 입력하세요" />
      {q.a && <button onClick={() => setEditing(false)} className="btn btn-ghost shrink-0">취소</button>}
      <button disabled={!content} onClick={() => { onSubmit(q.id, content); setEditing(false); }} className="btn btn-ink shrink-0">{q.a ? '답변 저장' : '답변 등록'}</button>
    </div>
  );
}

export function SellerQna() {
  const { toast } = useApp();
  const [rows, setRows] = useState(() => [...myStoreQna].sort((a, b) => b.date - a.date));
  const [tab, setTab] = useState('미답변');
  const list = rows.filter((q) => tab === '전체' || (tab === '미답변' ? !q.a : q.a));
  const onAnswer = (id, content) => { setRows(rows.map((x) => (x.id === id ? { ...x, a: content } : x))); toast('답변을 등록했어요'); };
  return (
    <div>
      <PageHead title="상품 문의" desc="평균 답변 시간은 스토어 신뢰도 지표에 반영됩니다. (목표: 24시간 이내)" />
      <Segments items={['미답변', '답변완료', '전체']} value={tab} onChange={setTab} counts={{ 미답변: rows.filter((q) => !q.a).length, 답변완료: rows.filter((q) => q.a).length, 전체: rows.length }} />
      <div className="panel mt-3 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>상태</th><th>상품</th><th>문의 · 답변</th><th>작성자</th><th>작성일</th></tr></thead>
          <tbody>
            {list.map((q) => (
              <tr key={q.id}>
                <td className="whitespace-nowrap"><span className="inline-flex items-center gap-1.5 text-mute"><StatusPill s={q.a ? '답변완료' : '미답변'} />{q.secret && <Lock size={12} aria-label="비밀글" />}</span></td>
                <td className="text-ink-2 min-w-[160px]">{productById[q.productId].name}</td>
                <td><div className="min-w-[320px] py-2">
                  <p className="text-[14px] whitespace-pre-line"><b className="mr-2">Q</b>{q.q}</p>
                  <AnswerBox key={`${q.id}-${q.a ?? ''}`} q={q} onSubmit={onAnswer} />
                </div></td>
                <td className="whitespace-nowrap">{qnaWriter(q.userId)}</td>
                <td className="num text-ink-2 whitespace-nowrap">{ymd(q.date)}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-mute text-sm">문의가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────── 채팅 (스토어 톡 · 판매자 운영 상담) ─────────── */
export function SellerChats() {
  return (
    <>
      <PageHead title="채팅" desc="구매자 스토어 톡과 운영팀 상담을 한곳에서 봅니다."
        right={<OpenChatButton request={{ type: 'SELLER_SUPPORT', storeId: MY_STORE.id }} by="SELLER" basePath="/seller/chats">운영팀에 문의</OpenChatButton>} />
      <ChatInbox kind="seller" basePath="/seller/chats" />
    </>
  );
}

/* ─────────── 정산 내역 ───────────
   실제 SellerSettlementList · SettlementDetailBody 와 같은 구성 — 정산 주차(ISO 주) · 건수(이월) · 상세(건별 표 · 보류 사유 · 상태 이력) */
const isoWeek = (d) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y = t.getUTCFullYear();
  return `${y}-W${String(Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7)).padStart(2, '0')}`;
};
const ACTOR = { SYSTEM: '자동', ADMIN: '곳간 운영팀' };
// 목업: 정산 행에 주차 · 이월 건수 · 건별 내역 · 상태 이력을 붙인다 (건별 금액 합 = 구매확정 매출)
function withDetail(s, i) {
  const prods = productsOfStore(s.storeId).filter((p) => p.status !== '판매중지');
  const carriedOver = i % 3 === 1 ? 2 : 0;
  const base = Array.from({ length: s.orders }, (_, k) => salePrice(prods[k % prods.length]));
  const scale = s.gross / base.reduce((a, b) => a + b, 0);
  const items = base.map((b, k) => {
    const p = prods[k % prods.length];
    const confirmedAt = new Date(s.start.getTime() + (k % 7) * 864e5 + 10 * 36e5);
    const no = `${ymd(confirmedAt).replace(/\./g, '')}-${String(100 + ((k * 37 + i * 11) % 300)).padStart(6, '0')}-01`;
    return { id: `${s.id}-${k}`, productName: p.name, orderNo: no, confirmedAt, amount: Math.round((b * scale) / 10) * 10, rate: s.rate, carriedOver: k < carriedOver };
  });
  items.at(-1).amount = s.gross - items.slice(0, -1).reduce((a, x) => a + x.amount, 0);
  items.forEach((x) => { x.payout = x.amount - Math.round(x.amount * x.rate) - Math.round(x.amount * PAYMENT_FEE); });
  const closed = new Date(s.end.getTime() + 864e5 + 2 * 36e5);
  const history = [{ at: closed, from: '집계중', to: '지급예정', actor: 'SYSTEM' }];
  if (s.status === '지급완료') history.push({ at: new Date(s.pay.getTime() + 10 * 36e5), from: '지급예정', to: '지급완료', actor: 'ADMIN' });
  if (s.status === '지급보류') history.push({ at: new Date(closed.getTime() + 864e5), from: '지급예정', to: '지급보류', actor: 'ADMIN', reason: s.holdReason });
  return { ...s, week: isoWeek(s.start), carriedOver, items, history };
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
              <tr key={i.id}>
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
      {d.history.length > 0 && (
        <ol className="mt-3 space-y-1.5 text-[12.5px]">
          {d.history.map((h, idx) => (
            <li key={idx} className="flex items-center gap-1.5 flex-wrap">
              <span className="num text-mute">{ymdhm(h.at)}</span>
              {h.from && <><StatusPill s={h.from} /><span className="text-mute">→</span></>}<StatusPill s={h.to} />
              <span className="text-ink-2">{ACTOR[h.actor] ?? h.actor}{h.reason && ` · ${h.reason}`}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function SellerSettlements() {
  const { toast } = useApp();
  const mine = settlements.filter((s) => s.storeId === MY_STORE.id).map(withDetail);
  const [detail, setDetail] = useState(null);
  const [q, setQ] = useState('');
  const next = mine.find((s) => s.status === '지급예정');
  const paid8 = mine.filter((s) => s.status === '지급완료').reduce((a, s) => a + s.payout, 0);
  // 적용 수수료율 — 판매 상품의 카테고리별 (여러 카테고리면 모두 나열)
  const rates = [...new Set(productsOfStore(MY_STORE.id).map((p) => p.cat))].map((id) => ({ name: catById[id].name, rate: catById[id].commission }));
  const c = catById[MY_STORE.cat];
  const pendingPayout = Math.round(pendingThisWeek.s1.confirmed * (1 - c.commission - PAYMENT_FEE));
  const list = mine.filter((s) => `${s.week} ${s.status}`.includes(q.trim()));
  return (
    <div>
      <PageHead title="정산 내역" desc="구매확정일 기준 주 1회 정산 · 월~일 확정분을 다음 주 목요일에 등록 계좌로 지급합니다." />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi label="이번 주 정산 예정" value={comma(pendingPayout)} unit="원" sub="이번 주 구매확정분 · 수수료 차감 후" />
        <Kpi label="다음 지급 예정" value={next ? comma(next.payout) : '-'} unit="원" sub={next ? `${ymd(next.pay)} (목)` : '지급 전 정산서 없음'} />
        <Kpi label="최근 8주 지급 완료" value={comma(paid8 / 10000)} unit="만원" />
        <Kpi label="적용 수수료율" value={rates.map((r) => pct(r.rate + PAYMENT_FEE, 1)).join(' · ')}
          sub={`${rates.map((r) => `${r.name} ${pct(r.rate, 1)}`).join(' · ')} + 결제 2.2%`} />
      </div>
      <div className="flex mt-4">
        <div className="flex items-center border border-line-2 h-9 px-2.5 ml-auto w-full sm:w-72 bg-white">
          <Search size={15} className="text-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="정산 주차 · 상태" className="flex-1 px-2 text-[13px] outline-none" />
        </div>
      </div>
      <div className="panel mt-3 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>정산 주차</th><th>정산 대상기간 (구매확정)</th><th className="text-right">건수</th><th className="text-right">구매확정 매출</th><th className="text-right">판매수수료</th><th className="text-right">결제수수료</th><th className="text-right">정산금액</th><th>지급일</th><th>상태</th><th /></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={10} className="text-center text-mute py-10">아직 정산 내역이 없어요</td></tr>}
            {list.map((s) => (
              <tr key={s.id}>
                <td className="num text-[12px]">{s.week}</td>
                <td className="num whitespace-nowrap">{ymd(s.start)} ~ {ymd(s.end).slice(5)}</td>
                <td className="text-right num">{s.orders}{s.carriedOver > 0 && <div className="text-[11px] text-mute">이월 {s.carriedOver}</div>}</td>
                <td className="text-right num">{comma(s.gross)}</td>
                <td className="text-right num">−{comma(s.commission)}</td>
                <td className="text-right num">−{comma(s.pgFee)}</td>
                <td className="text-right num font-bold">{comma(s.payout)}</td>
                <td className="num">{ymd(s.pay)}</td>
                <td><StatusPill s={s.status} /></td>
                <td><button onClick={() => setDetail(s)} className="btn btn-line btn-xs">상세</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`정산 상세 · ${detail?.week ?? ''}`} width={600}
        footer={detail && <>
          <OpenChatButton by="SELLER" basePath="/seller/chats" request={{ type: 'SELLER_SUPPORT', storeId: MY_STORE.id, context: { type: 'SETTLEMENT', id: detail.id } }}>
            <MessagesSquare size={14} /> 이 정산 문의
          </OpenChatButton>
          {detail.status === '지급완료' && <button className="btn btn-line btn-sm" onClick={() => toast('정산 명세서(CSV)를 새 탭에서 열어요 · 링크는 10분 동안 유효')}><Download size={14} /> 정산 명세서 (CSV)</button>}
        </>}>
        {detail && <SettlementDetailBody d={detail} />}
      </Modal>
    </div>
  );
}

/* ─────────── 스토어 설정 ─────────── */
export function SellerStore() {
  const { toast } = useApp();
  const s = MY_STORE;
  const [color, setColor] = useState(s.color);
  return (
    <div>
      <PageHead title="스토어 설정" right={<button onClick={() => toast('저장되었어요')} className="btn btn-ink btn-sm">저장</button>} />
      <div className="grid xl:grid-cols-2 gap-4">
        <div className="panel">
          <div className="panel-head"><span className="panel-title">기본 정보</span><StatusPill s={s.status} /></div>
          <div className="p-5 space-y-4">
            <div className="relative h-32 bg-sand"><img src={s.cover} alt="" className="w-full h-full object-cover" /><button className="absolute right-2 bottom-2 btn btn-line btn-xs">커버 변경</button></div>
            <div className="flex items-center gap-4">
              <span className="w-14 h-14 text-white text-2xl font-black flex items-center justify-center" style={{ background: color }}>{s.name[0]}</span>
              <div className="flex gap-1.5">{['#5b6b4a', '#2b2b2b', '#7a4b2a', '#2f5f8a', '#b4371f', '#c08a2e'].map((c) => <button key={c} onClick={() => setColor(c)} className={cx('w-7 h-7', color === c && 'ring-2 ring-offset-2 ring-ink')} style={{ background: c }} />)}</div>
            </div>
            <div><label className="label">스토어명</label><input className="field bg-cream" defaultValue={s.name} readOnly /><p className="text-[12px] text-mute mt-1">스토어명 변경은 관리자 승인이 필요합니다.</p></div>
            <div><label className="label">스토어 URL</label><input className="field bg-cream num" defaultValue={`gotgan.kr/store/${s.slug}`} readOnly /></div>
            <div><label className="label">소개</label><textarea rows={3} className="field" defaultValue={s.intro} /></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="panel">
            <div className="panel-head"><span className="panel-title">배송 정책 (기본값)</span></div>
            <div className="p-5 grid sm:grid-cols-2 gap-4">
              <div><label className="label">택배사</label><select className="field" defaultValue={s.courier}><option>CJ대한통운</option><option>롯데택배</option><option>한진택배</option><option>우체국택배</option></select></div>
              <div><label className="label">기본 배송비</label><input className="field num" defaultValue={s.shipFee} /></div>
              <div><label className="label">무료배송 기준금액</label><input className="field num" defaultValue={s.freeOver} /></div>
              <div><label className="label">반품 배송비 (편도)</label><input className="field num" defaultValue={s.shipFee} /></div>
              <div className="sm:col-span-2"><label className="label">출고 안내 문구</label><input className="field" defaultValue={s.dispatch} /></div>
              <div className="sm:col-span-2"><label className="label">반품/교환지 주소</label><input className="field" defaultValue="서울 성동구 성수일로 77 2층 오롯이 리넨 작업실" /></div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title">사업자 · 정산 정보</span><button className="btn btn-line btn-xs">변경 요청</button></div>
            <div className="p-5"><KV rows={[['상호', `(주)${s.name.replace(/\s/g, '')}`], ['대표자', s.owner], ['사업자번호', s.bizNo], ['정산 계좌', '기업은행 010-****-8812'], ['입점일', ymd(s.since)], ['판매자 등급', `${s.grade} (최근 3개월 매출 · 페널티 기준)`]]} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
