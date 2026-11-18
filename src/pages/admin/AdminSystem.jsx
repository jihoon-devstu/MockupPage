import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useApp } from '../../lib/store';
import { PageHead, Modal } from '../../components/ui';
import {
  SCENARIO_SERVICES, createMonitor, tickMonitor, errorsPerMinute, monitorOverview, monitorCalls, monitorErrors, monitorSummary, traceOf,
  hasErrors, isLatencySpike, formatClock, isServerError,
  SCENARIO_LABEL, formatCount, progress, failureCauses, createLoadAcc, tickLoadAcc, loadResult, DONE_RESULT, STOPPED_RESULT, nextVisitors, visitorBreakdown,
} from '../../data/system';

/* ─────────── 시스템 상태 (장애 시연 F-1) ───────────
   실제: SystemDashboard, SystemServicePanel, SystemFeaturePanel, SystemTimeline, SystemLinks, SystemKillDialog (frontend #109)
   API: backend docs/api/admin.md 7절 — 상태 2초, 지표 15초, 타임라인 5초 폴링. 목업은 내리기 → 복구를 타이머로 흉내 낸다
   이중화 검증(시나리오, frontend #111 SystemScenarioPanel) — admin.md 7-2-1 kill-one-each
   부하테스트(frontend #116, #117, #119, admin.md 8절), 실시간 모니터링(#118, #120, admin.md 9절), 5xx 퍼센트 → 건수(#121)
   목업은 1초마다 가짜 트래픽을 만든다(data/system.js). 서비스를 전부 내리면 그 서비스 요청이 502 로 바뀌어 5xx 건수와 장애 감지가 뜬다
   목업 전용 주소: ?chaos=off = 내리기 스위치 꺼짐, ?conn=lost = 상태 조회 실패(마지막 값 유지), ?scenario=recovering = 시나리오 직후 복구 중(장애 주입 버튼 막힘)
   - ?load=running = 혼합 시나리오 120명 실행 중 + 20초 전 product 전부 내림(장애 감지)
   - ?load=done = 25분 전에 끝난 혼합 90명 실행(결과 탭, 502 일부)
   - ?load=stopped = 8분 전에 관리자가 중지한 둘러보기 60명 실행(상태 중지됨, 결과 탭, 실패 없음)
   현재 접속자, 부하테스트 진행 막대와 결과 탭, 중지 버튼, 진행 중 알림 띠(frontend #125 ~ #127, admin.md 8절 result, 9절 visitors)
   현재 접속자 총, 비회원, 구매자, 판매자, 관리자 구분 카드, 부하테스트 중지됨 STOPPED(frontend #128) */

// 서비스 13개 — 서버 순서 그대로. desired = Helm values replicas (구매 경로, 입구 2, 나머지 1)
const SERVICES = [
  ['order-service', true, 2], ['product-service', true, 2], ['payment-service', true, 2], ['store-service', true, 2], ['user-service', true, 2],
  ['review-service', true, 1], ['settlement-service', true, 1], ['chat-service', true, 1],
  ['gateway-service', false, 2], ['admin-service', false, 1], ['keycloak', false, 1], ['mysql', false, 1], ['redis', false, 1],
].map(([name, killable, desired]) => ({ name, killable, desired, ready: desired, state: 'UP' }));

// 사용자 기능 — 서버가 의존 관계로 계산 (admin.md 7절 표)
const FEATURES = [
  ['BROWSE', '둘러보기, 상품 상세', ['product-service']],
  ['STORE', '스토어', ['store-service']],
  ['REVIEW', '리뷰, 문의', ['review-service']],
  ['CART_ORDER', '장바구니, 주문', ['order-service', 'product-service', 'store-service']],
  ['PAYMENT', '결제', ['order-service', 'payment-service']],
  ['CHAT', '채팅', ['chat-service']],
  ['SETTLEMENT', '판매자 정산', ['settlement-service']],
  ['MYPAGE', '회원, 마이페이지', ['user-service']],
];
const featuresOf = (services) => FEATURES.map(([key, label, deps]) => {
  const causes = deps.filter((d) => services.find((s) => s.name === d).state !== 'UP');
  const down = causes.some((d) => services.find((s) => s.name === d).state === 'DOWN');
  return { key, label, state: down ? 'DOWN' : causes.length ? 'DEGRADED' : 'UP', causes };
});


// 이중화 검증 — 서버가 사유를 비우면 「시나리오 — …」 로 기록, 타임라인은 이 사유로 구분
const SCENARIO_REASON = '시나리오 — 레플리카 2 서비스 1개씩 내리기';
const NOT_READY_MESSAGE = '모든 대상 서비스가 정상일 때만 실행할 수 있어요.';
const scenarioTargets = (services) => services.filter((s) => s.killable && s.desired >= 2);
// 지난 시나리오 기록 예시 5건 — 서버처럼 화면 순서대로 1행씩, 최신순으로 내려옴 (목업 값, 실측 아님)
const scenarioEvents = (minutesAgo, recovered) => {
  const at = new Date(Date.now() - minutesAgo * 60000);
  return scenarioTargets(SERVICES).map((s, i) => ({
    eventId: 100 + i, service: s.name, scope: 'ONE', reason: SCENARIO_REASON, killedAt: at,
    recoveredAt: recovered ? new Date(at.getTime() + (30 + i * 2) * 1000) : null, recoverySeconds: recovered ? 30 + i * 2 : null,
  })).reverse();
};

// 최근 1분 5xx 건수(11/17 퍼센트 → 건수). 라우트 없는 서비스(gateway, keycloak, mysql, redis)는 '-'
const formatErrorCount = (count) => (count == null ? '-' : `${count}건/분`);
const serviceShortName = (name) => name.replace(/-service$/, '');
const clock = (d) => d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul' });

