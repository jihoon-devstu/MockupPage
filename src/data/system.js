/* 시스템 상태 · 장애 분석 리포트 목업 데이터 (실제 frontend #116 ~ #122, backend docs/api/admin.md 8 ~ 10절)
   - 실시간 모니터링: 실제는 Prometheus · Zipkin · Loki 를 폴링. 목업은 1초마다 가짜 트래픽을 만들어 같은 모양으로 쌓는다
     (서비스를 전부 내리면 그 서비스로 가는 요청이 게이트웨이 502 로 바뀌고, 5xx 건수(최근 1분)가 오른다)
   - 장애 리포트: 실제는 서버가 기간을 받아 계산. 목업은 11/16 저녁 ~ 11/17 오전의 고정 사건 5건으로 같은 응답을 만든다
   - 값은 전부 시연용 예시(실측 아님). IP 는 문서용 대역(203.0.113.x · 198.51.100.x) */

export const serviceShortName = (name) => name.replace(/-service$/, '');

// 부하테스트 시나리오가 실제로 부르는 서비스 (실제 monitor.js SCENARIO_SERVICES)
export const SCENARIO_SERVICES = {
  BROWSE: ['product-service', 'review-service', 'store-service'],
  REVIEWS: ['review-service'],
  CART: ['user-service', 'order-service', 'product-service', 'store-service'],
  MIXED: ['product-service', 'review-service', 'store-service', 'user-service', 'order-service'],
};

// 이상 판단 — 5xx 가 최근 3개 점 중 하나라도 0 보다 크면 / 응답 급등 = 마지막 값 1초 초과 또는 중앙값의 3배 + 200ms 초과
export const hasErrors = (points = []) => points.slice(-3).some((p) => p.v > 0);
export function isLatencySpike(points = []) {
  if (points.length === 0) return false;
  const last = points.at(-1).v;
  if (last > 1000) return true;
  const before = points.slice(0, -1).map((p) => p.v).filter((v) => v > 0).sort((a, b) => a - b);
  if (before.length < 3) return false;
  return last > before[Math.floor(before.length / 2)] * 3 + 200;
}
export const formatClock = (ms) => {
  const d = new Date(ms);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
};
export const isServerError = (status) => status != null && status >= 500;

/* ─────────── 실시간 모니터링 시뮬레이션 ─────────── */

// 게이트웨이 라우트가 있는 서비스 9개 (keycloak · mysql · redis · gateway 제외). base = 평소 초당 요청, ms = 평소 평균 응답
// apis = [메서드, API(묶음), 경로 예시, 비율, 응답 배수]
const MONITOR_SERVICES = [
  ['order-service', 0.3, 48, [['GET', '/api/cart', '/api/cart', 0.35, 0.9], ['POST', '/api/cart/items', '/api/cart/items', 0.25, 1.4], ['PATCH', '/api/cart/items/{id}', '/api/cart/items/{n}', 0.2, 1.1], ['DELETE', '/api/cart/items/{id}', '/api/cart/items/{n}', 0.2, 1]]],
  ['product-service', 1.2, 42, [['GET', '/api/products', '/api/products?category=fashion&page=0', 0.45, 1.25], ['GET', '/api/products/{id}', '/api/products/{n}', 0.45, 0.8], ['GET', '/api/categories', '/api/categories', 0.1, 0.4]]],
  ['payment-service', 0.05, 120, [['POST', '/api/payments/complete', '/api/payments/complete', 1, 1]]],
  ['store-service', 0.4, 30, [['GET', '/api/stores/{id}', '/api/stores/{n}', 0.7, 0.8], ['GET', '/api/stores', '/api/stores?page=0', 0.3, 1.4]]],
  ['user-service', 0.3, 55, [['GET', '/api/users/me', '/api/users/me', 0.6, 0.6], ['POST', '/api/auth/login', '/api/auth/login', 0.4, 3.4]]],
  ['review-service', 0.5, 38, [['GET', '/api/reviews', '/api/reviews?productId={n}&page=0', 0.6, 1.1], ['GET', '/api/reviews/summary', '/api/reviews/summary?productId={n}', 0.4, 0.7]]],
  ['settlement-service', 0.02, 85, [['GET', '/api/seller/settlements', '/api/seller/settlements?page=0', 1, 1]]],
  ['chat-service', 0.1, 25, [['GET', '/api/chats/rooms', '/api/chats/rooms', 1, 1]]],
  ['admin-service', 0.4, 95, [['GET', '/api/admin/dashboard', '/api/admin/dashboard', 0.6, 1.3], ['GET', '/api/admin/users', '/api/admin/users?page=0', 0.4, 0.6]]],
].map(([name, base, ms, apis]) => ({ name, base, ms, apis }));
export const MONITOR_SERVICE_NAMES = MONITOR_SERVICES.map((s) => s.name);

