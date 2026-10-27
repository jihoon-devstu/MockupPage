/* 알림 센터 (admin-service notification, NTF-08) 목업 데이터
   - 받는 쪽: USER(구매자 김서연) · STORE(오롯이 리넨) · ADMIN(관리자 전원)
   - 종류: ORDER_PAID · ORDER_SHIPPED · ORDER_CANCELLED · ORDER_RETURNED · SETTLEMENT_PAID · STORE_APPROVED · STORE_REJECTED · STORE_SUPPLEMENT · CHAT_MESSAGE
   - 실제로는 SQS 이벤트 · chat-service 요청 → 알림함(DynamoDB, 90일) → SSE 로 바로 도착. 목업은 목록 · 안 읽은 수 · 모두 읽음 · 링크 이동만 */

export const NOTIFICATIONS = {
  USER: [
    { id: 'n-u1', type: 'CHAT_MESSAGE', title: '곳간 운영팀', body: '곳간 운영팀입니다. 스토어 톡 내용 확인했어요. 판매자에게 출고 일정을 확인하고…', link: '/mypage/chats/103', read: false, ago: '4시간 전' },
    { id: 'n-u2', type: 'CHAT_MESSAGE', title: '오롯이 리넨', body: '재입고되면 상품 상세의 재입고 알림으로 바로 알려드릴게요!', link: '/mypage/chats/101', read: false, ago: '5시간 전' },
    { id: 'n-u3', type: 'ORDER_SHIPPED', title: '배송이 시작됐어요', body: '프렌치 리넨 오버핏 셔츠 · CJ대한통운 송장 등록', link: '/mypage/orders/2026092809114007', read: false, ago: '어제' },
    { id: 'n-u4', type: 'ORDER_PAID', title: '결제가 완료됐어요', body: '프렌치 리넨 오버핏 셔츠 외 1건', link: '/mypage/orders/2026092809114007', read: true, ago: '3일 전' },
    { id: 'n-u5', type: 'ORDER_RETURNED', title: '반품이 완료됐어요', body: '환불 금액은 결제수단으로 돌려드렸어요', link: '/mypage/claims', read: true, ago: '5일 전' },
  ],
  STORE: [
    { id: 'n-s2', type: 'CHAT_MESSAGE', title: '곳간 운영팀', body: '처리되지 않은 반품 요청 1건이 있어 보류됐어요. 처리하시면 다음 지급일에…', link: '/seller/chats/104', read: false, ago: '2시간 전' },
    { id: 'n-s1', type: 'CHAT_MESSAGE', title: '새 스토어 톡', body: '박*민: 쇼핑백도 같이 받을 수 있는지 궁금해요.', link: '/seller/chats/105', read: false, ago: '3시간 전' },
    { id: 'n-s3', type: 'SETTLEMENT_PAID', title: '정산금이 지급됐어요', body: '9/14~9/20 주차 정산금 지급 완료', link: '/seller/settlements', read: false, ago: '어제' },
    { id: 'n-s4', type: 'STORE_APPROVED', title: '입점이 승인됐어요', body: '오롯이 리넨 스토어가 개설됐어요. 상품을 등록해 보세요', link: '/seller', read: true, ago: '20개월 전' },
  ],
  ADMIN: [
    { id: 'n-a1', type: 'CHAT_MESSAGE', title: '[고객 상담] 정하준', body: '주문번호는 2026093021034417 입니다.', link: '/admin/chats/107', read: false, ago: '1시간 전' },
    { id: 'n-a2', type: 'CHAT_MESSAGE', title: '[고객 상담] 김서연', body: '판매자가 출고를 계속 미루고 있어요. 확인 부탁드려요.', link: '/admin/chats/103', read: false, ago: '7시간 전' },
    { id: 'n-a3', type: 'CHAT_MESSAGE', title: '[판매자 상담] 오롯이 리넨', body: '이번 주 정산이 지급 보류로 나오는데 이유를 알 수 있을까요?', link: '/admin/chats/104', read: true, ago: '어제' },
  ],
};
