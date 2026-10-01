import { useState } from 'react';
import { Download, Flag, Lock } from 'lucide-react';
import { productById, catById, PAYMENT_FEE } from '../../data/catalog';
import { reviewsOfStore, ratingSummary } from '../../data/reviews';
import { settlements, pendingThisWeek } from '../../data/orders';
import { userById } from '../../data/people';
import { useApp } from '../../lib/store';
import { PageHead, Segments, Stars, StatusPill, Modal, Kpi, KV, Pill, Checkbox, HBars } from '../../components/ui';
import { won, comma, ymd, cx, maskName, pct } from '../../lib/format';
import { MY_STORE, myStoreQna } from './SellerLayout';

/* ─────────── 리뷰 관리 ─────────── */
export function SellerReviews() {
  const { toast } = useApp();
  const all = reviewsOfStore(MY_STORE.id);
  const [rows, setRows] = useState(all);
  const [tab, setTab] = useState('전체');
  const [prod, setProd] = useState('all');
  const [draft, setDraft] = useState({});
  const [report, setReport] = useState(null);
  const sum = ratingSummary(all);
  const list = rows.filter((r) =>
    (prod === 'all' || r.productId === prod) &&
    (tab === '전체' || (tab === '답글 미작성' && !r.reply) || (tab === '1~2점' && r.rating <= 2) || (tab === '포토' && r.photos.length)));
  const prods = [...new Set(all.map((r) => r.productId))];
  const byProduct = prods.map((pid) => {
    const s = ratingSummary(all.filter((r) => r.productId === pid));
    return { label: productById[pid].name, value: s.avg, note: `${s.total}건` };
  }).sort((a, b) => b.value - a.value);

  return (
    <div>
      <PageHead title="리뷰 관리" desc="답글은 쇼핑몰 상품 상세에 공개됩니다. 부당한 리뷰는 '신고'로 관리자 검토를 요청할 수 있어요 (임의 삭제 불가)." />
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
          counts={{ 전체: rows.length, '답글 미작성': rows.filter((r) => !r.reply).length, '1~2점': rows.filter((r) => r.rating <= 2).length, 포토: rows.filter((r) => r.photos.length).length }} />
        <select value={prod} onChange={(e) => setProd(e.target.value)} className="field field-sm h-9 w-auto ml-auto">
          <option value="all">전체 상품</option>{prods.map((id) => <option key={id} value={id}>{productById[id].name}</option>)}
        </select>
      </div>

      <div className="panel mt-3 divide-y divide-line">
        {list.map((r) => {
          const p = productById[r.productId];
          const u = userById[r.userId];
          return (
            <div key={r.id} className="p-5 grid md:grid-cols-[1fr_340px] gap-5">
              <div>
                <div className="flex items-center gap-2 text-[12px] flex-wrap">
                  <Stars value={r.rating} size={12} /><b className="text-[13px]">{r.rating}.0</b>
                  <span className="text-mute">{maskName(u.name)} · {ymd(r.date)} · {p.name} ({r.option})</span>
                  {r.blinded && <Pill tone="rust">블라인드</Pill>}
                  {r.reports > 0 && <Pill tone="amber">신고 {r.reports}</Pill>}
                </div>
                <p className="mt-2 text-[14px] font-semibold">{r.title}</p>
                <p className="mt-1 text-[13.5px] text-ink-2 leading-relaxed">{r.body}</p>
                {r.photos[0] && <img src={r.photos[0]} alt="" className="mt-2 w-20 h-20 object-cover" />}
                <button onClick={() => setReport(r)} className="mt-3 text-[12px] text-mute flex items-center gap-1 hover:text-rust"><Flag size={12} /> 관리자에게 신고</button>
              </div>
              <div>
                {r.reply ? (
                  <div className="bg-cream p-4 text-[13px]"><div className="text-[11.5px] text-mute mb-1">내 답글</div><p className="text-ink-2">{r.reply}</p><button className="mt-2 text-[12px] text-mute underline">수정</button></div>
                ) : (
                  <div>
                    <textarea rows={3} value={draft[r.id] || ''} onChange={(e) => setDraft({ ...draft, [r.id]: e.target.value })} className="field text-[13px]" placeholder="고객에게 답글을 남겨주세요" />
                    <div className="flex justify-between items-center mt-2">
                      <button onClick={() => setDraft({ ...draft, [r.id]: r.rating >= 4 ? '소중한 후기 감사합니다! 다음에도 만족하실 수 있도록 준비하겠습니다.' : '불편을 드려 죄송합니다. 말씀해주신 부분 꼭 개선하겠습니다.' })} className="text-[12px] text-sky">자주 쓰는 답글</button>
                      <button disabled={!draft[r.id]} onClick={() => { setRows(rows.map((x) => (x.id === r.id ? { ...x, reply: draft[r.id] } : x))); toast('답글을 등록했어요'); }} className="btn btn-ink btn-xs">등록</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!report} onClose={() => setReport(null)} title="리뷰 신고" width={440}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setReport(null)}>취소</button><button className="btn btn-ink btn-sm" onClick={() => { setReport(null); toast('신고가 접수되었어요. 관리자 검토 후 결과를 알려드려요.'); }}>신고하기</button></>}>
        <div className="space-y-2 text-[14px]">
          {['욕설/비방', '광고/홍보성 내용', '상품과 무관한 내용', '개인정보 노출', '허위 사실 (미구매 등)'].map((x, i) => <label key={x} className="flex items-center gap-2"><input type="radio" name="rr" defaultChecked={!i} /> {x}</label>)}
        </div>
        <p className="text-[12px] text-mute mt-4">신고 누적 3회 이상 또는 관리자 판단 시 블라인드됩니다. 단순 낮은 평점은 신고 사유가 되지 않습니다.</p>
      </Modal>
    </div>
  );
}

/* ─────────── 상품 문의 ─────────── */
export function SellerQna() {
  const { toast } = useApp();
  const [rows, setRows] = useState(myStoreQna);
  const [tab, setTab] = useState('미답변');
  const [draft, setDraft] = useState({});
  const list = rows.filter((q) => tab === '전체' || (tab === '미답변' ? !q.a : q.a));
  return (
    <div>
      <PageHead title="상품 문의" desc="평균 답변 시간은 스토어 신뢰도 지표에 반영됩니다. (목표: 24시간 이내)" />
      <Segments items={['미답변', '답변완료', '전체']} value={tab} onChange={setTab} counts={{ 미답변: rows.filter((q) => !q.a).length, 답변완료: rows.filter((q) => q.a).length, 전체: rows.length }} />
      <div className="panel mt-3 divide-y divide-line">
        {list.length === 0 && <div className="py-12 text-center text-mute text-sm">문의가 없습니다.</div>}
        {list.map((q) => (
          <div key={q.id} className="p-5">
            <div className="flex items-center gap-2 text-[12px] text-mute">
              <StatusPill s={q.a ? '답변완료' : '미답변'} />{q.secret && <Lock size={12} />}
              {userById[q.userId].name} · {ymd(q.date)} · <span className="text-ink-2">{productById[q.productId].name}</span>
            </div>
            <p className="mt-2 text-[14px]"><b className="mr-2">Q</b>{q.q}</p>
            {q.a ? (
              <p className="mt-2 text-[14px] text-ink-2 bg-cream p-3"><b className="mr-2 text-point">A</b>{q.a}</p>
            ) : (
              <div className="mt-3 flex gap-2">
                <input value={draft[q.id] || ''} onChange={(e) => setDraft({ ...draft, [q.id]: e.target.value })} className="field" placeholder="답변을 입력하세요" />
                <button disabled={!draft[q.id]} onClick={() => { setRows(rows.map((x) => (x.id === q.id ? { ...x, a: draft[q.id] } : x))); toast('답변을 등록했어요 (구매자 알림 발송)'); }} className="btn btn-ink shrink-0">답변 등록</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────── 정산 내역 ─────────── */
export function SellerSettlements() {
  const mine = settlements.filter((s) => s.storeId === MY_STORE.id);
  const [detail, setDetail] = useState(null);
  const c = catById[MY_STORE.cat];
  const total = mine.filter((s) => s.status === '지급완료').reduce((a, s) => a + s.payout, 0);
  return (
    <div>
      <PageHead title="정산 내역" desc="구매확정일 기준 주 1회 정산 · 월~일 확정분을 다음 주 목요일에 등록 계좌로 지급합니다."
        right={<button className="btn btn-line btn-sm"><Download size={14} /> 정산내역 엑셀</button>} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi label="이번 주 집계중 (9/28~)" value={comma(pendingThisWeek.s1.confirmed)} unit="원" sub="구매확정 누적 매출" />
        <Kpi label="다음 지급 예정" value={comma(mine[0].payout)} unit="원" sub={`${ymd(mine[0].pay)} (목)`} />
        <Kpi label="최근 8주 지급 완료" value={comma(total / 10000)} unit="만원" sub={`${mine.filter((s) => s.status === '지급완료').length}회`} />
        <Kpi label="적용 수수료율" value={pct(c.commission + PAYMENT_FEE, 1)} sub={`판매 ${pct(c.commission)} + 결제 2.2%`} />
      </div>
      <div className="panel mt-4 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>정산번호</th><th>정산 대상기간 (구매확정)</th><th className="text-right">건수</th><th className="text-right">구매확정 매출</th><th className="text-right">환불</th><th className="text-right">판매수수료</th><th className="text-right">결제수수료</th><th className="text-right">정산금액</th><th>지급일</th><th>상태</th><th /></tr></thead>
          <tbody>
            {mine.map((s) => (
              <tr key={s.id}>
                <td className="num text-[12px]">{s.id}</td>
                <td className="num whitespace-nowrap">{ymd(s.start)} ~ {ymd(s.end).slice(5)}</td>
                <td className="text-right num">{s.orders}</td>
                <td className="text-right num">{comma(s.gross)}</td>
                <td className="text-right num text-rust">−{comma(s.refund)}</td>
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
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`정산 상세 · ${detail?.id}`} width={520}>
        {detail && (
          <div className="text-[14px]">
            <div className="text-[13px] text-mute mb-3">대상기간 {ymd(detail.start)} ~ {ymd(detail.end)} · 지급일 {ymd(detail.pay)}</div>
            <div className="border-t border-ink num">
              {[['구매확정 매출', detail.gross], ['환불·취소', -detail.refund], [`판매수수료 (${pct(detail.rate)})`, -detail.commission], ['결제수수료 (2.2%)', -detail.pgFee]].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2.5 border-b border-line"><span className="font-sans text-ink-2">{k}</span><span>{v < 0 ? '−' : ''}{won(Math.abs(v))}</span></div>
              ))}
              <div className="flex justify-between py-3 text-[17px] font-bold"><span className="font-sans">정산금액</span><span>{won(detail.payout)}</span></div>
            </div>
            <KV rows={[['지급 계좌', detail.bank], ['세금계산서', '수수료 세금계산서 매월 10일 자동 발행']]} />
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ─────────── 스토어 설정 ─────────── */
export function SellerStore() {
  const { toast } = useApp();
  const s = MY_STORE;
  const [color, setColor] = useState(s.color);
  const [dormant, setDormant] = useState(false);
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
          <div className="panel p-5">
            <div className="flex items-start justify-between gap-4">
              <div><div className="font-bold text-[14px]">휴면 전환</div><p className="text-[12.5px] text-mute mt-1">스토어와 모든 상품이 쇼핑몰에서 숨겨집니다. 진행 중인 주문은 계속 처리해야 합니다.</p></div>
              <button onClick={() => setDormant(true)} className="btn btn-line btn-sm shrink-0">휴면 신청</button>
            </div>
          </div>
        </div>
      </div>
      <Modal open={dormant} onClose={() => setDormant(false)} title="휴면 전환 신청" width={440}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setDormant(false)}>취소</button><button className="btn btn-ink btn-sm" onClick={() => { setDormant(false); toast('휴면 전환이 신청되었어요 (관리자 확인 후 적용)'); }}>신청</button></>}>
        <p className="text-[14px]">미처리 주문 <b className="text-point">3건</b>이 있습니다. 처리 완료 후 휴면 전환됩니다.</p>
        <Checkbox className="mt-4" checked label="휴면 기간 중 정산은 '지급보류' 처리됨을 확인했습니다" />
      </Modal>
    </div>
  );
}
