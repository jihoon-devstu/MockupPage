import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Star, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cx, won, comma, salePrice, md, shortWon } from '../lib/format';
import { useApp } from '../lib/store';

/* ─── 별점 ─── */
export function Stars({ value, size = 12, className = '' }) {
  return (
    <span className={cx('inline-flex items-center gap-px', className)} aria-label={`별점 ${value}점`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i + 1));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} strokeWidth={0} className="absolute inset-0 fill-line-2" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} strokeWidth={0} className="fill-ink" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/* ─── 상태 뱃지 ─── */
const TONES = {
  ink: 'bg-ink text-white',
  mute: 'bg-sand text-ink-2',
  moss: 'bg-moss-soft text-moss',
  amber: 'bg-amber-soft text-amber',
  rust: 'bg-rust-soft text-rust',
  sky: 'bg-sky-soft text-sky',
  point: 'bg-point text-white',
  line: 'border border-line-2 text-ink-2',
};
export function Pill({ tone = 'mute', children, className = '' }) {
  return <span className={cx('inline-flex items-center h-[22px] px-2 text-[11.5px] font-semibold whitespace-nowrap', TONES[tone], className)}>{children}</span>;
}

const STATUS = {
  운영중: 'moss', 휴면: 'amber', 정지: 'rust', 정상: 'moss', 이용정지: 'rust',
  심사대기: 'sky', 보완요청: 'amber', 승인: 'moss', 반려: 'rust',
  판매중: 'moss', 품절: 'amber', 판매중지: 'mute',
  지급예정: 'sky', 지급완료: 'mute', 지급보류: 'rust', 집계중: 'line',
  결제완료: 'sky', 배송준비: 'amber', 배송중: 'moss', 배송완료: 'ink', 구매확정: 'mute',
  취소요청: 'rust', 취소완료: 'mute', 반품요청: 'rust', 반품완료: 'mute', 교환요청: 'rust',
  답변완료: 'mute', 미답변: 'rust', 블라인드: 'rust', 검토대기: 'amber', 정상노출: 'moss',
};
export const StatusPill = ({ s }) => <Pill tone={STATUS[s] || 'mute'}>{s}</Pill>;

/* ─── 가격 ─── */
export function Price({ p, size = 'md' }) {
  const sp = salePrice(p);
  const big = size === 'lg';
  return (
    <div className="flex items-baseline gap-1.5 flex-wrap">
      {p.discount > 0 && <span className={cx('font-bold text-point', big ? 'text-2xl' : 'text-[15px]')}>{Math.round(p.discount * 100)}%</span>}
      <span className={cx('font-bold', big ? 'text-2xl' : 'text-[15px]')}>{comma(sp)}<span className={big ? 'text-lg' : 'text-[13px]'}>원</span></span>
      {p.discount > 0 && <span className="text-[12px] text-mute line-through">{comma(p.price)}</span>}
    </div>
  );
}

/* ─── 모달 ─── */
export function Modal({ open, onClose, title, children, footer, width = 520 }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-6" onMouseDown={onClose}>
      <div className="w-full bg-white max-h-[90vh] flex flex-col" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between h-14 px-5 border-b border-line shrink-0">
          <h3 className="text-[16px] font-bold">{title}</h3>
          <button onClick={onClose} className="p-1 -mr-1 hover:bg-sand" aria-label="닫기"><X size={20} strokeWidth={1.6} /></button>
        </div>
        <div className="overflow-y-auto overflow-x-hidden p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-3 border-t border-line bg-cream shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ─── 토스트 ─── */
export function ToastHost() {
  const { toastMsg } = useApp();
  if (!toastMsg) return null;
  return (
    <div key={toastMsg.id} className="toast-in fixed left-1/2 bottom-8 z-[90] -translate-x-1/2 flex items-center gap-2 bg-ink text-white text-sm px-4 h-11 shadow-lg">
      <Check size={16} className="text-point" /> {toastMsg.msg}
    </div>
  );
}

/* ─── 체크박스 ─── */
export function Checkbox({ checked, onChange, label, className = '' }) {
  return (
    <label className={cx('inline-flex items-center gap-2 cursor-pointer select-none', className)}>
      <span className={cx('w-[18px] h-[18px] border flex items-center justify-center shrink-0', checked ? 'bg-ink border-ink' : 'bg-white border-line-2')}>
        {checked && <Check size={13} strokeWidth={3} className="text-white" />}
      </span>
      <input type="checkbox" className="sr-only" checked={!!checked} onChange={(e) => onChange?.(e.target.checked)} />
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}

/* ─── 페이지네이션 (목업: 동작 X) ─── */
export function Pager({ total = 5, className = '' }) {
  const [cur, setCur] = useState(1);
  return (
    <div className={cx('flex items-center justify-center gap-1 text-[13px]', className)}>
      <button className="w-8 h-8 flex items-center justify-center hover:bg-sand" onClick={() => setCur(Math.max(1, cur - 1))}><ChevronLeft size={16} /></button>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <button key={n} onClick={() => setCur(n)} className={cx('w-8 h-8 num', n === cur ? 'bg-ink text-white' : 'hover:bg-sand text-ink-2')}>{n}</button>
      ))}
      <button className="w-8 h-8 flex items-center justify-center hover:bg-sand" onClick={() => setCur(Math.min(total, cur + 1))}><ChevronRight size={16} /></button>
    </div>
  );
}

