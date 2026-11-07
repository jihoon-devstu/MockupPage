import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../lib/store';
import { Upload, Check, FileText, X } from 'lucide-react';
import { categories } from '../../data/catalog';
import { Checkbox } from '../../components/ui';
import { cx, ymd, ymdhm, daysAgo, TODAY } from '../../lib/format';

/* 입점 신청 — 실제 구현(frontend #63 · #65 · #66, 박지연)과 같은 화면
   들어오면 내 신청 상태(GET /api/seller/apply/me): 없으면 4단계 폼 / 있으면 상태 화면(심사대기 · 보완요청 · 반려 · 승인)
   보완요청이면 "보완 제출하기" → 제출 내용이 채워진 한 페이지 폼(틀린 칸만 고쳐 재제출)
   목업 미리보기: ?status=PENDING | SUPPLEMENT | REJECTED | REJECTED_WAIT | APPROVED (없으면 신청 폼) */
const STEPS = ['판매자 정보', '스토어 · 상품', '서류 제출', '정산 · 약관'];
const STATUS_LABEL = { PENDING: '심사대기', SUPPLEMENT: '보완요청', APPROVED: '승인', REJECTED: '반려' };
const ACTOR_LABEL = { APPLICANT: '신청자', ADMIN: '곳간 운영팀', SYSTEM: '시스템' };
const BIZ_TYPES = ['개인사업자', '법인사업자'];
const DOC_TYPES = [
  { value: 'BUSINESS_REG', label: '사업자등록증', desc: '사업자등록증 사본' },
  { value: 'ECOMMERCE_REG', label: '통신판매업 신고증', desc: '정부24에서 발급 가능' },
  { value: 'BANK_COPY', label: '정산 계좌 통장 사본', desc: '사업자 명의 계좌 (개인사업자는 대표자 명의 가능)' },
  { value: 'PRODUCT_PHOTO', label: '대표 상품 사진', desc: '실제 판매할 상품 사진 3~10장', multiple: true },
];
// 판매수수료 범위 — 수수료 안내(/fees)와 같은 표(시드값)에서 계산. 수수료 안내는 새 탭(작성 중인 신청서 유지)
const COMMISSION_RANGE = '6%–11%';
const FeesLink = () => <Link to="/fees" target="_blank" rel="noopener noreferrer" className="underline">수수료 안내</Link>;
const DOC_LABEL = Object.fromEntries(DOC_TYPES.map((d) => [d.value, d.label]));
const EXPECTED_SALES = ['선택 안 함', '500만원 미만', '500만 ~ 2,000만원', '2,000만 ~ 1억', '1억 이상'];
const BANKS = ['기업은행', '국민은행', '신한은행', '우리은행', '하나은행', '농협'];
const FIELD_LABEL = {
  bizType: '사업자 구분', companyName: '상호명', ownerName: '대표자명', bizRegNo: '사업자등록번호', ecommerceRegNo: '통신판매업 신고번호',
  managerPhone: '담당자 휴대폰', managerEmail: '담당자 이메일', businessAddress: '사업장 주소', storeName: '스토어 이름', slug: '스토어 주소',
  categoryId: '대표 카테고리', intro: '스토어 소개', expectedMonthlySales: '월 예상 매출', salesChannel: '운영 중인 채널', bank: '은행', number: '계좌번호', holder: '예금주',
};

