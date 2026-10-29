import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileCheck, Store, Wallet, Users, Flag, MessagesSquare, Tags, ArrowRight, FileText, ExternalLink, Search } from 'lucide-react';
import ConsoleLayout from '../../layouts/ConsoleLayout';
import NotificationBell from '../../components/NotificationBell';
import { useChatUnread } from '../../lib/chat';
import { stores, categories, catById, products, PAYMENT_FEE } from '../../data/catalog';
import { applications, users } from '../../data/people';
import { settlements, platformDaily } from '../../data/orders';
import { useApp } from '../../lib/store';
import { PageHead, Kpi, BarChart, HBars, StatusPill, Segments, Modal, KV, Checkbox } from '../../components/ui';
import { won, comma, ymd, ymdhm, pct, shortWon, cx, TODAY } from '../../lib/format';
import { REPORTS } from './AdminMore';

/* 목업용 모듈 상태 */
export let APPS = applications.map((a) => ({ ...a }));
export const openReportCount = () => REPORTS.reduce((a, t) => a + t.reports.filter((r) => r.status === 'OPEN').length, 0); // 처리 대기 신고 수

export function AdminLayout() {
  const chatUnread = useChatUnread('admin');
  const { logout } = useApp();
  const nav = useNavigate();
  const onLogout = () => { logout(); nav('/', { replace: true }); };
  const groups = [
    { title: '홈', items: [{ to: '/admin', end: true, label: '대시보드', icon: LayoutDashboard }] },
    { title: '판매자', items: [
      { to: '/admin/applications', label: '입점 심사', icon: FileCheck, count: APPS.filter((a) => a.status === '심사대기').length },
      { to: '/admin/stores', label: '스토어 관리', icon: Store },
      { to: '/admin/settlements', label: '정산 관리', icon: Wallet, count: settlements.filter((s) => s.status === '지급보류').length },
    ] },
    { title: '회원 · 콘텐츠', items: [
      { to: '/admin/users', label: '회원 관리', icon: Users },
      { to: '/admin/reports', label: '신고 관리', icon: Flag, count: openReportCount() },
      { to: '/admin/chats', label: '상담함', icon: MessagesSquare, count: chatUnread },
    ] },
    { title: '설정', items: [{ to: '/admin/categories', label: '카테고리 · 수수료', icon: Tags }] },
  ];
  return <ConsoleLayout kind="admin" badge="운영관리" groups={groups} onLogout={onLogout} bell={<NotificationBell to="ADMIN" dark />} account={{ name: '곳간 운영팀', role: '파트너운영 · 최고관리자', avatar: '/images/avatar/u-2.jpg' }} />;
}

