import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, Download, ExternalLink } from 'lucide-react';
import { stores, storeById, catById, categories, productsOfStore, productById, PAYMENT_FEE } from '../../data/catalog';
import { users, userById } from '../../data/people';
import { settlements } from '../../data/orders';
import { reviews, reviewsOfStore, ratingSummary } from '../../data/reviews';
import { useApp } from '../../lib/store';
import { PageHead, Segments, StatusPill, Modal, KV, Kpi, Checkbox, Stars, Pill, Spark } from '../../components/ui';
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
  const [q, setQ] = useState('');
  const T = ['전체', '정상', '휴면', '이용정지'];
  const counts = Object.fromEntries(T.map((t) => [t, t === '전체' ? users.length : users.filter((u) => u.status === t).length]));
  const list = users.filter((u) => (tab === '전체' || u.status === tab) && (u.name + u.email).includes(q));
  return (
    <div>
      <PageHead title="회원 관리" desc="1년 미접속 회원은 개인정보 분리보관(휴면) · 등급은 매월 1일 갱신" />
      <div className="flex flex-wrap gap-3 items-center">
        <Segments items={T} value={tab} onChange={setTab} counts={counts} />
        <div className="flex items-center border border-line-2 h-9 px-2.5 ml-auto w-full sm:w-64 bg-white"><Search size={15} className="text-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · 이메일" className="flex-1 px-2 text-[13px] outline-none" /></div>
      </div>
      <div className="panel mt-3 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>회원</th><th>이메일</th><th>등급</th><th className="text-right">주문</th><th className="text-right">누적 구매</th><th className="text-right">포인트</th><th>가입일</th><th>최근 접속</th><th>상태</th></tr></thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td><Link to={`/admin/users/${u.id}`} className="flex items-center gap-2 font-semibold hover:underline"><img src={u.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />{u.name}</Link></td>
                <td className="text-ink-2">{u.email}</td>
                <td>{u.grade}</td>
                <td className="text-right num">{u.orders}</td>
                <td className="text-right num">{comma(u.spent)}</td>
                <td className="text-right num">{comma(u.point)}</td>
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
  return (
    <div>
      <PageHead crumbs="회원 · 콘텐츠 > 회원 관리" title={u.name} desc={`${u.email} · 가입 ${ymd(u.joined)}`}
        right={<><button onClick={() => setModal('point')} className="btn btn-line btn-sm">포인트 지급/회수</button><button onClick={() => setModal('ban')} className={cx('btn btn-sm', u.status === '이용정지' ? 'btn-ink' : 'btn-line text-rust')}>{u.status === '이용정지' ? '정지 해제' : '이용 정지'}</button></>} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi label="등급" value={u.grade} sub="최근 6개월 기준" />
        <Kpi label="누적 주문" value={u.orders} unit="건" />
        <Kpi label="누적 구매금액" value={comma(u.spent)} unit="원" />
        <Kpi label="보유 포인트" value={comma(u.point)} unit="P" />
      </div>
      <div className="grid xl:grid-cols-[360px_1fr] gap-4 mt-4">
        <div className="panel">
          <div className="p-5 flex items-center gap-3 border-b border-line"><img src={u.avatar} alt="" className="w-12 h-12 rounded-full object-cover" /><div><b>{u.name}</b> <span className="text-mute text-[13px]">({u.nick})</span><div><StatusPill s={u.status} /></div></div></div>
          <div className="p-5"><KV rows={[['회원번호', u.id.toUpperCase()], ['휴대폰', u.phone], ['최근 접속', ymdhm(u.lastLogin)], ['마케팅 수신', '동의 (2025.03.02)'], ['본인인증', '완료']]} /></div>
          {u.memo && <div className="mx-5 mb-5 bg-rust-soft text-rust text-[13px] p-3">{u.memo}</div>}
        </div>
        <div className="panel">
          <div className="panel-head"><span className="panel-title">작성 리뷰</span></div>
          {urev.length === 0 && <div className="py-10 text-center text-mute text-sm">작성한 리뷰가 없습니다.</div>}
          {urev.map((r) => (
            <div key={r.id} className="px-5 py-3.5 border-b border-line last:border-0 text-[13px]">
              <div className="flex items-center gap-2"><Stars value={r.rating} size={11} /><span className="text-mute">{ymd(r.date)} · {productById[r.productId].name}</span>{r.reports > 0 && <Pill tone="rust">신고 {r.reports}</Pill>}</div>
              <p className="mt-1 text-ink-2">{r.body}</p>
            </div>
          ))}
        </div>
      </div>
      <Modal open={modal === 'ban'} onClose={() => setModal(null)} title={u.status === '이용정지' ? '이용 정지 해제' : '이용 정지'} width={440}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setModal(null)}>취소</button><button className="btn btn-ink btn-sm" onClick={() => { setModal(null); toast('처리되었어요 (회원에게 안내 메일 발송)'); }}>확인</button></>}>
        {u.status !== '이용정지' && <><label className="label">정지 기간</label><select className="field mb-3"><option>7일</option><option>30일</option><option>영구</option></select><label className="label">사유</label><select className="field mb-3"><option>허위 리뷰 / 리뷰 어뷰징</option><option>상습 반품 · 블랙컨슈머</option><option>결제 도용 의심</option><option>욕설 · 비방</option></select></>}
        <textarea rows={3} className="field" placeholder="내부 메모" />
      </Modal>
      <Modal open={modal === 'point'} onClose={() => setModal(null)} title="포인트 지급/회수" width={400}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setModal(null)}>취소</button><button className="btn btn-ink btn-sm" onClick={() => { setModal(null); toast('포인트가 지급되었어요'); }}>실행</button></>}>
        <Segments items={['지급', '회수']} value="지급" onChange={() => {}} />
        <input className="field num mt-3" placeholder="포인트" />
        <input className="field mt-2" placeholder="사유 (회원에게 노출)" />
      </Modal>
    </div>
  );
}

