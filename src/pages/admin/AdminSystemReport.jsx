import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { useApp } from '../../lib/store';
import { PageHead } from '../../components/ui';
import {
  EVENT_LABEL, KIND_LABEL, REPORT_NOW, barLayout, buildReport, formatDayTime, formatSeconds, fromLocalInput, issueCount, issueWindow,
  presets, reportFileName, serviceColor, serviceLabel, toLocalInput, validRange,
} from '../../data/system';

/* ─────────── 장애 분석 리포트 /admin/system/report ───────────
   실제: IncidentReport · incidentReport.js (frontend #121 · #122), API backend docs/api/admin.md 10절
   위는 운영팀이 읽는 순서(요약 문장 → 건수 → 시간대별 막대 → 이슈 → 이벤트), 개발자 상세는 접어 둔다
   목업: 기준 시각을 11/17 11:30 으로 고정하고 고정 사건 5건(data/system.js)으로 응답을 만든다. 내려받기는 토스트만 */

function PeriodPicker({ preset, onPreset, onCustom }) {
  const [from, setFrom] = useState(toLocalInput(REPORT_NOW - 3600000));
  const [to, setTo] = useState(toLocalInput(REPORT_NOW));
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="기간">
      {presets().map((p) => (
        <button key={p.key} className={`btn btn-sm ${preset === p.key ? 'btn-ink' : 'btn-line'}`} aria-pressed={preset === p.key} onClick={() => onPreset(p)}>{p.label}</button>
      ))}
      <span className="text-mute text-sm ml-2">직접</span>
      <input type="datetime-local" className="field field-sm w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="시작" />
      <span className="text-mute">~</span>
      <input type="datetime-local" className="field field-sm w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label="끝" />
      <button className={`btn btn-sm ${preset === 'custom' ? 'btn-ink' : 'btn-line'}`} onClick={() => onCustom({ from: fromLocalInput(from), to: fromLocalInput(to) })}>조회</button>
    </div>
  );
}

