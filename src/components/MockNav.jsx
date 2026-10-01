import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { cx } from '../lib/format';

/* 목업 리뷰용 화면 이동 패널 (실서비스에는 포함하지 않음) */
export const SCREENS = [
  ['구매자 · 쇼핑몰', [
    ['/', '메인'], ['/products?cat=fashion', '상품 목록 (카테고리)'], ['/products?q=리넨', '검색 결과'], ['/products/p101', '상품 상세 (옵션·리뷰)'],
    ['/products/p103', '상품 상세 (품절)'], ['/stores', '스토어 목록'], ['/store/s1', '스토어 홈'], ['/cart', '장바구니'], ['/checkout', '주문/결제'],
    ['/order/complete', '주문 완료'], ['/login', '로그인'], ['/signup', '회원가입'], ['/help', '고객센터 FAQ'], ['/seller/apply', '입점 신청'],
  ]],
  ['구매자 · 마이페이지', [
    ['/mypage/orders', '주문 · 배송'], ['/mypage/orders/2026092809114007', '주문 상세 · 배송조회'], ['/mypage/claim/2026092419502215-1?type=반품', '반품 신청'],
    ['/mypage/claims', '취소/반품/교환 내역'], ['/mypage/reviews', '리뷰 관리'], ['/mypage/wishlist', '찜'], ['/mypage/coupons', '쿠폰 · 포인트'],
    ['/mypage/profile', '회원정보'], ['/mypage/addresses', '배송지'],
  ]],
  ['판매자센터', [
    ['/seller', '대시보드'], ['/seller/products', '상품 조회'], ['/seller/products/new', '상품 등록'], ['/seller/products/p101/edit', '상품 수정'],
    ['/seller/orders', '주문 관리'], ['/seller/claims', '취소/반품/교환'], ['/seller/reviews', '리뷰 관리'], ['/seller/qna', '상품 문의'],
    ['/seller/settlements', '정산 내역'], ['/seller/store', '스토어 설정'],
  ]],
  ['스토어 관리자', [
    ['/admin', '운영 대시보드'], ['/admin/applications', '입점 심사 목록'], ['/admin/applications/AP-2609-031', '입점 심사 상세'], ['/admin/stores', '스토어 관리'],
    ['/admin/stores/s5', '스토어 상세 (휴면)'], ['/admin/settlements', '정산 관리'], ['/admin/users', '회원 관리'], ['/admin/users/u11', '회원 상세 (정지)'],
    ['/admin/reviews', '신고 리뷰'], ['/admin/categories', '카테고리 · 수수료'],
  ]],
];

export default function MockNav() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const here = loc.pathname + loc.search;
  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed left-4 bottom-4 z-[70] h-10 px-3.5 bg-point text-white text-[12px] font-bold tracking-wide shadow-lg flex items-center gap-2">
        <span className="font-mono">MOCK</span> 화면 목록
      </button>
      {open && (
        <div className="fixed left-4 bottom-16 z-[70] w-[min(560px,calc(100vw-32px))] max-h-[70vh] overflow-y-auto bg-white border border-ink shadow-2xl">
          <div className="flex items-center justify-between px-4 h-11 border-b border-line sticky top-0 bg-white">
            <b className="text-[13px]">목업 화면 바로가기</b>
            <button onClick={() => setOpen(false)}><X size={18} /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5 p-4">
            {SCREENS.map(([g, items]) => (
              <div key={g}>
                <div className="eyebrow text-ink mb-1.5">{g}</div>
                <ul>
                  {items.map(([to, l]) => (
                    <li key={to}><Link onClick={() => setOpen(false)} to={to} className={cx('block py-1 text-[13px] hover:text-point', here === to ? 'font-bold text-point' : 'text-ink-2')}>{l}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
