import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileCheck, Store, Wallet, Users, Flag, Tags, ArrowRight, FileText, ExternalLink } from 'lucide-react';
import ConsoleLayout from '../../layouts/ConsoleLayout';
import { stores, categories, catById, PAYMENT_FEE } from '../../data/catalog';
import { applications, users } from '../../data/people';
import { settlements, platformDaily } from '../../data/orders';
import { reviews } from '../../data/reviews';
import { useApp } from '../../lib/store';
import { PageHead, Kpi, BarChart, HBars, StatusPill, Segments, Modal, KV, Checkbox, Pill } from '../../components/ui';
import { won, comma, ymd, ymdhm, pct, shortWon, cx } from '../../lib/format';

/* 목업용 모듈 상태 */
export let APPS = applications.map((a) => ({ ...a }));
const reported = () => reviews.filter((r) => r.reports > 0);

export function AdminLayout() {
  const groups = [
    { title: '홈', items: [{ to: '/admin', end: true, label: '대시보드', icon: LayoutDashboard }] },
    { title: '판매자', items: [
      { to: '/admin/applications', label: '입점 심사', icon: FileCheck, count: APPS.filter((a) => a.status === '심사대기').length },
      { to: '/admin/stores', label: '스토어 관리', icon: Store },
      { to: '/admin/settlements', label: '정산 관리', icon: Wallet, count: settlements.filter((s) => s.status === '지급보류').length },
    ] },
    { title: '회원 · 콘텐츠', items: [
      { to: '/admin/users', label: '회원 관리', icon: Users },
      { to: '/admin/reviews', label: '신고 리뷰', icon: Flag, count: reported().filter((r) => r.blinded).length },
    ] },
    { title: '설정', items: [{ to: '/admin/categories', label: '카테고리 · 수수료', icon: Tags }] },
  ];
  const notices = [
    { text: '신규 입점 신청 2건 (숲속제과, 실과바늘)', time: '3시간 전', to: '/admin/applications' },
    { text: '9/21~9/27 주차 정산 지급 승인 대기 (9개 스토어)', time: '오늘 09:00', to: '/admin/settlements' },
    { text: '리뷰 신고 누적 3회 이상 — 자동 블라인드 3건', time: '어제', to: '/admin/reviews' },
  ];
  return <ConsoleLayout kind="admin" badge="운영관리" groups={groups} notices={notices} account={{ name: '곳간 운영팀', role: '파트너운영 · 최고관리자', avatar: '/images/avatar/u-2.jpg' }} />;
}