const POINTS = 36;          // 그래프 3분 · 5초 간격
const CALL_POOL = 400;      // 호출 표본 (필터해도 40건이 남게)
const hex = (n) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
const jitter = (v, r = 0.15) => v * (1 + (Math.random() * 2 - 1) * r);
const pick = (items, weightOf) => {
  let r = Math.random() * items.reduce((n, x) => n + weightOf(x), 0);
  return items.find((x) => (r -= weightOf(x)) <= 0) ?? items.at(-1);
};

export function createMonitor() {
  const series = () => ({ rps: [], avgMs: [], errors: [] });
  return {
    total: series(),
    byService: Object.fromEntries(MONITOR_SERVICE_NAMES.map((n) => [n, series()])),
    db: {},
    seconds: [],      // 초마다 서비스별 {req, err, msSum} — 5분 보관(분석 탭 · 5xx 1분 합)
    apiSeconds: [],   // 초마다 API 별 {service, api, status, count, msSum}
    calls: [],        // 호출 표본 최신순
    logs: [
      // 평소에도 보이는 WARN · ERROR 로그 예시, 최신순 (5xx 아님 → 장애 감지 아님)
      { kind: 'LOG', timestampMs: Date.now() - 4 * 60000 - 870, service: 'payment-service', level: 'ERROR', title: '포트원 결제 조회 시간 초과(5000ms), 재시도 1회 후 성공', status: null, traceId: hex(32) },
      { kind: 'LOG', timestampMs: Date.now() - 7 * 60000 - 4210, service: 'user-service', level: 'WARN', title: 'Keycloak 토큰 발급 응답 지연 1240ms', status: null, traceId: hex(32) },
    ],
  };
}

/**
 * 1초 진행. env = { load: {scenario, vus} | null, stateOf(name) → 'UP' | 'RECOVERING' | 'DOWN', readyOf(name) → 준비된 파드 수 }
 * 5초마다 그래프 점을 하나 붙인다
 */
