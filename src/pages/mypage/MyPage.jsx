import { useState } from 'react';
import { Link, NavLink, Outlet, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Star, Camera, Upload } from 'lucide-react';
import { productById, storeById } from '../../data/catalog';
import { ME, myAddresses, GRADES, gradeById, nextGrade } from '../../data/people';
import { myOrders, FLOW, trackingOf, orderPay, linePoints, orderOfLine, POINT_RATE } from '../../data/orders';
import { myPointHistory, myPointBalance, pointSum, POINT_TYPES } from '../../data/points';
import { reviews } from '../../data/reviews';
import { useApp } from '../../lib/store';
import { StatusPill, Modal, Checkbox, Stars, Empty, Pill, GradeBadge, Segments } from '../../components/ui';
import { ChatInbox, OpenChatButton } from '../../components/Chat';
import { CHAT_ME } from '../../data/chats';
import { cx, won, comma, ymd, ymdhm } from '../../lib/format';

const allLines = myOrders.flatMap((o) => o.items.map((l) => ({ ...l, orderId: o.id })));

/* ─────────── 레이아웃 ─────────── */
const MENU = [
  ['쇼핑', [['/mypage/orders', '주문 · 배송'], ['/mypage/claims', '취소 · 반품 · 교환'], ['/cart', '장바구니']]],
  ['활동', [['/mypage/reviews', '리뷰 관리'], ['/mypage/qna', '상품 문의'], ['/mypage/chats', '1:1 채팅']]],
  ['혜택', [['/mypage/points', '포인트']]],
  ['내 정보', [['/mypage/profile', '회원정보 수정'], ['/mypage/addresses', '배송지 관리']]],
];

export function MyPageLayout() {
  const next = nextGrade(ME.spent);
  const todoReviews = allLines.filter((l) => l.status === '구매확정' && !l.reviewed).length;
  const openClaims = allLines.filter((l) => ['취소요청', '반품요청', '교환요청'].includes(l.status)).length;
  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-8">
      {/* 상단 요약 */}
      <div className="bg-ink text-white grid md:grid-cols-[1fr_auto]">
        <div className="p-6 md:p-8 flex items-center gap-5">
          <img src={ME.avatar} alt="" className="w-16 h-16 rounded-full object-cover" />
          <div>
            <div className="flex items-center gap-2 text-[13px] text-white/60"><GradeBadge grade={ME.grade} dark /> {gradeById[ME.grade].label} 회원 · {next ? `${next.id}까지 ${won(next.min - ME.spent)}` : '최고 등급'}</div>
            <div className="text-[22px] font-bold mt-0.5">{ME.name}님, 반가워요</div>
            <div className="mt-2 h-1 w-56 bg-white/15"><div className="h-full bg-[#e6c06a]" style={{ width: `${next ? (ME.spent / next.min) * 100 : 100}%` }} /></div>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t md:border-t-0 md:border-l border-white/10">
          {[['포인트', `${comma(myPointBalance)}P`, '/mypage/points'], ['작성 가능 리뷰', `${todoReviews}건`, '/mypage/reviews'], ['진행 중 클레임', `${openClaims}건`, '/mypage/claims']].map(([k, v, to], i) => (
            <Link key={k} to={to} className={cx('px-6 md:px-9 py-5 md:py-8 text-center hover:bg-white/5', i && 'border-l border-white/10')}>
              <div className="text-[12px] text-white/60">{k}</div>
              <div className="text-[20px] font-bold mt-1 num">{v}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[200px_1fr] gap-6 lg:gap-10 mt-8">
        <aside className="min-w-0">
          <h2 className="text-[22px] font-bold mb-4 hidden lg:block">마이페이지</h2>
          <nav className="flex lg:block gap-4 overflow-x-auto no-scrollbar border-b lg:border-0 border-line pb-3 lg:pb-0">
            {MENU.map(([g, items]) => (
              <div key={g} className="lg:mb-6 flex lg:block gap-4 shrink-0">
                <div className="hidden lg:block text-[12px] font-bold text-mute mb-2">{g}</div>
                {items.map(([to, l]) => (
                  <NavLink key={to} to={to} className={({ isActive }) => cx('block lg:py-1.5 text-[14px] whitespace-nowrap', isActive ? 'font-bold text-ink lg:underline underline-offset-4' : 'text-ink-2 hover:text-ink')}>{l}</NavLink>
                ))}
              </div>
            ))}
          </nav>
        </aside>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  );
}

const H = ({ children, right }) => <div className="flex items-end justify-between border-b border-ink pb-3 mb-5"><h1 className="text-[20px] font-bold">{children}</h1>{right}</div>;

/* ─────────── 리뷰 작성 모달 ─────────── */
export function ReviewModal({ line, onClose }) {
  const { toast } = useApp();
  const [star, setStar] = useState(5);
  const [hover, setHover] = useState(0);
  const [fit, setFit] = useState('정사이즈');
  const [photo, setPhoto] = useState(false);
  if (!line) return null;
  const p = productById[line.productId];
  const wear = p.cat === 'fashion' || p.cat === 'shoes-bags';
  return (
    <Modal open onClose={onClose} title="리뷰 쓰기" width={560}
      footer={<><button className="btn btn-line btn-sm" onClick={onClose}>취소</button><button className="btn btn-ink btn-sm" onClick={() => { onClose(); toast('리뷰가 등록되었어요'); }}>등록하기</button></>}>
      <div className="flex gap-3 pb-4 border-b border-line">
        <img src={p.images[0]} alt="" className="w-14 h-16 object-cover" />
        <div className="text-[13px]"><div className="text-mute">{storeById[p.storeId].name}</div><div className="font-semibold">{p.name}</div><div className="text-mute">{line.option}</div></div>
      </div>
      <div className="py-5 text-center">
        <div className="text-[14px] font-semibold">상품은 만족하셨나요?</div>
        <div className="mt-3 flex justify-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} onMouseEnter={() => setHover(i)} onClick={() => setStar(i)}>
              <Star size={34} strokeWidth={0} className={(hover || star) >= i ? 'fill-ink' : 'fill-line-2'} />
            </button>
          ))}
        </div>
        <div className="text-[12px] text-mute mt-1">{['', '별로예요', '그저 그래요', '괜찮아요', '좋아요', '최고예요'][hover || star]}</div>
      </div>
      {wear && (
        <div className="mb-4">
          <div className="label">사이즈는 어땠나요?</div>
          <div className="grid grid-cols-3 gap-2">{['작아요', '정사이즈', '커요'].map((f) => <button key={f} onClick={() => setFit(f)} className={cx('h-10 border text-sm', fit === f ? 'border-ink border-2 font-bold' : 'border-line-2')}>{f}</button>)}</div>
        </div>
      )}
      <label className="label">리뷰 내용</label>
      <textarea rows={5} className="field" placeholder="최소 20자 이상 작성해주세요. 다른 구매자에게 큰 도움이 됩니다." />
      <button onClick={() => setPhoto(!photo)} className={cx('mt-3 w-20 h-20 border flex flex-col items-center justify-center text-[11px] gap-1', photo ? 'border-ink' : 'border-dashed border-line-2 text-mute')}>
        {photo ? <img src={p.images[1]} alt="" className="w-full h-full object-cover" /> : <><Camera size={18} />사진 추가</>}
      </button>
      <p className="mt-3 text-[12px] text-mute">사진은 최대 5장 · 상품과 무관한 내용, 욕설은 운영 정책에 따라 블라인드 처리될 수 있습니다.</p>
    </Modal>
  );
}

