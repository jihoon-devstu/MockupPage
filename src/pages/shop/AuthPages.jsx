import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Search } from 'lucide-react';
import { Checkbox } from '../../components/ui';
import { useApp } from '../../lib/store';
import { cx } from '../../lib/format';
import { faqs, FAQ_CATS } from '../../data/faq';
import { OpenChatButton } from '../../components/Chat';
import { CHAT_ME } from '../../data/chats';
import { ME } from '../../data/people';

// 로그인 탭 — 고른 역할이 계정에 없으면 로그인시키지 않고 안내 (실제 features/auth/constants.js LOGIN_TABS)
const LOGIN_TABS = [
  { role: 'BUYER', label: '구매회원', home: '/' },
  { role: 'SELLER', label: '판매자', home: '/seller' },
  { role: 'ADMIN', label: '운영자', home: '/admin' },
];
const roleMismatchMessage = (tab) => `${tab.label} 계정이 아니에요. 위에서 로그인 유형을 확인해주세요`;
// 목업 계정: 이메일에 seller · admin 이 들어 있으면 그 역할, 아니면 구매회원
const MOCK_ACCOUNTS = {
  BUYER: { name: ME.name, roles: ['BUYER'] },
  SELLER: { name: '한지우', roles: ['SELLER'] },
  ADMIN: { name: '곳간 운영팀', roles: ['ADMIN'] },
};
const accountOf = (email) => MOCK_ACCOUNTS[/admin/i.test(email) ? 'ADMIN' : /seller/i.test(email) ? 'SELLER' : 'BUYER'];

// 소셜 로그인 — 카카오 · 네이버 · Google (실제는 제공자 가이드의 버튼 이미지 · 심볼, 목업은 같은 색의 글자 버튼)
const SOCIAL_PROVIDERS = [
  { id: 'kakao', label: '카카오 로그인', className: 'bg-[#FEE500] text-black/85 rounded-[12px]' },
  { id: 'naver', label: '네이버 로그인', className: 'bg-[#03C75A] text-white rounded-[6px]' },
  { id: 'google', label: 'Google 계정으로 로그인', className: 'bg-white text-[#1F1F1F] border border-[#747775] rounded-[4px]' },
];

function SocialLoginButtons() {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 text-[12px] text-mute">
        <div className="h-px flex-1 bg-line" />간편 로그인<div className="h-px flex-1 bg-line" />
      </div>
      <div className="mt-4 space-y-2">
        {/* 실제: 백엔드 /api/auth/social/{id} → 제공자 로그인 → /auth/callback. 목업은 바로 콜백 화면으로 */}
        {SOCIAL_PROVIDERS.map((p) => (
          <Link key={p.id} to="/auth/callback" className={cx('flex h-12 w-full items-center justify-center text-[15px] font-medium', p.className)}>{p.label}</Link>
        ))}
      </div>
    </div>
  );
}

const SOCIAL_ERROR_MESSAGES = {
  AUTH_EMAIL_DUPLICATE: '이미 가입된 이메일이에요. 탈퇴한 계정의 이메일은 다시 쓸 수 없어요',
  AUTH_ACCOUNT_DISABLED: '이용이 정지된 계정이에요. 고객센터로 문의해주세요',
  AUTH_SOCIAL_LOGIN_FAILED: '소셜 로그인에 실패했어요. 다시 시도해주세요',
};

/* /auth/callback — 소셜 로그인 결과 (실제 features/auth/components/SocialCallback.jsx). ?error=코드 면 안내 후 로그인 화면으로 */
export function AuthCallback() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { login, toast } = useApp();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const error = params.get('error');
    const t = setTimeout(() => {
      if (error) {
        toast(SOCIAL_ERROR_MESSAGES[error] ?? SOCIAL_ERROR_MESSAGES.AUTH_SOCIAL_LOGIN_FAILED);
        nav('/login', { replace: true });
        return;
      }
      login(MOCK_ACCOUNTS.BUYER);
      toast(`${MOCK_ACCOUNTS.BUYER.name}님, 반가워요`);
      nav('/', { replace: true });
    }, 600);
    return () => clearTimeout(t);
  }, [nav, params, login, toast]);
  return <p className="pt-32 text-center text-sm text-mute">로그인 중이에요…</p>;
}