/* ─────────── 신고 리뷰 ─────────── */
export function AdminReviews() {
  const { toast } = useApp();
  const [rows, setRows] = useState(() => reviews.filter((r) => r.reports > 0).map((r) => ({ ...r })));
  const decide = (r, blind) => { setRows(rows.map((x) => (x.id === r.id ? { ...x, blinded: blind, decided: true } : x))); toast(blind ? '블라인드 처리 · 작성자에게 통보' : '정상 노출로 복구했어요'); };
  return (
    <div>
      <PageHead title="신고 리뷰" desc="신고 3회 이상 누적 시 자동 블라인드 → 운영자 최종 판단 · 판매자는 리뷰를 직접 삭제할 수 없습니다." />
      <div className="panel overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>리뷰</th><th>상품 / 스토어</th><th>작성자</th><th>신고 사유</th><th className="text-right">신고</th><th>현재</th><th className="text-center">처리</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const p = productById[r.productId];
              return (
                <tr key={r.id}>
                  <td className="max-w-[320px]"><div className="flex items-center gap-1.5 text-[11.5px] text-mute"><Stars value={r.rating} size={10} /> {ymd(r.date)}</div><p className="mt-0.5 line-clamp-2">{r.body}</p></td>
                  <td className="text-[12.5px]">{p.name}<div className="text-mute">{storeById[p.storeId].name}</div></td>
                  <td><Link to={`/admin/users/${r.userId}`} className="hover:underline">{userById[r.userId].name}</Link></td>
                  <td>{r.reportReason}</td>
                  <td className={cx('text-right num font-bold', r.reports >= 3 && 'text-rust')}>{r.reports}</td>
                  <td><StatusPill s={r.blinded ? '블라인드' : '검토대기'} /></td>
                  <td>
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => decide(r, true)} className="btn btn-ink btn-xs">블라인드</button>
                      <button onClick={() => decide(r, false)} className="btn btn-line btn-xs">정상노출</button>
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
export function AdminCategories() {
  const { toast } = useApp();
  return (
    <div>
      <PageHead title="카테고리 · 수수료" desc="수수료율 변경은 판매자 공지 후 7일 뒤 적용 (전자상거래 표준약관) · 결제수수료는 PG 계약 기준 일괄 적용"
        right={<button onClick={() => toast('변경 사항이 2026.10.08부터 적용 예약되었어요')} className="btn btn-ink btn-sm">변경 예약</button>} />
      <div className="panel overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>카테고리</th><th>세부 분류</th><th className="text-right">스토어</th><th className="w-36">판매수수료</th><th className="text-right">결제수수료</th><th className="text-right">합계</th><th>필수 인증 서류</th></tr></thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="font-semibold">{c.name}<div className="text-[11px] font-mono text-mute font-normal">{c.en}</div></td>
                <td className="text-ink-2 text-[12.5px]">{c.subs.join(' · ')}</td>
                <td className="text-right num">{stores.filter((s) => s.cat === c.id).length}</td>
                <td><div className="flex items-center gap-1"><input className="field field-sm num w-20" defaultValue={(c.commission * 100).toFixed(1)} /> %</div></td>
                <td className="text-right num">{pct(PAYMENT_FEE, 1)}</td>
                <td className="text-right num font-semibold">{pct(c.commission + PAYMENT_FEE, 1)}</td>
                <td className="text-[12.5px] text-ink-2">{{ food: '영업신고증 / 농업경영체', beauty: '화장품 책임판매업 등록필증', digital: 'KC 인증서' }[c.id] || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn-line btn-sm mt-3">+ 카테고리 추가</button>
    </div>
  );
}
