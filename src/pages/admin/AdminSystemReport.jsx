import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { useApp } from '../../lib/store';
import { PageHead } from '../../components/ui';
import {
  EVENT_LABEL, ISSUE_CLASS, KIND_LABEL, barLayout, buildReport, formatDayTime, formatSeconds, fromLocalInput, issueClass, issueImpact,
  issueMinutes, issueWindow, overview, presets, reportFileName, serviceColor, serviceLabel, summarizeEvents, toLocalInput, validRange,
} from '../../data/system';

/* ─────────── 장애 분석 리포트 /admin/system/report ───────────
   실제: IncidentReport, incidentReport.js (frontend #124 섹션 개편, #129 외부 탐색 구분), API backend docs/api/admin.md 10절
   섹션(내려받기 파일과 같음): 1 한눈에 보기, 2 이슈(요약표 + 이슈별 개조식), 3 운영 이벤트 요약표, 4 시간대별 건수, 5 개발자 상세(접힘).
   파드 시작, 종료 같은 원본 이벤트는 요약표에서 종류별 한 줄로 묶고 하나하나는 개발자 상세에만 둔다
   목업: 기준 시각을 11/17 11:30 으로 고정하고 고정 사건 5건(data/system.js)으로 응답을 만든다. 내려받기는 토스트만
   목업 전용 주소: ?case=probe = 11/16 21:30 ~ 22:30 직접 조회(외부 탐색만 있는 기간, "실제 장애 없음, 외부 탐색 1건") */

// ?case=probe 의 직접 조회 기간
const PROBE_RANGE = { from: new Date('2026-11-16T21:30:00+09:00').getTime(), to: new Date('2026-11-16T22:30:00+09:00').getTime() };

function PeriodPicker({ preset, onPreset, custom, onCustom }) {
  const [from, setFrom] = useState(toLocalInput(custom.from));
  const [to, setTo] = useState(toLocalInput(custom.to));
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="기간">
      {presets().map((p) => (
        <button key={p.key} type="button" className={`btn btn-sm ${preset === p.key ? 'btn-ink' : 'btn-line'}`} aria-pressed={preset === p.key}
          onClick={() => onPreset(p.key)}>{p.label}</button>
      ))}
      <span className="text-mute text-sm ml-2">직접</span>
      <input type="datetime-local" className="field field-sm w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="시작" />
      <span className="text-mute">~</span>
      <input type="datetime-local" className="field field-sm w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label="끝" />
      <button type="button" className={`btn btn-sm ${preset === 'custom' ? 'btn-ink' : 'btn-line'}`}
        onClick={() => onCustom({ from: fromLocalInput(from), to: fromLocalInput(to) })}>조회</button>
    </div>
  );
}

function Section({ no, title, children, label }) {
  return (
    <section aria-label={label ?? title} className="border border-line bg-paper p-4">
      <h2 className="text-lg font-bold mb-3"><span className="text-mute mr-2">{no}</span>{title}</h2>
      {children}
    </section>
  );
}

function Overview({ report, period }) {
  const o = overview(report);
  return (
    <Section no="1" title="한눈에 보기">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span aria-label="상태" className={`px-3 py-1 font-bold ${o.status === 'bad' ? 'bg-rust-soft text-rust' : 'bg-moss-soft text-moss'}`}>{o.statusText}</span>
        <span className="text-sm text-mute">기간 {period} / 구간 {report.bucketSeconds / 60}분</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {o.cards.map((c) => (
          <div key={c.label} className="border border-line px-3 py-2">
            <span className="text-sm text-mute">{c.label}</span>
            <p className="text-xl font-bold tabular-nums">{c.value.toLocaleString('ko-KR')}</p>
            {c.sub && <p className="text-xs text-mute">{c.sub}</p>}
          </div>
        ))}
      </div>
    </Section>
  );
}