export function tickMonitor(m, t, env) {
  const loaded = env.load && env.load.vus > 0 ? SCENARIO_SERVICES[env.load.scenario] : [];
  const loadRps = env.load ? env.load.vus * 1.6 : 0;
  const sec = { t, svc: {} };
  const apiSec = { t, rows: [] };
  const sampleFrom = [];
  MONITOR_SERVICES.forEach((s) => {
    const state = env.stateOf(s.name);
    const share = loaded.includes(s.name) ? loadRps / loaded.length : 0;
    const req = Math.max(0, jitter(s.base + share, 0.2));
    const down = state === 'DOWN';
    const ms = down ? 3 : jitter(s.ms * (1 + share / 150) * (state === 'RECOVERING' && share > 0 ? 1.8 : 1));
    sec.svc[s.name] = { req, err: down ? req : 0, msSum: req * ms };
    s.apis.forEach(([method, api, , ratio, mult]) => {
      const count = req * ratio;
      apiSec.rows.push({ service: s.name, api: `${method} ${api}`, status: down ? '502' : '200', count, msSum: count * (down ? 3 : ms * mult) });
    });
    // 4xx 조금 (업무 오류 — 장애 아님)
    if (!down && req > 0) apiSec.rows.push({ service: s.name, api: '', status: s.name === 'user-service' ? '401' : '404', count: req * 0.03, msSum: 0 });
    sampleFrom.push({ s, req, ms, down });
    // DB 연결 풀 — 파드당 최대 10
    const max = 10 * env.readyOf(s.name);
    const need = Math.ceil((req * ms) / 1000 * 1.3);
    m.db[s.name] = { active: Math.min(max, need), pending: max > 0 ? Math.max(0, need - max) : 0, max };
  });
  m.seconds.push(sec);
  m.apiSeconds.push(apiSec);
  while (m.seconds.length && m.seconds[0].t < t - 300000) m.seconds.shift();
  while (m.apiSeconds.length && m.apiSeconds[0].t < t - 300000) m.apiSeconds.shift();

  // 호출 표본 — 초당 최대 6건, 요청 많은 서비스가 더 자주
  const total = sampleFrom.reduce((n, x) => n + x.req, 0);
  const k = Math.min(6, Math.max(total < 0.5 ? 0 : 1, Math.round(Math.sqrt(total) * 1.1)));
  for (let i = 0; i < k; i += 1) {
    const x = pick(sampleFrom, (y) => y.req);
    const [method, api, path, , mult] = pick(x.s.apis, (a) => a[3]);
    const status = x.down ? 502 : Math.random() < 0.03 ? (x.s.name === 'user-service' ? 401 : 404) : 200;
    const call = {
      traceId: hex(32), timestampMs: t + Math.floor((i / k) * 1000), method, api: `${method} ${api}`,
      path: path.replace('{n}', String(100 + Math.floor(Math.random() * 60))), service: x.s.name, status,
      durationMs: Math.max(1, Math.round(x.down ? jitter(3, 0.5) : jitter(x.ms * mult, 0.35))),
    };
    m.calls.unshift(call);
    if (x.down) {
      m.logs.unshift({ kind: 'RESPONSE', timestampMs: call.timestampMs, service: x.s.name, level: null, title: `${method} ${call.path}`, status, traceId: call.traceId });
    }
  }
  if (m.calls.length > CALL_POOL) m.calls.length = CALL_POOL;
  // 내려간 서비스 — 게이트웨이가 연결 실패 로그를 남긴다(3초마다)
  sampleFrom.filter((x) => x.down && Math.floor(t / 1000) % 3 === 0).forEach((x) => {
    m.logs.unshift({ kind: 'LOG', timestampMs: t + 500, service: 'gateway-service', level: 'ERROR', title: `Connection refused: ${x.s.name}:8080 (라우트 ${x.s.name})`, status: null, traceId: null });
  });
  m.logs = m.logs.filter((l) => l.timestampMs >= t - 600000).slice(0, 400);

  // 5초마다 그래프 점 — 초당 요청 · 평균 응답은 직전 15초, 5xx 는 최근 1분 건수
  if (Math.floor(t / 1000) % 5 === 0) {
    const recent = m.seconds.filter((x) => x.t > t - 15000);
    const minute = m.seconds.filter((x) => x.t > t - 60000);
    const agg = (rows, name) => rows.reduce((a, x) => {
      const v = name ? x.svc[name] : Object.values(x.svc).reduce((b, y) => ({ req: b.req + y.req, err: b.err + y.err, msSum: b.msSum + y.msSum }), { req: 0, err: 0, msSum: 0 });
      return { req: a.req + v.req, err: a.err + v.err, msSum: a.msSum + v.msSum };
    }, { req: 0, err: 0, msSum: 0 });
    const push = (target, name) => {
      const r = agg(recent, name);
      const e = agg(minute, name);
      const okReq = r.req - r.err;
      target.rps.push({ t, v: r.req / Math.max(1, recent.length) });
      target.avgMs.push({ t, v: okReq > 0 ? (r.msSum - r.err * 3) / okReq : 0 });
      target.errors.push({ t, v: Math.round(e.err) });
      Object.values(target).forEach((pts) => { if (pts.length > POINTS) pts.shift(); });
    };
    push(m.total);
    MONITOR_SERVICE_NAMES.forEach((n) => push(m.byService[n], n));
  }
}

/** 서비스 카드의 5xx 건수 — 최근 1분 (실제 metrics errorsPerMinute). 라우트 없는 서비스는 null → '-' */
export function errorsPerMinute(m, name, t) {
  if (!MONITOR_SERVICE_NAMES.includes(name)) return null;
  return Math.round(m.seconds.filter((x) => x.t > t - 60000).reduce((n, x) => n + x.svc[name].err, 0));
}

export const monitorOverview = (m) => ({
  total: m.total,
  services: MONITOR_SERVICE_NAMES.map((name) => ({ name, series: m.byService[name], db: m.db[name] ?? null })),
});

export const monitorCalls = (m, service) => m.calls.filter((c) => !service || c.service === service).slice(0, 40);
export const monitorErrors = (m, service) => m.logs.filter((e) => !service || e.service === service).slice(0, 40);

