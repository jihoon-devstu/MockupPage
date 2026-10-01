import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Checkbox } from '../../components/ui';
import { useApp } from '../../lib/store';
import { cx } from '../../lib/format';

/* 목업: 로그인 / 회원가입은 화면 이동만. 실제 인증 없음. */
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
        <input className="field h-12" placeholder={tab === 'buyer' ? '이메일' : tab === 'seller' ? '판매자 아이디' : '운영자 사번'} />
        <input className="field h-12" type="password" placeholder="비밀번호" />
        <div className="flex justify-between items-center py-1 text-[13px]">
          <Checkbox checked label="로그인 상태 유지" />
          <span className="text-mute">아이디 · 비밀번호 찾기</span>
        </div>
        <button className="btn btn-ink btn-lg w-full">로그인</button>
      </form>
      {tab === 'buyer' && (
        <>
          <div className="my-6 flex items-center gap-3 text-[12px] text-mute"><span className="flex-1 h-px bg-line" />간편 로그인<span className="flex-1 h-px bg-line" /></div>
          <div className="space-y-2">
            <button onClick={() => nav('/mypage')} className="btn btn-lg w-full bg-[#FEE500] border-[#FEE500] text-[#191919]">카카오로 시작하기</button>
            <button onClick={() => nav('/mypage')} className="btn btn-lg w-full bg-[#03C75A] border-[#03C75A] text-white">네이버로 시작하기</button>
          </div>
          <p className="mt-8 text-center text-[13px] text-ink-2">아직 회원이 아니신가요? <Link to="/signup" className="font-bold underline">회원가입</Link></p>
        </>
      )}
      {tab === 'seller' && <p className="mt-8 text-center text-[13px] text-ink-2">아직 입점 전이신가요? <Link to="/seller/apply" className="font-bold underline">입점 신청하기</Link></p>}
      {tab === 'admin' && <p className="mt-8 text-center text-[12px] text-mute">운영자 계정은 사내 VPN 접속 + OTP 2차 인증이 필요합니다. (목업에서는 생략)</p>}
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
      <p className="mt-1 text-sm text-mute">가입 즉시 3,000P를 드려요.</p>
      <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); toast('가입을 환영해요! 3,000P가 지급되었어요'); nav('/'); }}>
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

const FAQ = [
  ['배송', '주문한 상품은 언제 받을 수 있나요?', '곳간은 여러 판매자가 입점한 오픈마켓으로, 스토어마다 출고 기준이 다릅니다. 상품 상세의 “출고” 항목에서 확인할 수 있어요.'],
  ['배송', '여러 스토어 상품을 함께 주문하면 배송비는?', '배송비는 스토어별로 부과됩니다. 같은 스토어 상품끼리는 묶음배송되며, 스토어별 무료배송 기준이 적용됩니다.'],
  ['취소/반품', '주문 취소는 언제까지 가능한가요?', '“결제완료” 상태에서는 즉시 취소, “배송준비” 상태에서는 판매자 승인 후 취소됩니다. 발송 이후에는 반품으로 진행해주세요.'],
  ['취소/반품', '구매확정 후에도 반품할 수 있나요?', '구매확정 후에는 판매대금이 판매자에게 정산되므로 곳간을 통한 반품이 어렵습니다. 판매자에게 직접 문의해주세요.'],
  ['리뷰/포인트', '리뷰 포인트는 언제 지급되나요?', '구매확정 후 30일 이내 작성 시 텍스트 100P, 포토 500P가 즉시 지급됩니다.'],
  ['회원', '회원 등급은 어떻게 정해지나요?', '최근 6개월 구매확정 금액 기준으로 매월 1일 갱신됩니다. (실버 30만 / 골드 80만 / VIP 200만원)'],
];
export function Help() {
  const [open, setOpen] = useState(0);
  return (
    <div className="max-w-[860px] mx-auto px-4 md:px-6 pt-10">
      <div className="eyebrow">Help center</div>
      <h1 className="mt-2 text-[28px] font-bold tracking-tight border-b border-ink pb-4">자주 묻는 질문</h1>
      <ul>
        {FAQ.map(([c, q, a], i) => (
          <li key={q} className="border-b border-line">
            <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center gap-4 py-5 text-left">
              <span className="w-20 shrink-0 text-[12px] text-mute">{c}</span>
              <span className="flex-1 font-medium">{q}</span>
              <ChevronDown size={18} className={cx('transition-transform', open === i && 'rotate-180')} />
            </button>
            {open === i && <p className="pb-5 pl-24 text-[14px] text-ink-2 leading-relaxed">{a}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
