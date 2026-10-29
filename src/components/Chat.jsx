import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Empty, Pill, Segments } from './ui';
import { useApp } from '../lib/store';
import ReportModal from './ReportModal';
import { cx } from '../lib/format';
import { ROOM_TYPE_LABEL, CHAT_MAX_LENGTH } from '../data/chats';
import {
  useChatRooms, SIDE, isVisible, otherSide, counterpartName, unreadCount, preview, openRoom, sendMessage, markRead, setRoomStatus,
} from '../lib/chat';

/* 1:1 채팅 (chat-service) — 실제 구현 features/chat/components 의 ChatInbox · ChatRoomPanel · OpenChatButton 과 같은 구성
   목업: 실시간 연결(STOMP) 대신 보내면 잠시 뒤 상대가 읽고 → "입력 중…" → 답장하는 흐름을 흉내 */

// 화면마다 보는 방 종류 탭 — 구매자: 스토어 톡 · 고객센터 / 판매자: 스토어 톡 · 운영 상담 / 관리자: 상담방 2종 (+ 처리 대기 · 종료)
const TABS = {
  buyer: [['전체', {}], ['스토어 톡', { type: 'STORE_INQUIRY' }], ['고객센터', { type: 'BUYER_SUPPORT' }]],
  seller: [['전체', {}], ['스토어 톡', { type: 'STORE_INQUIRY' }], ['운영 상담', { type: 'SELLER_SUPPORT' }]],
  admin: [['처리 대기', { status: 'OPEN' }], ['판매자 상담', { type: 'SELLER_SUPPORT' }], ['고객 상담', { type: 'BUYER_SUPPORT' }], ['종료', { status: 'RESOLVED' }]],
};
const when = (d) => (d ? d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '');
const time = (d) => d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const CONNECTION_TEXT = { connecting: '연결 중…', disconnected: '연결이 끊겼어요. 다시 연결하는 중…', stopped: '실시간 연결이 멈췄어요. 새로고침해 주세요.' };
const PAGE = 20; // 한 번에 보이는 메시지 수 — 실제는 서버 페이지(위로 더 보기)
const REPLY = { BUYER: '네, 확인했어요. 감사합니다!', SELLER: '확인해 보고 바로 안내드릴게요. 잠시만 기다려 주세요!', ADMIN: '곳간 운영팀입니다. 내용 확인 후 바로 답변드릴게요.' };