/* 로그인 — 자체 폼 → user-service → Keycloak (역할 BUYER · SELLER · ADMIN). 목업: 이메일로 역할을 정해 로그인 */
export function Login() {
  const nav = useNavigate();
  const { login, toast } = useApp();
  const [tab, setTab] = useState(LOGIN_TABS[0]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const account = accountOf(email);
    if (!account.roles.includes(tab.role)) { setError(roleMismatchMessage(tab)); return; } // 로그인 상태로 두지 않음
    login(account);
    toast(`${account.name}님, 반가워요`);
    nav(tab.home, { replace: true });
  };
  return (
    <div className="max-w-[400px] mx-auto px-4 pt-16">
      <h1 className="text-[26px] font-bold tracking-tight text-center">로그인</h1>
      <div className="mt-8 grid grid-cols-3 border border-line-2 text-[13px]">
        {LOGIN_TABS.map((t, i) => (
          <button key={t.role} type="button" onClick={() => { setTab(t); setError(''); }} className={cx('h-10', i && 'border-l border-line-2', tab.role === t.role ? 'bg-ink text-white font-semibold' : 'text-ink-2')}>{t.label}</button>
        ))}
      </div>
      <form className="mt-6 space-y-2.5" onSubmit={submit} noValidate>
        <input className="field h-12" type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field h-12" type="password" placeholder="비밀번호" />
        {error && <p role="alert" className="pt-1 text-[13px] text-rust">{error}</p>}
        <div className="pt-1.5">
          <button type="submit" className="btn btn-ink btn-lg w-full">로그인</button>
        </div>
      </form>
      {tab.role === 'BUYER' && (
        <>
          <SocialLoginButtons />
          <p className="mt-8 text-center text-[13px] text-ink-2">아직 회원이 아니신가요? <Link to="/signup" className="font-bold underline">회원가입</Link></p>
        </>
      )}
      {tab.role === 'SELLER' && <p className="mt-8 text-center text-[13px] text-ink-2">아직 입점 전이신가요? <Link to="/seller/apply" className="font-bold underline">입점 신청하기</Link></p>}
      {tab.role === 'ADMIN' && <p className="mt-8 text-center text-[12px] text-mute">운영자 계정은 곳간 운영팀에서 발급합니다.</p>}
    </div>
  );
}

export function Signup() {
  const nav = useNavigate();
  const { toast, login } = useApp();
  const [all, setAll] = useState(false);
  const [name, setName] = useState('');
  return (
    <div className="max-w-[440px] mx-auto px-4 pt-16">
      <h1 className="text-[26px] font-bold tracking-tight">회원가입</h1>
      <p className="mt-1 text-sm text-mute">결제할 때마다 실결제금액의 5%가 포인트로 적립돼요.</p>
      <form className="mt-8 space-y-4" onSubmit={(e) => {
        e.preventDefault();
        // 가입하면 바로 로그인 → 홈
        const n = name.trim() || ME.name;
        login({ name: n, roles: ['BUYER'] });
        toast(`${n}님, 가입을 환영해요!`);
        nav('/', { replace: true });
      }}>
        <div><label className="label">이메일</label><div className="flex gap-2"><input className="field" placeholder="example@email.com" /><button type="button" className="btn btn-line shrink-0">중복확인</button></div></div>
        <div><label className="label">비밀번호</label><input type="password" className="field" placeholder="영문 · 특수문자 포함 8자 이상" /></div>
        <div><label className="label">비밀번호 확인</label><input type="password" className="field" /></div>
        <div><label className="label">이름</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="label">휴대폰 번호</label><input type="tel" className="field" placeholder="010-0000-0000" /></div>
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

      <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border border-ink p-6">
        <div>
          <div className="font-bold text-[16px]">1:1 상담</div>
          <p className="mt-1 text-[13px] text-ink-2">주문 · 결제 · 계정 문제는 곳간 운영팀과 실시간으로 이야기해요.</p>
        </div>
        <OpenChatButton className="btn btn-ink btn-sm" basePath="/mypage/chats" by="BUYER" request={{ type: 'BUYER_SUPPORT', buyerId: CHAT_ME.userId }}>운영팀과 채팅</OpenChatButton>
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-px bg-line border border-line">
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