// 내 신청 상태 예시 (store.md 2-2절 모양)
const SUBMITTED = {
  bizType: '개인사업자', companyName: '바람결 리빙', ownerName: '김하늘', bizRegNo: '123-45-67890', ecommerceRegNo: '2026-서울마포-0123',
  managerPhone: '010-1234-5678', managerEmail: 'sky@example.com', businessAddress: '서울 마포구 월드컵로 12길 3, 2층',
  storeName: '바람결 리빙', slug: 'baramgyeol', categoryId: 'living', intro: '손으로 엮은 라탄 소품을 만듭니다.', expectedMonthlySales: '500만원 미만', salesChannel: '',
  products: [{ name: '라탄 바구니 M', sub: '수납', price: 38000 }, { name: '라탄 트레이', sub: '수납', price: 26000 }],
  bank: '국민은행', number: '123456-01-234567', holder: '김하늘',
  documents: [['BUSINESS_REG', '사업자등록증.pdf'], ['ECOMMERCE_REG', '통신판매업신고증.pdf'], ['BANK_COPY', '통장사본.jpg'], ['PRODUCT_PHOTO', 'basket.jpg, tray.jpg, lamp.jpg']],
};
const history = (...rows) => rows.map(([toStatus, d, actor, reason]) => ({ toStatus, changedAt: daysAgo(d), actor, reason }));
const ME = {
  PENDING: { status: 'PENDING', applicationNo: 'AP-2610-0101', storeName: '바람결 리빙', history: history(['PENDING', 2, 'APPLICANT']) },
  SUPPLEMENT: {
    status: 'SUPPLEMENT', applicationNo: 'AP-2610-0102', storeName: '바람결 리빙', supplementDueAt: new Date(TODAY.getTime() + 5 * 864e5),
    statusReason: '통신판매업 신고증의 상호가 신청서와 다릅니다. 같은 상호로 발급된 신고증을 다시 올려 주세요.', requestedDocs: ['ECOMMERCE_REG'],
    history: history(['PENDING', 4, 'APPLICANT'], ['SUPPLEMENT', 2, 'ADMIN', '통신판매업 신고증 상호 불일치']),
  },
  REJECTED: {
    status: 'REJECTED', applicationNo: 'AP-2609-0077', storeName: '바람결 리빙', reapplyAvailableAt: daysAgo(1),
    statusReason: '판매 예정 상품이 곳간 취급 카테고리와 맞지 않습니다.', requestedDocs: [],
    history: history(['PENDING', 35, 'APPLICANT'], ['REJECTED', 31, 'ADMIN', '취급 카테고리 불일치']),
  },
  REJECTED_WAIT: {
    status: 'REJECTED', applicationNo: 'AP-2610-0090', storeName: '바람결 리빙', reapplyAvailableAt: new Date(TODAY.getTime() + 26 * 864e5),
    statusReason: '사업자 상태가 휴업으로 확인됩니다.', requestedDocs: [],
    history: history(['PENDING', 6, 'APPLICANT'], ['REJECTED', 4, 'ADMIN', '사업자 휴업']),
  },
  APPROVED: { status: 'APPROVED', applicationNo: 'AP-2610-0055', storeName: '바람결 리빙', history: history(['PENDING', 5, 'APPLICANT'], ['APPROVED', 3, 'ADMIN']) },
};

function Field({ label, req, children, hint }) {
  return (
    <div>
      <label className="label">{label}{req && <span className="text-point ml-0.5">*</span>}</label>
      {children}
      {hint && <p className="text-[12px] text-mute mt-1.5">{hint}</p>}
    </div>
  );
}

// 서류 한 칸 — current 는 재제출 화면의 "지금 낸 파일"
function Doc({ type, done, onToggle, current }) {
  return (
    <div className={cx('border p-4 flex items-center gap-4', done ? 'border-ink' : 'border-dashed border-line-2')}>
      <div className={cx('w-10 h-10 flex items-center justify-center shrink-0', done ? 'bg-ink text-white' : 'bg-cream text-mute')}>{done ? <FileText size={18} /> : <Upload size={18} />}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold">{type.label} <span className="text-point">*</span></div>
        <div className="text-[12px] text-mute truncate">{done ? (type.multiple ? 'photo1.jpg, photo2.jpg, photo3.jpg · 3장' : `${type.label.replace(/\s/g, '')}.pdf`) : current ? `지금 낸 파일: ${current}` : type.desc}</div>
      </div>
      {done && type.multiple && <button className="btn btn-sm btn-line">추가</button>}
      <button onClick={onToggle} className={cx('btn btn-sm', done ? 'btn-ghost' : 'btn-line')}>{done ? <X size={14} /> : '파일 선택'}</button>
    </div>
  );
}

export default function SellerApply() {
  const [sp] = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [reapply, setReapply] = useState(false);
  const [resubmit, setResubmit] = useState(false);
  const me = submitted ? ME.PENDING : ME[sp.get('status')];
  if (me?.status === 'SUPPLEMENT' && resubmit) return <Resubmit me={me} onCancel={() => setResubmit(false)} onDone={() => { setResubmit(false); setSubmitted(true); }} />;
  if (me && !reapply) return <ApplicationStatus me={me} onReapply={() => setReapply(true)} onResubmit={() => { setResubmit(true); window.scrollTo(0, 0); }} />;
  return <ApplyForm onSubmit={() => { setReapply(false); setSubmitted(true); window.scrollTo(0, 0); }} />;
}

