import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, Download, ExternalLink, ChevronRight } from 'lucide-react';
import { stores, storeById, catById, categories, products, productsOfStore, productById, PAYMENT_FEE } from '../../data/catalog';
import { users, userById, GRADES, nextGrade } from '../../data/people';
import { userPointHistory } from '../../data/points';
import { settlements } from '../../data/orders';
import { reviews, reviewsOfStore, ratingSummary } from '../../data/reviews';
import { useApp } from '../../lib/store';
import { PageHead, Segments, StatusPill, Modal, KV, Kpi, Checkbox, Stars, Pill, Spark, GradeBadge } from '../../components/ui';
import { won, comma, ymd, ymdhm, pct, cx, shortWon } from '../../lib/format';

/* ─────────── 스토어 관리 ─────────── */
export function AdminStores() {
  const [tab, setTab] = useState('전체');
  const [q, setQ] = useState('');
  const T = ['전체', '운영중', '휴면', '정지'];
  const counts = Object.fromEntries(T.map((t) => [t, t === '전체' ? stores.length : stores.filter((s) => s.status === t).length]));
  const list = stores.filter((s) => (tab === '전체' || s.status === tab) && (s.name + s.owner).includes(q));
  return (
    <div>
      <PageHead title="스토어 관리" desc="입점 승인된 스토어 목록 · 등급은 최근 3개월 거래액과 페널티 점수로 매월 1일 갱신" right={<button className="btn btn-line btn-sm"><Download size={14} /> 엑셀</button>} />
      <div className="flex flex-wrap gap-3 items-center">
        <Segments items={T} value={tab} onChange={setTab} counts={counts} />
        <div className="flex items-center border border-line-2 h-9 px-2.5 ml-auto w-full sm:w-64 bg-white"><Search size={15} className="text-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="스토어명 · 대표자" className="flex-1 px-2 text-[13px] outline-none" /></div>
      </div>
      <div className="panel mt-3 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>스토어</th><th>대표자</th><th>카테고리</th><th>등급</th><th className="text-right">상품</th><th className="text-right">8주 거래액</th><th>추이</th><th>평점</th><th>입점일</th><th>상태</th></tr></thead>
          <tbody>
            {list.map((s) => {
              const ss = settlements.filter((x) => x.storeId === s.id);
              const sum = ratingSummary(reviewsOfStore(s.id));
              return (
                <tr key={s.id}>
                  <td><Link to={`/admin/stores/${s.id}`} className="flex items-center gap-2 font-semibold hover:underline"><span className="w-7 h-7 text-white text-[12px] font-bold flex items-center justify-center" style={{ background: s.color }}>{s.name[0]}</span>{s.name}</Link></td>
                  <td>{s.owner}</td>
                  <td className="text-ink-2">{catById[s.cat].name}</td>
                  <td>{s.grade}</td>
                  <td className="text-right num">{productsOfStore(s.id).length}</td>
                  <td className="text-right num">{shortWon(ss.reduce((a, x) => a + x.gross, 0))}원</td>
                  <td><Spark values={ss.map((x) => x.gross).reverse()} /></td>
                  <td>★ {sum.avg.toFixed(1)}</td>
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
        right={<><Link to={`/store/${s.id}`} className="btn btn-line btn-sm">쇼핑몰에서 보기 <ExternalLink size={13} /></Link><button onClick={() => setModal(true)} className="btn btn-ink btn-sm">상태 변경</button></>} />
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
            <div className="p-5"><KV rows={[['상태', <StatusPill s={status} />], ['등급', s.grade], ['사업자번호', s.bizNo], ['연락처', s.phone], ['이메일', s.email], ['배송', `${s.courier} · ${won(s.shipFee)}`], ['관심고객', comma(s.followers)]]} /></div>
          </div>
          <div className="panel p-5 space-y-3">
            <div className="panel-title">수수료 개별 설정</div>
            <div className="flex items-center gap-2"><input className="field num w-24" defaultValue={(c.commission * 100).toFixed(1)} /><span>%</span><button onClick={() => toast('개별 수수료율이 다음 정산부터 적용됩니다')} className="btn btn-line btn-sm">적용</button></div>
            <p className="text-[12px] text-mute">카테고리 기본값 {pct(c.commission)} · 프로모션/협의 시 개별 조정</p>
          </div>
          <div className="panel p-5">
            <div className="panel-title mb-2">관리 메모</div>
            <ul className="text-[12.5px] text-ink-2 space-y-1.5">
              <li><span className="num text-mute">2026.09.12</span> 추석 기획전 참여 확정</li>
              {s.id === 's5' && <li><span className="num text-mute">2026.09.25</span> 반품 미처리 3건 → 정산 보류 / 휴면 전환</li>}
              <li><span className="num text-mute">{ymd(s.since)}</span> 입점 승인</li>
            </ul>
          </div>
        </div>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="스토어 상태 변경" width={460}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setModal(false)}>취소</button><button className="btn btn-ink btn-sm" onClick={() => { setModal(false); toast(`스토어 상태: ${status}`); }}>변경</button></>}>
        <Segments items={['운영중', '휴면', '정지']} value={status} onChange={setStatus} />
        <div className="mt-4 text-[13px] text-ink-2 bg-cream p-3 leading-relaxed">
          {status === '운영중' && '스토어와 판매중 상품이 쇼핑몰에 노출됩니다.'}
          {status === '휴면' && '스토어/상품이 비노출됩니다. 진행 중 주문은 처리 가능하며, 정산은 클레임 완료 후 지급됩니다.'}
          {status === '정지' && '즉시 비노출 + 판매자센터 기능 제한. 미정산 금액은 지급보류되며, 분쟁 해소 후 지급됩니다.'}
        </div>
        {status !== '운영중' && <><label className="label mt-4">사유 (판매자에게 통보)</label><textarea rows={3} className="field" /></>}
      </Modal>
    </div>
  );
}

/* ─────────── 정산 관리 ─────────── */
const WEEKS = [...new Set(settlements.map((s) => s.start.getTime()))];
export function AdminSettlements() {
  const { toast } = useApp();
  const [week, setWeek] = useState(WEEKS[0]);
  const [rows, setRows] = useState(settlements);
  const [sel, setSel] = useState(new Set());
  const [hold, setHold] = useState(null);
  const list = rows.filter((s) => s.start.getTime() === week);
  const tot = (k) => list.reduce((a, s) => a + s[k], 0);
  const payable = list.filter((s) => s.status === '지급예정');
  const pay = () => {
    setRows(rows.map((s) => (sel.has(s.id) && s.status === '지급예정' ? { ...s, status: '지급완료' } : s)));
    toast(`${[...sel].filter((id) => payable.find((p) => p.id === id)).length}건 지급 실행 (펌뱅킹 이체 요청)`); setSel(new Set());
  };
  return (
    <div>
      <PageHead title="정산 관리" desc="구매확정일 기준 주간 정산 · 지급액 = 구매확정 매출 − 환불 − 판매수수료(카테고리별) − 결제수수료(2.2%)"
        right={<button className="btn btn-line btn-sm"><Download size={14} /> 정산 명세 엑셀</button>} />
      <div className="panel p-4 flex flex-wrap items-center gap-3">
        <span className="text-[13px] font-semibold">정산 주차</span>
        <select value={week} onChange={(e) => { setWeek(Number(e.target.value)); setSel(new Set()); }} className="field field-sm h-9 w-auto">
          {WEEKS.map((w) => { const d = new Date(w); return <option key={w} value={w}>{ymd(d)} ~ {ymd(new Date(w + 6 * 864e5)).slice(5)} (지급 {ymd(new Date(w + 10 * 864e5)).slice(5)})</option>; })}
        </select>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mt-4">
        <Kpi label="구매확정 매출" value={shortWon(tot('gross'))} unit="원" />
        <Kpi label="환불 차감" value={comma(tot('refund') / 10000)} unit="만원" />
        <Kpi label="판매수수료 (플랫폼 수익)" value={comma(tot('commission') / 10000)} unit="만원" />
        <Kpi label="결제수수료 (PG)" value={comma(tot('pgFee') / 10000)} unit="만원" />
        <Kpi label="판매자 지급 총액" value={shortWon(tot('payout'))} unit="원" sub={`${list.length}개 스토어`} />
      </div>
      <div className="panel mt-4">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-line text-[13px]">
          <span className="text-ink-2 mr-2">선택 <b className="num text-ink">{sel.size}</b>건</span>
          <button disabled={!sel.size} onClick={pay} className="btn btn-ink btn-xs">지급 실행</button>
          <button disabled={!sel.size} onClick={() => toast('선택 건 지급보류 처리')} className="btn btn-line btn-xs">지급 보류</button>
          <span className="ml-auto text-mute">지급 대기 {payable.length}건 · {won(payable.reduce((a, s) => a + s.payout, 0))}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr>
              <th className="w-10"><Checkbox checked={payable.length > 0 && payable.every((s) => sel.has(s.id))} onChange={(on) => setSel(on ? new Set(payable.map((s) => s.id)) : new Set())} /></th>
              <th>스토어</th><th className="text-right">건수</th><th className="text-right">구매확정 매출</th><th className="text-right">환불</th><th className="text-right">수수료율</th><th className="text-right">판매수수료</th><th className="text-right">결제수수료</th><th className="text-right">지급액</th><th>상태</th><th />
            </tr></thead>
            <tbody>
              {list.map((s) => {
                const st = storeById[s.storeId];
                return (
                  <tr key={s.id}>
                    <td>{s.status === '지급예정' && <Checkbox checked={sel.has(s.id)} onChange={() => { const n = new Set(sel); n.has(s.id) ? n.delete(s.id) : n.add(s.id); setSel(n); }} />}</td>
                    <td><Link to={`/admin/stores/${st.id}`} className="font-semibold hover:underline">{st.name}</Link><div className="text-[11px] text-mute num">{s.id}</div></td>
                    <td className="text-right num">{s.orders}</td>
                    <td className="text-right num">{comma(s.gross)}</td>
                    <td className="text-right num text-rust">−{comma(s.refund)}</td>
                    <td className="text-right num">{pct(s.rate)}</td>
                    <td className="text-right num">{comma(s.commission)}</td>
                    <td className="text-right num">{comma(s.pgFee)}</td>
                    <td className="text-right num font-bold">{comma(s.payout)}</td>
                    <td><StatusPill s={s.status} /></td>
                    <td>{s.status === '지급보류' && <button onClick={() => setHold(s)} className="btn btn-line btn-xs">사유</button>}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-bold bg-cream [&>td]:h-11 [&>td]:px-3 [&>td]:border-t [&>td]:border-ink">
                <td /><td>합계</td><td className="text-right num">{comma(tot('orders'))}</td><td className="text-right num">{comma(tot('gross'))}</td><td className="text-right num">−{comma(tot('refund'))}</td><td /><td className="text-right num">{comma(tot('commission'))}</td><td className="text-right num">{comma(tot('pgFee'))}</td><td className="text-right num">{comma(tot('payout'))}</td><td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <Modal open={!!hold} onClose={() => setHold(null)} title="지급 보류 사유" width={440}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setHold(null)}>닫기</button><button className="btn btn-ink btn-sm" onClick={() => { setHold(null); toast('보류 해제 → 지급예정으로 변경'); }}>보류 해제</button></>}>
        <p className="text-[14px]">{hold?.holdReason}</p>
      </Modal>
    </div>
  );
}

/* ─────────── 회원 관리 ─────────── */
export function AdminUsers() {
  const [tab, setTab] = useState('전체');
  const [grade, setGrade] = useState('전체');
  const [q, setQ] = useState('');
  const T = ['전체', '정상', '휴면', '이용정지'];
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
          <thead><tr><th>회원</th><th>이메일</th><th>등급</th><th className="text-right">주문</th><th className="text-right">누적 구매확정</th><th className="text-right">보유 포인트</th><th>가입일</th><th>최근 접속</th><th>상태</th></tr></thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td><Link to={`/admin/users/${u.id}`} className="flex items-center gap-2 font-semibold hover:underline"><img src={u.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />{u.name}</Link></td>
                <td className="text-ink-2">{u.email}</td>
                <td><GradeBadge grade={u.grade} /></td>
                <td className="text-right num">{u.orders}</td>
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

export function AdminUserDetail() {
  const { id } = useParams();
  const { toast } = useApp();
  const u = userById[id] || users[0];
  const [modal, setModal] = useState(null);
  const urev = reviews.filter((r) => r.userId === u.id).slice(0, 5);
  const next = nextGrade(u.spent);
  const ph = userPointHistory(u);
  return (
    <div>
      <PageHead crumbs="회원 · 콘텐츠 > 회원 관리" title={<span className="flex items-center gap-2">{u.name} <GradeBadge grade={u.grade} /></span>} desc={`${u.email} · 가입 ${ymd(u.joined)}`}
        right={<button onClick={() => setModal('ban')} className={cx('btn btn-sm', u.status === '이용정지' ? 'btn-ink' : 'btn-line text-rust')}>{u.status === '이용정지' ? '정지 해제' : '이용 정지'}</button>} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi label="회원등급" value={u.grade} sub={next ? `${next.id}까지 ${won(next.min - u.spent)}` : '최고 등급'} />
        <Kpi label="누적 주문" value={u.orders} unit="건" />
        <Kpi label="누적 구매확정 금액" value={comma(u.spent)} unit="원" />
        <Kpi label="보유 포인트" value={comma(u.point)} unit="P" sub="적립률 5% (실결제금액 기준)" />
      </div>
      <div className="grid xl:grid-cols-[360px_1fr] gap-4 mt-4">
        <div className="panel">
          <div className="p-5 flex items-center gap-3 border-b border-line"><img src={u.avatar} alt="" className="w-12 h-12 rounded-full object-cover" /><div><b>{u.name}</b> <span className="text-mute text-[13px]">({u.nick})</span><div><StatusPill s={u.status} /></div></div></div>
          <div className="p-5"><KV rows={[['회원번호', u.id.toUpperCase()], ['휴대폰', u.phone], ['회원등급', <GradeBadge grade={u.grade} />], ['최근 접속', ymdhm(u.lastLogin)], ['마케팅 수신', '동의 (2025.03.02)']]} /></div>
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
        </div>
      </div>
      <Modal open={modal === 'ban'} onClose={() => setModal(null)} title={u.status === '이용정지' ? '이용 정지 해제' : '이용 정지'} width={440}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setModal(null)}>취소</button><button className="btn btn-ink btn-sm" onClick={() => { setModal(null); toast('처리되었어요'); }}>확인</button></>}>
        {u.status !== '이용정지' && <><label className="label">정지 기간</label><select className="field mb-3"><option>7일</option><option>30일</option><option>영구</option></select><label className="label">사유</label><select className="field mb-3"><option>허위 리뷰 / 리뷰 어뷰징</option><option>결제 도용 의심</option><option>욕설 · 비방</option></select></>}
        <textarea rows={3} className="field" placeholder="내부 메모" />
      </Modal>
    </div>
  );
}

/* ─────────── 리뷰 관리 ─────────── */
export function AdminReviews() {
  const { toast } = useApp();
  const [rows, setRows] = useState(() => reviews.slice(0, 40).concat(reviews.slice(40).filter((r) => r.flag)).map((r) => ({ ...r })));
  const [tab, setTab] = useState('검토 대상');
  const [photo, setPhoto] = useState(false);
  const T = ['검토 대상', '블라인드', '전체'];
  const match = (r, t) => (t === '검토 대상' ? r.flag && !r.blinded : t === '블라인드' ? r.blinded : true);
  const counts = Object.fromEntries(T.map((t) => [t, rows.filter((r) => match(r, t)).length]));
  const list = rows.filter((r) => match(r, tab) && (!photo || r.photos.length));
  const decide = (r, blind) => { setRows(rows.map((x) => (x.id === r.id ? { ...x, blinded: blind } : x))); toast(blind ? '블라인드 처리했어요' : '정상 노출로 변경했어요'); };
  return (
    <div>
      <PageHead title="리뷰 관리" desc="별점 · 사진 리뷰 모니터링 · 운영 정책 위반 리뷰는 블라인드 처리 (판매자는 리뷰를 삭제할 수 없음)" />
      <div className="flex flex-wrap gap-3 items-center">
        <Segments items={T} value={tab} onChange={setTab} counts={counts} />
        <Checkbox checked={photo} onChange={setPhoto} label="사진 리뷰만" className="ml-auto" />
      </div>
      <div className="panel mt-3 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>리뷰</th><th>사진</th><th>상품 / 스토어</th><th>작성자</th><th>검토 사유</th><th>상태</th><th className="text-center">처리</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7} className="text-center text-mute py-10">해당하는 리뷰가 없습니다.</td></tr>}
            {list.map((r) => {
              const p = productById[r.productId];
              return (
                <tr key={r.id}>
                  <td className="max-w-[320px]"><div className="flex items-center gap-1.5 text-[11.5px] text-mute"><Stars value={r.rating} size={10} /> {ymd(r.date)}</div><p className="mt-0.5 line-clamp-2">{r.body}</p></td>
                  <td>{r.photos[0] ? <img src={r.photos[0]} alt="" className="w-10 h-10 object-cover" /> : <span className="text-mute">-</span>}</td>
                  <td className="text-[12.5px]">{p.name}<div className="text-mute">{storeById[p.storeId].name}</div></td>
                  <td><Link to={`/admin/users/${r.userId}`} className="hover:underline">{userById[r.userId].name}</Link></td>
                  <td className="text-[12.5px]">{r.flag || <span className="text-mute">-</span>}</td>
                  <td><StatusPill s={r.blinded ? '블라인드' : r.flag ? '검토대기' : '정상노출'} /></td>
                  <td>
                    <div className="flex gap-1 justify-center">
                      {!r.blinded && <button onClick={() => decide(r, true)} className="btn btn-ink btn-xs">블라인드</button>}
                      {(r.blinded || r.flag) && <button onClick={() => decide(r, false)} className="btn btn-line btn-xs">정상노출</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────── 카테고리 · 수수료 ─────────── */
const DOCS_BY_CAT = { food: '영업신고증 / 농업경영체', beauty: '화장품 책임판매업 등록필증', digital: 'KC 인증서' };

export function AdminCategories() {
  const { toast } = useApp();
  const [open, setOpen] = useState(() => new Set([categories[0].id]));
  const [edit, setEdit] = useState(null);
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const prodCount = (cid, sub) => products.filter((p) => p.cat === cid && (!sub || p.sub === sub)).length;
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
          <thead><tr><th>카테고리</th><th>코드</th><th className="text-right">상품</th><th className="text-right">스토어</th><th className="w-36">판매수수료</th><th className="text-right">결제수수료</th><th className="text-right">합계</th><th>필수 인증 서류</th><th className="text-center">관리</th></tr></thead>
          <tbody>
            {categories.map((c) => {
              const on = open.has(c.id);
              return [
                <tr key={c.id} className="bg-cream/60">
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
                  <td className="text-[12.5px] text-ink-2">{DOCS_BY_CAT[c.id] || '-'}</td>
                  <td><div className="flex gap-1 justify-center"><button onClick={() => setEdit({ mode: 'new', parent: c.id })} className="btn btn-line btn-xs">하위 추가</button><button onClick={() => setEdit({ mode: 'edit', parent: '', name: c.name })} className="btn btn-line btn-xs">수정</button></div></td>
                </tr>,
                ...(on ? c.subs.map((s) => (
                  <tr key={`${c.id}-${s}`}>
                    <td className="pl-10 text-ink-2"><span className="text-line-2 mr-1.5">└</span>{s}</td>
                    <td className="font-mono text-[11.5px] text-mute">{c.id}/{s}</td>
                    <td className="text-right num">{prodCount(c.id, s)}</td>
                    <td className="text-right text-mute">-</td>
                    <td className="text-[12.5px] text-mute">상위와 동일 ({pct(c.commission)})</td>
                    <td className="text-right num text-mute">{pct(PAYMENT_FEE, 1)}</td>
                    <td className="text-right num text-mute">{pct(c.commission + PAYMENT_FEE, 1)}</td>
                    <td />
                    <td><div className="flex gap-1 justify-center"><button onClick={() => setEdit({ mode: 'edit', parent: c.id, name: s })} className="btn btn-line btn-xs">수정</button><button onClick={() => toast(prodCount(c.id, s) ? '상품이 등록된 카테고리는 삭제할 수 없어요' : '삭제했어요')} className="btn btn-ghost btn-xs">삭제</button></div></td>
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
              <select className="field" defaultValue={edit.parent}>
                <option value="">없음 (상위 카테고리로 등록)</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="label">카테고리명</label><input className="field" defaultValue={edit.name || ''} placeholder="예: 셔츠" /></div>
            {!edit.parent && <div><label className="label">판매수수료 (%)</label><input className="field num" placeholder="예: 10.0" /></div>}
            <div><label className="label">노출 순서</label><input className="field num" defaultValue="1" /></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
