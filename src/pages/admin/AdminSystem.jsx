import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useApp } from '../../lib/store';
import { PageHead, Modal } from '../../components/ui';

/* ─────────── 시스템 상태 (장애 시연 F-1) ───────────
   실제: SystemDashboard · SystemServicePanel · SystemFeaturePanel · SystemTimeline · SystemLinks · SystemKillDialog (frontend #109)
   API: backend docs/api/admin.md 7절 — 상태 2초 · 지표 15초 · 타임라인 5초 폴링. 목업은 내리기 → 복구를 타이머로 흉내 낸다
   목업 전용 주소: ?chaos=off = 내리기 스위치 꺼짐 · ?conn=lost = 상태 조회 실패(마지막 값 유지) */

// 서비스 13개 — 서버 순서 그대로. desired = Helm values replicas (구매 경로 · 입구 2, 나머지 1)
const SERVICES = [
  ['order-service', true, 2], ['product-service', true, 2], ['payment-service', true, 2], ['store-service', true, 2], ['user-service', true, 2],
  ['review-service', true, 1], ['settlement-service', true, 1], ['chat-service', true, 1],
  ['gateway-service', false, 2], ['admin-service', false, 1], ['keycloak', false, 1], ['mysql', false, 1], ['redis', false, 1],
].map(([name, killable, desired]) => ({ name, killable, desired, ready: desired, state: 'UP' }));

// 사용자 기능 — 서버가 의존 관계로 계산 (admin.md 7절 표)
const FEATURES = [
  ['BROWSE', '둘러보기 · 상품 상세', ['product-service']],
  ['STORE', '스토어', ['store-service']],
  ['REVIEW', '리뷰 · 문의', ['review-service']],
  ['CART_ORDER', '장바구니 · 주문', ['order-service', 'product-service', 'store-service']],
  ['PAYMENT', '결제', ['order-service', 'payment-service']],
  ['CHAT', '채팅', ['chat-service']],
  ['SETTLEMENT', '판매자 정산', ['settlement-service']],
  ['MYPAGE', '회원 · 마이페이지', ['user-service']],
];
const featuresOf = (services) => FEATURES.map(([key, label, deps]) => {
  const causes = deps.filter((d) => services.find((s) => s.name === d).state !== 'UP');
  const down = causes.some((d) => services.find((s) => s.name === d).state === 'DOWN');
  return { key, label, state: down ? 'DOWN' : causes.length ? 'DEGRADED' : 'UP', causes };
});

// 지표 — 라우트가 없는 서비스(gateway · keycloak · mysql · redis)는 null → '-'
const NO_ROUTE = ['gateway-service', 'keycloak', 'mysql', 'redis'];
const errorRateOf = (s) => (NO_ROUTE.includes(s.name) ? null : s.state === 'DOWN' ? 1 : 0); // 목업: 전부 내리면 gateway 가 502 를 셈

const formatErrorRate = (rate) => (rate == null ? '-' : `${Math.round(rate * 1000) / 10}%`);
const serviceShortName = (name) => name.replace(/-service$/, '');
const clock = (d) => d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul' });

const SERVICE_STATE = {
  UP: { label: '정상', card: 'border-line bg-paper', pill: 'bg-moss-soft text-moss' },
  DEGRADED: { label: '일부', card: 'border-amber bg-amber-soft', pill: 'bg-amber text-white' },
  DOWN: { label: '중단', card: 'border-rust bg-rust-soft', pill: 'bg-rust text-white' },
  RECOVERING: { label: '복구 중', card: 'border-sky bg-sky-soft', pill: 'bg-sky text-white' },
};
const FEATURE_STATE = {
  UP: { icon: '🟢', label: '정상', className: 'text-moss' },
  DEGRADED: { icon: '🟡', label: '일부', className: 'text-amber' },
  DOWN: { icon: '🔴', label: '중단', className: 'text-rust' },
};

function PodDots({ ready, desired }) {
  return (
    <span role="img" aria-label={`파드 ${desired}개 중 ${ready}개 준비`} className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="text-xl leading-none tracking-wider">{'●'.repeat(ready)}<span className="text-mute">{'○'.repeat(desired - ready)}</span></span>
      <span className="text-lg tabular-nums text-ink-2">{ready}/{desired}</span>
    </span>
  );
}