const SERVICE_STATE = {
  UP: { label: '정상', card: 'border-line bg-paper', pill: 'bg-moss-soft text-moss' },
  DEGRADED: { label: '일부', card: 'border-amber bg-amber-soft', pill: 'bg-amber text-white' },
  DOWN: { label: '중단', card: 'border-rust bg-rust-soft', pill: 'bg-rust text-white' },
  RECOVERING: { label: '복구 중', card: 'border-sky bg-sky-soft', pill: 'bg-sky text-white' },
};
const FEATURE_STATE = {
  UP: { icon: '🟢', label: '정상', className: 'text-moss', legend: '정상' },
  DEGRADED: { icon: '🟡', label: '일부', className: 'text-amber', legend: '일부 동작' },
  DOWN: { icon: '🔴', label: '중단', className: 'text-rust', legend: '중단' },
};

// 파드 수 색(11/16) — 다 준비 초록, 0개 빨강, 일부 주황. 빠진 파드는 빨간 빈 원
const podTone = (ready, desired) => (ready >= desired ? 'text-moss' : ready === 0 ? 'text-rust' : 'text-amber');
function PodDots({ ready, desired }) {
  const tone = podTone(ready, desired);
  return (
    <span role="img" aria-label={`파드 ${desired}개 중 ${ready}개 준비`} className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="text-xl leading-none tracking-wider"><span className={tone}>{'●'.repeat(ready)}</span><span className="text-rust">{'○'.repeat(Math.max(0, desired - ready))}</span></span>
      <span className={`text-lg tabular-nums font-bold ${tone}`}>{ready}/{desired}</span>
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

function ScenarioPanel({ services, chaosEnabled, onRun }) {
  const [confirming, setConfirming] = useState(false);
  const targets = scenarioTargets(services);
  const names = targets.map((s) => serviceShortName(s.name)).join(', ');
  const blocked = !chaosEnabled ? '내리기 기능이 꺼져 있어요.' : targets.length === 0 ? '대상 서비스가 없어요.' : targets.some((s) => s.state !== 'UP') ? NOT_READY_MESSAGE : null;
  return (
    <section aria-label="이중화 검증" className="border border-line bg-paper px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <h2 className="text-lg font-bold">이중화 검증</h2>
      <button className="btn btn-ink" disabled={!!blocked} onClick={() => setConfirming(true)}>구매 경로 장애 주입</button>
      <div className="text-base">
        <span className="text-mute">대상</span> <b>{names || '-'}</b>
        <span className="ml-3 text-sm text-mute">{blocked ?? '각 서비스 파드 1개 제거, 1개로 무중단 유지'}</span>
      </div>
      {confirming && (
        <Modal open onClose={() => setConfirming(false)} title="구매 경로 장애 주입" footer={<>
          <button className="btn btn-line" onClick={() => setConfirming(false)}>취소</button>
          <button className="btn btn-ink" onClick={() => { onRun(targets); setConfirming(false); }}>장애 주입</button>
        </>}>
          <p className="text-sm">{names} 파드를 1개씩 지웁니다. 각 서비스에 남은 파드가 받아서 쇼핑몰은 계속 동작해요.</p>
          <p className="mt-2 text-sm text-ink-2">하나라도 정상이 아니면 아무것도 지우지 않아요. 내린 뒤 1분 동안은 같은 서비스를 다시 내릴 수 없어요.</p>
        </Modal>
      )}
    </section>
  );
}

function Links() {
  const [guideOpen, setGuideOpen] = useState(false);
  return (
    <>
      <Link to="/admin/system/report" className="btn btn-ink btn-sm">장애 리포트</Link>
      <a href="/" target="_blank" rel="noopener noreferrer" className="btn btn-line btn-sm inline-flex items-center gap-1">쇼핑몰 새 창으로 열기 <ExternalLink size={14} /></a>
      <button className="btn btn-line btn-sm" onClick={() => setGuideOpen(true)}>Grafana 안내</button>
      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="Grafana 접속 방법">
        <p className="text-sm">자세한 그래프, 로그, 트레이스는 Grafana 에서 봅니다. 외부에 열려 있지 않아 터미널에서 먼저 연결해야 해요.</p>
        <pre className="mt-3 p-3 bg-cream text-[13px] overflow-x-auto"><code>kubectl -n monitoring port-forward svc/grafana 3000</code></pre>
        <p className="mt-3 text-sm">연결한 뒤 <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" className="underline">http://localhost:3000</a> 을 여세요.</p>
      </Modal>
    </>
  );
}

/* ─── 그래프 한 칸 (실제 LoadTestChart) — 가로축은 첫 점부터 채우고 30초 ~ 3분, alert 면 연한 빨간 배경 ─── */
function LineChart({ label, points = [], format, floor = 1, alert = false, alertText, compact = false }) {
  const W = 300;
  const H = 80;
  const last = points.at(-1);
  const first = points[0]?.t ?? 0;
  const end = last?.t ?? 0;
  const span = Math.min(180000, Math.max(30000, end - first));
  const begin = Math.max(first, end - span);
  const max = Math.max(floor, ...points.map((p) => p.v)) * 1.15;
  const xy = points.map((p) => [((p.t - begin) / span) * W, H - (p.v / max) * H]);
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <figure className={`border px-3 pt-2 pb-1 min-w-0 ${alert ? 'border-rust bg-rust-soft' : 'border-line bg-paper'}`} aria-label={label}>
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className={`text-sm ${alert ? 'text-rust font-bold' : 'text-mute'}`}>{label}{alert && alertText ? `, ${alertText}` : ''}</span>
        <b className={`${compact ? 'text-base' : 'text-xl'} tabular-nums ${alert ? 'text-rust' : ''}`}>{last ? format(last.v) : '-'}</b>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`w-full ${compact ? 'h-12' : 'h-20'} ${alert ? 'text-rust' : 'text-ink'}`} aria-hidden="true">
        {xy.length > 1 && (
          <>
            <polygon points={`${xy[0][0]},${H} ${line} ${xy.at(-1)[0]},${H}`} fill="currentColor" opacity="0.08" />
            <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
    </figure>
  );
}

/* ─── 부하테스트 (실제 SystemLoadTestPanel, admin.md 8절) — 목업은 k6 대신 화면 상태로 흉내 ─── */
const LOAD_SCENARIOS = [
  { value: 'BROWSE', label: '둘러보기 (조회)' },
  { value: 'REVIEWS', label: '리뷰 조회 폭주' },
  { value: 'CART', label: '장바구니 CRUD (계정 필요)' },
  { value: 'MIXED', label: '혼합 (둘러보기 70%, 장바구니 30%)' },
];
const LOAD_STATE_LABEL = { RUNNING: '실행 중', DONE: '완료', STOPPED: '중지됨', FAILED: '실패' };

// 진행 막대 — 경과, 남은 시간. 끝난 실행은 "마지막 부하테스트 완료/중지됨" (화면이 1초마다 다시 그려져 흐른다)
function ProgressBar({ load, running }) {
  const p = progress(load);
  return (
    <div className={`border px-4 py-3 ${running ? 'border-rust bg-rust-soft' : 'border-line bg-cream'}`} aria-label="진행 상태">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className={`font-bold ${running ? 'text-rust' : ''}`}>
          {running ? '부하테스트 진행 중' : `마지막 부하테스트 ${LOAD_STATE_LABEL[load.state]}`}: {SCENARIO_LABEL[load.scenario]}, 시작 {load.startVus}명
        </span>
        <span className="tabular-nums">경과 {p.elapsed} / {running ? `남은 시간 ${p.remaining}` : `최대 ${Math.round(load.durationSec / 60)}분`}</span>
      </div>
      <div className="mt-2 h-2 bg-paper" role="progressbar" aria-valuenow={p.percent} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-2 ${running ? 'bg-rust' : 'bg-ink-2'} transition-all`} style={{ width: `${p.percent}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value, tone = '' }) {
  return (
    <div className="border border-line px-3 py-2">
      <span className="text-sm text-mute">{label}</span>
      <p className={`text-xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function LiveTab({ k6, result }) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="지금까지 요청" value={`${formatCount(result?.requests)}건`} />
        <Stat label="실패" value={`${formatCount(result?.failed)}건`} tone={result?.failed > 0 ? 'text-rust' : ''} />
        <Stat label="응답 시간 p95" value={result?.p95Ms == null ? '-' : `${Math.round(result.p95Ms)}ms`} />
        <Stat label="최대 동시 사용자" value={`${formatCount(result?.peakVus)}명`} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <LineChart label="동시 사용자 (부하)" points={k6.vus} floor={10} format={(v) => `${Math.round(v)}명`} />
        <LineChart label="초당 요청 (부하)" points={k6.rps} floor={10} format={(v) => `${v.toFixed(0)}건`} />
      </div>
    </div>
  );
}

function ResultTab({ result, running }) {
  if (!result) return <p className="text-mute">아직 부하테스트 기록이 없어요.</p>;
  return (
    <div className="grid gap-4" aria-label="부하테스트 결과">
      {running && <p className="text-sm text-mute">실행 중이라 지금까지의 값이에요. 끝나면 최종 결과로 바뀝니다.</p>}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <Stat label="전체 요청" value={`${formatCount(result.requests)}건`} />
        <Stat label="실패" value={`${formatCount(result.failed)}건`} tone={result.failed > 0 ? 'text-rust' : 'text-moss'} />
        <Stat label="응답 시간 p95" value={result.p95Ms == null ? '-' : `${Math.round(result.p95Ms)}ms`} />
        <Stat label="평균 초당 요청" value={`${result.avgRps}건`} />
        <Stat label="최대 동시 사용자" value={`${formatCount(result.peakVus)}명`} />
        <Stat label="실행 시간" value={`${Math.floor(result.elapsedSec / 60)}분 ${result.elapsedSec % 60}초`} />
      </div>
      <div>
        <h3 className="font-bold mb-1">원인</h3>
        <ul className="list-disc pl-5 text-sm grid gap-0.5" aria-label="실패 원인">
          {failureCauses(result).map((line) => <li key={line} className={result.failed > 0 ? '' : 'text-moss'}>{line}</li>)}
        </ul>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-bold mb-1">상태 코드별</h3>
          <table className="w-full text-sm" aria-label="상태 코드별">
            <tbody>
              {Object.entries(result.byStatus).map(([status, n]) => (
                <tr key={status} className="border-b border-line">
                  <td className={`py-1 ${status.startsWith('2') ? '' : 'text-rust font-bold'}`}>{status}</td>
                  <td className="text-right tabular-nums">{formatCount(n)}건</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="font-bold mb-1">실패가 많은 API</h3>
          {result.topFailures.length === 0 ? <p className="text-sm text-mute">없음</p> : (
            <table className="w-full text-sm" aria-label="실패가 많은 API">
              <tbody>
                {result.topFailures.map((f) => (
                  <tr key={`${f.api}-${f.status}`} className="border-b border-line">
                    <td className="py-1">{f.api}</td><td className="text-rust">{f.status === '0' ? '연결 실패' : f.status}</td>
                    <td className="text-right tabular-nums">{formatCount(f.count)}건</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadTestPanel({ scenario, onScenarioChange, load, accounts, k6, result, vus, onVus, durationSec, onDuration, onStart, onScale, onStop, onAccounts }) {
  const running = load?.state === 'RUNNING';
  const preparing = accounts?.state === 'RUNNING';
  const [tab, setTab] = useState(load && !running ? 'result' : 'live');
  // 실행이 끝나면 결과 탭으로, 새로 시작하면 실시간 탭으로
  const runKey = `${load?.startedAt}-${running}`;
  useEffect(() => {
    if (load) setTab(running ? 'live' : 'result');
  }, [runKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section aria-label="부하테스트" className="panel">
      <div className="panel-head">
        <div className="flex items-center gap-3">
          <h2 className="panel-title">부하테스트</h2>
          {load && <span className={`px-2 py-0.5 text-sm font-bold ${running ? 'bg-rust-soft text-rust' : 'bg-sand text-ink-2'}`}>{LOAD_STATE_LABEL[load.state]}</span>}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-mute">{accounts ? `계정 준비 ${LOAD_STATE_LABEL[accounts.state]}` : '장바구니 시나리오는 계정 준비 먼저'}</span>
          <button className="btn btn-line" disabled={running || preparing} onClick={onAccounts}>계정 준비</button>
        </div>
      </div>
      <div className="px-5 py-4 grid gap-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <label className="flex items-center gap-2 text-base">
            <span className="text-mute">시나리오</span>
            <select className="field w-auto" value={scenario} disabled={running} onChange={(e) => onScenarioChange(e.target.value)}>
              {LOAD_SCENARIOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          {/* 시나리오가 쓰는 서비스 — 아래 서비스 카드에도 바깥 테두리로 강조 */}
          <span className="flex flex-wrap items-center gap-1 text-sm" aria-label="시나리오가 쓰는 서비스">
            <span className="text-mute">사용 서비스</span>
            {SCENARIO_SERVICES[running ? load.scenario : scenario].map((s) => <span key={s} className="px-1.5 py-0.5 border border-ink font-bold">{serviceShortName(s)}</span>)}
          </span>
          <label className="flex items-center gap-2 text-base">
            <span className="text-mute">최대 시간</span>
            <select className="field w-auto" value={durationSec} disabled={running} onChange={(e) => onDuration(Number(e.target.value))}>
              {[60, 180, 300, 600].map((d) => <option key={d} value={d}>{d / 60}분</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3 text-base grow min-w-[260px]">
            <span className="text-mute shrink-0">동시 사용자</span>
            <input type="range" min={0} max={300} step={10} value={vus} className="grow accent-rust" aria-label="동시 사용자 수"
              onChange={(e) => onVus(Number(e.target.value))} onPointerUp={onScale} onKeyUp={onScale} />
            <b className="w-16 text-right tabular-nums text-lg">{vus}명</b>
          </label>
          {/* 시작과 중지는 항상 함께, 중지는 실행 중에만 켜짐 */}
          <div className="flex gap-2">
            <button className="btn btn-ink" disabled={running || preparing} onClick={onStart}>부하 시작</button>
            <button className={`btn ${running ? 'btn-point' : 'btn-line'}`} disabled={!running} onClick={onStop}>부하 중지</button>
          </div>
        </div>
        {running && <p className="text-sm text-mute -mt-2">실행 중에는 슬라이더를 놓는 순간 사용자 수가 바뀌어요. 0명이면 요청을 멈추고 대기해요.</p>}

        {load && <ProgressBar load={load} running={running} />}

        <div>
          <div className="flex gap-1 border-b border-line mb-3" role="tablist" aria-label="부하테스트 보기">
            {[['live', '실시간'], ['result', '결과']].map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key}
                className={`px-4 py-2 text-sm -mb-px border-b-2 ${tab === key ? 'border-ink font-bold' : 'border-transparent text-mute'}`}
                onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>
          {tab === 'live' ? <LiveTab k6={k6} result={result} /> : <ResultTab result={result} running={running} />}
        </div>
      </div>
    </section>
  );
}

/* ─── 현재 접속자 (실제 SystemVisitors) — 총 접속자 그래프 + 구분 카드 5개(총, 비회원, 구매자, 판매자, 관리자) ─── */
const visitorCount = (v) => (v == null ? '-' : `${v}명`);
function Visitors({ history, data }) {
  return (
    <section aria-label="현재 접속자" className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3">
      <LineChart label="현재 접속자 (총)" points={history} floor={5} format={(v) => `${v}명`} />
      <ul className="grid grid-cols-5 gap-2" aria-label="접속자 구분">
        {visitorBreakdown(data).map((i) => (
          <li key={i.key} className={`border px-3 py-2 ${i.key === 'total' ? 'border-ink' : 'border-line'} bg-paper`}>
            <span className="text-sm text-mute">{i.label}</span>
            <p className="text-xl font-bold tabular-nums">{visitorCount(i.value)}</p>
          </li>
        ))}
      </ul>
      <p className="lg:col-span-2 -mt-1 text-xs text-mute">
        탭을 열면 바로 늘고 닫으면 바로 줄어요(브라우저가 강제 종료되면 최대 1분 뒤). 5초마다 갱신, 부하테스트 가상 사용자는 빼고 셉니다. 역할이 여러 개면 관리자, 판매자, 구매자 순으로 하나만 셉니다.
      </p>
    </section>
  );
}

/* ─── 실시간 모니터링 (실제 SystemMonitorPanel, admin.md 9절) — 부하테스트와 상관없이 실제 트래픽 ─── */
const MONITOR_TABS = [['overview', '총 현황'], ['services', '서비스별'], ['calls', '호출'], ['errors', '장애'], ['summary', '분석']];
const fmtRps = (v) => `${v.toFixed(1)}건`;
const fmtMs = (v) => `${v.toFixed(0)}ms`;
const fmtCount = (v) => `${Math.round(v)}건`;
const errorRowStyle = { boxShadow: 'inset 4px 0 0 var(--color-rust)' }; // 5xx 행 왼쪽 빨간 줄

function SeriesCharts({ series, compact = false }) {
  return (
    <>
      <LineChart label="초당 요청" points={series.rps} floor={compact ? 1 : 5} format={fmtRps} compact={compact} />
      <LineChart label="평균 응답" points={series.avgMs} floor={100} format={fmtMs} alert={isLatencySpike(series.avgMs)} alertText="급등" compact={compact} />
      <LineChart label="5xx 건수 (최근 1분)" points={series.errors} floor={5} format={fmtCount} alert={hasErrors(series.errors)} alertText="장애" compact={compact} />
    </>
  );
}

function MonitorPanel({ monitor }) {
  const [tab, setTab] = useState('overview');
  const [service, setService] = useState('');
  const [trace, setTrace] = useState(null);
  const overview = monitorOverview(monitor);
  const alerting = hasErrors(overview.total.errors);
  const pools = overview.services.filter((s) => s.db);
  const db = pools.reduce((a, s) => ({ active: a.active + s.db.active, pending: a.pending + s.db.pending, max: a.max + s.db.max }), { active: 0, pending: 0, max: 0 });
  const calls = tab === 'calls' ? monitorCalls(monitor, service) : [];
  const errors = tab === 'errors' ? monitorErrors(monitor, service) : [];
  const summary = tab === 'summary' ? monitorSummary(monitor) : null;
  const statusTotal = summary?.statuses.reduce((n, s) => n + s.count, 0) ?? 0;
  const callOf = (traceId) => monitor.calls.find((c) => c.traceId === traceId);
  return (
    <section aria-label="실시간 모니터링" className="panel">
      <div className="panel-head">
        <h2 className="panel-title">실시간 모니터링 {alerting && <span className="ml-2 px-2 py-0.5 text-sm bg-rust text-white">장애 감지</span>}</h2>
        <span className="text-sm text-mute">실제 트래픽 기준, 그래프 5초, 호출 / 장애 1초</span>
      </div>
      <div role="tablist" className="flex gap-5 px-5 border-b border-line overflow-x-auto">
        {MONITOR_TABS.map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} className={`tab ${tab === key ? 'tab-on' : ''}`} onClick={() => setTab(key)}>{label}</button>)}
      </div>
      <div className="px-5 py-4">
        {(tab === 'calls' || tab === 'errors') && (
          <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
            <span className="text-mute">서비스</span>
            <select className="field field-sm w-auto" value={service} onChange={(e) => setService(e.target.value)} aria-label="서비스 필터">
              <option value="">전체 서비스</option>
              {overview.services.map((s) => <option key={s.name} value={s.name}>{serviceShortName(s.name)}</option>)}
            </select>
            <span className="text-mute">상태 확인, 지표 수집(/actuator) 요청은 항상 빼고 보여요.</span>
          </div>
        )}
        {tab === 'overview' && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <SeriesCharts series={overview.total} />
            <div className={`border px-3 py-2 ${db.pending > 0 ? 'border-rust bg-rust-soft' : 'border-line bg-paper'}`} aria-label="DB 연결">
              <span className={`text-sm ${db.pending > 0 ? 'text-rust font-bold' : 'text-mute'}`}>DB 연결 (전체){db.pending > 0 ? ', 대기 발생' : ''}</span>
              <p className="text-xl font-bold tabular-nums mt-1">{db.active} / {db.max}</p>
              <p className="text-sm text-mute">사용 중 / 최대, 대기 {db.pending}</p>
            </div>
          </div>
        )}
        {tab === 'services' && (
          <ul className="grid md:grid-cols-2 xl:grid-cols-3 gap-3" aria-label="서비스별 현황">
            {overview.services.map((s) => {
              const bad = hasErrors(s.series.errors) || isLatencySpike(s.series.avgMs);
              return (
                <li key={s.name} className={`border-2 p-2 ${bad ? 'border-rust' : 'border-line'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <b className={`text-lg ${bad ? 'text-rust' : ''}`}>{serviceShortName(s.name)}</b>
                    <span className="text-sm text-mute">DB {s.db.active}/{s.db.max}{s.db.pending ? `, 대기 ${s.db.pending}` : ''}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1"><SeriesCharts series={s.series} compact /></div>
                </li>
              );
            })}
          </ul>
        )}
        {tab === 'calls' && (calls.length === 0 ? <p className="py-6 text-center text-sm text-mute">최근 1분 동안 {service ? `${serviceShortName(service)}로 ` : ''}들어온 요청이 없어요.</p> : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="tbl" aria-label="최근 호출">
              <thead><tr><th>시각</th><th>API</th><th>서비스</th><th>상태</th><th className="text-right">소요</th></tr></thead>
              <tbody>
                {calls.map((c) => {
                  const bad = isServerError(c.status);
                  return (
                    <tr key={c.traceId} onClick={() => setTrace(traceOf(c))} className={`cursor-pointer ${bad ? 'text-rust font-bold' : ''}`} style={bad ? errorRowStyle : undefined}>
                      <td className="tabular-nums whitespace-nowrap">{formatClock(c.timestampMs)}</td>
                      <td className="break-all">{c.method} {c.path}</td>
                      <td>{serviceShortName(c.service)}</td>
                      <td className="tabular-nums">{c.status}</td>
                      <td className="text-right tabular-nums">{c.durationMs}ms</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
        {tab === 'errors' && (errors.length === 0 ? <p className="py-6 text-center text-sm text-mute">최근 10분 동안 {service ? `${serviceShortName(service)} ` : ''}장애가 없어요.</p> : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="tbl" aria-label="최근 장애">
              <thead><tr><th>시각</th><th>구분</th><th>서비스</th><th>내용</th><th>상태</th></tr></thead>
              <tbody>
                {errors.map((e) => {
                  const bad = e.kind === 'RESPONSE' || e.level === 'ERROR';
                  const call = e.traceId && callOf(e.traceId);
                  return (
                    <tr key={`${e.kind}-${e.timestampMs}-${e.traceId ?? e.title}`} onClick={() => call && setTrace(traceOf(call))}
                      className={`${call ? 'cursor-pointer' : ''} ${bad ? 'text-rust font-bold' : ''}`} style={bad ? errorRowStyle : undefined}>
                      <td className="tabular-nums whitespace-nowrap">{formatClock(e.timestampMs)}</td>
                      <td className="whitespace-nowrap">{e.kind === 'RESPONSE' ? '5xx 응답' : `로그 ${e.level}`}</td>
                      <td>{serviceShortName(e.service)}</td>
                      <td className="break-all">{e.title}</td>
                      <td className="tabular-nums">{e.status ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
        {tab === 'summary' && (
          <div className="grid xl:grid-cols-3 gap-4">
            <section aria-label="에러가 많은 API">
              <h3 className="font-bold mb-2">에러가 많은 API (5분)</h3>
              {summary.topErrors.length ? (
                <ol className="grid gap-1 text-sm">
                  {summary.topErrors.map((e) => <li key={`${e.service}-${e.api}`} className="flex justify-between gap-2 text-rust font-bold"><span className="break-all">{serviceShortName(e.service)}, {e.api}, {e.status}</span><span className="tabular-nums">{e.count}건</span></li>)}
                </ol>
              ) : <p className="text-sm text-mute">5xx 없음</p>}
            </section>
            <section aria-label="느린 API">
              <h3 className="font-bold mb-2">느린 API (평균, 5분)</h3>
              <ol className="grid gap-1 text-sm">
                {summary.slowest.map((s) => <li key={`${s.service}-${s.api}`} className="flex justify-between gap-2"><span className="break-all">{serviceShortName(s.service)}, {s.api}</span><span className="tabular-nums">{s.avgMs}ms</span></li>)}
              </ol>
            </section>
            <section aria-label="상태 코드 분포">
              <h3 className="font-bold mb-2">상태 코드 (5분)</h3>
              <ul className="grid gap-1 text-sm">
                {summary.statuses.map((s) => {
                  const five = s.status.startsWith('5');
                  return (
                    <li key={s.status} className={`grid grid-cols-[44px_1fr_64px] gap-2 items-center ${five ? 'text-rust font-bold' : ''}`}>
                      <span className="tabular-nums">{s.status}</span>
                      <span className="h-2 bg-sand"><span className={`block h-2 ${five ? 'bg-rust' : 'bg-ink'}`} style={{ width: `${(s.count / statusTotal) * 100}%` }} /></span>
                      <span className="text-right tabular-nums">{s.count}건</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )}
      </div>
      {trace && <TraceModal trace={trace} onClose={() => setTrace(null)} />}
    </section>
  );
}

/* ─── 트레이스 한 건 (실제 SystemTraceModal) — 요청이 거친 서비스와 구간별 시간, 장애 구간은 빨간 막대 ─── */
function TraceModal({ trace, onClose }) {
  const total = Math.max(trace.durationMs, 1);
  return (
    <Modal open onClose={onClose} title="트레이스" width={760}>
      <p className="text-sm text-mute break-all">traceId {trace.traceId}, 전체 {trace.durationMs}ms</p>
      <ol className="mt-3 grid gap-1" aria-label="구간">
        {trace.spans.map((s) => (
          <li key={s.id} className="grid grid-cols-[96px_1fr] gap-2 items-center text-sm">
            <span className={`font-bold truncate ${s.error ? 'text-rust' : ''}`}>{serviceShortName(s.service)}</span>
            <div className="min-w-0">
              <div className="flex justify-between gap-2">
                <span className={`truncate ${s.error ? 'text-rust' : 'text-ink-2'}`}>{s.name}{s.status ? `, ${s.status}` : ''}</span>
                <span className="tabular-nums shrink-0">{s.durationMs}ms</span>
              </div>
              <div className="relative h-2 bg-sand">
                <span className={`absolute inset-y-0 ${s.error ? 'bg-rust' : 'bg-ink'}`} style={{ left: `${(s.startMs / total) * 100}%`, width: `${Math.max(0.5, (s.durationMs / total) * 100)}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Modal>
  );
}

export function AdminSystem() {
  const { toast } = useApp();
  const [sp] = useSearchParams();
  const chaosEnabled = sp.get('chaos') !== 'off';
  const connLost = sp.get('conn') === 'lost';
  const recoveringStart = sp.get('scenario') === 'recovering';
  const loadStart = sp.get('load') === 'running';
  // ?scenario=recovering: 방금 장애 주입 → 대상 5개가 1/2 복구 중, ?load=running: product 전부 내림(0/2)
  const [services, setServices] = useState(() => (recoveringStart
    ? SERVICES.map((s) => (s.killable && s.desired >= 2 ? { ...s, ready: s.desired - 1, state: 'RECOVERING' } : s))
    : loadStart ? SERVICES.map((s) => (s.name === 'product-service' ? { ...s, ready: 0, state: 'DOWN' } : s)) : SERVICES));
  // 최신순 (서버 순서 그대로) — 지난 이중화 검증 5건 예시
  const [events, setEvents] = useState(() => (recoveringStart ? [...scenarioEvents(0, false), ...scenarioEvents(20, true)]
    : loadStart ? [{ eventId: 1, service: 'product-service', scope: 'ALL', reason: null, killedAt: new Date(Date.now() - 20000), recoveredAt: null, recoverySeconds: null }, ...scenarioEvents(20, true)]
      : scenarioEvents(20, true)));
  const [killTarget, setKillTarget] = useState(null);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // 부하테스트 — 목업은 k6 Job 대신 화면 상태. ?load=running = 혼합 120명이 2분 15초째 실행 중, ?load=done = 25분 전에 끝난 실행,
  // ?load=stopped = 8분 전에 중지한 실행. load.vus = 지금 사용자 수(슬라이더), startVus = 시작할 때 사용자 수, finishedAt = 실제 끝난 시각(admin.md 8절)
  const loadDone = sp.get('load') === 'done';
  const loadStopped = sp.get('load') === 'stopped';
  const [scenario, setScenario] = useState(loadStart ? 'MIXED' : 'BROWSE');
  const [load, setLoad] = useState(() => {
    if (loadStart) return { scenario: 'MIXED', state: 'RUNNING', vus: 120, startVus: 120, durationSec: 300, startedAt: Date.now() - 135000, finishedAt: null };
    if (loadDone) {
      const startedAt = Date.now() - 30 * 60000;
      return { scenario: 'MIXED', state: 'DONE', vus: 90, startVus: 90, durationSec: 300, startedAt, finishedAt: startedAt + 300000 };
    }
    if (loadStopped) {
      const finishedAt = Date.now() - 8 * 60000;
      return { scenario: 'BROWSE', state: 'STOPPED', vus: 60, startVus: 60, durationSec: 300, startedAt: finishedAt - 108000, finishedAt };
    }
    return null;
  });
  const [accounts, setAccounts] = useState(() => (loadStart || loadDone ? { state: 'DONE' } : null));
  const [vus, setVus] = useState(loadStart ? 120 : 50);
  const [durationSec, setDurationSec] = useState(300);
  const running = load?.state === 'RUNNING';

  // 실시간 모니터링 시뮬레이션 — 처음에 3분치를 채우고 1초마다 진행
  const servicesRef = useRef(services);
  servicesRef.current = services;
  const loadRef = useRef(load);
  loadRef.current = load;
  const sim = useRef(null);
  if (!sim.current) {
    const now = Date.now();
    const monitor = createMonitor();
    const k6 = { vus: [], rps: [] };
    const acc = loadStart ? createLoadAcc() : null; // 부하테스트 결과 누적 (?load=done, ?load=stopped 는 고정 결과)
    const visitors = [];
    let v = null;
    for (let i = 180; i >= 1; i -= 1) {
      const t = now - i * 1000;
      const loading = loadStart && t >= now - 135000;
      const down = (name) => loadStart && name === 'product-service' && t >= now - 20000;
      const stateOf = (name) => (down(name) ? 'DOWN' : 'UP');
      tickMonitor(monitor, t, {
        load: loading ? { scenario: 'MIXED', vus: 120 } : null,
        stateOf,
        readyOf: (name) => (down(name) ? 0 : SERVICES.find((x) => x.name === name).desired),
      });
      if (loading) {
        k6.vus.push({ t, v: 120 });
        k6.rps.push({ t, v: 120 * 1.6 * (0.92 + Math.random() * 0.16) });
        tickLoadAcc(acc, { scenario: 'MIXED', vus: 120 }, stateOf);
      }
      // 끝난 실행의 그래프는 끝난 시각에서 멈춘다(마지막 3분만)
      if (loadDone) {
        const tt = t - 25 * 60000;
        k6.vus.push({ t: tt, v: 90 });
        k6.rps.push({ t: tt, v: 90 * 1.6 * (0.92 + Math.random() * 0.16) });
      }
      // 중지된 실행은 1분 48초치만 (끝난 시각에서 멈춤)
      if (loadStopped && i <= 108) {
        const tt = t - 8 * 60000;
        k6.vus.push({ t: tt, v: 60 });
        k6.rps.push({ t: tt, v: 60 * 1.6 * (0.92 + Math.random() * 0.16) });
      }
      // 현재 접속자 — 실제는 화면을 연 뒤부터 쌓이지만 목업은 2분치를 미리 채운다
      if (i <= 120 && Math.floor(t / 1000) % 5 === 0) {
        v = nextVisitors(v);
        visitors.push({ t, v: v.visitors });
      }
    }
    sim.current = { monitor, k6, acc, visitors, lastVisitors: v };
  }
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      const l = loadRef.current;
      const live = l?.state === 'RUNNING' ? l : null;
      const find = (name) => servicesRef.current.find((x) => x.name === name);
      tickMonitor(sim.current.monitor, t, { load: live, stateOf: (name) => find(name).state, readyOf: (name) => find(name).ready });
      if (live) {
        const { k6 } = sim.current;
        k6.vus.push({ t, v: live.vus });
        k6.rps.push({ t, v: live.vus * 1.6 * (0.92 + Math.random() * 0.16) });
        if (k6.vus.length > 300) { k6.vus.shift(); k6.rps.shift(); }
        tickLoadAcc(sim.current.acc, live, (name) => find(name).state);
        if (t - live.startedAt >= live.durationSec * 1000) setLoad({ ...live, state: 'DONE', finishedAt: t });
      }
      // 현재 접속자 — 5초마다 작게 오르내림
      if (Math.floor(t / 1000) % 5 === 0) {
        const v = nextVisitors(sim.current.lastVisitors);
        sim.current.lastVisitors = v;
        sim.current.visitors = [...sim.current.visitors, { t, v: v.visitors }].slice(-120);
      }
      setTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  // ?load=running — 20초 전에 내린 product 가 하나씩 복구
  useEffect(() => {
    if (!loadStart) return;
    timers.current.push(setTimeout(() => patch('product-service', 1), 4000));
    timers.current.push(setTimeout(() => {
      patch('product-service', 2);
      setEvents((list) => list.map((e) => (e.eventId === 1 ? { ...e, recoveredAt: new Date(), recoverySeconds: Math.round((Date.now() - e.killedAt) / 1000) } : e)));
    }, 10000));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startLoad = () => {
    const v = Math.max(1, vus);
    sim.current.k6 = { vus: [], rps: [] };
    sim.current.acc = createLoadAcc();
    setLoad({ scenario, state: 'RUNNING', vus: v, startVus: v, durationSec, startedAt: Date.now(), finishedAt: null });
    toast(`부하테스트를 시작했어요: 동시 사용자 ${v}명`);
  };
  // 슬라이더를 놓을 때만 사용자 수 반영 (실제 PATCH /loadtest)
  const scaleLoad = () => running && setLoad((l) => ({ ...l, vus }));
  // 중지 = 실제 DELETE /loadtest, 상태는 STOPPED(중지됨)
  const stopLoad = () => { setLoad((l) => ({ ...l, state: 'STOPPED', finishedAt: Date.now() })); toast('부하테스트를 중지했어요.'); };
  const loadTestResult = sim.current.acc ? loadResult(sim.current.acc) : loadDone ? DONE_RESULT : loadStopped ? STOPPED_RESULT : null;
  const prepareAccounts = () => {
    setAccounts({ state: 'RUNNING' });
    toast('부하용 계정 300개를 준비하고 있어요(약 1분).');
    timers.current.push(setTimeout(() => setAccounts({ state: 'DONE' }), 8000)); // 목업은 8초
  };

  const patch = (name, ready) => setServices((list) => list.map((s) => (s.name === name
    ? { ...s, ready, state: ready >= s.desired ? 'UP' : ready === 0 ? 'DOWN' : 'RECOVERING' } : s)));

  // 내리기 1건 = 타임라인 1행. 목업 복구 흉내 — 새 파드가 하나씩 Ready
  const killPods = (s, scope, count, reason, eventId) => {
    const killedAt = new Date();
    patch(s.name, s.ready - count);
    setEvents((list) => [{ eventId, service: s.name, scope, reason, killedAt, recoveredAt: null, recoverySeconds: null }, ...list].slice(0, 20));
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

  const kill = (scope) => {
    const s = killTarget;
    const count = scope === 'ONE' ? 1 : s.ready;
    killPods(s, scope, count, null, Date.now());
    toast(`${serviceShortName(s.name)} 파드 ${count}개를 내렸어요.`);
    setKillTarget(null);
  };

  // 시나리오 — 대상마다 파드 1개(= 서비스별 ONE), 서비스마다 1행
  const runScenario = (targets) => {
    const base = Date.now();
    targets.forEach((s, i) => killPods(s, 'ONE', 1, SCENARIO_REASON, base + i));
    toast(`${targets.length}개 서비스에 장애를 주입했어요 — 파드 1개씩 제거`);
  };

  const killable = services.filter((s) => s.killable);
  const fixed = services.filter((s) => !s.killable);
  const features = featuresOf(services);
  const highlighted = SCENARIO_SERVICES[running ? load.scenario : scenario];
  const now = Date.now();
  const errorsOf = (name) => errorsPerMinute(sim.current.monitor, name, now);

  return (
    <div>
      <PageHead title="시스템 상태" desc="장애 발생 시 기능별 영향 범위와 복구 소요 시간을 확인합니다." right={<Links />} />
      {/* 부하테스트 진행 중 알림 띠 — 누르면 부하테스트 패널로 */}
      {running && (
        <a href="#loadtest" role="status" className="sticky top-0 z-10 mb-3 flex items-center gap-2 px-4 py-2 bg-rust text-paper font-bold">
          <span className="inline-block w-2 h-2 rounded-full bg-paper animate-pulse" aria-hidden="true" />
          부하테스트 진행 중: {SCENARIO_LABEL[load.scenario]}. 그래프와 숫자에 가상 사용자 요청이 섞여 있어요.
        </a>
      )}
      {connLost && <p role="alert" className="mb-3 px-4 py-3 bg-rust-soft text-lg font-bold text-rust">연결 끊김 — 마지막으로 받은 상태를 보여 주고 있어요.</p>}
      <div className="grid gap-4">
        <Visitors history={sim.current.visitors} data={sim.current.lastVisitors} />
        <div id="loadtest">
          <LoadTestPanel scenario={scenario} onScenarioChange={setScenario} load={load} accounts={accounts} k6={sim.current.k6} result={loadTestResult}
            vus={vus} onVus={setVus} durationSec={durationSec} onDuration={setDurationSec}
            onStart={startLoad} onScale={scaleLoad} onStop={stopLoad} onAccounts={prepareAccounts} />
        </div>
        <MonitorPanel monitor={sim.current.monitor} />
        <ScenarioPanel services={services} chaosEnabled={chaosEnabled} onRun={runScenario} />
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
                // 부하테스트 시나리오가 쓰는 서비스 = 카드 바깥 테두리
                <li key={s.name} className={`border-2 p-3 ${st.card} ${highlighted.includes(s.name) ? 'outline outline-2 outline-offset-2 outline-ink' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl font-bold">{name}</span>
                    <span className={`px-2 py-0.5 text-lg font-bold whitespace-nowrap ${st.pill}`}>{st.label}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 mt-2">
                    <PodDots ready={s.ready} desired={s.desired} />
                    <span className={`text-lg tabular-nums whitespace-nowrap ${errorsOf(s.name) > 0 ? 'text-rust font-bold' : ''}`}>5xx {formatErrorCount(errorsOf(s.name))}</span>
                  </div>
                  {/* 복구 중에는 내리기를 막는다 */}
                  <button className="btn btn-line btn-sm w-full mt-2" disabled={!chaosEnabled || s.state !== 'UP'} onClick={() => setKillTarget(s)} aria-label={`${name} 내리기`}>내리기</button>
                </li>
              );
            })}
          </ul>
          {/* 입구, 관리자, 로그인, 데이터 — 시연에서 내리지 않으니 한 줄로 줄인다 */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-3">
            <span className="text-sm text-mute whitespace-nowrap">내릴 수 없음</span>
            {fixed.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-2">
                <span className="text-lg font-bold">{serviceShortName(s.name)}</span>
                <PodDots ready={s.ready} desired={s.desired} />
                <span className={`px-2 text-base font-bold whitespace-nowrap ${SERVICE_STATE[s.state].pill}`}>{SERVICE_STATE[s.state].label}</span>
                <span className={`text-base tabular-nums whitespace-nowrap ${errorsOf(s.name) > 0 ? 'text-rust font-bold' : ''}`}>5xx {formatErrorCount(errorsOf(s.name))}</span>
              </span>
            ))}
          </div>
        </section>
        <div className="grid xl:grid-cols-2 gap-4 items-start">
          <section aria-label="사용자 기능" className="border border-line bg-paper p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1">
              <h2 className="text-lg font-bold">사용자 기능</h2>
              {/* 상태 색 설명 */}
              <ul aria-label="상태 설명" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
                {Object.values(FEATURE_STATE).map((s) => <li key={s.label}><span aria-hidden="true">{s.icon}</span> <b className={s.className}>{s.legend}</b></li>)}
              </ul>
            </div>
            <ul className="grid sm:grid-cols-2 gap-x-6">
              {features.map((f) => {
                const st = FEATURE_STATE[f.state];
                return (
                  <li key={f.key} className="flex flex-wrap items-center gap-x-2 py-2 border-t border-line">
                    <span aria-hidden="true" className="text-base leading-none">{st.icon}</span>
                    <span className="text-xl font-bold">{f.label}</span>
                    <span className={`ml-auto text-lg font-bold ${st.className}`}>
                      {st.label}
                      {f.causes.length > 0 && <span className="font-normal">, {f.causes.map(serviceShortName).join(', ')}</span>}
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
                    {e.reason?.startsWith('시나리오') && <span className="px-1.5 text-sm font-bold bg-sand text-ink-2">이중화 검증</span>}
                    {e.recoveredAt
                      ? <span className="text-moss font-bold">→ {clock(e.recoveredAt)} 복구, {e.recoverySeconds}초</span>
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