// 빨간 강조는 실제 장애만, 외부 탐색과 의도한 시험은 회색 줄
function IssueCard({ issue }) {
  const cls = issueClass(issue);
  return (
    <li className={`border border-line border-l-4 px-3 py-2 ${cls === 'real' ? 'border-l-rust' : 'border-l-line'}`}>
      <p className="font-bold">#{issue.no} {KIND_LABEL[issue.kind]}<span className="ml-2 text-sm font-normal text-mute tabular-nums">{issueWindow(issue)}, {issueMinutes(issue)}분</span></p>
      <ul className="mt-1 text-sm grid gap-0.5">
        <li><b className="inline-block w-10 text-ink-2">영향</b>{issueImpact(issue)}</li>
        {issue.causes.map((c, k) => (
          <li key={c.code}><b className="inline-block w-10 text-ink-2">{k === 0 ? '원인' : '관련'}</b>{c.label}: <span className="text-mute">{c.detail}</span></li>
        ))}
        <li><b className="inline-block w-10 text-ink-2">구분</b>{cls === 'real' ? <b className="text-rust">{ISSUE_CLASS.real.long}</b> : ISSUE_CLASS[cls].long}</li>
      </ul>
    </li>
  );
}

function Issues({ issues }) {
  return (
    <Section no="2" title="이슈">
      {issues.length === 0 ? <p className="text-mute">이 기간에는 이슈가 없어요.</p> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="이슈 목록">
              <thead><tr className="text-left text-mute border-b border-line">
                <th className="py-1 pr-2">#</th><th className="pr-2">시간</th><th className="pr-2">길이</th><th className="pr-2">종류</th>
                <th className="pr-2">영향</th><th className="pr-2">주 원인</th><th>구분</th>
              </tr></thead>
              <tbody>
                {issues.map((i) => (
                  <tr key={i.no} className="border-b border-line align-top">
                    <td className="py-1.5 pr-2 tabular-nums">{i.no}</td>
                    <td className="pr-2 tabular-nums whitespace-nowrap">{issueWindow(i)}</td>
                    <td className="pr-2 tabular-nums">{issueMinutes(i)}분</td>
                    <td className="pr-2 whitespace-nowrap">{KIND_LABEL[i.kind]}</td>
                    <td className="pr-2">{issueImpact(i)}</td>
                    <td className="pr-2">{i.causes[0]?.label ?? '-'}</td>
                    <td className="whitespace-nowrap">{issueClass(i) === 'real' ? <b className="text-rust">실제 장애</b> : <span className="text-mute">{ISSUE_CLASS[issueClass(i)].short}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-3 grid gap-2" aria-label="이슈 상세">{issues.map((i) => <IssueCard key={i.no} issue={i} />)}</ul>
        </>
      )}
    </Section>
  );
}

function EventSummary({ events }) {
  const rows = summarizeEvents(events);
  return (
    <Section no="3" title="운영 이벤트 요약">
      {rows.length === 0 ? <p className="text-mute">기록된 이벤트가 없어요.</p> : (
        <table className="w-full text-sm" aria-label="운영 이벤트 요약">
          <thead><tr className="text-left text-mute border-b border-line"><th className="py-1 pr-2 w-28">종류</th><th className="pr-2 w-16 text-right">건수</th><th className="pl-3">내용</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-line">
                <td className={`py-1.5 pr-2 ${r.alert ? 'text-rust font-bold' : ''}`}>{r.label}</td>
                <td className="pr-2 text-right tabular-nums">{r.count}</td>
                <td className="pl-3 text-mute">{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-2 text-xs text-mute">이벤트 하나하나는 5. 개발자 상세에 있어요.</p>
    </Section>
  );
}

function Chart({ report }) {
  const l = barLayout(report.buckets);
  const services = [...new Set(report.buckets.flatMap((b) => Object.keys(b.byService)))];
  const probes = report.buckets.some((b) => b.serverErrors === 0 && b.suspicious > 0);
  return (
    <Section no="4" title="시간대별 건수">
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
          {services.length === 0 && !probes && <span className="text-mute">이 기간에 응답 실패, 탐색 요청이 없어요.</span>}
        </figcaption>
      </figure>
    </Section>
  );
}

function DevSection({ report }) {
  return (
    <details className="border border-line bg-paper p-4">
      <summary className="text-lg font-bold cursor-pointer"><span className="text-mute mr-2">5</span>개발자 상세 (근거 로그, 구간별 건수, 전체 이벤트)</summary>
      <h3 className="font-bold mt-4">이슈별 근거 로그</h3>
      {report.issues.map((i) => (
        <div key={i.no} className="mt-2">
          <h4 className="text-sm font-bold">#{i.no} {issueWindow(i)}</h4>
          {i.logs.length > 0 ? (
            <ul className="text-xs font-mono" aria-label={`이슈 ${i.no} 로그`}>
              {i.logs.map((l) => (
                <li key={`${l.timestampMs}-${l.title}`} className="py-0.5 border-t border-line break-all">
                  {formatSeconds(l.timestampMs)} [{l.level}] {serviceLabel(l.service)}: {l.title}{l.traceId && <span className="text-mute"> (traceId {l.traceId})</span>}
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-mute">근거 로그 없음</p>}
        </div>
      ))}
      <h3 className="font-bold mt-4">이상 신호가 있는 구간</h3>
      <ul className="text-sm tabular-nums">
        {report.buckets.filter((b) => b.serverErrors || b.suspicious || b.rateLimited || b.dbErrors).map((b) => (
          <li key={b.t}>{formatDayTime(b.t)}: 요청 {b.requests}, 5xx {b.serverErrors}, 429 {b.rateLimited}, 탐색 {b.suspicious}, DB 오류 {b.dbErrors}, 에러 로그 {b.errorLogs}</li>
        ))}
      </ul>
      {report.suspicious.length > 0 && (
        <>
          <h3 className="font-bold mt-4">탐색 요청 로그 (게이트웨이)</h3>
          <ul className="text-xs font-mono">{report.suspicious.map((l) => <li key={`${l.timestampMs}-${l.title}`} className="break-all">{formatSeconds(l.timestampMs)} {l.title}</li>)}</ul>
        </>
      )}
      <h3 className="font-bold mt-4">전체 이벤트 ({report.events.length}건)</h3>
      <ul className="max-h-72 overflow-y-auto text-xs tabular-nums" aria-label="전체 이벤트">
        {report.events.map((e) => (
          <li key={`${e.t}-${e.type}-${e.detail}`} className="py-0.5 border-t border-line">
            {formatSeconds(e.t)} <b>{EVENT_LABEL[e.type] ?? e.type}</b> {e.service ? serviceLabel(e.service) : ''} <span className="text-mute">{e.detail}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function AdminSystemReport() {
  const { toast } = useApp();
  const [sp] = useSearchParams();
  const probe = sp.get('case') === 'probe';
  const [preset, setPreset] = useState(probe ? 'custom' : '1h');
  const [custom, setCustom] = useState(() => (probe ? PROBE_RANGE : presets().find((p) => p.key === '1h')));
  // 버튼을 누를 때 기간을 고정한다 (실제와 같음)
  const [range, setRange] = useState(() => ({ from: custom.from, to: custom.to }));
  const report = validRange(range) ? buildReport(range) : null;

  const choosePreset = (key) => {
    const p = presets().find((x) => x.key === key);
    setPreset(key);
    setRange({ from: p.from, to: p.to });
  };
  const chooseCustom = (r) => {
    setPreset('custom');
    setCustom(r);
    setRange(r);
  };

  return (
    <div>
      <PageHead title="장애 분석 리포트" desc="언제, 어느 서비스에서, 몇 건, 왜 문제가 있었는지 기간별로 정리합니다. 최근 7일까지 볼 수 있어요."
        right={(
          <div className="flex gap-2">
            <Link to="/admin/system" className="btn btn-line btn-sm">시스템 상태</Link>
            {/* 실제는 화면과 같은 5개 섹션 + 원본 JSON 을 HTML 한 파일로 내려받음(인쇄하면 PDF). 목업은 파일을 만들지 않는다 */}
            <button type="button" className="btn btn-ink btn-sm inline-flex items-center gap-1" disabled={!report} onClick={() => toast(`${reportFileName(report)} 파일을 내려받았어요`)}>
              <Download size={14} aria-hidden="true" /> 보고서 내려받기
            </button>
          </div>
        )} />
      <div className="mb-4"><PeriodPicker preset={preset} onPreset={choosePreset} custom={custom} onCustom={chooseCustom} /></div>
      {report ? (
        <div className="grid gap-4">
          <Overview report={report} period={`${formatDayTime(report.fromMs)} ~ ${formatDayTime(report.toMs)}`} />
          <Issues issues={report.issues} />
          <EventSummary events={report.events} />
          <Chart report={report} />
          <DevSection report={report} />
        </div>
      ) : (
        <p className="py-10 text-center text-mute">리포트를 만들지 못했어요. 기간을 최근 7일 안으로 골라 주세요.</p>
      )}
    </div>
  );
}
