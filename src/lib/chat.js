import { useSyncExternalStore } from 'react';
import { storeById, productById } from '../data/catalog';
import { userById } from '../data/people';
import { CHAT_ROOMS, CHAT_MESSAGE_SEQ, CHAT_ME, ADMIN_DISPLAY_NAME, RESOLVED_NOTICE } from '../data/chats';
import { maskName } from './format';

/* 목업 전용 채팅 상태 (새로고침하면 초기화)
   실제로는 chat-service REST(/api/chats/**) + STOMP(/ws/chat) — 여기서는 화면 사이에 공유되는 모듈 상태로만 흉내 */
let rooms = CHAT_ROOMS.map((r) => ({ ...r, messages: [...r.messages], read: { ...r.read } }));
let seq = CHAT_MESSAGE_SEQ;
const listeners = new Set();
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const update = (roomId, fn) => {
  rooms = rooms.map((r) => (r.roomId === roomId ? fn(r) : r));
  listeners.forEach((fn2) => fn2());
};

export const useChatRooms = () => useSyncExternalStore(subscribe, () => rooms);

/* 화면 종류(kind) → 이 방에서 내 자리 */
export const SIDE = { buyer: 'BUYER', seller: 'SELLER', admin: 'ADMIN' };

/** 방에서 상대 쪽 */
export function otherSide(room, side) {
  if (room.type === 'STORE_INQUIRY') return side === 'BUYER' ? 'SELLER' : 'BUYER';
  if (room.type === 'SELLER_SUPPORT') return side === 'SELLER' ? 'ADMIN' : 'SELLER';
  return side === 'BUYER' ? 'ADMIN' : 'BUYER';
}

/** 보이는 방: 구매자 = 내 스토어 톡 · 내 고객 상담 / 판매자 = 내 스토어의 스토어 톡 · 운영 상담 / 관리자 = 상담방 2종 전체 */
export function isVisible(room, kind) {
  if (kind === 'buyer') return room.buyerId === CHAT_ME.userId && room.type !== 'SELLER_SUPPORT';
  if (kind === 'seller') return room.storeId === CHAT_ME.storeId && room.type !== 'BUYER_SUPPORT';
  return room.type !== 'STORE_INQUIRY';
}

/** 상대 이름 — 구매자 ← 스토어명 · 판매자 ← 가린 구매자 이름 · 관리자 ← 스토어명 · 회원 이름, 관리자 쪽은 "곳간 운영팀" */
export function counterpartName(room, side) {
  const other = otherSide(room, side);
  if (other === 'ADMIN') return ADMIN_DISPLAY_NAME;
  if (other === 'SELLER') return storeById[room.storeId]?.name ?? `스토어 #${room.storeId}`;
  const name = userById[room.buyerId]?.name;
  if (!name) return `회원 #${room.buyerId}`;
  return side === 'SELLER' ? maskName(name) : name;
}

export function unreadCount(room, side) {
  const other = otherSide(room, side);
  return room.messages.filter((m) => m.kind === 'TEXT' && m.sender === other && m.id > (room.read[side] ?? 0)).length;
}

export function preview(room) {
  const m = room.messages.at(-1);
  if (!m) return null;
  return { text: m.kind === 'CONTEXT' ? `문의 대상 · ${m.content}` : m.content, at: m.at };
}

/** 메뉴 배지 — 그 화면에서 보이는 방의 안 읽은 메시지 합 */
export function useChatUnread(kind) {
  const all = useChatRooms();
  return all.filter((r) => isVisible(r, kind)).reduce((a, r) => a + unreadCount(r, SIDE[kind]), 0);
}

/* 문맥 카드 제목 (chat.md 문맥 카드 표) */
function contextTitle(ctx) {
  if (ctx.type === 'PRODUCT') return productById[ctx.id]?.name ?? `상품 #${ctx.id}`;
  if (ctx.type === 'STORE') return `스토어 ${storeById[ctx.id]?.name ?? ctx.id}`;
  if (ctx.type === 'CHAT_ROOM') {
    const r = rooms.find((x) => x.roomId === ctx.id);
    return `스토어 톡 #${ctx.id} (${storeById[r?.storeId]?.name ?? ''})`;
  }
  return `${ctx.type} #${ctx.id}`;
}

/** 방 열기 — 같은 방(type, buyerId, storeId)이 있으면 그 방에 문맥 카드만 붙이고(마지막 카드와 같으면 생략), 없으면 새로 만든다 */
export function openRoom({ type, buyerId = 0, storeId = 0, context, by }) {
  let room = rooms.find((r) => r.type === type && r.buyerId === buyerId && r.storeId === storeId);
  if (!room) {
    room = { roomId: Math.max(...rooms.map((r) => r.roomId)) + 1, type, buyerId, storeId, status: type === 'STORE_INQUIRY' ? null : 'OPEN', messages: [], read: {} };
    rooms = [...rooms, room];
  }
  if (context) {
    const lastCard = room.messages.findLast((m) => m.kind === 'CONTEXT');
    if (!(lastCard && lastCard.context.type === context.type && lastCard.context.id === context.id)) {
      const title = contextTitle(context);
      const msg = { id: ++seq, kind: 'CONTEXT', sender: by, content: title, context: { ...context, title }, at: new Date() };
      update(room.roomId, (r) => ({ ...r, messages: [...r.messages, msg], read: { ...r.read, [by]: msg.id } }));
      return room.roomId;
    }
  }
  listeners.forEach((fn) => fn());
  return room.roomId;
}

/** 메시지 보내기 — 종료된 상담방에 보내면 자동으로 다시 OPEN */
export function sendMessage(roomId, sender, content) {
  const msg = { id: ++seq, kind: 'TEXT', sender, content, at: new Date() };
  update(roomId, (r) => ({ ...r, status: r.status === 'RESOLVED' ? 'OPEN' : r.status, messages: [...r.messages, msg], read: { ...r.read, [sender]: msg.id } }));
}

export function markRead(roomId, side) {
  const room = rooms.find((r) => r.roomId === roomId);
  const lastId = room?.messages.at(-1)?.id;
  if (!lastId || room.read[side] === lastId) return;
  update(roomId, (r) => ({ ...r, read: { ...r.read, [side]: lastId } }));
}

/** 상담 상태 바꾸기 (관리자, 상담방만) — 종료하면 SYSTEM 안내 */
export function setRoomStatus(roomId, status) {
  update(roomId, (r) => ({
    ...r, status,
    messages: status === 'RESOLVED' ? [...r.messages, { id: ++seq, kind: 'SYSTEM', sender: 'SYSTEM', content: RESOLVED_NOTICE, at: new Date() }] : r.messages,
  }));
}