/* ─────────── 대시보드 ─────────── */
// 일별 거래액 = 결제일별 최근 30일 · 카테고리별 거래액 · 스토어 순위 = 정산의 최근 8주 구매확정분 (실제 AdminDashboard.jsx)
export function AdminDashboard() {
  const gmv = platformDaily.reduce((a, d) => a + d.amount, 0);
  const orderCount = platformDaily.reduce((a, d) => a + d.orders, 0);
  const lastWeek = settlements.filter((s) => s.start.getTime() === settlements[0].start.getTime());
  const thisMonth = (d) => d.getFullYear() === TODAY.getFullYear() && d.getMonth() === TODAY.getMonth();
  const sum = (list, k) => list.reduce((a, s) => a + s[k], 0);
  const scheduled = settlements.filter((s) => s.status === '지급예정');
  const held = settlements.filter((s) => s.status === '지급보류');
  const commissionThisMonth = sum(settlements.filter((s) => thisMonth(s.pay)), 'commission');
  const paidThisMonth = sum(settlements.filter((s) => s.status === '지급완료' && thisMonth(s.pay)), 'payout');
  const catRows = categories.map((c) => ({
    label: c.name,
    value: settlements.filter((s) => stores.find((x) => x.id === s.storeId).cat === c.id).reduce((a, s) => a + s.gross, 0),
    note: pct(c.commission),
  })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const storeRank = stores.map((s) => {
    const ss = settlements.filter((x) => x.storeId === s.id);
    return { s, items: sum(ss, 'orders'), gross: sum(ss, 'gross'), commission: sum(ss, 'commission') };
  }).sort((a, b) => b.gross - a.gross).slice(0, 10);
  const salesFrom = settlements.reduce((m, s) => (s.start < m ? s.start : m), settlements[0].start);
  const todo = [
    ['입점 심사 대기', APPS.filter((a) => a.status === '심사대기').length, '/admin/applications'],
    ['보완 요청 중', APPS.filter((a) => a.status === '보완요청').length, '/admin/applications'],
    ['정산 지급 승인', lastWeek.filter((s) => s.status === '지급예정').length, '/admin/settlements'],
    ['지급 보류', held.length, '/admin/settlements'],
    ['신고 처리 대기', openReportCount(), '/admin/reports'],
    ['이용정지 회원', users.filter((u) => u.status === '이용정지').length, '/admin/users'],
  ];
  return (
    <div>
      <PageHead title="운영 대시보드" desc="거래액은 결제 기준, 수수료 수익 · 지급액은 정산서 기준" />
      <div className="panel grid grid-cols-3 md:grid-cols-6">
        {todo.map(([k, n, to], i) => (
          <Link key={k} to={to} className={cx('px-4 py-4 hover:bg-cream border-line', i % 3 && 'border-l', i >= 3 && 'border-t md:border-t-0', i % 6 && 'md:border-l')}>
            <div className="text-[12.5px] text-ink-2">{k}</div>
            <div className={cx('mt-1 text-[24px] font-bold num', n ? 'text-point' : 'text-line-2')}>{n}</div>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
        <Kpi label="누적 거래액 (GMV)" value={shortWon(gmv)} unit="원" sub={`결제 완료 주문 ${comma(orderCount)}건`} />
        <Kpi label="이번 달 수수료 수익" value={comma(commissionThisMonth / 10000)} unit="만원" sub="판매수수료 (결제수수료 제외)" />
        <Kpi label="지급 예정 · 보류" value={shortWon(sum(scheduled, 'payout'))} unit="원" sub={`보류 ${won(sum(held, 'payout'))} · 이번 달 지급 ${shortWon(paidThisMonth)}원`} />
        <Kpi label="운영 스토어 / 회원" value={`${stores.filter((s) => s.status === '운영중').length}`} unit={`곳 · ${comma(users.length)}명`}
          sub={`판매중 상품 ${comma(products.filter((p) => p.status === '판매중').length)} · 품절 ${comma(products.filter((p) => p.status === '품절').length)} · 강제중지 ${comma(products.filter((p) => p.blocked).length)}`} />
      </div>
      <div className="grid xl:grid-cols-[1fr_360px] gap-4 mt-4">
        <div className="panel">
          <div className="panel-head"><span className="panel-title">일별 거래액 · 최근 30일</span></div>
          <div className="p-5"><BarChart data={platformDaily} /></div>
        </div>
        <div className="panel">
          <div className="panel-head"><span className="panel-title">카테고리별 거래액 (8주 · 구매확정)</span><span className="text-[11.5px] text-mute">수수료율</span></div>
          <div className="p-5"><HBars rows={catRows} format={(v) => `${shortWon(v)}원`} /></div>
        </div>
      </div>
      <div className="panel mt-4 overflow-x-auto">
        <div className="panel-head"><span className="panel-title">스토어 거래액 순위 (최근 8주 · 구매확정 · 상위 10)</span><Link to="/admin/stores" className="text-[12px] text-mute flex items-center gap-1">스토어 관리 <ArrowRight size={12} /></Link></div>
        <table className="tbl">
          <thead><tr><th className="w-12">순위</th><th>스토어</th><th className="text-right">구매확정</th><th className="text-right">거래액</th><th className="text-right">수수료 수익</th></tr></thead>
          <tbody>
            {storeRank.map(({ s, items, gross, commission }, i) => (
              <tr key={s.id}>
                <td className="num font-bold">{i + 1}</td>
                <td className="font-semibold">{s.name}</td>
                <td className="text-right num">{comma(items)}건</td>
                <td className="text-right num">{won(gross)}</td>
                <td className="text-right num">{won(commission)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-2 text-[11.5px] text-mute">{ymd(salesFrom)}부터 · 정산 데이터 기준 (거래액은 포인트 차감 전 상품주문 금액)</p>
      </div>
    </div>
  );
}

/* ─────────── 입점 심사 ─────────── */
// 서류 종류 — 보완요청 재제출 선택과 같은 값 (상품 사진은 3~10장)
const DOC_TYPES = [
  { value: 'BUSINESS_REG', label: '사업자등록증' },
  { value: 'ECOMMERCE_REG', label: '통신판매업 신고증' },
  { value: 'BANK_COPY', label: '통장 사본' },
  { value: 'PRODUCT_PHOTO', label: '상품 사진' },
];
const APPLICATION_STATUS_LABEL = { PENDING: '심사대기', SUPPLEMENT: '보완요청', APPROVED: '승인', REJECTED: '반려' };
const CHECKLIST = [['biz', '사업자 상태 정상 (국세청 조회)'], ['ecom', '통신판매업 신고 확인'], ['dup', '기존 스토어 중복 입점 없음'], ['cat', '카테고리 · 상품 적합']];
const REJECT_REASONS = ['사업자 정보 확인 불가', '판매 금지 품목 포함', '정품/인증 증빙 불가', '기존 스토어 중복 입점', '기타'];

export function AdminApplications() {
  const [tab, setTab] = useState('전체');
  const [q, setQ] = useState('');
  const T = ['전체', '심사대기', '보완요청', '승인', '반려'];
  const counts = Object.fromEntries(T.map((t) => [t, t === '전체' ? APPS.length : APPS.filter((a) => a.status === t).length]));
  const list = APPS.filter((a) => (tab === '전체' || a.status === tab) && (a.no + a.storeName + a.owner + catById[a.cat].name).includes(q));
  return (
    <div>
      <PageHead title="입점 심사" desc="심사 기준: 사업자 상태(국세청) · 통신판매업 신고 · 카테고리 적합성 · 중복 입점 여부 / 처리 기한: 접수 후 영업일 3일" />
      <div className="flex flex-wrap gap-3 items-center">
        <Segments items={T} value={tab} onChange={setTab} counts={counts} />
        <div className="flex items-center border border-line-2 h-9 px-2.5 ml-auto w-full sm:w-72 bg-white"><Search size={15} className="text-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="접수번호 · 스토어 · 대표자 · 카테고리" className="flex-1 px-2 text-[13px] outline-none" /></div>
      </div>
      <div className="panel mt-3 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>접수번호</th><th>스토어명</th><th>대표자</th><th>카테고리</th><th>구분</th><th>월 예상매출</th><th>신청일시</th><th>상태</th><th /></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={9} className="text-center text-mute py-10">해당하는 신청이 없습니다.</td></tr>}
            {list.map((a) => (
              <tr key={a.id}>
                <td className="num text-[12px]">{a.no}</td>
                <td className="font-semibold">{a.storeName}</td>
                <td>{a.owner}</td>
                <td>{catById[a.cat].name}</td>
                <td>{a.bizType}</td>
                <td>{a.expected}</td>
                <td className="num text-ink-2 whitespace-nowrap">{ymdhm(a.applied)}</td>
                <td><StatusPill s={a.status} /></td>
                <td><Link to={`/admin/applications/${a.id}`} className="btn btn-line btn-xs">{a.status === '심사대기' ? '심사하기' : '보기'}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminApplicationDetail() {
  const { id } = useParams();
  const a = APPS.find((x) => String(x.id) === id) || APPS[0];
  return <ApplicationDetailBody key={a.id} a={a} />; // key: 다른 신청으로 이동하면 체크리스트 상태 초기화
}

function ApplicationDetailBody({ a }) {
  const nav = useNavigate();
  const { toast } = useApp();
  const [modal, setModal] = useState(null);
  const c = catById[a.cat];
  const current = a.documents.filter((d) => d.current);
  const has = (type) => current.some((d) => d.docType === type);
  const dupCount = a.sameBizRegNo.applications.length + a.sameBizRegNo.stores.length;
  // 체크리스트는 화면에서만 — 서버는 받지도 검사하지도 않음
  const [checks, setChecks] = useState({ biz: has('BUSINESS_REG'), ecom: has('ECOMMERCE_REG'), dup: dupCount === 0, cat: true });
  const [requestedDocs, setRequestedDocs] = useState([]);
  const [message, setMessage] = useState('');
  const [rejectPreset, setRejectPreset] = useState(REJECT_REASONS[0]);
  const [rejectDetail, setRejectDetail] = useState('');
  const allChecked = Object.values(checks).every(Boolean);
  const rejectReason = rejectDetail.trim() ? `${rejectPreset} — ${rejectDetail.trim()}` : rejectPreset;
  const decide = (status, msg, reason = null) => {
    APPS = APPS.map((x) => (x.id === a.id ? { ...x, status, decided: new Date(), note: reason ?? x.note, history: [...x.history, { from: x.status, to: status, reason, at: new Date(), by: '곳간 운영팀' }] } : x));
    setModal(null); toast(msg); nav('/admin/applications');
  };
  const toggleDoc = (value, on) => setRequestedDocs((prev) => (on ? [...prev, value] : prev.filter((v) => v !== value)));

  return (
    <div>
      <PageHead crumbs="판매자 > 입점 심사" title={<>{a.storeName} <span className="text-[14px] font-normal text-mute num ml-1">{a.no}</span></>} desc={`신청일시 ${ymdhm(a.applied)}`}
        right={<StatusPill s={a.status} />} />
      {a.note && ['보완요청', '반려'].includes(a.status) && <div className={cx('mb-4 px-4 py-3 text-[13px]', a.status === '반려' ? 'bg-rust-soft text-rust' : 'bg-amber-soft text-amber')}>{a.note}</div>}
      <div className="grid xl:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <div className="panel">
            <div className="panel-head"><span className="panel-title">신청 정보</span></div>
            <div className="p-5"><KV cols={2} rows={[
              ['스토어명', a.storeName], ['대표자', a.owner], ['상호', a.companyName], ['사업자 구분', a.bizType],
              ['사업자번호', <span className="num">{a.bizNo}</span>], ['통신판매업', <span className="num">{a.ecomNo}</span>],
              ['카테고리', `${c.name} (수수료 ${pct(c.commission)})`], ['연락처', a.phone], ['이메일', a.email], ['사업장 주소', a.address],
              ['월 예상매출', a.expected], ['운영 채널', a.channel],
              ['정산 계좌', a.account ? `${a.account.bank} ${a.account.number} (${a.account.holder})` : '-'],
            ]} /></div>
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title">스토어 소개 · 판매 예정 상품</span></div>
            <div className="p-5">
              <p className="text-[14px] text-ink-2 leading-relaxed">{a.intro}</p>
              <ul className="mt-4 border-t border-line">{a.products.map((p) => <li key={p.name} className="py-2.5 border-b border-line text-[13px] flex justify-between">{p.name}<span className="text-mute">{p.subCategory} · {won(p.price)}</span></li>)}</ul>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title">제출 서류</span><span className="text-[11.5px] text-mute">링크는 10분 동안 열려요 — 만료되면 새로고침</span></div>
            <div className="p-5 grid sm:grid-cols-2 gap-2">
              {DOC_TYPES.map(({ value, label }) => {
                const docs = a.documents.filter((d) => d.docType === value);
                if (!docs.length) {
                  return (
                    <div key={value} className="flex items-center gap-3 border border-dashed border-rust/50 bg-rust-soft/40 p-3">
                      <FileText size={18} className="text-rust" />
                      <div className="flex-1 text-[13px]"><div className="font-semibold">{label}</div><div className="text-[11.5px] text-mute">미제출</div></div>
                    </div>
                  );
                }
                return docs.map((d) => (
                  <div key={d.documentId} className={cx('flex items-center gap-3 border border-line p-3', !d.current && 'opacity-60')}>
                    <FileText size={18} className="text-ink" />
                    <div className="flex-1 min-w-0 text-[13px]"><div className="font-semibold">{label}{!d.current && ' (이전 제출본)'}</div><div className="text-[11.5px] text-mute truncate">{d.originalName}</div></div>
                    <button className="btn btn-ghost btn-xs" title="주소는 10분 뒤 만료돼요 — 열리지 않으면 새로고침"><ExternalLink size={13} /> 열기</button>
                  </div>
                ));
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-20 self-start">
          <div className="panel">
            <div className="panel-head"><span className="panel-title">심사 체크리스트</span></div>
            <div className="p-5 space-y-2.5 text-[13px]">
              {CHECKLIST.map(([k, l]) => (
                <Checkbox key={k} checked={checks[k]} onChange={(v) => setChecks({ ...checks, [k]: v })} label={l} />
              ))}
              <div className="mt-2 border-t border-line pt-2.5 text-[12px] text-ink-2">
                <div className="font-semibold">같은 사업자번호</div>
                {dupCount === 0 && <div className="text-mute">다른 신청 · 스토어 없음</div>}
                {a.sameBizRegNo.applications.map((x) => <div key={`a${x.applicationId}`} className="num">{x.applicationNo} · {x.storeName} · {APPLICATION_STATUS_LABEL[x.status] ?? x.status}</div>)}
                {a.sameBizRegNo.stores.map((x) => <div key={`s${x.storeId}`}>스토어 {x.storeName} · {x.status}</div>)}
              </div>
            </div>
          </div>
          {['심사대기', '보완요청'].includes(a.status) && (
            <div className="panel p-5 space-y-2">
              <button onClick={() => setModal('approve')} disabled={!allChecked} className="btn btn-ink w-full">승인</button>
              {a.status === '심사대기' && <button onClick={() => setModal('supplement')} className="btn btn-line w-full">보완 요청</button>}
              <button onClick={() => setModal('reject')} className="btn btn-line w-full text-rust">반려</button>
              {!allChecked && <p className="text-[11.5px] text-mute text-center">체크리스트를 모두 확인해야 승인할 수 있어요</p>}
            </div>
          )}
          <div className="panel">
            <div className="panel-head"><span className="panel-title">처리 이력</span></div>
            <ol className="p-5 space-y-3 text-[13px]">
              {a.history.map((h) => (
                <li key={`${h.at.getTime()}-${h.to}`} className="relative pl-4 border-l-2 border-line">
                  <div className="flex items-center gap-1.5">
                    {h.from && <><StatusPill s={h.from} /><span className="text-mute">→</span></>}
                    <StatusPill s={h.to} />
                  </div>
                  {h.reason && <div className="mt-1 text-ink-2">{h.reason}</div>}
                  <div className="text-[11.5px] text-mute num">{ymdhm(h.at)} · {h.by}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <Modal open={modal === 'approve'} onClose={() => setModal(null)} title="입점 승인" width={480}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setModal(null)}>취소</button><button className="btn btn-ink btn-sm" onClick={() => decide('승인', `${a.storeName} 입점 승인 · 승인 안내 메일 발송`)}>승인 확정</button></>}>
        <div className="space-y-4 text-[14px]">
          <KV rows={[['스토어', a.storeName], ['스토어 URL', <span className="num">gotgan.kr/store/{a.slug}</span>], ['판매수수료', `${pct(c.commission)} (카테고리 기본)`], ['결제수수료', pct(PAYMENT_FEE, 1)], ['판매자 등급', '새싹 (시작 등급)']]} />
          <p className="text-[12px] text-mute">승인 시: ① 스토어 생성(상태: 운영중) ② 판매자 권한 부여(신청자의 다음 로그인부터) ③ 승인 안내 메일 발송</p>
        </div>
      </Modal>
      <Modal open={modal === 'supplement'} onClose={() => setModal(null)} title="보완 요청" width={480}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setModal(null)}>취소</button><button className="btn btn-ink btn-sm" disabled={!message.trim() || message.trim().length > 255} onClick={() => decide('보완요청', '보완 요청을 보냈어요 (7일 내 미보완 시 자동 반려)', message.trim())}>요청 보내기</button></>}>
        <div className="space-y-2 text-[14px]">{DOC_TYPES.map((d) => <Checkbox key={d.value} checked={requestedDocs.includes(d.value)} onChange={(on) => toggleDoc(d.value, on)} label={`${d.label} 재제출`} />)}</div>
        <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="field mt-4" placeholder="판매자에게 전달할 메시지 (필수 · 서류가 아닌 내용 보완이면 서류 선택 없이)" />
      </Modal>
      <Modal open={modal === 'reject'} onClose={() => setModal(null)} title="입점 반려" width={480}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setModal(null)}>취소</button><button className="btn btn-sm bg-rust text-white border-rust" disabled={rejectReason.length > 255} onClick={() => decide('반려', '반려 처리 · 사유가 신청자에게 발송되었어요', rejectReason)}>반려 확정</button></>}>
        <label className="label">반려 사유</label>
        <select value={rejectPreset} onChange={(e) => setRejectPreset(e.target.value)} className="field mb-3">{REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}</select>
        <textarea rows={3} value={rejectDetail} onChange={(e) => setRejectDetail(e.target.value)} className="field" placeholder="상세 사유 (신청자에게 전달됨)" />
        <p className="text-[12px] text-mute mt-2">반려 후 30일 이내 재신청이 제한됩니다.</p>
      </Modal>
    </div>
  );
}