function KillDialog({ service, onKill, onClose }) {
  const name = serviceShortName(service.name);
  const multi = service.desired > 1;
  return (
    <Modal open onClose={onClose} title={`${name} 서비스 내리기`} footer={<>
      <button className="btn btn-line" onClick={onClose}>취소</button>
      {multi && <button className="btn btn-line" onClick={() => onKill('ONE')}>1개만 내리기</button>}
      <button className="btn btn-ink" onClick={() => onKill('ALL')}>{multi ? '전부 내리기' : '내리기'}</button>
    </>}>
      <p className="text-sm">파드를 삭제합니다. 새 파드가 자동으로 떠서 잠시 뒤 복구돼요.</p>
      <ul className="mt-2 text-sm text-ink-2 list-disc pl-5">
        {multi && <li>1개만: 남은 파드가 요청을 받아 서비스는 끊기지 않아요.</li>}
        <li>{multi ? '전부' : '내리면'}: 복구될 때까지 이 서비스를 쓰는 기능이 멈춰요.</li>
      </ul>
    </Modal>
  );
}

function Links() {
  const [guideOpen, setGuideOpen] = useState(false);
  return (
    <>
      <a href="/" target="_blank" rel="noopener noreferrer" className="btn btn-line btn-sm inline-flex items-center gap-1">쇼핑몰 새 창으로 열기 <ExternalLink size={14} /></a>
      <button className="btn btn-line btn-sm" onClick={() => setGuideOpen(true)}>Grafana 안내</button>
      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="Grafana 접속 방법">
        <p className="text-sm">자세한 그래프 · 로그 · 트레이스는 Grafana 에서 봅니다. 외부에 열려 있지 않아 터미널에서 먼저 연결해야 해요.</p>
        <pre className="mt-3 p-3 bg-cream text-[13px] overflow-x-auto"><code>kubectl -n monitoring port-forward svc/grafana 3000</code></pre>
        <p className="mt-3 text-sm">연결한 뒤 <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" className="underline">http://localhost:3000</a> 을 여세요.</p>
      </Modal>
    </>
  );
}

