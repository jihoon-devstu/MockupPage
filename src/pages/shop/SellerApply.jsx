import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Check, FileText, X } from 'lucide-react';
import { categories } from '../../data/catalog';
import { Checkbox } from '../../components/ui';
import { cx, pct } from '../../lib/format';

/* 입점 신청 (4단계)
   1 판매자 정보 → 2 스토어 · 카테고리 · 판매 예정 상품 → 3 서류 제출 → 4 정산 계좌 · 약관
   제출 후 상태: 심사대기 → (보완요청) → 승인 / 반려  (관리자 > 입점 심사에서 처리) */
const STEPS = ['판매자 정보', '스토어 · 상품', '서류 제출', '정산 · 약관'];

function Field({ label, req, children, hint }) {
  return (
    <div>
      <label className="label">{label}{req && <span className="text-point ml-0.5">*</span>}</label>
      {children}
      {hint && <p className="text-[12px] text-mute mt-1.5">{hint}</p>}
    </div>
  );
}

function Doc({ name, desc, done, onToggle }) {
  return (
    <div className={cx('border p-4 flex items-center gap-4', done ? 'border-ink' : 'border-dashed border-line-2')}>
      <div className={cx('w-10 h-10 flex items-center justify-center shrink-0', done ? 'bg-ink text-white' : 'bg-cream text-mute')}>{done ? <FileText size={18} /> : <Upload size={18} />}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold">{name} <span className="text-point">*</span></div>
        <div className="text-[12px] text-mute truncate">{done ? `${name.replace(/\s/g, '')}_2026.pdf · 1.2MB` : desc}</div>
      </div>
      <button onClick={onToggle} className={cx('btn btn-sm', done ? 'btn-ghost' : 'btn-line')}>{done ? <X size={14} /> : '파일 선택'}</button>
    </div>
  );
}