/* ─── 내 신청 상태 ─── */
function ApplicationStatus({ me, onReapply, onResubmit }) {
  const canReapply = me.status === 'REJECTED' && me.reapplyAvailableAt <= TODAY;
  const TITLE = {
    PENDING: ['Under review', '입점 신청을 심사하고 있습니다', '심사 결과는 영업일 기준 3일 이내 이메일로 안내드려요.'],
    SUPPLEMENT: ['Supplement requested', '보완이 필요한 항목이 있습니다', `${me.supplementDueAt ? ymd(me.supplementDueAt) : ''}까지 보완하지 않으면 자동으로 반려돼요.`],
    REJECTED: ['Rejected', '입점 신청이 반려되었습니다', `${ymd(me.reapplyAvailableAt ?? TODAY)}부터 다시 신청할 수 있어요.`],
    APPROVED: ['Approved', '입점이 승인되었습니다', '판매자 권한은 다시 로그인하면 적용돼요. 판매자센터에서 상품을 등록해 보세요.'],
  }[me.status];
  return (
    <div className="max-w-[640px] mx-auto px-4 pt-20">
      <div className="eyebrow">{TITLE[0]}</div>
      <h1 className="mt-2 text-[28px] font-bold tracking-tight">{TITLE[1]}</h1>
      <p className="mt-2 text-ink-2 text-sm">접수번호 <b className="num">{me.applicationNo}</b> · {me.storeName} · {TITLE[2]}</p>
      {me.statusReason && (
        <div className="mt-6 bg-cream p-5 text-[13px] leading-relaxed">
          <b>{me.status === 'REJECTED' ? '반려 사유' : '보완 요청'}</b>
          <p className="mt-1 text-ink-2">{me.statusReason}</p>
          {me.requestedDocs.length > 0 && <p className="mt-2 text-ink-2">다시 낼 서류: {me.requestedDocs.map((d) => DOC_LABEL[d]).join(' · ')}</p>}
        </div>
      )}
      <ol className="mt-10 border-l-2 border-line ml-2">
        {me.history.map((h, i) => (
          <li key={i} className="relative pl-6 pb-7 last:pb-0">
            <span className={cx('absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2', i === me.history.length - 1 ? 'bg-point border-point' : 'bg-white border-line-2')} />
            <div className="font-semibold text-[15px]">{String(i + 1).padStart(2, '0')}. {STATUS_LABEL[h.toStatus]}</div>
            <div className="text-[13px] text-mute mt-0.5">{ymdhm(h.changedAt)} · {ACTOR_LABEL[h.actor]}{h.reason && ` · ${h.reason}`}</div>
          </li>
        ))}
      </ol>
      <div className="mt-10 grid grid-cols-2 gap-2">
        <Link to="/" className="btn btn-line btn-lg">쇼핑몰로</Link>
        {me.status === 'APPROVED' && <Link to="/seller" className="btn btn-ink btn-lg">판매자센터로 →</Link>}
        {canReapply && <button onClick={onReapply} className="btn btn-ink btn-lg">다시 신청하기</button>}
        {me.status === 'SUPPLEMENT' && <button onClick={onResubmit} className="btn btn-ink btn-lg">보완 제출하기</button>}
      </div>
    </div>
  );
}

