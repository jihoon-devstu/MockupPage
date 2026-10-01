import { LayoutDashboard, Package, PlusSquare, ShoppingCart, RotateCcw, Star, MessageCircle, Wallet, Store } from 'lucide-react';
import ConsoleLayout from '../../layouts/ConsoleLayout';
import { storeById } from '../../data/catalog';
import { sellerOrders } from '../../data/orders';
import { qnas } from '../../data/reviews';

export const MY_STORE = storeById.s1; // 목업: 로그인한 판매자 = 오롯이 리넨
export const myStoreQna = qnas.filter((q) => ['p101', 'p102', 'p103', 'p104', 'p105'].includes(q.productId));

export default function SellerLayout() {
  const cnt = (s) => sellerOrders.filter((o) => o.status === s).length;
  const claims = sellerOrders.filter((o) => ['취소요청', '반품요청', '교환요청'].includes(o.status)).length;
  const groups = [
    { title: '홈', items: [{ to: '/seller', end: true, label: '대시보드', icon: LayoutDashboard }] },
    { title: '상품', items: [
      { to: '/seller/products', end: true, label: '상품 조회/수정', icon: Package },
      { to: '/seller/products/new', label: '상품 등록', icon: PlusSquare },
    ] },
    { title: '주문 · 배송', items: [
      { to: '/seller/orders', label: '주문 관리', icon: ShoppingCart, count: cnt('결제완료') },
      { to: '/seller/claims', label: '취소/반품/교환', icon: RotateCcw, count: claims },
    ] },
    { title: '고객', items: [
      { to: '/seller/reviews', label: '리뷰 관리', icon: Star },
      { to: '/seller/qna', label: '상품 문의', icon: MessageCircle, count: myStoreQna.filter((q) => !q.a).length },
    ] },
    { title: '정산 · 스토어', items: [
      { to: '/seller/settlements', label: '정산 내역', icon: Wallet },
      { to: '/seller/store', label: '스토어 설정', icon: Store },
    ] },
  ];
  const notices = [
    { text: `신규 주문 ${cnt('결제완료')}건이 발주 확인을 기다리고 있어요`, time: '방금', to: '/seller/orders' },
    { text: '반품 요청이 접수되었습니다 — 3영업일 내 처리 필요', time: '2시간 전', to: '/seller/claims' },
    { text: '[공지] 10월 추석 연휴 정산 일정 안내', time: '어제', to: '/seller/settlements' },
  ];
  return <ConsoleLayout kind="seller" badge="판매자센터" groups={groups} notices={notices}
    account={{ name: MY_STORE.name, role: `${MY_STORE.owner} 대표 · ${MY_STORE.grade}`, avatar: '/images/avatar/u-6.jpg' }} />;
}
