import { productById } from './catalog';
import { daysAgo } from '../lib/format';

/* 1:1 채팅 (chat-service :8089) 목업 데이터
   - 방 3종: STORE_INQUIRY 스토어 톡(구매자 ↔ 스토어) · SELLER_SUPPORT 판매자 운영 상담(스토어 ↔ 관리자 전원) · BUYER_SUPPORT 고객센터 1:1 상담(구매자 ↔ 관리자 전원)
   - 같은 방 = (type, buyerId, storeId) — 안 쓰는 쪽은 0
   - 목업 시점: 구매자 = 김서연(u1), 판매자 = 오롯이 리넨(s1), 관리자 = 곳간 운영팀
   - read: 쪽(BUYER · SELLER · ADMIN)마다 마지막으로 읽은 메시지 번호 */

export const ROOM_TYPE_LABEL = { STORE_INQUIRY: '스토어 톡', SELLER_SUPPORT: '판매자 운영 상담', BUYER_SUPPORT: '고객센터 1:1 상담' };
export const CHAT_MAX_LENGTH = 1000;
export const RESOLVED_NOTICE = '상담이 종료됐어요. 더 궁금한 점이 있으면 다시 메시지를 보내 주세요';
export const ADMIN_DISPLAY_NAME = '곳간 운영팀';
export const CHAT_ME = { userId: 'u1', storeId: 's1' };

let mid = 0;
const text = (sender, content, at) => ({ id: ++mid, kind: 'TEXT', sender, content, at });
const card = (sender, context, at) => ({ id: ++mid, kind: 'CONTEXT', sender, content: context.title, context, at });
const system = (content, at) => ({ id: ++mid, kind: 'SYSTEM', sender: 'SYSTEM', content, at });
const product = (id) => ({ type: 'PRODUCT', id, title: productById[id].name });

const r101 = [
  card('BUYER', product('p101'), daysAgo(0, 6)),
  text('BUYER', '안녕하세요! 이 셔츠 오트밀 M 사이즈 재입고 예정이 있을까요?', daysAgo(0, 6)),
  text('SELLER', '안녕하세요, 오롯이 리넨입니다. 오트밀 M 은 다음 주 화요일 재입고 예정이에요.', daysAgo(0, 5)),
  text('SELLER', '재입고되면 상품 상세의 재입고 알림으로 바로 알려드릴게요!', daysAgo(0, 5)),
];
const r102 = [
  card('BUYER', product('p601'), daysAgo(4)),
  text('BUYER', '주문한 지 4일이 지났는데 아직 배송 준비 중이에요. 언제 보내 주시나요?', daysAgo(4)),
  text('SELLER', '수확 일정이 밀려 이번 주 안에 보내드릴게요. 죄송합니다.', daysAgo(3)),
  text('BUYER', '오늘도 출고가 안 됐어요. 언제쯤 받을 수 있을까요?', daysAgo(0, 8)),
];
const r103 = [
  card('BUYER', { type: 'CHAT_ROOM', id: 102, title: '스토어 톡 #102 (산골농부 박씨네)' }, daysAgo(0, 7)),
  text('BUYER', '판매자가 출고를 계속 미루고 있어요. 확인 부탁드려요.', daysAgo(0, 7)),
  text('ADMIN', '곳간 운영팀입니다. 스토어 톡 내용 확인했어요. 판매자에게 출고 일정을 확인하고 오늘 안에 다시 안내드릴게요.', daysAgo(0, 4)),
];
const r104 = [
  card('SELLER', { type: 'SETTLEMENT', id: 3921, title: '정산 9/21~9/27 · 지급 보류' }, daysAgo(1, 3)),
  text('SELLER', '이번 주 정산이 지급 보류로 나오는데 이유를 알 수 있을까요?', daysAgo(1, 3)),
  text('ADMIN', '처리되지 않은 반품 요청 1건이 있어 보류됐어요. 처리하시면 다음 지급일에 함께 지급됩니다.', daysAgo(0, 2)),
];
const r105 = [
  card('BUYER', product('p102'), daysAgo(0, 3)),
  text('BUYER', '선물용 포장 가능할까요?', daysAgo(0, 3)),
  text('BUYER', '쇼핑백도 같이 받을 수 있는지 궁금해요.', daysAgo(0, 3)),
];
const r106 = [
  card('SELLER', { type: 'SETTLEMENT', id: 3815, title: '정산 9/14~9/20 · 지급 보류' }, daysAgo(6)),
  text('SELLER', '지난 주차 정산이 지급 보류됐는데 언제 지급되나요?', daysAgo(6)),
  text('ADMIN', '미처리 반품 3건이 남아 보류됐어요. 처리가 끝나면 보류를 풀고 다음 지급일에 지급됩니다.', daysAgo(6)),
  text('SELLER', '네, 확인했습니다. 감사합니다.', daysAgo(5)),
  system(RESOLVED_NOTICE, daysAgo(5)),
];
const r107 = [
  text('BUYER', '포인트가 적립이 안 된 것 같아요. 9/30 에 결제한 주문이에요.', daysAgo(0, 1)),
  text('BUYER', '주문번호는 20260930-000044 입니다.', daysAgo(0, 1)),
];
const last = (ms) => ms.at(-1).id;

export const CHAT_ROOMS = [
  { roomId: 101, type: 'STORE_INQUIRY', buyerId: 'u1', storeId: 's1', status: null, messages: r101, read: { BUYER: r101[2].id, SELLER: r101[1].id } },
  { roomId: 102, type: 'STORE_INQUIRY', buyerId: 'u1', storeId: 's6', status: null, messages: r102, read: { BUYER: last(r102), SELLER: r102[2].id } },
  { roomId: 103, type: 'BUYER_SUPPORT', buyerId: 'u1', storeId: 0, status: 'OPEN', messages: r103, read: { BUYER: r103[1].id, ADMIN: last(r103) } },
  { roomId: 104, type: 'SELLER_SUPPORT', buyerId: 0, storeId: 's1', status: 'OPEN', messages: r104, read: { SELLER: r104[1].id, ADMIN: last(r104) } },
  { roomId: 105, type: 'STORE_INQUIRY', buyerId: 'u3', storeId: 's1', status: null, messages: r105, read: { BUYER: last(r105), SELLER: 0 } },
  { roomId: 106, type: 'SELLER_SUPPORT', buyerId: 0, storeId: 's5', status: 'RESOLVED', messages: r106, read: { SELLER: last(r106), ADMIN: last(r106) } },
  { roomId: 107, type: 'BUYER_SUPPORT', buyerId: 'u5', storeId: 0, status: 'OPEN', messages: r107, read: { BUYER: last(r107), ADMIN: 0 } },
];
export const CHAT_MESSAGE_SEQ = mid;