/* ─────────── 주문 · 배송 ─────────── */
function LineActions({ l, onReview }) {
  const { toast } = useApp();
  const nav = useNavigate();
  const b = 'btn btn-line btn-xs';
  switch (l.status) {
    case '결제완료': return <button className={b} onClick={() => nav(`/mypage/claim/${l.lineId}?type=취소`)}>주문취소</button>;
    case '배송준비': return <button className={b} onClick={() => nav(`/mypage/claim/${l.lineId}?type=취소`)}>취소요청</button>;
    case '배송중': return <Link className={b} to={`/mypage/orders/${l.orderId}`}>배송조회</Link>;
    case '배송완료': return (<>
      <button className="btn btn-ink btn-xs" onClick={() => toast('구매확정 되었어요. 리뷰를 작성할 수 있어요')}>구매확정</button>
      <button className={b} onClick={() => nav(`/mypage/claim/${l.lineId}?type=반품`)}>반품요청</button>
      <button className={b} onClick={() => nav(`/mypage/claim/${l.lineId}?type=교환`)}>교환요청</button>
    </>);
    case '구매확정': return l.reviewed ? <span className="text-[12px] text-mute">리뷰 작성완료</span> : <button className="btn btn-point btn-xs" onClick={() => onReview(l)}>리뷰쓰기</button>;
    case '반품요청': return <button className={b} onClick={() => toast('반품 요청을 철회했어요')}>반품철회</button>;
    case '교환요청': return <button className={b} onClick={() => toast('교환 요청을 철회했어요')}>교환철회</button>;
    case '취소요청': return <button className={b} onClick={() => toast('취소 요청을 철회했어요')}>취소철회</button>;
    default: return null;
  }
}