export function AdminSystem() {
  const { toast } = useApp();
  const [sp] = useSearchParams();
  const chaosEnabled = sp.get('chaos') !== 'off';
  const connLost = sp.get('conn') === 'lost';
  const [services, setServices] = useState(SERVICES);
  const [events, setEvents] = useState([]); // 최신순 (서버 순서 그대로) — 처음엔 '아직 내린 서비스가 없어요.'
  const [killTarget, setKillTarget] = useState(null);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const patch = (name, ready) => setServices((list) => list.map((s) => (s.name === name
    ? { ...s, ready, state: ready >= s.desired ? 'UP' : ready === 0 ? 'DOWN' : 'RECOVERING' } : s)));

  const kill = (scope) => {
    const s = killTarget;
    const count = scope === 'ONE' ? 1 : s.ready;
    const eventId = Date.now();
    const killedAt = new Date();
    patch(s.name, s.ready - count);
    setEvents((list) => [{ eventId, service: s.name, scope, killedAt, recoveredAt: null, recoverySeconds: null }, ...list].slice(0, 20));
    toast(`${serviceShortName(s.name)} 파드 ${count}개를 내렸어요.`);
    setKillTarget(null);
    // 목업 복구 흉내 — 새 파드가 하나씩 Ready
    const step = scope === 'ONE' ? 8000 : 6000;
    for (let i = 1; i <= count; i += 1) {
      timers.current.push(setTimeout(() => {
        patch(s.name, s.ready - count + i);
        if (i === count) {
          const recoveredAt = new Date();
          setEvents((list) => list.map((e) => (e.eventId === eventId ? { ...e, recoveredAt, recoverySeconds: Math.round((recoveredAt - killedAt) / 1000) } : e)));
        }
      }, step * i));
    }
  };

  const killable = services.filter((s) => s.killable);
  const fixed = services.filter((s) => !s.killable);
  const features = featuresOf(services);

  return (
    <div>
      <PageHead title="시스템 상태" desc="서비스를 내리면 어떤 기능이 멈추고 얼마 만에 복구되는지 보여 줍니다." right={<Links />} />
      {connLost && <p role="alert" className="mb-3 px-4 py-3 bg-rust-soft text-lg font-bold text-rust">연결 끊김 — 마지막으로 받은 상태를 보여 주고 있어요.</p>}
      <div className="grid gap-4">
        <section aria-label="서비스 상태" className="border border-line bg-paper p-4">
          <div className="flex flex-wrap items-baseline gap-x-3 mb-2">
            <h2 className="text-lg font-bold">서비스 상태</h2>
            {!chaosEnabled && <p className="text-sm text-mute">내리기 기능이 꺼져 있어요. 시연 때만 켭니다.</p>}
          </div>
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {killable.map((s) => {
              const st = SERVICE_STATE[s.state];
              const name = serviceShortName(s.name);
              return (
                <li key={s.name} className={`border-2 p-3 ${st.card}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl font-bold">{name}</span>
                    <span className={`px-2 py-0.5 text-lg font-bold whitespace-nowrap ${st.pill}`}>{st.label}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 mt-2">
                    <PodDots ready={s.ready} desired={s.desired} />
                    <span className="text-lg tabular-nums whitespace-nowrap">오류 {formatErrorRate(errorRateOf(s))}</span>
                  </div>
                  {/* 복구 중에는 내리기를 막는다 */}
                  <button className="btn btn-line btn-sm w-full mt-2" disabled={!chaosEnabled || s.state !== 'UP'} onClick={() => setKillTarget(s)} aria-label={`${name} 내리기`}>내리기</button>
                </li>
              );
            })}
          </ul>
          {/* 입구 · 관리자 · 로그인 · 데이터 — 시연에서 내리지 않으니 한 줄로 줄인다 */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-3">
            <span className="text-sm text-mute whitespace-nowrap">내릴 수 없음</span>
            {fixed.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-2">
                <span className="text-lg font-bold">{serviceShortName(s.name)}</span>
                <PodDots ready={s.ready} desired={s.desired} />
                <span className={`px-2 text-base font-bold whitespace-nowrap ${SERVICE_STATE[s.state].pill}`}>{SERVICE_STATE[s.state].label}</span>
                <span className="text-base tabular-nums whitespace-nowrap">오류 {formatErrorRate(errorRateOf(s))}</span>
              </span>
            ))}
          </div>
        </section>
        <div className="grid xl:grid-cols-2 gap-4 items-start">
          <section aria-label="사용자 기능" className="border border-line bg-paper p-4">
            <h2 className="text-lg font-bold mb-1">사용자 기능</h2>
            <ul className="grid sm:grid-cols-2 gap-x-6">
              {features.map((f) => {
                const st = FEATURE_STATE[f.state];
                return (
                  <li key={f.key} className="flex flex-wrap items-center gap-x-2 py-2 border-t border-line">
                    <span aria-hidden="true" className="text-base leading-none">{st.icon}</span>
                    <span className="text-xl font-bold">{f.label}</span>
                    <span className={`ml-auto text-lg font-bold ${st.className}`}>
                      {st.label}
                      {f.causes.length > 0 && <span className="font-normal"> · {f.causes.map(serviceShortName).join(', ')}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1 text-sm text-mute">의존 관계로 계산한 값이에요.</p>
          </section>
          <section aria-label="타임라인" className="border border-line bg-paper p-4">
            <h2 className="text-lg font-bold mb-1">타임라인</h2>
            {events.length > 0 ? (
              <ul className="max-h-48 overflow-y-auto">
                {events.map((e) => (
                  <li key={e.eventId} className="flex flex-wrap items-baseline gap-x-2 py-2 border-t border-line first:border-t-0 text-lg tabular-nums">
                    <span>{clock(e.killedAt)}</span>
                    <span className="font-bold">{serviceShortName(e.service)}</span>
                    <span>{e.scope === 'ONE' ? '1개' : '전부'} 내림</span>
                    {e.recoveredAt
                      ? <span className="text-moss font-bold">→ {clock(e.recoveredAt)} 복구 · {e.recoverySeconds}초</span>
                      : <span className="text-sky font-bold">→ 복구 기다리는 중</span>}
                  </li>
                ))}
              </ul>
            ) : <p className="py-2 text-sm text-mute">아직 내린 서비스가 없어요.</p>}
          </section>
        </div>
      </div>
      {killTarget && <KillDialog service={killTarget} onKill={kill} onClose={() => setKillTarget(null)} />}
    </div>
  );
}
