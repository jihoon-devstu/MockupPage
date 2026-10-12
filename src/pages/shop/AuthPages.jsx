import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Search } from 'lucide-react';
import { Checkbox } from '../../components/ui';
import { useApp } from '../../lib/store';
import { cx } from '../../lib/format';
import { faqs, FAQ_CATS } from '../../data/faq';

/* 목업: 로그인 / 회원가입은 화면 이동만. 실제로는 자체 폼 → user-service → Keycloak (역할 BUYER · SELLER · ADMIN) */
export function Login() {
  const nav = useNavigate();
  const [tab, setTab] = useState('buyer');
  const dest = { buyer: '/mypage', seller: '/seller', admin: '/admin' }[tab];
  return (
    <div className="max-w-[400px] mx-auto px-4 pt-16">
      <h1 className="text-[26px] font-bold tracking-tight text-center">로그인</h1>
      <div className="mt-8 grid grid-cols-3 border border-line-2 text-[13px]">
        {[['buyer', '구매회원'], ['seller', '판매자'], ['admin', '운영자']].map(([k, l], i) => (
          <button key={k} onClick={() => setTab(k)} className={cx('h-10', i && 'border-l border-line-2', tab === k ? 'bg-ink text-white font-semibold' : 'text-ink-2')}>{l}</button>
        ))}
      </div>
      <form className="mt-6 space-y-2.5" onSubmit={(e) => { e.preventDefault(); nav(dest); }}>
        <input className="field h-12" placeholder="이메일" />
        <input className="field h-12" type="password" placeholder="비밀번호" />
        <div className="flex justify-between items-center py-1 text-[13px]">
          <Checkbox checked label="로그인 상태 유지" />
          <span className="text-mute">아이디 · 비밀번호 찾기</span>
        </div>
        <button className="btn btn-ink btn-lg w-full">로그인</button>
      </form>
      {tab === 'buyer' && (
        <>
          <p className="mt-8 text-center text-[13px] text-ink-2">아직 회원이 아니신가요? <Link to="/signup" className="font-bold underline">회원가입</Link></p>
        </>
      )}
      {tab === 'seller' && <p className="mt-8 text-center text-[13px] text-ink-2">아직 입점 전이신가요? <Link to="/seller/apply" className="font-bold underline">입점 신청하기</Link></p>}
      {tab === 'admin' && <p className="mt-8 text-center text-[12px] text-mute">운영자 계정은 곳간 운영팀에서 발급합니다.</p>}
    </div>
  );
}

export function Signup() {
  const nav = useNavigate();
  const { toast } = useApp();
  const [all, setAll] = useState(false);
  return (
    <div className="max-w-[440px] mx-auto px-4 pt-16">
      <h1 className="text-[26px] font-bold tracking-tight">회원가입</h1>
      <p className="mt-1 text-sm text-mute">결제할 때마다 실결제금액의 5%가 포인트로 적립돼요.</p>
      <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); toast('가입을 환영해요! 로그인해주세요'); nav('/login'); }}>
        <div><label className="label">이메일</label><div className="flex gap-2"><input className="field" placeholder="example@email.com" /><button type="button" className="btn btn-line shrink-0">중복확인</button></div></div>
        <div><label className="label">비밀번호</label><input type="password" className="field" placeholder="영문, 숫자, 특수문자 포함 8자 이상" /></div>
        <div><label className="label">비밀번호 확인</label><input type="password" className="field" /></div>
        <div><label className="label">이름</label><input className="field" /></div>
        <div><label className="label">휴대폰 번호</label><div className="flex gap-2"><input className="field" placeholder="010-0000-0000" /><button type="button" onClick={() => toast('인증번호를 보냈어요 (목업)')} className="btn btn-line shrink-0">인증요청</button></div></div>
        <div className="border border-line p-4 space-y-2.5 text-[13px]">
          <Checkbox checked={all} onChange={setAll} label={<b>전체 동의</b>} />
          <div className="h-px bg-line" />
          {['(필수) 만 14세 이상입니다', '(필수) 이용약관 동의', '(필수) 개인정보 수집·이용 동의', '(선택) 마케팅 정보 수신 동의'].map((t) => <Checkbox key={t} checked={all} onChange={() => {}} label={t} />)}
        </div>
        <button className="btn btn-ink btn-lg w-full">가입하기</button>
      </form>
    </div>
  );
}

export function Help() {
  const [cat, setCat] = useState('전체');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(0);
  const list = faqs.filter((f) => (cat === '전체' || f.cat === cat) && (!q || (f.q + f.a).includes(q)));
  return (
    <div className="max-w-[860px] mx-auto px-4 md:px-6 pt-10">
      <div className="eyebrow">Help center</div>
      <h1 className="mt-2 text-[28px] font-bold tracking-tight">고객센터</h1>
      <div className="mt-6 relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(-1); }} className="field h-12 pl-11" placeholder="궁금한 내용을 검색해보세요 (예: 포인트, 반품)" />
      </div>

      <h2 className="mt-10 text-[18px] font-bold border-b border-ink pb-3">자주 묻는 질문</h2>
      <div className="flex gap-1.5 flex-wrap py-4">
        {['전체', ...FAQ_CATS].map((c) => (
          <button key={c} onClick={() => { setCat(c); setOpen(-1); }} className={cx('h-8 px-3 text-[13px] border', cat === c ? 'border-ink bg-ink text-white' : 'border-line-2 text-ink-2 hover:border-ink')}>{c}</button>
        ))}
      </div>
      <ul className="border-t border-line">
        {list.length === 0 && <li className="py-12 text-center text-sm text-mute">검색 결과가 없어요.</li>}
        {list.map((f, i) => (
          <li key={f.q} className="border-b border-line">
            <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center gap-4 py-5 text-left">
              <span className="w-24 shrink-0 text-[12px] text-mute">{f.cat}</span>
              <span className="flex-1 font-medium">{f.q}</span>
              <ChevronDown size={18} className={cx('transition-transform shrink-0', open === i && 'rotate-180')} />
            </button>
            {open === i && <p className="pb-5 pl-28 pr-6 text-[14px] text-ink-2 leading-relaxed">{f.a}</p>}
          </li>
        ))}
      </ul>

      <div className="mt-12 grid sm:grid-cols-2 gap-px bg-line border border-line">
        <div className="bg-white p-6">
          <div className="eyebrow">Q&amp;A</div>
          <div className="mt-1.5 font-bold text-[16px]">상품문의는 판매자에게</div>
          <p className="mt-2 text-[13px] text-ink-2 leading-relaxed">상품 · 배송 · 재입고 문의는 상품 상세의 Q&amp;A 탭에서 남기면 판매자가 직접 답변해요.</p>
          <div className="mt-4 flex gap-2">
            <Link to="/products/p101#qna" className="btn btn-ink btn-sm">상품 Q&amp;A 예시</Link>
            <Link to="/mypage/qna" className="btn btn-line btn-sm">내 상품 문의</Link>
          </div>
        </div>
        <div className="bg-white p-6">
          <div className="eyebrow">Claims</div>
          <div className="mt-1.5 font-bold text-[16px]">취소 · 반품 · 교환</div>
          <p className="mt-2 text-[13px] text-ink-2 leading-relaxed">주문 상태에 따라 마이페이지에서 바로 신청하고 처리 상태를 확인할 수 있어요.</p>
          <div className="mt-4 flex gap-2">
            <Link to="/mypage/orders" className="btn btn-ink btn-sm">주문 · 배송</Link>
            <Link to="/mypage/claims" className="btn btn-line btn-sm">신청 내역</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