/** 채팅함 — 왼쪽 방 목록 · 오른쪽 열린 방(/…/chats/:roomId). 좁은 화면은 하나씩 */
export function ChatInbox({ kind, basePath }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const all = useChatRooms();
  const [tab, setTab] = useState(TABS[kind][0][0]);
  const filter = Object.fromEntries(TABS[kind])[tab];
  const side = SIDE[kind];
  const mine = all.filter((r) => isVisible(r, kind));
  const rooms = mine
    .filter((r) => (!filter.type || r.type === filter.type) && (!filter.status || r.status === filter.status))
    .sort((a, b) => (preview(b)?.at ?? 0) - (preview(a)?.at ?? 0));
  const found = mine.find((r) => String(r.roomId) === roomId);
  // 관리자 목록엔 스토어 톡이 없다 — 도움 요청 카드(CHAT_ROOM)로 연결된 스토어 톡만 읽기 전용으로 연다
  const helped = kind === 'admin' && roomId && !found
    && mine.some((r) => r.messages.some((m) => m.context?.type === 'CHAT_ROOM' && String(m.context.id) === roomId));
  const readOnlyRoom = helped ? all.find((r) => String(r.roomId) === roomId) : null;
  const open = found ?? readOnlyRoom;

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[480px]">
      <aside className={cx('flex flex-col min-h-0 border border-line bg-white', roomId && 'hidden lg:flex')}>
        <div className="p-3 border-b border-line overflow-x-auto"><Segments items={TABS[kind].map(([t]) => t)} value={tab} onChange={setTab} /></div>
        <ul className="flex-1 overflow-y-auto">
          {rooms.length === 0 && <li><Empty title="대화가 없어요" /></li>}
          {rooms.map((r) => {
            const unread = unreadCount(r, side);
            const pv = preview(r);
            return (
              <li key={r.roomId}>
                <Link to={`${basePath}/${r.roomId}`}
                  className={cx('flex gap-3 px-4 py-3 border-b border-line hover:bg-cream', String(r.roomId) === roomId && 'bg-cream')}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold truncate">{counterpartName(r, side)}</span>
                      <span className="text-[11px] text-mute shrink-0">{ROOM_TYPE_LABEL[r.type]}</span>
                    </div>
                    <p className="text-[12.5px] text-ink-2 truncate mt-0.5">{pv?.text ?? '대화를 시작해 보세요'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] text-mute">{when(pv?.at)}</span>
                    {unread > 0 && <span className="min-w-5 h-5 px-1.5 bg-point text-white text-[11px] font-bold flex items-center justify-center num">{unread}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
      <div className={cx('min-h-0', !roomId && 'hidden lg:block')}>
        {open ? <ChatRoomPanel key={open.roomId} room={open} side={side} basePath={basePath} readOnly={!!readOnlyRoom} onBack={() => navigate(basePath)} />
          : <div className="h-full border border-line bg-white flex items-center justify-center text-mute text-sm">
              {roomId ? '대화방을 찾을 수 없어요.' : '왼쪽에서 대화를 고르세요.'}
            </div>}
      </div>
    </div>
  );
}

/** 열린 방 — 메시지 목록 · 입력 · 상담 상태(관리자). 관리자의 도움 요청 스토어 톡 열람은 읽기 전용 */
function ChatRoomPanel({ room, side, basePath, readOnly, onBack }) {
  const { toast } = useApp();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [conn, setConn] = useState('connecting'); // 목업: 방을 열면 잠깐 '연결 중…' 뒤 연결됨
  const [reportTarget, setReportTarget] = useState(null); // 판매자의 구매자 신고 (회원 신고)
  const timers = useRef([]);
  const listRef = useRef(null);
  const other = otherSide(room, side);
  const name = readOnly ? `스토어 톡 #${room.roomId}` : counterpartName(room, side);
  const lastId = room.messages.at(-1)?.id;
  const lastMineId = room.messages.findLast((m) => m.kind === 'TEXT' && m.sender === side)?.id;
  const notice = room.status === 'RESOLVED'
    ? (side === 'ADMIN' ? '종료된 상담이에요. 다시 열거나 답장하면 이어집니다.' : '종료된 상담이에요. 메시지를 보내면 다시 열려요.') : null;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { const t = setTimeout(() => setConn('connected'), 700); return () => clearTimeout(t); }, []);
  const visible = room.messages.slice(-shown);
  // 새 메시지가 보이면 맨 아래로 + 읽음
  useLayoutEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [lastId, typing]);
  useEffect(() => {
    if (!readOnly) markRead(room.roomId, side);
  }, [room.roomId, lastId, side, readOnly]);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return toast('메시지를 입력해 주세요.');
    if (conn !== 'connected') return toast('연결 중이에요. 잠시 뒤 다시 보내 주세요.');
    sendMessage(room.roomId, side, trimmed);
    setText('');
    // 목업: 상대가 읽고(읽음) → 입력 중… → 답장
    const later = (ms, fn) => timers.current.push(setTimeout(fn, ms));
    later(900, () => markRead(room.roomId, other));
    later(1800, () => setTyping(true));
    later(4200, () => { setTyping(false); sendMessage(room.roomId, other, REPLY[other]); });
  };
  const askHelp = () => {
    const id = openRoom({ type: 'BUYER_SUPPORT', buyerId: room.buyerId, context: { type: 'CHAT_ROOM', id: room.roomId }, by: 'BUYER' });
    navigate(`${basePath}/${id}`);
  };

  return (
    <section className="flex flex-col h-full min-h-0 bg-white border border-line">
      <header className="flex items-center gap-2 px-4 h-14 border-b border-line shrink-0">
        {onBack && <button className="btn btn-ghost btn-xs lg:hidden" onClick={onBack}>← 목록</button>}
        <div className="min-w-0">
          <div className="font-bold truncate">{name}</div>
          <div className="text-[11.5px] text-mute">{ROOM_TYPE_LABEL[room.type]}</div>
        </div>
        {room.status && <Pill tone={room.status === 'OPEN' ? 'sky' : 'mute'} className="ml-1">{room.status === 'OPEN' ? '상담 중' : '종료'}</Pill>}
        {readOnly && <Pill tone="amber" className="ml-1">읽기 전용</Pill>}
        <div className="ml-auto flex gap-2">
          {side === 'BUYER' && room.type === 'STORE_INQUIRY' && (
            <button className="btn btn-line btn-xs" onClick={askHelp}>운영팀에 도움 요청</button>
          )}
          {side === 'SELLER' && room.type === 'STORE_INQUIRY' && room.buyerId && (
            <button className="btn btn-line btn-xs" onClick={() => setReportTarget({ type: 'USER', id: room.buyerId, label: '구매자' })}>구매자 신고</button>
          )}
          {side === 'ADMIN' && room.status && !readOnly && (
            <button className="btn btn-line btn-xs" onClick={() => setRoomStatus(room.roomId, room.status === 'OPEN' ? 'RESOLVED' : 'OPEN')}>
              {room.status === 'OPEN' ? '상담 종료' : '다시 열기'}
            </button>
          )}
        </div>
      </header>

      {CONNECTION_TEXT[conn] && <div className="px-4 py-1.5 text-[12px] bg-amber-soft text-amber shrink-0">{CONNECTION_TEXT[conn]}</div>}

      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2 bg-cream">
        {room.messages.length > shown && (
          <div className="text-center">
            <button className="btn btn-ghost btn-xs" onClick={() => setShown((n) => n + PAGE)}>이전 메시지 더 보기</button>
          </div>
        )}
        {room.messages.length === 0 && <p className="text-center text-mute text-sm py-10">첫 메시지를 보내 보세요.</p>}
        {visible.map((m) => (
          <MessageItem key={m.id} m={m} mine={!readOnly && m.sender === side} basePath={basePath}
            read={m.id === lastMineId && (room.read[other] ?? 0) >= m.id} />
        ))}
      </div>

      {typing && <div className="px-4 py-1 text-[12px] text-mute shrink-0">{name} 님이 입력 중…</div>}
      {notice && <div className="px-4 py-1.5 text-[12px] text-mute border-t border-line shrink-0">{notice}</div>}
      {readOnly ? (
        <div className="px-4 py-3 text-[13px] text-mute border-t border-line">구매자가 도움을 요청한 스토어 톡이에요. 관리자는 읽기만 할 수 있어요.</div>
      ) : (
        <div className="flex gap-2 p-3 border-t border-line shrink-0">
          <textarea value={text} maxLength={CHAT_MAX_LENGTH} rows={2} placeholder="메시지 입력 (Enter 보내기 · Shift+Enter 줄바꿈)"
            className="flex-1 resize-none border border-line-2 px-3 py-2 text-[14px] outline-none focus:border-ink"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }} />
          <div className="flex flex-col items-end justify-between">
            <span className="text-[11px] text-mute num">{text.length}/{CHAT_MAX_LENGTH}</span>
            <button className="btn btn-ink btn-sm" onClick={submit}>보내기</button>
          </div>
        </div>
      )}
      <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} />
    </section>
  );
}