function Chart({ report }) {
  const l = barLayout(report.buckets);
  const services = [...new Set(report.buckets.flatMap((b) => Object.keys(b.byService)))];
  const probes = report.buckets.some((b) => b.serverErrors === 0 && b.suspicious > 0);
  return (
    <figure aria-label="시간대별 건수">
      <svg viewBox={`0 0 ${l.width} ${l.height}`} className="w-full" role="img" aria-label="시간대별 응답 실패 건수">
        <line x1={l.pad} y1={l.height - l.pad} x2={l.width} y2={l.height - l.pad} stroke="var(--color-line)" />
        <text x="0" y="12" fontSize="11" fill="var(--color-mute)">{l.max}건</text>
        {l.rects.map((r) => <rect key={`${r.x}-${r.y}-${r.color}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.color}><title>{r.title}</title></rect>)}
        {l.ticks.map((t) => <text key={t.x} x={t.x} y={l.height - 8} fontSize="11" fill="var(--color-mute)">{t.label}</text>)}
      </svg>
      <figcaption className="flex flex-wrap gap-3 text-sm mt-1">
        {services.map((s) => <span key={s} className="inline-flex items-center gap-1"><i className="inline-block w-2.5 h-2.5" style={{ background: serviceColor(s) }} />{serviceLabel(s)}</span>)}
        {probes && <span className="inline-flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 bg-[#9aa0a6]" />탐색 요청</span>}
        {services.length === 0 && !probes && <span className="text-mute">이 기간에 응답 실패나 탐색 요청이 없어요.</span>}
      </figcaption>
    </figure>
  );
}

function Kpis({ summary }) {
  const items = [
    ['이슈', `${summary.issues}건`, `의도한 시험 ${summary.intendedIssues}건`],
    ['응답 실패 (5xx)', `${summary.serverErrors}건`],
    ['공격 의심 요청', `${summary.suspicious}건`],
    ['요청 제한 (429)', `${summary.rateLimited}건`],
    ['전체 요청', `${summary.requests}건`],
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {items.map(([label, value, sub]) => (
        <div key={label} className="border border-line bg-paper px-3 py-2">
          <span className="text-sm text-mute">{label}</span>
          <p className="text-xl font-bold tabular-nums">{value}</p>
          {sub && <p className="text-xs text-mute">{sub}</p>}
        </div>
      ))}
    </div>
  );
}

function IssueTable({ issues }) {
  if (issues.length === 0) return <p className="py-3 text-mute">이 기간에는 이슈가 없어요.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="이슈 목록">
        <thead><tr className="text-left text-mute border-b border-line">
          <th className="py-1 pr-2">#</th><th className="pr-2">시간</th><th className="pr-2">종류</th><th className="pr-2">서비스</th>
          <th className="pr-2 text-right">건수</th><th className="pr-2">원인</th><th>구분</th>
        </tr></thead>
        <tbody>
          {issues.map((i) => (
            <tr key={i.no} className="border-b border-line align-top">
              <td className="py-1.5 pr-2 tabular-nums">{i.no}</td>
              <td className="pr-2 tabular-nums whitespace-nowrap">{issueWindow(i)}</td>
              <td className="pr-2 whitespace-nowrap">{KIND_LABEL[i.kind]}</td>
              <td className="pr-2">{i.services.map(serviceLabel).join(', ') || '-'}</td>
              <td className="pr-2 text-right tabular-nums">{issueCount(i)}</td>
              <td className="pr-2">{i.causes.map((c) => c.label).join(', ')}</td>
              <td className="whitespace-nowrap">{i.intended ? <span className="text-mute">의도한 시험</span> : <b className="text-rust">실제 장애</b>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ol className="mt-3 grid gap-1 text-base list-decimal pl-5" aria-label="이슈 설명">
        {issues.map((i) => <li key={i.no}>{i.sentence}</li>)}
      </ol>
    </div>
  );
}

function EventList({ events }) {
  if (events.length === 0) return <p className="py-2 text-mute">기록된 이벤트가 없어요.</p>;
  return (
    <ul className="max-h-72 overflow-y-auto text-sm" aria-label="이벤트">
      {events.map((e) => (
        <li key={`${e.t}-${e.type}-${e.detail}`} className="flex flex-wrap gap-x-2 py-1 border-t border-line first:border-t-0 tabular-nums">
          <span>{formatSeconds(e.t)}</span>
          <span className="font-bold">{EVENT_LABEL[e.type]}</span>
          {e.service && <span>{serviceLabel(e.service)}</span>}
          <span className="text-mute">{e.detail}</span>
        </li>
      ))}
    </ul>
  );
}

function DevSection({ report }) {
  const busy = report.buckets.filter((b) => b.serverErrors || b.suspicious || b.rateLimited || b.dbErrors);
  return (
    <details className="border border-line bg-paper p-4">
      <summary className="text-lg font-bold cursor-pointer">개발자 상세: 원인 근거, 로그, 구간별 건수</summary>
      {report.issues.map((i) => (
        <div key={i.no} className="mt-4">
          <h4 className="font-bold">#{i.no} {issueWindow(i)}, {KIND_LABEL[i.kind]}</h4>
          <ul className="text-sm mt-1">
            {i.causes.map((c) => <li key={c.code + c.detail}><code className="px-1 bg-cream">{c.code}</code> {c.label}: {c.detail}</li>)}
          </ul>
          {i.logs.length > 0 && (
            <ul className="mt-2 text-xs font-mono" aria-label={`이슈 ${i.no} 로그`}>
              {i.logs.map((l) => (
                <li key={`${l.timestampMs}-${l.title}`} className="py-0.5 border-t border-line break-all">
                  {formatSeconds(l.timestampMs)} [{l.level}] {serviceLabel(l.service)}: {l.title}{l.traceId && <span className="text-mute"> traceId {l.traceId}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <h4 className="font-bold mt-4">이상 신호가 있는 구간</h4>
      {busy.length ? (
        <ul className="text-sm tabular-nums">
          {busy.map((b) => <li key={b.t}>{formatDayTime(b.t)}: 요청 {b.requests}, 5xx {b.serverErrors}, 429 {b.rateLimited}, 탐색 {b.suspicious}, DB 오류 {b.dbErrors}, 에러 로그 {b.errorLogs}</li>)}
        </ul>
      ) : <p className="text-sm text-mute">없음</p>}
      {report.suspicious.length > 0 && (
        <>
          <h4 className="font-bold mt-4">탐색 요청 로그 (게이트웨이)</h4>
          <ul className="text-xs font-mono">{report.suspicious.map((l) => <li key={`${l.timestampMs}-${l.title}`} className="break-all">{formatSeconds(l.timestampMs)} {l.title}</li>)}</ul>
        </>
      )}
    </details>
  );
}

export function AdminSystemReport() {
  const { toast } = useApp();
  const [preset, setPreset] = useState('1h');
  const [range, setRange] = useState(() => presets()[0]);
  const ok = validRange(range);
  const report = ok ? buildReport(range) : null;

  return (
    <div>
      <PageHead title="장애 분석 리포트" desc="언제, 어느 서비스에서, 몇 건, 왜 문제가 있었는지 기간별로 정리합니다. 최근 7일까지 볼 수 있어요."
        right={<>
          <Link to="/admin/system" className="btn btn-line btn-sm">시스템 상태</Link>
          {/* 실제는 운영팀 섹션 + 개발자 섹션을 HTML 한 파일로 내려받음(인쇄하면 PDF). 목업은 파일을 만들지 않는다 */}
          <button className="btn btn-ink btn-sm inline-flex items-center gap-1" disabled={!report} onClick={() => toast(`${reportFileName(report)} 파일을 내려받았어요`)}>
            <Download size={14} /> 보고서 내려받기
          </button>
        </>} />
      <div className="mb-4">
        <PeriodPicker preset={preset} onPreset={(p) => { setPreset(p.key); setRange({ from: p.from, to: p.to }); }}
          onCustom={(r) => { setPreset('custom'); setRange(r); }} />
      </div>
      {report ? (
        <div className="grid gap-4">
          <section aria-label="운영팀 보고" className="border border-line bg-paper p-4 grid gap-4">
            <div>
              <p className="text-sm text-mute">기간 {formatDayTime(report.fromMs)} ~ {formatDayTime(report.toMs)}, 구간 {report.bucketSeconds / 60}분</p>
              <p className="mt-1 px-4 py-3 bg-cream text-lg font-bold" aria-label="요약">{report.summary.headline}</p>
            </div>
            <Kpis summary={report.summary} />
            <div><h3 className="font-bold mb-1">시간대별 건수</h3><Chart report={report} /></div>
            <div><h3 className="font-bold mb-1">이슈</h3><IssueTable issues={report.issues} /></div>
            <div><h3 className="font-bold mb-1">이벤트</h3><EventList events={report.events} /></div>
          </section>
          <DevSection report={report} />
        </div>
      ) : (
        <p className="py-10 text-center text-mute">리포트를 만들지 못했어요. 기간을 최근 7일 안으로 골라 주세요.</p>
      )}
    </div>
  );
}