/* ─── 신청 폼 (4단계) ─── */
function ApplyForm({ onSubmit }) {
  const { toast } = useApp();
  const [step, setStep] = useState(0);
  const [bizType, setBizType] = useState(BIZ_TYPES[0]);
  const [cat, setCat] = useState(categories[0].id);
  const [items, setItems] = useState(['', '']);
  const [docs, setDocs] = useState({});
  const [agree, setAgree] = useState({ sellerTerms: false, electronicFinance: false, privacy: false, marketing: false });
  const c = categories.find((x) => x.id === cat);
  // 목업: 실제 화면 검사 중 서류 개수만 흉내 (빈칸 · 형식 검사는 생략)
  const next = () => {
    if (step === 2 && !DOC_TYPES.every((t) => docs[t.value])) { toast('서류 3종을 모두 올려 주세요'); return; }
    setStep(step + 1);
  };

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
              <li>· 판매수수료 상위 카테고리별 {COMMISSION_RANGE} · 결제수수료 2.2% (<FeesLink />)</li>
              <li>· 주 1회 정산 (구매확정 기준)</li>
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
                {BIZ_TYPES.map((t) => <button key={t} onClick={() => setBizType(t)} className={cx('h-11 border text-sm', bizType === t ? 'border-ink border-2 font-bold' : 'border-line-2')}>{t}</button>)}
              </div>
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="상호명" req><input className="field" placeholder="사업자등록증 상 상호" /></Field>
              <Field label="대표자명" req><input className="field" /></Field>
              <Field label="사업자등록번호" req><input className="field num" placeholder="000-00-00000" /></Field>
              <Field label="통신판매업 신고번호" req><input className="field num" placeholder="2026-서울성동-0000" /></Field>
              <Field label="담당자 휴대폰" req><input className="field num" placeholder="010-0000-0000" /></Field>
              <Field label="담당자 이메일" req hint="심사 결과를 이 주소로 보내드려요."><input className="field" placeholder="seller@example.com" /></Field>
            </div>
            <Field label="사업장 주소" req>
              <div className="flex gap-2"><input className="field" placeholder="주소 검색 후 상세 주소를 덧붙여 주세요" /><button className="btn btn-line shrink-0">검색</button></div>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-[20px] font-bold">스토어 · 카테고리 · 판매 예정 상품</h2>
            <Field label="스토어 이름" req hint="쇼핑몰에 노출되는 이름입니다. 승인 후 변경하려면 관리자 승인이 필요해요."><input className="field" placeholder="예) 오롯이 리넨" /></Field>
            <Field label="스토어 주소" req hint="영소문자 · 숫자 · 하이픈 3~30자. 승인 후 변경할 수 없어요."><div className="flex items-center border border-line-2 h-10 px-3 text-sm"><span className="text-mute shrink-0">{window.location.host}/store/</span><input className="flex-1 min-w-0 outline-none" placeholder="my-store" /></div></Field>
            <Field label="대표 카테고리" req hint="카테고리에 따라 판매수수료가 달라집니다.">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((x) => (
                  <button key={x.id} onClick={() => setCat(x.id)} className={cx('h-14 border text-left px-3', cat === x.id ? 'border-ink border-2' : 'border-line-2 hover:border-ink')}>
                    <div className="text-[14px] font-semibold">{x.name}</div>
                    <div className="text-[11.5px] text-mute">{x.en}</div>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="판매 예정 상품" req hint="대표 상품 2~10개. 상품명 · 세부 분류 · 예상 판매가">
              <div className="space-y-2">
                {items.map((v, i) => (
                  <div key={i} className="grid grid-cols-[1fr_120px_140px] gap-2">
                    <input className="field" placeholder={`상품명 ${i + 1}`} defaultValue={v} />
                    <select className="field">{c.subs.map((s) => <option key={s}>{s}</option>)}</select>
                    <input className="field num" placeholder="예상 판매가" />
                  </div>
                ))}
                {items.length < 10 && <button onClick={() => setItems([...items, ''])} className="btn btn-ghost btn-sm">+ 상품 추가</button>}
              </div>
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="월 예상 매출"><select className="field">{EXPECTED_SALES.map((o) => <option key={o}>{o}</option>)}</select></Field>
              <Field label="운영 중인 채널"><input className="field" placeholder="자사몰, 인스타그램 등 URL" /></Field>
            </div>
            <Field label="스토어 소개"><textarea rows={4} className="field" placeholder="어떤 가게인지, 어떤 상품을 만드는지 소개해주세요." /></Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="text-[20px] font-bold mb-2">서류 제출</h2>
            <p className="text-[13px] text-mute mb-4">PDF, JPG, PNG (최대 10MB) · 발급일 3개월 이내 · 상품 사진은 JPG, PNG</p>
            {DOC_TYPES.map((t) => <Doc key={t.value} type={t} done={docs[t.value]} onToggle={() => setDocs({ ...docs, [t.value]: !docs[t.value] })} />)}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-[20px] font-bold">정산 계좌 · 약관</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="은행" req><select className="field">{BANKS.map((b) => <option key={b}>{b}</option>)}</select></Field>
              <Field label="계좌번호" req><input className="field num" /></Field>
              <Field label="예금주" req><input className="field" /></Field>
            </div>
            <div className="border border-line">
              <div className="px-4 h-11 flex items-center bg-cream font-semibold text-[14px] border-b border-line">정산 정책 요약</div>
              <table className="w-full text-[13px]">
                <tbody>
                  {[['판매수수료', <>상위 카테고리별 {COMMISSION_RANGE} (<FeesLink />)</>], ['결제수수료', '2.2% (PG사 수수료)'], ['정산 기준', '구매확정일 (배송완료 7일 후 자동 확정)'], ['정산 주기', '주 1회 · 월~일 확정분을 다음 주 목요일 지급'], ['지급 보류', '클레임 미처리, 스토어 정지 시 해당 건 지급 보류']].map(([k, v]) => (
                    <tr key={k} className="border-b border-line last:border-0"><th className="w-28 text-left font-medium text-ink-2 px-4 py-2.5">{k}</th><td className="px-4 py-2.5">{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 text-[13px]">
              {[['sellerTerms', '(필수) 곳간 판매자 이용약관'], ['electronicFinance', '(필수) 전자금융거래 이용약관'], ['privacy', '(필수) 개인정보 수집 및 이용 동의'], ['marketing', '(선택) 판매자 마케팅 소식 수신']].map(([k, t]) => (
                <Checkbox key={k} checked={agree[k]} onChange={(v) => setAgree({ ...agree, [k]: v })} label={t} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 pt-5 border-t border-line flex justify-between">
          <button disabled={step === 0} onClick={() => setStep(step - 1)} className="btn btn-line">이전</button>
          {step < 3 ? (
            <button onClick={next} className="btn btn-ink px-8">다음 단계</button>
          ) : (
            <button onClick={() => { if (!(agree.sellerTerms && agree.electronicFinance && agree.privacy)) { toast('필수 약관에 동의해 주세요'); return; } onSubmit(); }} className="btn btn-point px-8">입점 신청하기</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 보완 재제출 — 제출한 내용으로 채운 한 페이지 폼, 바꾼 칸만 보냄 ─── */
function Resubmit({ me, onCancel, onDone }) {
  const { toast } = useApp();
  const [form, setForm] = useState(SUBMITTED);
  const [docs, setDocs] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const changed = Object.keys(FIELD_LABEL).filter((k) => form[k] !== SUBMITTED[k]);
  const needDocs = DOC_TYPES.filter((t) => me.requestedDocs.includes(t.value));
  const changedCount = changed.length + needDocs.length;
  const current = (type) => SUBMITTED.documents.find(([t]) => t === type)?.[1];
  const submit = () => {
    // 실제 resubmitConfirmMessage 와 같은 문구
    const names = [...changed.map((k) => FIELD_LABEL[k]), ...needDocs.map((t) => `${t.label}(다시 냄)`)];
    if (window.confirm(names.length ? `바꾼 항목: ${names.join(' · ')}\n제출하면 다시 심사받습니다. 제출할까요?` : '바꾼 항목이 없어요. 확인만 제출할까요?')) { toast('보완 내용을 제출했어요. 다시 심사해 드릴게요.'); onDone(); }
  };

  return (
    <div className="max-w-[760px] mx-auto px-4 pt-10">
      <div className="eyebrow">Supplement</div>
      <h1 className="mt-2 text-[28px] font-bold tracking-tight">보완 제출</h1>
      <p className="mt-2 text-ink-2 text-sm">접수번호 <b className="num">{me.applicationNo}</b> · {ymd(me.supplementDueAt)}까지 제출해 주세요. 제출한 내용이 채워져 있어요 — 틀린 칸만 고치면 돼요.</p>
      <div className="mt-6 bg-cream p-5 text-[13px] leading-relaxed">
        <b>보완 요청</b>
        <p className="mt-1 text-ink-2">{me.statusReason}</p>
      </div>

      <section className="mt-10 space-y-3">
        <h2 className="text-[18px] font-bold">다시 낼 서류</h2>
        {needDocs.length === 0
          ? <p className="text-[13px] text-mute">다시 낼 서류는 없어요. 아래에서 고칠 내용만 수정해 주세요.</p>
          : <p className="text-[13px] text-mute">PDF, JPG, PNG (최대 10MB) · 상품 사진은 JPG, PNG</p>}
        {needDocs.map((t) => <Doc key={t.value} type={t} current={current(t.value)} done={docs[t.value]} onToggle={() => setDocs({ ...docs, [t.value]: !docs[t.value] })} />)}
      </section>

      <section className="mt-10 space-y-5">
        <h2 className="text-[18px] font-bold">판매자 정보</h2>
        <Field label="사업자 구분" req hint="사업자 구분 · 대표자명 · 사업자등록번호를 바꾸면 사업자등록증도 다시 내야 해요.">
          <div className="grid grid-cols-2 gap-2">
            {BIZ_TYPES.map((t) => <button key={t} onClick={() => setForm({ ...form, bizType: t })} className={cx('h-11 border text-sm', form.bizType === t ? 'border-ink border-2 font-bold' : 'border-line-2')}>{t}</button>)}
          </div>
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          {['companyName', 'ownerName', 'bizRegNo', 'ecommerceRegNo', 'managerPhone', 'managerEmail'].map((k) => (
            <Field key={k} label={FIELD_LABEL[k]} req><input className="field" value={form[k]} onChange={set(k)} /></Field>
          ))}
        </div>
        <Field label="사업장 주소" req><div className="flex gap-2"><input className="field" value={form.businessAddress} onChange={set('businessAddress')} /><button className="btn btn-line shrink-0">검색</button></div></Field>
      </section>

      <section className="mt-10 space-y-5">
        <h2 className="text-[18px] font-bold">스토어 · 상품</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="스토어 이름" req><input className="field" value={form.storeName} onChange={set('storeName')} /></Field>
          <Field label="스토어 주소" req hint="영소문자 · 숫자 · 하이픈 3~30자"><input className="field" value={form.slug} onChange={set('slug')} /></Field>
        </div>
        <Field label="대표 카테고리" req>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map((x) => <button key={x.id} onClick={() => setForm({ ...form, categoryId: x.id })} className={cx('h-12 border text-left px-3 text-[14px]', form.categoryId === x.id ? 'border-ink border-2 font-semibold' : 'border-line-2 hover:border-ink')}>{x.name}</button>)}
          </div>
        </Field>
        <Field label="판매 예정 상품" req hint="대표 상품 2~10개">
          <div className="space-y-2">
            {form.products.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_140px] gap-2">
                <input className="field" defaultValue={p.name} />
                <select className="field" defaultValue={p.sub}>{[...new Set([p.sub, ...(categories.find((x) => x.id === form.categoryId)?.subs ?? [])])].map((s) => <option key={s}>{s}</option>)}</select>
                <input className="field num" type="number" min="1" placeholder="예상 판매가" defaultValue={p.price} />
              </div>
            ))}
            {form.products.length < 10 && <button type="button" onClick={() => setForm({ ...form, products: [...form.products, { name: '', sub: '', price: '' }] })} className="btn btn-ghost btn-sm">+ 상품 추가</button>}
          </div>
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="월 예상 매출"><select className="field" value={form.expectedMonthlySales} onChange={set('expectedMonthlySales')}>{EXPECTED_SALES.map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="운영 중인 채널"><input className="field" value={form.salesChannel} onChange={set('salesChannel')} /></Field>
        </div>
        <Field label="스토어 소개"><textarea rows={4} className="field" value={form.intro} onChange={set('intro')} /></Field>
      </section>

      <section className="mt-10 space-y-5">
        <h2 className="text-[18px] font-bold">정산 계좌</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="은행" req><select className="field" value={form.bank} onChange={set('bank')}>{BANKS.map((b) => <option key={b}>{b}</option>)}</select></Field>
          <Field label="계좌번호" req><input className="field num" value={form.number} onChange={set('number')} /></Field>
          <Field label="예금주" req><input className="field" value={form.holder} onChange={set('holder')} /></Field>
        </div>
      </section>

      <div className="mt-10 pt-5 border-t border-line flex items-center justify-between gap-3">
        <button onClick={onCancel} className="btn btn-line">취소</button>
        <span className="text-[13px] text-mute">{changedCount ? `고친 항목 ${changedCount}개` : '고친 항목 없음 — 확인만 제출돼요'}</span>
        <button onClick={submit} className="btn btn-point px-8">보완 제출하기</button>
      </div>
    </div>
  );
}