// 문맥 카드 머리 — 어떤 화면에서 무엇을 두고 묻는지 (실제 프론트 chatView.contextLabel 과 같음)
const CONTEXT_LABEL = {
  PRODUCT: '상품 문의', ORDER: '주문 · 결제 문의', ORDER_ITEM: '주문 상품 문의', SETTLEMENT: '정산 문의',
  STORE: '스토어 문의', REPORT: '신고 처리 문의', CHAT_ROOM: '스토어 톡 도움 요청',
};

function MessageItem({ m, mine, read, basePath }) {
  if (m.kind === 'SYSTEM') return <p className="text-center text-[12px] text-mute py-1">{m.content}</p>;
  if (m.kind === 'CONTEXT') {
    return (
      <div className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
        <div className="max-w-[80%] border border-line-2 bg-white px-3 py-2">
          <div className="text-[11px] text-mute">{CONTEXT_LABEL[m.context.type] ?? '문의 대상'}</div>
          <div className="text-[13.5px] font-semibold">{m.context.title}</div>
          {m.context.type === 'CHAT_ROOM' && basePath === '/admin/chats' && (
            <Link to={`${basePath}/${m.context.id}`} className="text-[12px] text-point underline">대화 보기 (읽기 전용)</Link>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className={cx('flex items-end gap-1.5', mine ? 'justify-end' : 'justify-start')}>
      {mine && <span className="text-[10.5px] text-mute whitespace-nowrap">{read && <b className="text-point mr-1">읽음</b>}{time(m.at)}</span>}
      <p className={cx('max-w-[75%] px-3 py-2 text-[14px] whitespace-pre-wrap break-words', mine ? 'bg-ink text-white' : 'bg-white border border-line')}>{m.content}</p>
      {!mine && <span className="text-[10.5px] text-mute whitespace-nowrap">{time(m.at)}</span>}
    </div>
  );
}

/**
 * 다른 화면에서 채팅 열기 — 같은 방이 있으면 그 방에 문맥 카드만 붙는다. 열리면 basePath/{roomId} 로 이동
 * request = { type, buyerId?, storeId?, context?: { type, id } }, by = 여는 쪽(BUYER · SELLER · ADMIN)
 */
export function OpenChatButton({ request, by, basePath, className = 'btn btn-line btn-sm', children }) {
  const navigate = useNavigate();
  return (
    <button type="button" className={className} onClick={() => navigate(`${basePath}/${openRoom({ ...request, by })}`)}>{children}</button>
  );
}