/** 분석 탭 — 최근 5분 */
export function monitorSummary(m) {
  const byApi = {};
  const statuses = {};
  m.apiSeconds.forEach((sec) => sec.rows.forEach((r) => {
    statuses[r.status] = (statuses[r.status] ?? 0) + r.count;
    if (!r.api) return;
    const key = `${r.service}|${r.api}|${r.status}`;
    const a = byApi[key] ?? (byApi[key] = { service: r.service, api: r.api, status: r.status, count: 0, msSum: 0 });
    a.count += r.count;
    a.msSum += r.msSum;
  }));
  const rows = Object.values(byApi);
  const topErrors = rows.filter((r) => r.status.startsWith('5')).sort((a, b) => b.count - a.count).slice(0, 5)
    .map((r) => ({ service: r.service, api: r.api, status: r.status, count: Math.round(r.count) })).filter((r) => r.count > 0);
  const ok = rows.filter((r) => r.status === '200' && r.count > 0);
  const slowest = ok.map((r) => ({ service: r.service, api: r.api, avgMs: Math.round(r.msSum / r.count) })).sort((a, b) => b.avgMs - a.avgMs).slice(0, 5);
  return {
    topErrors, slowest,
    statuses: Object.entries(statuses).map(([status, count]) => ({ status, count: Math.round(count) })).filter((s) => s.count > 0).sort((a, b) => b.count - a.count),
  };
}

/** 트레이스 한 건 — 게이트웨이 → 서비스 → DB 구간. 502 면 게이트웨이에서 연결 실패로 끝난다 */
export function traceOf(call) {
  const d = call.durationMs;
  if (call.status >= 500) {
    return { traceId: call.traceId, durationMs: d, spans: [
      { id: 'a', service: 'gateway-service', name: `${call.method} ${call.path}`, startMs: 0, durationMs: d, status: call.status, error: true },
      { id: 'b', service: 'gateway-service', name: `connect ${call.service}:8080`, startMs: 0, durationMs: Math.max(1, d - 1), status: null, error: true },
    ] };
  }
  const inner = Math.max(1, d - 4);
  const spans = [
    { id: 'a', service: 'gateway-service', name: `${call.method} ${call.path}`, startMs: 0, durationMs: d, status: call.status, error: false },
    { id: 'b', service: call.service, name: call.api, startMs: 2, durationMs: inner, status: call.status, error: false },
  ];
  if (call.service === 'product-service' && call.api.endsWith('{id}')) {
    spans.push({ id: 'c', service: 'store-service', name: 'GET /internal/stores/{id}', startMs: 2 + Math.round(inner * 0.5), durationMs: Math.max(1, Math.round(inner * 0.3)), status: 200, error: false });
  }
  if (call.service === 'order-service') {
    spans.push({ id: 'd', service: 'order-service', name: 'redis HGETALL cart:{userId}', startMs: 2 + Math.round(inner * 0.15), durationMs: Math.max(1, Math.round(inner * 0.15)), status: null, error: false });
  }
  spans.push({ id: 'e', service: call.service, name: 'SELECT (JDBC)', startMs: 2 + Math.round(inner * 0.2), durationMs: Math.max(1, Math.round(inner * 0.25)), status: null, error: false });
  return { traceId: call.traceId, durationMs: d, spans };
}

/* ─────────── 장애 분석 리포트 ─────────── */

const MIN = 60000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const KST = 9 * HOUR;
// 목업 기준 시각 — 기간 버튼이 매번 같은 결과를 내도록 고정 (실제는 지금 시각)
export const REPORT_NOW = new Date('2026-11-17T11:30:00+09:00').getTime();
const at = (s) => new Date(`2026-${s}:00+09:00`).getTime();   // '11-17T11:05' → ms

export const KIND_LABEL = { ERROR: '응답 실패', ATTACK: '공격 의심', TRAFFIC: '요청 급증' };
export const EVENT_LABEL = {
  CHAOS_KILL: '장애 주입', CHAOS_RECOVER: '복구', POD_START: '파드 시작', POD_STOP: '파드 종료', POD_RESTART: '파드 재시작',
  DEPLOY: '배포', LOADTEST_START: '부하테스트 시작', LOADTEST_END: '부하테스트 종료', CIRCUIT_OPEN: '차단기 열림',
};
export const SERVICE_LABEL = {
  'order-service': '주문', 'product-service': '상품', 'payment-service': '결제', 'store-service': '스토어', 'user-service': '회원',
  'review-service': '리뷰', 'settlement-service': '정산', 'chat-service': '채팅', 'gateway-service': '게이트웨이',
  'admin-service': '관리자', keycloak: '로그인', mysql: 'DB', redis: 'Redis',
};
export const serviceLabel = (name) => SERVICE_LABEL[name] ?? name ?? '-';
const COLORS = ['#b4532a', '#2f6f8f', '#7a5c99', '#3f7d4e', '#c08a1e', '#8c3b5e', '#4a5a6a', '#9a6b3f'];
export const serviceColor = (name) => COLORS[Math.max(0, Object.keys(SERVICE_LABEL).indexOf(name)) % COLORS.length];