export function MyOrders() {
  const [review, setReview] = useState(null);
  const [period, setPeriod] = useState('3개월');
  const counts = FLOW.map((s) => [s, allLines.filter((l) => l.status === s).length]);
  return (
    <div>
      <H>주문 · 배송</H>
      <div className="grid grid-cols-5 border border-line">
        {counts.map(([s, n], i) => (
          <div key={s} className={cx('py-5 text-center relative', i && 'border-l border-line')}>
            <div className={cx('text-[24px] font-bold num', n ? 'text-ink' : 'text-line-2')}>{n}</div>
            <div className="text-[12px] text-ink-2 mt-1">{s}</div>
            {i < 4 && <ChevronRight size={14} className="absolute -right-[8px] top-1/2 -translate-y-1/2 bg-white text-mute hidden sm:block" />}
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-6 mb-4">
        {['1개월', '3개월', '6개월', '전체'].map((p) => <button key={p} onClick={() => setPeriod(p)} className={cx('h-8 px-3 text-[13px] border', period === p ? 'border-ink bg-ink text-white' : 'border-line-2 text-ink-2')}>{p}</button>)}
      </div>
      <div className="space-y-5">
        {myOrders.map((o) => (
          <div key={o.id} className="border border-line">
            <div className="flex items-center justify-between px-4 h-11 bg-cream border-b border-line text-[13px]">
              <span><b>{ymd(o.date)}</b> <span className="text-mute num ml-2">주문번호 {o.id}</span></span>
              <Link to={`/mypage/orders/${o.id}`} className="flex items-center text-ink-2 hover:text-ink">상세보기 <ChevronRight size={14} /></Link>
            </div>
            {o.items.map((l) => {
              const p = productById[l.productId];
              return (
                <div key={l.lineId} className="flex flex-wrap sm:flex-nowrap gap-4 p-4 border-b border-line last:border-0">
                  <Link to={`/products/${p.id}`}><img src={p.images[0]} alt="" className="w-20 h-24 object-cover" /></Link>
                  <div className="flex-1 min-w-0 text-[13px]">
                    <StatusPill s={l.status} />
                    <div className="mt-1.5 text-mute">{storeById[p.storeId].name}</div>
                    <Link to={`/products/${p.id}`} className="font-medium text-[14px] hover:underline">{p.name}</Link>
                    <div className="text-mute mt-0.5">{l.option || '단일상품'} · {l.qty}개 · <b className="text-ink num">{won(l.unitPrice * l.qty)}</b></div>
                    {l.status === '배송완료' && <div className="text-[12px] text-moss mt-1">{ymd(new Date(l.date.getTime() + 9 * 864e5))} 자동 구매확정 예정</div>}
                  </div>
                  <div className="w-full sm:w-auto flex sm:flex-col gap-1.5 sm:items-stretch sm:min-w-[96px]"><LineActions l={{ ...l, orderId: o.id }} onReview={setReview} /></div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <ReviewModal line={review} onClose={() => setReview(null)} />
    </div>
  );
}

export function MyOrderDetail() {
  const { id } = useParams();
  const o = myOrders.find((x) => x.id === id) || myOrders[1];
  const shipped = o.items.find((l) => l.invoice) || o.items[0];
  const pay = orderPay(o);
  return (
    <div>
      <H right={<Link to="/mypage/orders" className="text-[13px] text-ink-2">← 목록</Link>}>주문 상세</H>
      <div className="text-[13px] text-ink-2 mb-4"><b className="text-ink">{ymdhm(o.date)}</b> 주문 · <span className="num">{o.id}</span></div>

      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        <div className="border border-line">
          {o.items.map((l) => {
            const p = productById[l.productId];
            return (
              <div key={l.lineId} className="flex gap-4 p-4 border-b border-line last:border-0 text-[13px]">
                <img src={p.images[0]} alt="" className="w-16 h-20 object-cover" />
                <div className="flex-1"><StatusPill s={l.status} /><div className="font-medium text-[14px] mt-1.5">{p.name}</div><div className="text-mute">{l.option} · {l.qty}개</div></div>
                <div className="flex flex-col items-end justify-between">
                  <div className="font-bold num">{won(l.unitPrice * l.qty)}</div>
                  <OpenChatButton className="btn btn-line btn-xs" basePath="/mypage/chats" by="BUYER"
                    request={{ type: 'STORE_INQUIRY', buyerId: CHAT_ME.userId, storeId: l.storeId, context: { type: 'ORDER_ITEM', id: l.lineId } }}>
                    판매자 문의
                  </OpenChatButton>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border border-line p-5">
          <div className="font-bold mb-1">배송 조회</div>
          <div className="text-[12px] text-mute mb-4">{shipped.courier} {shipped.invoice ? <span className="num">{shipped.invoice}</span> : '· 송장 등록 전'}</div>
          <ol className="border-l border-line ml-1.5">
            {trackingOf(shipped).map((t, i) => (
              <li key={i} className="relative pl-5 pb-4 last:pb-0">
                <span className={cx('absolute -left-[5px] top-1 w-[9px] h-[9px] rounded-full', i === 0 ? 'bg-point' : 'bg-line-2')} />
                <div className={cx('text-[13px]', i === 0 ? 'font-bold' : 'text-ink-2')}>{t.what}</div>
                <div className="text-[11.5px] text-mute num">{ymdhm(t.t)} · {t.where}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div>
          <div className="font-bold mb-2">배송지</div>
          <div className="border-t border-ink text-[13px]">
            {[['받는 분', myAddresses[0].name], ['연락처', myAddresses[0].phone], ['주소', `${myAddresses[0].addr} ${myAddresses[0].detail}`], ['요청사항', '문 앞에 놓아주세요']].map(([k, v]) => <div key={k} className="flex py-2.5 border-b border-line"><span className="w-24 text-mute">{k}</span>{v}</div>)}
          </div>
        </div>
        <div>
          <div className="font-bold mb-2">결제 정보</div>
          <div className="border-t border-ink text-[13px]">
            {[['상품금액', won(pay.goods)], ['배송비', pay.ship ? `+${won(pay.ship)}` : '무료'], ['포인트 사용', pay.used ? `−${comma(pay.used)}P` : '0P'], ['결제수단', `${o.payment.method} · ${o.payment.detail}`]].map(([k, v]) => <div key={k} className="flex justify-between py-2.5 border-b border-line"><span className="text-mute">{k}</span><span className="num">{v}</span></div>)}
            <div className="flex justify-between py-3 font-bold border-b border-line"><span>실결제금액</span><span className="num text-[16px]">{won(pay.paid)}</span></div>
            <div className="flex justify-between py-2.5 text-[13px]"><span className="text-mute">적립 포인트 (실결제금액의 {POINT_RATE * 100}%)</span><span className="num font-semibold text-moss">+{comma(pay.earned)}P</span></div>
          </div>
          <div className="flex gap-2 mt-2">
            <button className="btn btn-line btn-sm">영수증 / 거래명세서</button>
            <OpenChatButton basePath="/mypage/chats" by="BUYER" request={{ type: 'BUYER_SUPPORT', buyerId: CHAT_ME.userId, context: { type: 'ORDER', id: o.id } }}>
              결제 · 환불 문의
            </OpenChatButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── 클레임 신청 (취소 · 반품 · 교환) ─────────── */
const CLAIM_ALLOWED = { 결제완료: ['취소'], 배송준비: ['취소'], 배송중: [], 배송완료: ['반품', '교환'] };
const REASONS = {
  취소: ['단순 변심', '다른 상품 잘못 주문', '배송 지연', '판매자 요청'],
  반품: ['단순 변심', '사이즈/색상 안 맞음', '상품 불량/파손', '오배송', '상품정보와 다름'],
  교환: ['사이즈/색상 안 맞음', '상품 불량/파손', '오배송', '상품정보와 다름'],
};
const SELLER_FAULT = ['상품 불량/파손', '오배송', '상품정보와 다름'];

/* 환불 계산: 결제수단 환불 = 상품금액 − 그 상품주문분 사용 포인트 − 반품 배송비 / 사용 포인트는 환원, 적립 포인트는 회수 */
function refundOf(o, l, type, reason) {
  const amount = l.unitPrice * l.qty;
  const lp = linePoints(o, l);
  const shipFee = storeById[l.storeId].shipFee || 3000;
  const fee = type === '취소' || SELLER_FAULT.includes(reason) ? 0 : shipFee * 2;
  if (type === '교환') return { amount, fee, cash: 0, pointBack: 0, pointTake: 0 };
  return { amount, fee, cash: Math.max(0, amount - lp.used - fee), pointBack: lp.used, pointTake: lp.earned };
}

function RefundBox({ r, type }) {
  const row = (k, v, cls = '') => <div className={cx('flex justify-between', cls)}><span className="text-ink-2">{k}</span><span className="num">{v}</span></div>;
  return (
    <div className="bg-cream p-5 text-[14px] space-y-2">
      {row('상품 금액', won(r.amount))}
      {type === '교환'
        ? row('교환 배송비 (왕복)', r.fee ? won(r.fee) : '판매자 부담')
        : <>
          {row(type === '취소' ? '취소 배송비' : '반품 배송비 차감', r.fee ? `−${won(r.fee)}` : '판매자 부담')}
          {row('사용 포인트 환원', r.pointBack ? `+${comma(r.pointBack)}P` : '0P', 'text-moss')}
          {row('적립 포인트 회수', r.pointTake ? `−${comma(r.pointTake)}P` : '0P', 'text-rust')}
          <div className="flex justify-between font-bold border-t border-line-2 pt-2"><span>결제수단 환불 예정 금액</span><span className="num">{won(r.cash)}</span></div>
        </>}
    </div>
  );
}

export function ClaimRequest() {
  const { lineId } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { toast } = useApp();
  const l = allLines.find((x) => x.lineId === lineId) || allLines[0];
  const o = orderOfLine(l.lineId);
  const p = productById[l.productId];
  const store = storeById[p.storeId];
  const allowed = CLAIM_ALLOWED[l.status] || [];
  const types = allowed.length ? allowed : ['취소', '반품', '교환'];
  const [type, setType] = useState(types.includes(sp.get('type')) ? sp.get('type') : types[0]);
  const [reason, setReason] = useState('');
  const sellerFault = SELLER_FAULT.includes(reason);
  const r = refundOf(o, l, type, reason);
  return (
    <div>
      <H>취소 · 반품 · 교환 신청</H>
      <div className="flex gap-4 border border-line p-4 text-[13px]">
        <img src={p.images[0]} alt="" className="w-16 h-20 object-cover" />
        <div className="flex-1"><div className="text-mute">{store.name}</div><div className="font-medium text-[14px]">{p.name}</div><div className="text-mute">{l.option || '단일상품'} · {l.qty}개 · {won(r.amount)}</div></div>
        <div><StatusPill s={l.status} /></div>
      </div>
      <div className="mt-6 space-y-5">
        <div>
          <label className="label">신청 유형</label>
          <div className="grid grid-cols-3 gap-2">
            {['취소', '반품', '교환'].map((t) => {
              const on = types.includes(t);
              return (
                <button key={t} disabled={!on} onClick={() => { setType(t); setReason(''); }}
                  className={cx('h-11 border text-[14px]', type === t ? 'border-ink border-2 font-semibold' : 'border-line-2', !on && 'text-line-2 bg-cream cursor-not-allowed')}>{t}</button>
              );
            })}
          </div>
          <p className="text-[12px] text-mute mt-1.5">결제완료 · 배송준비: 취소 / 배송완료 후 7일 이내: 반품 · 교환 (구매확정 후에는 신청할 수 없어요)</p>
        </div>
        <div>
          <label className="label">{type} 사유</label>
          <div className="grid sm:grid-cols-2 gap-2">
            {REASONS[type].map((x) => (
              <button key={x} onClick={() => setReason(x)} className={cx('h-11 border text-left px-3 text-[14px]', reason === x ? 'border-ink border-2 font-semibold' : 'border-line-2')}>{x}</button>
            ))}
          </div>
        </div>
        {type === '교환' && <div><label className="label">교환 옵션</label><select className="field"><option>{l.option} → 다른 옵션 선택</option>{p.options.flatMap((op) => op.values).map((v) => <option key={v}>{v}</option>)}</select></div>}
        <div><label className="label">상세 사유</label><textarea rows={4} className="field" placeholder="판매자에게 전달할 내용을 적어주세요" /></div>
        {type !== '취소' && (
          <div>
            <label className="label">사진 첨부 {sellerFault && <span className="text-point">(필수)</span>}</label>
            <button className="w-20 h-20 border border-dashed border-line-2 text-mute flex flex-col items-center justify-center gap-1 text-[11px]"><Upload size={18} />추가</button>
          </div>
        )}
        {type !== '취소' && (
          <div><label className="label">회수 방법</label>
            <div className="grid grid-cols-2 gap-2"><button className="h-11 border-2 border-ink text-sm font-semibold">판매자 지정 택배 회수</button><button className="h-11 border border-line-2 text-sm">직접 발송</button></div>
          </div>
        )}
        <RefundBox r={r} type={type} />
        <p className="text-[12px] text-mute -mt-3">{type === '취소' ? '결제완료 상태는 즉시, 배송준비 상태는 판매자 승인 후 환불됩니다.' : type === '반품' ? '판매자가 회수 상품을 확인한 후 환불됩니다. (영업일 1~3일)' : '교환은 결제 · 재고 변동 없이 회수 확인 후 재배송됩니다.'}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => nav(-1)} className="btn btn-line">이전으로</button>
          <button disabled={!reason} onClick={() => { toast(`${type} 신청이 접수되었어요`); nav('/mypage/claims'); }} className="btn btn-ink px-8">{type} 신청하기</button>
        </div>
      </div>
    </div>
  );
}

export function MyClaims() {
  const [type, setType] = useState('전체');
  const [open, setOpen] = useState(null);
  const all = allLines.filter((l) => l.claim);
  const counts = { 전체: all.length, 취소: 0, 반품: 0, 교환: 0 };
  all.forEach((l) => { counts[l.claim.type] += 1; });
  const lines = type === '전체' ? all : all.filter((l) => l.claim.type === type);
  return (
    <div>
      <H>취소 · 반품 · 교환</H>
      <div className="mb-4"><Segments items={['전체', '취소', '반품', '교환']} value={type} onChange={setType} counts={counts} /></div>
      <table className="w-full text-[13px] border-t border-ink">
        <thead><tr className="text-left text-ink-2 border-b border-line"><th className="py-3 font-semibold">상품</th><th className="font-semibold">유형</th><th className="font-semibold hidden sm:table-cell">사유</th><th className="font-semibold hidden sm:table-cell">신청일</th><th className="font-semibold">상태</th><th /></tr></thead>
        <tbody>
          {lines.map((l) => {
            const p = productById[l.productId];
            const o = orderOfLine(l.lineId);
            const r = refundOf(o, l, l.claim.type, l.claim.reason);
            const done = l.status.endsWith('완료');
            const isOpen = open === l.lineId;
            return [
              <tr key={l.lineId} className="border-b border-line">
                <td className="py-3"><div className="flex items-center gap-3"><img src={p.images[0]} alt="" className="w-12 h-14 object-cover" /><span className="font-medium">{p.name}<br /><span className="text-mute font-normal">{l.option}</span></span></div></td>
                <td>{l.claim.type}</td><td className="text-ink-2 hidden sm:table-cell">{l.claim.reason}</td><td className="num hidden sm:table-cell">{ymd(l.claim.requested)}</td><td><StatusPill s={l.status} /></td>
                <td className="text-right"><button onClick={() => setOpen(isOpen ? null : l.lineId)} className="btn btn-line btn-xs">{isOpen ? '접기' : '상세'}</button></td>
              </tr>,
              isOpen && (
                <tr key={`${l.lineId}-d`} className="border-b border-line">
                  <td colSpan={6} className="py-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="text-[13px] space-y-1.5">
                        <div><span className="text-mute w-24 inline-block">상품주문번호</span><span className="num">{l.lineId}</span></div>
                        <div><span className="text-mute w-24 inline-block">사유</span>{l.claim.reason}{l.claim.detail && ` · ${l.claim.detail}`}</div>
                        <div><span className="text-mute w-24 inline-block">신청일</span><span className="num">{ymd(l.claim.requested)}</span></div>
                        <div><span className="text-mute w-24 inline-block">처리 상태</span>{done ? `${l.claim.type} 처리 완료` : '판매자 확인 중'}</div>
                      </div>
                      <div>
                        <RefundBox r={r} type={l.claim.type} />
                        {l.claim.type !== '교환' && <p className="text-[12px] text-mute mt-2">{done ? '사용 포인트는 환원되고, 이 상품주문분 적립 포인트는 회수되었어요.' : '처리 완료 시 사용 포인트 환원 · 적립 포인트 회수가 함께 진행돼요.'}</p>}
                      </div>
                    </div>
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
      <div className="mt-6 bg-cream p-5 text-[13px] text-ink-2 leading-relaxed">
        <b className="text-ink">처리 안내</b><br />
        · 결제완료 상태: 즉시 취소 · 배송준비 상태: 판매자 승인 후 취소<br />
        · 반품/교환: 배송완료 후 7일 이내 신청 가능 · 구매확정 후에는 신청 불가<br />
        · 취소 · 반품 완료 시 그 상품주문분 사용 포인트는 환원, 적립 포인트는 회수됩니다.
      </div>
    </div>
  );
}

/* ─────────── 리뷰 관리 ─────────── */
export function MyReviews() {
  const [tab, setTab] = useState('todo');
  const [review, setReview] = useState(null);
  const todo = allLines.filter((l) => l.status === '구매확정' && !l.reviewed);
  const mine = reviews.filter((r) => r.userId === ME.id).slice(0, 6);
  return (
    <div>
      <H>리뷰 관리</H>
      <div className="flex gap-6 border-b border-line mb-5">
        <button onClick={() => setTab('todo')} className={cx('tab', tab === 'todo' && 'tab-on')}>작성 가능한 리뷰 <span className="num text-point">{todo.length}</span></button>
        <button onClick={() => setTab('done')} className={cx('tab', tab === 'done' && 'tab-on')}>내가 쓴 리뷰 <span className="num">{mine.length}</span></button>
      </div>
      {tab === 'todo' ? (
        <div className="space-y-3">
          <p className="text-[13px] text-mute mb-2">구매확정된 상품주문 1건당 1개 · 확정 후 30일 이내 · 별점과 사진(최대 5장)을 남길 수 있어요</p>
          {todo.map((l) => {
            const p = productById[l.productId];
            return (
              <div key={l.lineId} className="flex items-center gap-4 border border-line p-4">
                <img src={p.images[0]} alt="" className="w-16 h-20 object-cover" />
                <div className="flex-1 text-[13px]"><div className="font-medium text-[14px]">{p.name}</div><div className="text-mute">{l.option} · {ymd(l.date)} 구매</div><div className="text-point text-[12px] mt-1">작성기한 D-{30 - Math.round((Date.now() - l.date) / 864e5) + 14}</div></div>
                <button onClick={() => setReview(l)} className="btn btn-ink btn-sm">리뷰 쓰기</button>
              </div>
            );
          })}
        </div>
      ) : (
        <ul>
          {mine.map((r) => {
            const p = productById[r.productId];
            return (
              <li key={r.id} className="py-5 border-b border-line flex gap-4">
                <img src={p.images[0]} alt="" className="w-14 h-16 object-cover" />
                <div className="flex-1 text-[13px]">
                  <div className="font-medium">{p.name}</div>
                  <div className="flex items-center gap-2 text-mute mt-0.5"><Stars value={r.rating} size={11} /> {ymd(r.date)} {r.blinded && <Pill tone="rust">블라인드</Pill>}</div>
                  <p className="mt-2 text-ink-2">{r.body}</p>
                  {r.reply && <p className="mt-2 bg-cream p-3 text-ink-2"><b className="text-ink">판매자 답글</b> {r.reply}</p>}
                </div>
                <div className="flex flex-col gap-1.5"><button className="btn btn-line btn-xs">수정</button><button className="btn btn-ghost btn-xs">삭제</button></div>
              </li>
            );
          })}
        </ul>
      )}
      <ReviewModal line={review} onClose={() => setReview(null)} />
    </div>
  );
}

export function MyQna() {
  return (
    <div>
      <H>상품 문의</H>
      <Empty title="작성한 문의가 없어요" desc="상품 상세 페이지의 Q&A 탭에서 문의할 수 있어요." action={<Link to="/help" className="btn btn-line btn-sm">고객센터 FAQ 보기</Link>} />
    </div>
  );
}

/* ─────────── 1:1 채팅 (스토어 톡 · 고객센터 1:1 상담) ─────────── */
export function MyChats() {
  return (
    <div>
      <H>1:1 채팅</H>
      <ChatInbox kind="buyer" basePath="/mypage/chats" />
    </div>
  );
}

/* ─────────── 포인트 ─────────── */
export function MyPoints() {
  const [type, setType] = useState('전체');
  const counts = Object.fromEntries([['전체', myPointHistory.length], ...POINT_TYPES.map((t) => [t, myPointHistory.filter((r) => r.type === t).length])]);
  const rows = type === '전체' ? myPointHistory : myPointHistory.filter((r) => r.type === type);
  return (
    <div>
      <H>포인트</H>
      <div className="grid grid-cols-2 md:grid-cols-5 border border-line">
        <div className="col-span-2 md:col-span-1 p-5 bg-ink text-white">
          <div className="text-[12px] text-white/60">보유 포인트</div>
          <div className="text-[26px] font-bold num mt-1">{comma(myPointBalance)}<span className="text-[15px] ml-0.5">P</span></div>
        </div>
        {POINT_TYPES.map((t, i) => (
          <div key={t} className={cx('p-5', i % 2 === 1 && 'border-l border-line', i > 0 && 'md:border-l', i < 2 && 'border-b md:border-b-0 border-line')}>
            <div className="text-[12px] text-mute">누적 {t}</div>
            <div className={cx('text-[18px] font-bold num mt-1', (t === '사용' || t === '회수') && 'text-ink-2')}>{t === '사용' || t === '회수' ? '−' : '+'}{comma(pointSum(t))}P</div>
          </div>
        ))}
      </div>
      <div className="mt-6 mb-4"><Segments items={['전체', ...POINT_TYPES]} value={type} onChange={setType} counts={counts} /></div>
      <table className="w-full text-[13px] border-t border-ink">
        <thead><tr className="text-left text-ink-2 border-b border-line"><th className="py-3 font-semibold w-28">일자</th><th className="font-semibold w-16">구분</th><th className="font-semibold">내용</th><th className="font-semibold text-right">포인트</th><th className="font-semibold text-right hidden sm:table-cell">잔액</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line">
              <td className="py-3 text-mute num">{ymd(r.date)}</td>
              <td><StatusPill s={r.type} /></td>
              <td><div>{r.desc}</div><div className="text-[11.5px] text-mute num">{r.ref}</div></td>
              <td className={cx('text-right num font-semibold', r.amount < 0 && 'text-rust')}>{r.amount > 0 ? '+' : ''}{comma(r.amount)}P</td>
              <td className="text-right num text-ink-2 hidden sm:table-cell">{comma(r.balance)}P</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-6 bg-cream p-5 text-[13px] text-ink-2 leading-relaxed">
        <b className="text-ink">포인트 안내</b><br />
        · 결제 시 실결제금액(포인트 사용분 제외)의 {POINT_RATE * 100}%가 적립되며, 다음 결제부터 사용할 수 있어요.<br />
        · 사용 · 적립 포인트는 상품주문 단위로 금액 비율에 따라 나뉘어 기록돼요.<br />
        · 취소 · 반품이 완료되면 그 상품주문분 사용 포인트는 환원, 적립 포인트는 회수됩니다.
      </div>
    </div>
  );
}

export function MyProfile() {
  const { toast } = useApp();
  return (
    <div>
      <H>회원정보 수정</H>
      <div className="max-w-[520px] space-y-4">
        <div className="flex items-center gap-4"><img src={ME.avatar} alt="" className="w-16 h-16 rounded-full object-cover" /><button className="btn btn-line btn-sm">프로필 사진 변경</button></div>
        {[['이메일', ME.email, true], ['이름', ME.name], ['닉네임', ME.nick], ['휴대폰', ME.phone]].map(([k, v, ro]) => (
          <div key={k}><label className="label">{k}</label><input className={cx('field', ro && 'bg-cream text-mute')} defaultValue={v} readOnly={ro} /></div>
        ))}
        <div><label className="label">비밀번호</label><button className="btn btn-line btn-sm">비밀번호 변경</button></div>
        <div className="border-t border-line pt-4 space-y-2 text-[13px]">
          <div className="font-semibold">알림 수신 설정</div>
          <Checkbox checked label="주문/배송 알림 (필수)" />
          <Checkbox checked label="관심 스토어 신상품 알림" />
          <Checkbox checked={false} label="마케팅 정보 수신 (이메일 · 문자)" />
        </div>
        <div className="flex justify-between pt-4">
          <button className="text-[12px] text-mute underline">회원 탈퇴</button>
          <button onClick={() => toast('회원정보가 수정되었어요')} className="btn btn-ink px-8">저장</button>
        </div>
      </div>
      <div className="mt-10 border border-line p-5 text-[13px]">
        <div className="font-bold mb-3">회원등급 <span className="text-mute font-normal">· 누적 구매확정 금액 기준 · 적립률은 모든 등급 {POINT_RATE * 100}%</span></div>
        <div className="grid grid-cols-3 gap-px bg-line">
          {GRADES.map((g) => (
            <div key={g.id} className={cx('p-3 text-center', g.id === ME.grade ? 'bg-ink text-white' : 'bg-white')}>
              <GradeBadge grade={g.id} dark={g.id === ME.grade} />
              <div className="font-bold mt-1.5">{g.label}</div>
              <div className="text-[11.5px] opacity-70 mt-1">{g.min ? `누적 ${comma(g.min / 10000)}만원 이상` : '가입 시'}</div>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-mute mt-2">내 누적 구매확정 금액 <b className="num text-ink">{won(ME.spent)}</b></p>
      </div>
    </div>
  );
}

export function MyAddresses() {
  const [open, setOpen] = useState(false);
  const { toast } = useApp();
  return (
    <div>
      <H right={<button onClick={() => setOpen(true)} className="btn btn-ink btn-sm">+ 배송지 추가</button>}>배송지 관리</H>
      <div className="space-y-3">
        {myAddresses.map((a) => (
          <div key={a.id} className="border border-line p-5 flex justify-between gap-4 text-[13px]">
            <div>
              <div className="font-bold text-[14px]">{a.label} · {a.name} {a.main && <span className="text-point text-[11px] ml-1">기본배송지</span>}</div>
              <div className="text-ink-2 mt-1">{a.phone}</div><div className="text-ink-2">({a.zip}) {a.addr} {a.detail}</div>
            </div>
            <div className="flex gap-1.5 items-start"><button className="btn btn-line btn-xs">수정</button>{!a.main && <button className="btn btn-ghost btn-xs">삭제</button>}</div>
          </div>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="배송지 추가"
        footer={<><button className="btn btn-line btn-sm" onClick={() => setOpen(false)}>취소</button><button className="btn btn-ink btn-sm" onClick={() => { setOpen(false); toast('배송지가 추가되었어요'); }}>저장</button></>}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2"><input className="field" placeholder="배송지명 (예: 집)" /><input className="field" placeholder="받는 분" /></div>
          <input className="field" placeholder="연락처" />
          <div className="flex gap-2"><input className="field" placeholder="우편번호" /><button className="btn btn-line shrink-0">주소 검색</button></div>
          <input className="field" placeholder="기본 주소" /><input className="field" placeholder="상세 주소" />
          <Checkbox checked={false} label="기본 배송지로 설정" />
        </div>
      </Modal>
    </div>
  );
}