/* ─── 빈 상태 ─── */
export function Empty({ title, desc, action }) {
  return (
    <div className="py-20 text-center">
      <div className="mx-auto mb-4 w-12 h-12 border border-line-2 flex items-center justify-center text-mute text-xl">∅</div>
      <p className="font-semibold">{title}</p>
      {desc && <p className="mt-1 text-sm text-mute">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ─── 콘솔: KPI 타일 ─── */
export function Kpi({ label, value, unit, delta, sub, to }) {
  const up = delta > 0;
  return (
    <div className="panel px-5 py-4">
      <div className="text-[13px] text-mute">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-[26px] font-bold num leading-none">{value}</span>
        {unit && <span className="text-sm text-ink-2">{unit}</span>}
      </div>
      <div className="mt-2 text-xs text-mute flex items-center gap-2">
        {delta !== undefined && <span className={cx('num font-medium', up ? 'text-moss' : 'text-rust')}>{up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%</span>}
        {sub}
      </div>
    </div>
  );
}

/* ─── 차트: 일별 매출 막대 (단일 시리즈, hover 툴팁) ─── */
export function BarChart({ data, height = 220, valueKey = 'amount', color = 'var(--color-ink)', highlightLast = true }) {
  const [hover, setHover] = useState(null);
  const W = 720, H = height, pad = { l: 44, r: 8, t: 12, b: 26 };
  const max = Math.max(...data.map((d) => d[valueKey])) * 1.1;
  const nice = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / nice) * nice;
  const ticks = [0, top / 2, top];
  const bw = (W - pad.l - pad.r) / data.length;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray={t ? '2 3' : ''} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill="var(--color-mute)" className="num">{shortWon(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.l + i * bw + bw * 0.18;
          const w = bw * 0.64;
          const yy = y(d[valueKey]);
          const h = Math.max(1, H - pad.b - yy);
          const r = Math.min(4, w / 2);
          const last = highlightLast && i === data.length - 1;
          const fill = last ? 'var(--color-point)' : hover === i ? 'var(--color-ink-2)' : color;
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              <path d={`M${x},${H - pad.b} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + w - r} Q${x + w},${yy} ${x + w},${yy + r} V${H - pad.b} Z`} fill={fill} opacity={hover === null || hover === i || last ? 1 : 0.55} />
              {(i % 5 === 0 || i === data.length - 1) && (
                <text x={pad.l + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--color-mute)" className="num">{md(d.date)}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 bg-ink text-white text-xs px-2.5 py-1.5 whitespace-nowrap"
          style={{ left: `${((pad.l + hover * bw + bw / 2) / W) * 100}%`, transform: 'translateX(-50%)' }}>
          <div className="text-white/60 num">{md(data[hover].date)}</div>
          <div className="font-semibold num">{won(data[hover][valueKey])} · {data[hover].orders}건</div>
        </div>
      )}
    </div>
  );
}

/* ─── 차트: 가로 막대 (카테고리/스토어 비중) ─── */
export function HBars({ rows, format = won }) {
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="group">
          <div className="flex justify-between text-[13px] mb-1">
            <span className="text-ink-2">{r.label}</span>
            <span className="num font-medium">{format(r.value)}{r.note && <span className="text-mute font-normal ml-1.5">{r.note}</span>}</span>
          </div>
          <div className="h-2 bg-sand">
            <div className="h-full bg-ink group-hover:bg-point transition-colors" style={{ width: `${(r.value / max) * 100}%`, borderRadius: '0 4px 4px 0' }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ─── 미니 스파크라인 ─── */
export function Spark({ values, w = 90, h = 26 }) {
  const max = Math.max(...values), min = Math.min(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - min) / (max - min || 1)) * (h - 4)}`).join(' ');
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke="var(--color-ink)" strokeWidth="1.5" /></svg>;
}

/* ─── 섹션 헤더 (쇼핑몰) ─── */
export function SectionHead({ eyebrow, title, right }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h2 className="text-[22px] font-bold tracking-tight">{title}</h2>
      </div>
      {right}
    </div>
  );
}

/* ─── 콘솔 페이지 헤더 ─── */
export function PageHead({ title, desc, right, crumbs }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        {crumbs && <div className="text-xs text-mute mb-1">{crumbs}</div>}
        <h1 className="text-[22px] font-bold tracking-tight">{title}</h1>
        {desc && <p className="text-[13px] text-mute mt-1">{desc}</p>}
      </div>
      {right && <div className="flex gap-2">{right}</div>}
    </div>
  );
}

/* ─── 필터 칩/세그먼트 ─── */
export function Segments({ items, value, onChange, counts }) {
  return (
    <div className="flex flex-wrap border border-line-2 bg-white w-fit">
      {items.map((it, i) => (
        <button key={it} onClick={() => onChange(it)}
          className={cx('h-9 px-3.5 text-[13px] flex items-center gap-1.5', i && 'border-l border-line-2', value === it ? 'bg-ink text-white font-semibold' : 'text-ink-2 hover:bg-cream')}>
          {it}
          {counts?.[it] !== undefined && <span className={cx('num text-[11px]', value === it ? 'text-white/70' : 'text-mute')}>{counts[it]}</span>}
        </button>
      ))}
    </div>
  );
}

/* ─── 키-값 표 ─── */
export function KV({ rows, cols = 1 }) {
  return (
    <dl className={cx('grid border-t border-line text-[13px]', cols === 2 && 'sm:grid-cols-2')}>
      {rows.map(([k, v]) => (
        <div key={k} className="flex border-b border-line">
          <dt className="w-32 shrink-0 bg-cream px-3 py-2.5 text-ink-2 font-medium">{k}</dt>
          <dd className="px-3 py-2.5 flex-1 min-w-0 break-all">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