const pad = (n) => String(n).padStart(2, '0');
const kst = (ms) => new Date(ms + KST);
export const formatDayTime = (ms) => { const d = kst(ms); return `${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
export const formatTime = (ms) => { const d = kst(ms); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
export const formatSeconds = (ms) => `${formatTime(ms)}:${pad(kst(ms).getUTCSeconds())}`;
export const toLocalInput = (ms) => { const d = kst(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
export const fromLocalInput = (v) => new Date(`${v}:00+09:00`).getTime();

/** 기간 버튼 (실제 presets) — 어제 퇴근 후 = 전날 18:00 ~ 오늘 09:00 */
export function presets(t = REPORT_NOW) {
  const today = Math.floor((t + KST) / DAY) * DAY - KST;
  return [
    { key: '1h', label: '최근 1시간', from: t - HOUR, to: t },
    { key: 'today', label: '오늘', from: today, to: t },
    { key: 'overnight', label: '어제 퇴근 후', from: today - 6 * HOUR, to: Math.min(today + 9 * HOUR, t) },
    { key: '24h', label: '최근 24시간', from: t - DAY, to: t },
  ];
}

// 고정 사건 — 분 단위 건수. perMin 배열의 i 번째 = start + i 분
const LOAD_TESTS = [
  { start: at('11-17T10:12'), end: at('11-17T10:24'), peakVus: 150 },
  { start: at('11-17T11:00'), end: at('11-17T11:10'), peakVus: 120 },
];
const INCIDENTS = [
  {
    kind: 'ATTACK', start: at('11-16T21:42'), services: [], intended: false, suspicious: [3, 9, 14, 8, 6, 4, 2], notFound: [3, 9, 14, 8, 6, 4, 2],
    causes: [{ code: 'ATTACK', label: '공격 의심(자동 스캐너 탐색)', detail: '탐색 요청 46건, 설정 비밀 파일 탐색(/.env 등) 21건, 워드프레스 관리 도구 탐색 15건, 스크립트 파일 탐색(.php 등) 7건, 경로 조작(../) 3건' }],
    logs: [],
  },
  {
    kind: 'ERROR', start: at('11-17T03:12'), services: ['review-service'], intended: false, errors: { 'review-service': [4, 3] }, errorLogs: [3, 2],
    causes: [{ code: 'OOM', label: '메모리 부족으로 파드 재시작', detail: '리뷰 review-service-7c9d8f6b5-k2x4p 재시작 1회(OOMKilled)' }],
    logs: [
      { timestampMs: at('11-17T03:12') + 8000, service: 'review-service', level: 'ERROR', title: 'java.lang.OutOfMemoryError: Java heap space (리뷰 요약 집계 중)', traceId: '4f1a9c2e7b3d5a80' },
      { timestampMs: at('11-17T03:12') + 31000, service: 'gateway-service', level: 'ERROR', title: 'Connection refused: review-service:8080', traceId: null },
    ],
  },
  {
    kind: 'TRAFFIC', start: at('11-17T10:12'), services: ['product-service', 'review-service', 'store-service'], intended: true,
    requests: [4200, 9800, 13900, 14210, 14100, 13950, 14180, 14020, 13870, 14090, 12100, 5200],
    causes: [
      { code: 'LOAD_TEST', label: '부하테스트 중(의도한 시험)', detail: '최대 150명, 10:12~10:24' },
      { code: 'SURGE', label: '요청 급증', detail: '구간 최대 14210건, 평소(182건)의 78배' },
    ],
    logs: [],
  },
  {
    kind: 'ERROR', start: at('11-17T11:05'), services: ['product-service'], intended: true, errors: { 'product-service': [612, 301] }, errorLogs: [18, 9],
    requests: [11400, 11250],
    causes: [
      { code: 'CHAOS', label: '관리자 장애 주입(의도한 시험)', detail: '상품 파드 2개 강제 종료 11:05, 41초 뒤 복구' },
      { code: 'LOAD_TEST', label: '부하테스트 중(의도한 시험)', detail: '최대 120명, 11:00~11:10' },
    ],
    logs: [
      { timestampMs: at('11-17T11:05') + 13000, service: 'gateway-service', level: 'ERROR', title: 'Connection refused: product-service:8080 (라우트 product-service)', traceId: '9b2e41d07c6a3f15e8d2a4b6c1f07e93' },
      { timestampMs: at('11-17T11:05') + 14000, service: 'order-service', level: 'WARN', title: '상품 조회 실패로 장바구니 가격 갱신 건너뜀 (502)', traceId: '1c7d93a0e4b25f68' },
      { timestampMs: at('11-17T11:05') + 52000, service: 'product-service', level: 'WARN', title: 'HikariPool-1 연결 준비 중 요청 대기 (새 파드 시작 직후)', traceId: null },
    ],
  },
  {
    kind: 'ERROR', start: at('11-17T11:18'), services: ['order-service'], intended: false, errors: { 'order-service': [9, 3] }, dbErrors: [3, 2], errorLogs: [5, 2],
    causes: [{ code: 'DB', label: 'DB 연결 대기', detail: '주문 서비스에서 DB 연결을 기다린 요청이 있었음 (대기 최대 4건)' }],
    logs: [
      { timestampMs: at('11-17T11:18') + 21000, service: 'order-service', level: 'ERROR', title: 'HikariPool-1 - Connection is not available, request timed out after 3000ms.', traceId: '6e0b5d28a1f94c37' },
      { timestampMs: at('11-17T11:18') + 22000, service: 'order-service', level: 'ERROR', title: 'POST /api/cart/items 500 CannotCreateTransactionException', traceId: '6e0b5d28a1f94c37' },
    ],
  },
];
const EVENTS = [
  [at('11-16T19:30'), 'DEPLOY', 'store-service', '새 버전 배포 시작'],
  [at('11-16T19:30') + 21000, 'POD_START', 'store-service', 'store-service-5d8c7b9f4-q7m2n 시작'],
  [at('11-16T19:30') + 64000, 'POD_STOP', 'store-service', 'store-service-6b4f8d2c1-h3k9t 종료'],
  [at('11-17T03:12') + 40000, 'POD_RESTART', 'review-service', 'review-service-7c9d8f6b5-k2x4p 재시작 1회(OOMKilled)'],
  [at('11-17T10:12') + 3000, 'LOADTEST_START', null, '부하테스트 시작'],
  [at('11-17T10:24') + 3000, 'LOADTEST_END', null, '부하테스트 종료(최대 150명)'],
  // 이중화 검증 — 5xx 없이 끝나 이슈는 아님
  ...['order-service', 'product-service', 'payment-service', 'store-service', 'user-service'].flatMap((s, i) => [
    [at('11-17T10:41') + 2000 + i * 100, 'CHAOS_KILL', s, '관리자가 파드 1개 강제 종료(ONE)'],
    [at('11-17T10:41') + 2000 + (30 + i * 2) * 1000, 'CHAOS_RECOVER', s, `복구 완료(${30 + i * 2}초)`],
  ]),
  [at('11-17T11:00') + 4000, 'LOADTEST_START', null, '부하테스트 시작'],
  [at('11-17T11:05') + 12000, 'CHAOS_KILL', 'product-service', '관리자가 파드 2개 강제 종료(ALL)'],
  [at('11-17T11:05') + 13000, 'POD_STOP', 'product-service', 'product-service-84f6c9d7b-2xk8w 종료'],
  [at('11-17T11:05') + 13000, 'POD_STOP', 'product-service', 'product-service-84f6c9d7b-9pq4r 종료'],
  [at('11-17T11:05') + 15000, 'POD_START', 'product-service', 'product-service-84f6c9d7b-m5t7z 시작'],
  [at('11-17T11:05') + 15000, 'POD_START', 'product-service', 'product-service-84f6c9d7b-w1n6c 시작'],
  [at('11-17T11:05') + 53000, 'CHAOS_RECOVER', 'product-service', '복구 완료(41초)'],
  [at('11-17T11:10') + 4000, 'LOADTEST_END', null, '부하테스트 종료(최대 120명)'],
].map(([t, type, service, detail]) => ({ t, type, service, detail }));
const SUSPICIOUS_LOGS = [
  [42, 5, 'GET /.env 404 ip=203.0.113.45 type=secret-file'], [43, 12, 'GET /.git/config 404 ip=203.0.113.45 type=secret-file'],
  [43, 40, 'GET /wp-admin/setup-config.php 404 ip=198.51.100.23 type=cms-probe'], [44, 8, 'GET /phpmyadmin/index.php 404 ip=198.51.100.23 type=cms-probe'],
  [44, 51, 'GET /xmlrpc.php 404 ip=198.51.100.23 type=script-probe'], [45, 30, 'GET /static/../../etc/passwd 400 ip=203.0.113.77 type=traversal'],
  [46, 2, 'GET /.env.production 404 ip=203.0.113.45 type=secret-file'], [47, 19, 'GET /wp-login.php 404 ip=198.51.100.23 type=cms-probe'],
].map(([m, s, title]) => ({ timestampMs: at('11-16T21:00') + m * MIN + s * 1000, title }));

// 평소 분당 요청 — 낮 180건 안팎, 새벽 25건 안팎 (고정 노이즈)
const noise = (t) => ((Math.sin(t / 7777777) * 10000) % 1 + 1) % 1;
function baseRequests(t) {
  const h = kst(t).getUTCHours();
  const level = h >= 9 && h < 23 ? 180 : h >= 1 && h < 7 ? 25 : 70;
  return Math.round(level * (0.85 + noise(t) * 0.3));
}

// 분 단위 원자료 — 기간 안 1분 칸마다
function minuteRow(t) {
  const row = { t, requests: baseRequests(t), serverErrors: 0, byService: {}, rateLimited: 0, notFound: Math.round(baseRequests(t) * 0.01), unauthorized: Math.round(baseRequests(t) * 0.004), suspicious: 0, dbErrors: 0, errorLogs: 0 };
  const lt = LOAD_TESTS.find((l) => t >= l.start && t < l.end);
  if (lt) row.requests += Math.round(lt.peakVus * 1.6 * 60 * 0.97);
  INCIDENTS.forEach((inc) => {
    const i = Math.floor((t - inc.start) / MIN);
    if (i < 0) return;
    if (inc.requests?.[i] != null) row.requests = inc.requests[i];
    if (inc.suspicious?.[i] != null) row.suspicious += inc.suspicious[i];
    if (inc.notFound?.[i] != null) row.notFound += inc.notFound[i];
    if (inc.dbErrors?.[i] != null) row.dbErrors += inc.dbErrors[i];
    if (inc.errorLogs?.[i] != null) row.errorLogs += inc.errorLogs[i];
    Object.entries(inc.errors ?? {}).forEach(([svc, list]) => {
      if (list[i] != null) { row.byService[svc] = (row.byService[svc] ?? 0) + list[i]; row.serverErrors += list[i]; }
    });
  });
  return row;
}
const incidentLength = (inc) => Math.max(...[inc.suspicious, inc.requests, ...Object.values(inc.errors ?? {})].filter(Boolean).map((l) => l.length));

/** 기간 검사 — 실제 400 SYSTEM_REPORT_INVALID_RANGE 조건 */
export const validRange = ({ from, to }) => Number.isFinite(from) && Number.isFinite(to) && from < to && to - from <= 7 * DAY && from > REPORT_NOW - 7 * DAY;

/** GET /api/admin/system/report 응답 모양 (admin.md 10절) */
export function buildReport({ from, to: rawTo }) {
  const to = Math.min(rawTo, REPORT_NOW);
  const len = to - from;
  const bucketSeconds = len <= 3 * HOUR ? 60 : len <= DAY ? 300 : len <= 3 * DAY ? 900 : 3600;
  const b = bucketSeconds * 1000;
  const buckets = [];
  for (let start = Math.floor(from / MIN) * MIN; start < to; start += b) {
    const sum = { t: start, requests: 0, serverErrors: 0, byService: {}, rateLimited: 0, notFound: 0, unauthorized: 0, suspicious: 0, dbErrors: 0, errorLogs: 0 };
    for (let t = start; t < Math.min(start + b, to); t += MIN) {
      const r = minuteRow(t);
      ['requests', 'serverErrors', 'rateLimited', 'notFound', 'unauthorized', 'suspicious', 'dbErrors', 'errorLogs'].forEach((k) => { sum[k] += r[k]; });
      Object.entries(r.byService).forEach(([k, v]) => { sum.byService[k] = (sum.byService[k] ?? 0) + v; });
    }
    buckets.push(sum);
  }
  const issues = INCIDENTS
    .map((inc) => ({ inc, end: inc.start + incidentLength(inc) * MIN }))
    .filter(({ inc, end }) => inc.start < to && end > from)
    .map(({ inc, end }, idx) => {
      const s = Math.max(inc.start, Math.floor(from / MIN) * MIN);
      const e = Math.min(end, to);
      const rows = [];
      for (let t = s; t < e; t += MIN) rows.push(minuteRow(t));
      const total = (k) => rows.reduce((n, r) => n + r[k], 0);
      const issue = {
        no: idx + 1, kind: inc.kind, startMs: s, endMs: e, services: inc.services,
        serverErrors: total('serverErrors'), suspicious: total('suspicious'), rateLimited: total('rateLimited'), requests: total('requests'),
        intended: inc.intended, causes: inc.causes, logs: inc.logs.filter((l) => l.timestampMs >= from && l.timestampMs < to),
      };
      const where = inc.services.length ? `${inc.services.map(serviceLabel).join(', ')} 서비스에서 ` : '';
      const what = inc.kind === 'ATTACK' ? `공격 의심 요청 ${issue.suspicious}건`
        : inc.kind === 'TRAFFIC' ? `요청 급증(구간 최대 ${Math.max(...rows.map((r) => r.requests))}건)` : `응답 실패 ${issue.serverErrors}건`;
      issue.sentence = `${formatDayTime(s)}~${formatTime(e)} ${where}${what}. 원인: ${inc.causes.slice(0, 2).map((c) => c.label).join(', ')}.`;
      return issue;
    });
  const sum = (k) => buckets.reduce((n, x) => n + x[k], 0);
  const intendedIssues = issues.filter((i) => i.intended).length;
  const period = `${formatDayTime(from)} ~ ${formatDayTime(to)}`;
  const serverErrors = sum('serverErrors');
  const suspicious = sum('suspicious');
  const headline = issues.length === 0
    ? `${period} 동안 이상 없음. 요청 ${sum('requests')}건이 모두 정상 처리됐습니다.`
    : `${period} 동안 이슈 ${issues.length}건(실제 장애 ${issues.length - intendedIssues}건, 의도한 시험 ${intendedIssues}건). 응답 실패 총 ${serverErrors}건${suspicious > 0 ? `, 공격 의심 요청 ${suspicious}건` : ''}.`;
  return {
    fromMs: from, toMs: to, bucketSeconds,
    summary: { headline, issues: issues.length, intendedIssues, requests: sum('requests'), serverErrors, suspicious, rateLimited: sum('rateLimited') },
    buckets, issues,
    events: EVENTS.filter((e) => e.t >= from && e.t <= to),
    suspicious: SUSPICIOUS_LOGS.filter((l) => l.timestampMs >= from && l.timestampMs < to).reverse(),
  };
}

/** 이슈 대표 건수 — 공격 의심은 탐색 요청, 요청 급증은 429(없으면 전체 요청), 나머지는 5xx */
export const issueCount = (i) => (i.kind === 'ATTACK' ? i.suspicious : i.kind === 'TRAFFIC' ? i.rateLimited || i.requests || 0 : i.serverErrors);
export const issueWindow = (i) => `${formatDayTime(i.startMs)} ~ ${formatTime(i.endMs)}`;

/** 시간대별 막대 배치 — 서비스별 5xx 를 쌓고, 5xx 없는 구간의 탐색 요청은 회색 */
export function barLayout(buckets, { width = 960, height = 180, pad: p = 28 } = {}) {
  const max = Math.max(1, ...buckets.map((x) => Math.max(x.serverErrors, x.suspicious)));
  const n = Math.max(1, buckets.length);
  const slot = (width - p) / n;
  const barW = Math.max(1, slot * 0.8);
  const scale = (height - p) / max;
  const rects = [];
  buckets.forEach((x, i) => {
    const left = p + i * slot;
    let y = height - p;
    Object.entries(x.byService).forEach(([svc, count]) => {
      y -= count * scale;
      rects.push({ x: left, y, w: barW, h: count * scale, color: serviceColor(svc), title: `${formatDayTime(x.t)} ${serviceLabel(svc)} ${count}건` });
    });
    if (x.serverErrors === 0 && x.suspicious > 0) {
      rects.push({ x: left, y: height - p - x.suspicious * scale, w: barW, h: x.suspicious * scale, color: '#9aa0a6', title: `${formatDayTime(x.t)} 탐색 요청 ${x.suspicious}건` });
    }
  });
  const step = Math.max(1, Math.ceil(n / 8));
  const ticks = buckets.map((x, i) => ({ x: p + i * slot, label: formatTime(x.t), i })).filter((x) => x.i % step === 0);
  return { width, height, pad: p, max, rects, ticks };
}

/** 내려받기 파일 이름 — 장애리포트_1117-1030_1117-1130.html */
export const reportFileName = (r) => {
  const d = (ms) => formatDayTime(ms).replace('/', '').replace(' ', '-').replace(':', '');
  return `장애리포트_${d(r.fromMs)}_${d(r.toMs)}.html`;
};