/* ─────────── 대시보드 ─────────── */
export function AdminDashboard() {
  const today = platformDaily.at(-1), yday = platformDaily.at(-2);
  const gmv = platformDaily.reduce((a, d) => a + d.amount, 0);
  const lastWeek = settlements.filter((s) => s.start.getTime() === settlements[0].start.getTime());
  const revenue = lastWeek.reduce((a, s) => a + s.commission, 0);
  const catRows = categories.map((c) => ({
    label: c.name,
    value: settlements.filter((s) => stores.find((x) => x.id === s.storeId).cat === c.id).reduce((a, s) => a + s.gross, 0),
    note: pct(c.commission),
  })).sort((a, b) => b.value - a.value);
  const storeRank = stores.map((s) => {
    const ss = settlements.filter((x) => x.storeId === s.id);
    return { s, gross: ss.reduce((a, x) => a + x.gross, 0), last: ss[0] };
  }).sort((a, b) => b.gross - a.gross);
  const todo = [
    ['입점 심사 대기', APPS.filter((a) => a.status === '심사대기').length, '/admin/applications'],
    ['보완 요청 중', APPS.filter((a) => a.status === '보완요청').length, '/admin/applications'],
    ['정산 지급 승인', lastWeek.filter((s) => s.status === '지급예정').length, '/admin/settlements'],
    ['지급 보류', settlements.filter((s) => s.status === '지급보류').length, '/admin/settlements'],
    ['신고 리뷰', reported().length, '/admin/reviews'],
    ['이용정지 회원', users.filter((u) => u.status === '이용정지').length, '/admin/users'],
  ];
  return (
    <div>
      <PageHead title="운영 대시보드" desc="2026.10.01 (목) 10:00 기준 · 거래액은 결제 기준, 수수료 수익은 구매확정 기준" />
      <div className="panel grid grid-cols-3 md:grid-cols-6">
        {todo.map(([k, n, to], i) => (
          <Link key={k} to={to} className={cx('px-4 py-4 hover:bg-cream border-line', i % 3 && 'border-l', i >= 3 && 'border-t md:border-t-0', i % 6 && 'md:border-l')}>
            <div className="text-[12.5px] text-ink-2">{k}</div>
            <div className={cx('mt-1 text-[24px] font-bold num', n ? 'text-point' : 'text-line-2')}>{n}</div>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
        <Kpi label="오늘 거래액 (GMV)" value={shortWon(today.amount)} unit="원" delta={((today.amount - yday.amount) / yday.amount) * 100} sub="전일 대비" />
        <Kpi label="최근 30일 거래액" value={shortWon(gmv)} unit="원" delta={8.7} sub="직전 30일 대비" />
        <Kpi label="지난주 수수료 수익" value={comma(revenue / 10000)} unit="만원" sub="판매수수료 (결제수수료 제외)" />
        <Kpi label="운영 스토어 / 회원" value={`${stores.filter((s) => s.status === '운영중').length}`} unit={`곳 · ${comma(48210)}명`} sub="신규 회원 오늘 +128" />
      </div>
      <div className="grid xl:grid-cols-[1fr_360px] gap-4 mt-4">
        <div className="panel">
          <div className="panel-head"><span className="panel-title">일별 거래액 · 최근 30일</span></div>
          <div className="p-5"><BarChart data={platformDaily} /></div>
        </div>
        <div className="panel">
          <div className="panel-head"><span className="panel-title">카테고리별 거래액 (8주)</span><span className="text-[11.5px] text-mute">수수료율</span></div>
          <div className="p-5"><HBars rows={catRows} format={(v) => `${shortWon(v)}원`} /></div>
        </div>
      </div>
      <div className="panel mt-4 overflow-x-auto">
        <div className="panel-head"><span className="panel-title">스토어 거래액 순위 (최근 8주)</span><Link to="/admin/stores" className="text-[12px] text-mute flex items-center gap-1">스토어 관리 <ArrowRight size={12} /></Link></div>
        <table className="tbl">
          <thead><tr><th className="w-12">순위</th><th>스토어</th><th>카테고리</th><th className="text-right">거래액</th><th className="text-right">수수료 수익</th><th>등급</th><th>상태</th></tr></thead>
          <tbody>
            {storeRank.map(({ s, gross }, i) => (
              <tr key={s.id}>
                <td className="num font-bold">{i + 1}</td>
                <td><Link to={`/admin/stores/${s.id}`} className="flex items-center gap-2 hover:underline"><span className="w-6 h-6 text-white text-[11px] font-bold flex items-center justify-center" style={{ background: s.color }}>{s.name[0]}</span>{s.name}</Link></td>
                <td className="text-ink-2">{catById[s.cat].name}</td>
                <td className="text-right num">{won(gross)}</td>
                <td className="text-right num">{won(gross * catById[s.cat].commission)}</td>
                <td>{s.grade}</td>
                <td><StatusPill s={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────── 입점 심사 ─────────── */
export function AdminApplications() {
  const [tab, setTab] = useState('전체');
  const T = ['전체', '심사대기', '보완요청', '승인', '반려'];
  const counts = Object.fromEntries(T.map((t) => [t, t === '전체' ? APPS.length : APPS.filter((a) => a.status === t).length]));
  const list = APPS.filter((a) => tab === '전체' || a.status === tab);
  return (
    <div>
      <PageHead title="입점 심사" desc="심사 기준: 사업자 상태(국세청) · 통신판매업 신고 · 카테고리 적합성 · 정품/인증 서류 · 중복 입점 여부 / 처리 기한: 접수 후 영업일 3일" />
      <Segments items={T} value={tab} onChange={setTab} counts={counts} />
      <div className="panel mt-3 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>접수번호</th><th>스토어명</th><th>대표자</th><th>카테고리</th><th>구분</th><th>서류</th><th>월 예상매출</th><th>신청일시</th><th>상태</th><th /></tr></thead>
          <tbody>
            {list.map((a) => {
              const docs = Object.values(a.docs).filter(Boolean).length;
              return (
                <tr key={a.id}>
                  <td className="num text-[12px]">{a.id}</td>
                  <td className="font-semibold">{a.storeName}</td>
                  <td>{a.owner}</td>
                  <td>{catById[a.cat].name}</td>
                  <td>{a.bizType}</td>
                  <td className={cx('num', docs < 4 && 'text-rust font-semibold')}>{docs}/4</td>
                  <td>{a.expected}</td>
                  <td className="num text-ink-2 whitespace-nowrap">{ymdhm(a.applied)}</td>
                  <td><StatusPill s={a.status} /></td>
                  <td><Link to={`/admin/applications/${a.id}`} className="btn btn-line btn-xs">{a.status === '심사대기' ? '심사하기' : '보기'}</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminApplicationDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast } = useApp();
  const a = APPS.find((x) => x.id === id) || APPS[0];
  const [modal, setModal] = useState(null);
  const [promo, setPromo] = useState(true);
  const c = catById[a.cat];
  const [checks, setChecks] = useState({ biz: a.docs.biz, ecom: a.docs.ecom, dup: true, cat: true, kc: a.cat !== 'digital' });
  const decide = (status, msg) => { APPS = APPS.map((x) => (x.id === a.id ? { ...x, status, decided: new Date() } : x)); setModal(null); toast(msg); nav('/admin/applications'); };
  const DOCS = [['biz', '사업자등록증'], ['ecom', '통신판매업 신고증'], ['bank', '통장 사본'], ['sample', '대표 상품 사진']];

  return (
    <div>
      <PageHead crumbs="판매자 > 입점 심사" title={<>{a.storeName} <span className="text-[14px] font-normal text-mute num ml-1">{a.id}</span></>} desc={`신청일시 ${ymdhm(a.applied)}`}
        right={<StatusPill s={a.status} />} />
      {a.note && <div className={cx('mb-4 px-4 py-3 text-[13px]', a.status === '반려' ? 'bg-rust-soft text-rust' : 'bg-amber-soft text-amber')}>{a.note}</div>}
      <div className="grid xl:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <div className="panel">
            <div className="panel-head"><span className="panel-title">신청 정보</span></div>
            <div className="p-5"><KV cols={2} rows={[['스토어명', a.storeName], ['대표자', a.owner], ['사업자 구분', a.bizType], ['사업자번호', <span className="num">{a.bizNo}</span>], ['통신판매업', <span className="num">{a.ecomNo}</span>], ['카테고리', `${c.name} (수수료 ${pct(c.commission)})`], ['연락처', a.phone], ['이메일', a.email], ['월 예상매출', a.expected], ['운영 채널', '자사몰 / 인스타그램']]} /></div>
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title">스토어 소개 · 판매 예정 상품</span></div>
            <div className="p-5">
              <p className="text-[14px] text-ink-2 leading-relaxed">{a.intro}</p>
              <ul className="mt-4 border-t border-line">{a.products.map((p) => <li key={p} className="py-2.5 border-b border-line text-[13px] flex justify-between">{p}<span className="text-mute">{c.name}</span></li>)}</ul>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title">제출 서류</span></div>
            <div className="p-5 grid sm:grid-cols-2 gap-2">
              {DOCS.map(([k, l]) => (
                <div key={k} className={cx('flex items-center gap-3 border p-3', a.docs[k] ? 'border-line' : 'border-dashed border-rust/50 bg-rust-soft/40')}>
                  <FileText size={18} className={a.docs[k] ? 'text-ink' : 'text-rust'} />
                  <div className="flex-1 text-[13px]"><div className="font-semibold">{l}</div><div className="text-[11.5px] text-mute">{a.docs[k] ? `${l.replace(/\s/g, '')}.pdf` : '미제출'}</div></div>
                  {a.docs[k] && <button className="btn btn-ghost btn-xs"><ExternalLink size={13} /> 열기</button>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-20 self-start">
          <div className="panel">
            <div className="panel-head"><span className="panel-title">심사 체크리스트</span></div>
            <div className="p-5 space-y-2.5 text-[13px]">
              {[['biz', '사업자 상태 정상 (국세청 조회)'], ['ecom', '통신판매업 신고 확인'], ['dup', '기존 스토어 중복 입점 없음'], ['cat', '카테고리 · 상품 적합'], ['kc', '카테고리 필수 인증서 (KC 등)']].map(([k, l]) => (
                <Checkbox key={k} checked={checks[k]} onChange={(v) => setChecks({ ...checks, [k]: v })} label={l} />
              ))}
              <textarea rows={3} className="field text-[13px] mt-2" placeholder="내부 심사 메모 (판매자에게 노출되지 않음)" />
            </div>
          </div>
          {['심사대기', '보완요청'].includes(a.status) && (
            <div className="panel p-5 space-y-2">
              <button onClick={() => setModal('approve')} disabled={!Object.values(checks).every(Boolean)} className="btn btn-ink w-full">승인</button>
              <button onClick={() => setModal('supplement')} className="btn btn-line w-full">보완 요청</button>
              <button onClick={() => setModal('reject')} className="btn btn-line w-full text-rust">반려</button>
              {!Object.values(checks).every(Boolean) && <p className="text-[11.5px] text-mute text-center">체크리스트를 모두 확인해야 승인할 수 있어요</p>}
            </div>
          )}
        </div>
      </div>

      <Modal open={modal === 'approve'} onClose={() => setModal(null)} title="입점 승인" width={480}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setModal(null)}>취소</button><button className="btn btn-ink btn-sm" onClick={() => decide('승인', `${a.storeName} 입점 승인 · 판매자 계정 발급 메일 발송`)}>승인 확정</button></>}>
        <div className="space-y-4 text-[14px]">
          <KV rows={[['스토어', a.storeName], ['스토어 URL', <span className="num">gotgan.kr/store/{a.storeName === '숲속제과' ? 'forest-bake' : 'new-store'}</span>], ['판매수수료', `${pct(c.commission)} (카테고리 기본)`], ['결제수수료', pct(PAYMENT_FEE, 1)], ['판매자 등급', '새싹 (시작 등급)']]} />
          <Checkbox checked={promo} onChange={setPromo} label="신규 입점 프로모션 적용 (3개월 판매수수료 50%)" />
          <p className="text-[12px] text-mute">승인 시: ① 스토어 생성(상태: 운영중) ② 판매자센터 계정 발급 ③ 승인 안내 메일/알림톡 발송 ④ 메인 신규 스토어 2주 노출</p>
        </div>
      </Modal>
      <Modal open={modal === 'supplement'} onClose={() => setModal(null)} title="보완 요청" width={480}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setModal(null)}>취소</button><button className="btn btn-ink btn-sm" onClick={() => decide('보완요청', '보완 요청을 보냈어요 (7일 내 미보완 시 자동 반려)')}>요청 보내기</button></>}>
        <div className="space-y-2 text-[14px]">{['사업자등록증 재제출', '통신판매업 신고증 제출', 'KC 인증서 제출', '상품 사진 추가 제출', '정품 증빙 서류'].map((x) => <Checkbox key={x} checked={x === 'KC 인증서 제출' && a.cat === 'digital'} label={x} />)}</div>
        <textarea rows={3} className="field mt-4" placeholder="판매자에게 전달할 메시지" />
      </Modal>
      <Modal open={modal === 'reject'} onClose={() => setModal(null)} title="입점 반려" width={480}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setModal(null)}>취소</button><button className="btn btn-sm bg-rust text-white border-rust" onClick={() => decide('반려', '반려 처리 · 사유가 신청자에게 발송되었어요')}>반려 확정</button></>}>
        <label className="label">반려 사유</label>
        <select className="field mb-3"><option>사업자 정보 확인 불가</option><option>판매 금지 품목 포함</option><option>정품/인증 증빙 불가</option><option>기존 스토어 중복 입점</option><option>기타</option></select>
        <textarea rows={3} className="field" placeholder="상세 사유 (신청자에게 전달됨)" />
        <p className="text-[12px] text-mute mt-2">반려 후 30일 이내 재신청이 제한됩니다.</p>
      </Modal>
    </div>
  );
}