export default function SellerApply() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [bizType, setBizType] = useState('개인');
  const [cat, setCat] = useState('fashion');
  const [items, setItems] = useState(['', '']);
  const [docs, setDocs] = useState({ biz: false, ecom: false, bank: false, sample: false });
  const [agree, setAgree] = useState(false);
  const c = categories.find((x) => x.id === cat);

  if (done) {
    return (
      <div className="max-w-[640px] mx-auto px-4 pt-20">
        <div className="eyebrow">Application received</div>
        <h1 className="mt-2 text-[28px] font-bold tracking-tight">입점 신청이 접수되었습니다</h1>
        <p className="mt-2 text-ink-2 text-sm">접수번호 <b className="num">AP-2610-001</b> · 심사 결과는 영업일 기준 3일 이내 이메일과 알림톡으로 안내드려요.</p>
        <ol className="mt-10 border-l-2 border-line ml-2">
          {[['신청 접수', '2026.10.01 10:24', true], ['서류 · 상품 심사', '영업일 1~3일 소요', false], ['승인 및 판매자 계정 발급', '판매자센터 로그인 정보 발송', false], ['스토어 오픈', '상품 등록 후 즉시 판매 시작', false]].map(([t, d, on], i) => (
            <li key={t} className="relative pl-6 pb-7 last:pb-0">
              <span className={cx('absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2', on ? 'bg-point border-point' : 'bg-white border-line-2')} />
              <div className={cx('font-semibold text-[15px]', !on && 'text-mute')}>{String(i + 1).padStart(2, '0')}. {t}</div>
              <div className="text-[13px] text-mute mt-0.5">{d}</div>
            </li>
          ))}
        </ol>
        <div className="mt-10 grid grid-cols-2 gap-2">
          <Link to="/" className="btn btn-line btn-lg">쇼핑몰로</Link>
          <Link to="/admin/applications" className="btn btn-ink btn-lg">관리자 화면에서 확인 →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1080px] mx-auto px-4 md:px-6 pt-10 grid lg:grid-cols-[300px_1fr] gap-10">
      <aside>
        <div className="lg:sticky lg:top-24">
          <div className="eyebrow">Seller onboarding</div>
          <h1 className="mt-2 text-[28px] font-bold tracking-tight leading-tight">곳간에<br />가게 열기</h1>
          <ol className="mt-8 space-y-1">
            {STEPS.map((s, i) => (
              <li key={s} className={cx('flex items-center gap-3 h-11 px-3 text-[14px]', i === step ? 'bg-ink text-white font-semibold' : i < step ? 'text-ink' : 'text-mute')}>
                <span className={cx('w-6 h-6 flex items-center justify-center text-[12px] num border', i === step ? 'border-white' : i < step ? 'bg-ink text-white border-ink' : 'border-line-2')}>{i < step ? <Check size={13} /> : i + 1}</span>{s}
              </li>
            ))}
          </ol>
          <div className="mt-8 bg-cream p-5 text-[13px] leading-relaxed">
            <b>입점 혜택</b>
            <ul className="mt-2 space-y-1 text-ink-2">
              <li>· 첫 3개월 판매수수료 50% 지원</li>
              <li>· 주 1회 정산 (구매확정 기준)</li>
              <li>· 신규 스토어 메인 노출 2주</li>
            </ul>
          </div>
        </div>
      </aside>

      <div className="border-t-2 border-ink pt-6">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-[20px] font-bold">판매자 정보</h2>
            <Field label="사업자 구분" req>
              <div className="grid grid-cols-2 gap-2">
                {['개인', '법인'].map((t) => <button key={t} onClick={() => setBizType(t)} className={cx('h-11 border text-sm', bizType === t ? 'border-ink border-2 font-bold' : 'border-line-2')}>{t}사업자</button>)}
              </div>
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="상호명" req><input className="field" placeholder="사업자등록증 상 상호" /></Field>
              <Field label="대표자명" req><input className="field" /></Field>
              <Field label="사업자등록번호" req hint="국세청 사업자 상태 조회로 자동 검증됩니다."><div className="flex gap-2"><input className="field num" placeholder="000-00-00000" /><button className="btn btn-line shrink-0">조회</button></div></Field>
              <Field label="통신판매업 신고번호" req><input className="field num" placeholder="2026-서울성동-0000" /></Field>
              <Field label="담당자 휴대폰" req><input className="field num" placeholder="010-0000-0000" /></Field>
              <Field label="담당자 이메일" req><input className="field" placeholder="심사 결과를 받을 이메일" /></Field>
            </div>
            <Field label="사업장 주소" req><div className="flex gap-2"><input className="field" placeholder="주소 검색" /><button className="btn btn-line shrink-0">검색</button></div></Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-[20px] font-bold">스토어 · 카테고리 · 판매 예정 상품</h2>
            <Field label="스토어 이름" req hint="쇼핑몰에 노출되는 이름입니다. 승인 후 1회 변경 가능."><input className="field" placeholder="예) 오롯이 리넨" /></Field>
            <Field label="스토어 주소" req><div className="flex items-center border border-line-2 h-10 px-3 text-sm"><span className="text-mute">gotgan.kr/store/</span><input className="flex-1 outline-none" placeholder="my-store" /></div></Field>
            <Field label="대표 카테고리" req hint="카테고리에 따라 판매수수료가 달라집니다.">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((x) => (
                  <button key={x.id} onClick={() => setCat(x.id)} className={cx('h-14 border text-left px-3', cat === x.id ? 'border-ink border-2' : 'border-line-2 hover:border-ink')}>
                    <div className="text-[14px] font-semibold">{x.name}</div>
                    <div className="text-[11.5px] text-mute">수수료 {pct(x.commission)}</div>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="판매 예정 상품" req hint={`대표 상품 2개 이상 입력. 세부 분류: ${c.subs.join(', ')}`}>
              <div className="space-y-2">
                {items.map((v, i) => (
                  <div key={i} className="grid grid-cols-[1fr_120px_140px] gap-2">
                    <input className="field" placeholder={`상품명 ${i + 1}`} value={v} onChange={(e) => setItems(items.map((x, k) => (k === i ? e.target.value : x)))} />
                    <select className="field">{c.subs.map((s) => <option key={s}>{s}</option>)}</select>
                    <input className="field num" placeholder="예상 판매가" />
                  </div>
                ))}
                <button onClick={() => setItems([...items, ''])} className="btn btn-ghost btn-sm">+ 상품 추가</button>
              </div>
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="월 예상 매출"><select className="field"><option>500만원 미만</option><option>500만 ~ 2,000만원</option><option>2,000만 ~ 1억</option><option>1억 이상</option></select></Field>
              <Field label="운영 중인 채널"><input className="field" placeholder="자사몰, 인스타그램 등 URL" /></Field>
            </div>
            <Field label="스토어 소개"><textarea rows={4} className="field" placeholder="어떤 가게인지, 어떤 상품을 만드는지 소개해주세요." /></Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="text-[20px] font-bold mb-2">서류 제출</h2>
            <p className="text-[13px] text-mute mb-4">PDF, JPG, PNG (최대 10MB) · 발급일 3개월 이내</p>
            <Doc name="사업자등록증" desc="사업자등록증 사본" done={docs.biz} onToggle={() => setDocs({ ...docs, biz: !docs.biz })} />
            <Doc name="통신판매업 신고증" desc="정부24에서 발급 가능" done={docs.ecom} onToggle={() => setDocs({ ...docs, ecom: !docs.ecom })} />
            <Doc name="정산 계좌 통장 사본" desc="사업자 명의 계좌 (개인사업자는 대표자 명의 가능)" done={docs.bank} onToggle={() => setDocs({ ...docs, bank: !docs.bank })} />
            <Doc name="대표 상품 사진" desc="실제 판매할 상품 사진 3장 이상" done={docs.sample} onToggle={() => setDocs({ ...docs, sample: !docs.sample })} />
            {['food', 'beauty', 'digital'].includes(cat) && (
              <div className="bg-amber-soft text-amber text-[13px] p-4 mt-4">
                <b>{c.name}</b> 카테고리는 추가 서류가 필요합니다: {cat === 'food' ? '영업신고증 또는 농업경영체 등록확인서' : cat === 'beauty' ? '화장품 책임판매업 등록필증' : 'KC 인증서 (전파/전기용품)'}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-[20px] font-bold">정산 계좌 · 약관</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="은행" req><select className="field"><option>기업은행</option><option>국민은행</option><option>신한은행</option><option>우리은행</option><option>하나은행</option><option>농협</option></select></Field>
              <Field label="계좌번호" req><input className="field num" /></Field>
              <Field label="예금주" req><input className="field" /></Field>
            </div>
            <div className="border border-line">
              <div className="px-4 h-11 flex items-center bg-cream font-semibold text-[14px] border-b border-line">정산 정책 요약</div>
              <table className="w-full text-[13px]">
                <tbody>
                  {[['판매수수료', `${c.name} ${pct(c.commission)} (첫 3개월 ${pct(c.commission / 2, 1)})`], ['결제수수료', '2.2% (PG사 수수료)'], ['정산 기준', '구매확정일 (배송완료 7일 후 자동 확정)'], ['정산 주기', '주 1회 · 월~일 확정분을 다음 주 목요일 지급'], ['지급 보류', '클레임 미처리, 스토어 정지 시 해당 건 지급 보류']].map(([k, v]) => (
                    <tr key={k} className="border-b border-line last:border-0"><th className="w-28 text-left font-medium text-ink-2 px-4 py-2.5">{k}</th><td className="px-4 py-2.5">{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 text-[13px]">
              <Checkbox checked={agree} onChange={setAgree} label={<b>아래 약관에 모두 동의합니다</b>} />
              {['(필수) 곳간 판매자 이용약관', '(필수) 전자금융거래 이용약관', '(필수) 개인정보 수집 및 이용 동의', '(선택) 판매자 마케팅 소식 수신'].map((t) => <div key={t} className="pl-7 text-mute">{t}</div>)}
            </div>
          </div>
        )}

        <div className="mt-10 pt-5 border-t border-line flex justify-between">
          <button disabled={step === 0} onClick={() => setStep(step - 1)} className="btn btn-line">이전</button>
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} className="btn btn-ink px-8">다음 단계</button>
          ) : (
            <button disabled={!agree} onClick={() => { setDone(true); window.scrollTo(0, 0); }} className="btn btn-point px-8">입점 신청하기</button>
          )}
        </div>
      </div>
    </div>
  );
}
