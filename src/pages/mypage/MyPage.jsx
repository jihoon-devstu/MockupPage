import { useState } from 'react';
import { Link, NavLink, Outlet, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Star, Camera, Upload, X, Lock } from 'lucide-react';
import { productById, storeById } from '../../data/catalog';
import { ME, myAddresses, GRADES, gradeById, nextGrade } from '../../data/people';
import { myOrders, FLOW, orderPay, linePoints, orderOfLine, shipFeeFor, POINT_RATE } from '../../data/orders';
import { myPointHistory, myPointBalance, pointSum, POINT_TYPES } from '../../data/points';
import { reviews, qnas } from '../../data/reviews';
import { useApp } from '../../lib/store';
import { StatusPill, Modal, Checkbox, Stars, Empty, Pill, GradeBadge, Segments } from '../../components/ui';
import { ChatInbox, OpenChatButton } from '../../components/Chat';
import InquiryModal from '../../components/InquiryModal';
import { CHAT_ME } from '../../data/chats';
import { cx, won, comma, ymd, ymdhm } from '../../lib/format';

/* 실제 구현 features/order (orderView · claimView · MyOrders · MyOrderDetail · MyClaimRequest · MyClaims),
   features/review (MyReviews · MyReviewModal), features/user (MyPoints · MyProfile · MyAddresses) 와 같은 구성 */
const allLines = myOrders.flatMap((o) => o.items.map((l) => ({ ...l, orderId: o.id })));
const DAY = 864e5;
// 상품주문 시각 (목업: 주문 시각 기준으로 계산 — 실제는 서버의 shippedAt · deliveredAt · confirmedAt)
const shippedAt = (l) => new Date(l.date.getTime() + 26 * 36e5);
const deliveredAt = (l) => new Date(l.date.getTime() + 46 * 36e5);
const confirmedAt = (l) => new Date(l.date.getTime() + (46 + 72) * 36e5);
const reviewExpiresAt = (l) => confirmedAt(l).getTime() + 30 * DAY;
// 리뷰 작성 가능 — 구매확정 후 30일 안 · 아직 안 씀
const writableOf = (l) => l.status === '구매확정' && !l.reviewed && reviewExpiresAt(l) > Date.now();
// 결제 대기 · 실패 주문의 상품주문은 '주문완료'로 남는다 → 주문 상태(결제대기 · 결제실패)로 보여 준다
const lineStatusLabel = (o, l) => ({ PENDING: '결제대기', FAILED: '결제실패' })[o.status] ?? l.status;
const payMethodLabel = (p) => ({ CARD: '카드', EASY_PAY: '간편결제' })[p?.method] ?? (p?.method || '포인트 결제');
const sortedOrders = [...myOrders].sort((a, b) => b.date - a.date);

/* 클레임 단계 — 화면은 유형 + 단계 (반품요청 · 반품승인 · 반품수거완료 · 교환재배송중 · 반품완료 · 반품거부, 취소 진행 중은 "취소중") */
const CLAIM_STEP_LABEL = { REQUESTED: '요청', APPROVED: '승인', COLLECTED: '수거완료', RESHIPPED: '재배송중', REJECTED: '거부', WITHDRAWN: '철회', COMPLETED: '완료' };
const claimStatusLabel = ({ type, step }) => (type === '취소' && step === 'APPROVED' ? '취소중' : `${type}${CLAIM_STEP_LABEL[step] ?? ''}`);
// 구매자가 철회할 수 있는지 — 반품 · 교환이 판매자 승인 전일 때만 (취소는 즉시 처리)
const canWithdraw = ({ type, step }) => type !== '취소' && step === 'REQUESTED';
function claimProgress({ type, step, rejectReason }) {
  switch (step) {
    case 'REQUESTED': return '판매자 확인 중이에요.';
    case 'APPROVED': return type === '취소' ? '환불을 처리하고 있어요.' : '승인되었어요. 상품을 회수하고 있어요.';
    case 'COLLECTED': return type === '반품' ? '회수 완료 — 환불을 처리하고 있어요.' : '회수 완료 — 곧 같은 옵션으로 다시 보내 드려요.';
    case 'RESHIPPED': return '교환 상품을 다시 보냈어요. 배송완료되면 교환이 끝나요.';
    case 'REJECTED': return `판매자가 거부했어요 — ${rejectReason ?? ''}`.trim();
    case 'WITHDRAWN': return '요청을 철회했어요.';
    default: return `${type} 처리가 끝났어요.`;
  }
}

/* ─────────── 레이아웃 ─────────── */
const MENU = [
  ['쇼핑', [['/mypage/orders', '주문 · 배송'], ['/mypage/claims', '취소 · 반품 · 교환'], ['/cart', '장바구니']]],
  ['활동', [['/mypage/reviews', '리뷰 관리'], ['/mypage/qna', '상품 문의'], ['/mypage/chats', '1:1 채팅']]],
  ['혜택', [['/mypage/points', '포인트']]],
  ['내 정보', [['/mypage/profile', '회원정보 수정'], ['/mypage/addresses', '배송지 관리']]],
];

export function MyPageLayout() {
  const next = nextGrade(ME.spent);
  const todoReviews = allLines.filter(writableOf).length;
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

/* ─────────── 리뷰 작성 · 수정 모달 ───────────
   target: { line } 이면 작성(작성 가능한 상품주문), { review } 면 수정(내가 쓴 리뷰) */
const FITS = ['작아요', '정사이즈', '커요'];
const CONTENT_MIN = 20;
const CONTENT_MAX = 2000;
const MAX_IMAGES = 3;
const STAR_TEXT = ['', '별로예요', '그저 그래요', '괜찮아요', '좋아요', '최고예요'];

export function ReviewModal({ target, onClose }) {
  if (!target) return null;
  return <ReviewForm key={target.review?.id ?? `new-${target.line.lineId}`} target={target} onClose={onClose} />;
}

function ReviewForm({ target, onClose }) {
  const { toast } = useApp();
  const editing = target.review;
  const item = editing ?? target.line;
  const p = productById[item.productId];
  const [star, setStar] = useState(editing?.rating ?? 5);
  const [hover, setHover] = useState(0);
  const [fit, setFit] = useState(editing?.fit ?? null);
  const [body, setBody] = useState(editing?.body ?? '');
  const [photos, setPhotos] = useState(editing?.photos ?? []);
  const [error, setError] = useState('');
  const submit = () => {
    const content = body.trim();
    if (content.length < CONTENT_MIN || content.length > CONTENT_MAX) return setError(`리뷰 내용은 ${CONTENT_MIN}~${CONTENT_MAX.toLocaleString()}자로 입력해 주세요`);
    toast(editing ? '리뷰를 수정했어요' : '리뷰가 등록되었어요');
    onClose();
  };
  // 목업: 사진 추가를 누르면 상품 사진을 하나씩 붙인다 (실제는 JPG · PNG · WEBP · 10MB 이하 파일 선택)
  const addPhoto = () => setPhotos((prev) => [...prev, p.images[prev.length % p.images.length]]);
  return (
    <Modal open onClose={onClose} title={editing ? '리뷰 수정' : '리뷰 쓰기'} width={560}
      footer={<><button className="btn btn-line btn-sm" onClick={onClose}>취소</button><button className="btn btn-ink btn-sm" onClick={submit}>{editing ? '수정하기' : '등록하기'}</button></>}>
      <div className="flex gap-3 pb-4 border-b border-line">
        <img src={p.images[0]} alt="" className="w-14 h-16 object-cover" />
        <div className="text-[13px]"><div className="font-semibold">{p.name}</div><div className="text-mute">{item.option}</div></div>
      </div>
      <div className="py-5 text-center">
        <div className="text-[14px] font-semibold">상품은 만족하셨나요?</div>
        <div className="mt-3 flex justify-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} aria-label={`별점 ${i}점`} onMouseEnter={() => setHover(i)} onClick={() => setStar(i)}>
              <Star size={34} strokeWidth={0} className={(hover || star) >= i ? 'fill-ink' : 'fill-line-2'} />
            </button>
          ))}
        </div>
        <div className="text-[12px] text-mute mt-1">{STAR_TEXT[hover || star]}</div>
      </div>
      <div className="mb-4">
        <div className="label">사이즈는 어땠나요? <span className="text-mute font-normal">(선택 — 의류 · 신발 · 가방)</span></div>
        <div className="grid grid-cols-3 gap-2">{FITS.map((f) => <button key={f} onClick={() => setFit(fit === f ? null : f)} className={cx('h-10 border text-sm', fit === f ? 'border-ink border-2 font-bold' : 'border-line-2')}>{f}</button>)}</div>
      </div>
      <label className="label">리뷰 내용</label>
      <textarea rows={5} className="field" value={body} onChange={(e) => setBody(e.target.value)} placeholder={`최소 ${CONTENT_MIN}자 이상 작성해주세요. 다른 구매자에게 큰 도움이 됩니다.`} />
      <div className="mt-1 text-right text-[11.5px] text-mute num">{body.trim().length} / {CONTENT_MAX.toLocaleString()}</div>
      <div className="mt-2 flex gap-2 flex-wrap">
        {photos.map((src, i) => (
          <div key={`${src}-${i}`} className="relative w-20 h-20">
            <img src={src} alt="" className="w-full h-full object-cover" />
            <button onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))} aria-label="사진 빼기" className="absolute top-0.5 right-0.5 bg-black/60 text-white p-0.5"><X size={12} /></button>
          </div>
        ))}
        {photos.length < MAX_IMAGES && (
          <button onClick={addPhoto} className="w-20 h-20 border border-dashed border-line-2 text-mute flex flex-col items-center justify-center text-[11px] gap-1"><Camera size={18} />사진 추가</button>
        )}
      </div>
      <p className="mt-3 text-[12px] text-mute">사진은 최대 {MAX_IMAGES}장 · 10MB 이하 · 상품과 무관한 내용, 욕설은 운영 정책에 따라 블라인드 처리될 수 있습니다.</p>
      {error && <p role="alert" className="mt-3 text-[13px] text-rust">{error}</p>}
    </Modal>
  );
}

/* ─────────── 주문 · 배송 ─────────── */
// 철회 버튼은 철회할 수 있는 클레임(판매자 승인 전 반품 · 교환)일 때만, 리뷰쓰기는 작성 가능(구매확정 후 30일 안 · 안 씀)일 때만
function LineActions({ o, l, onReview }) {
  const { toast } = useApp();
  const nav = useNavigate();
  const b = 'btn btn-line btn-xs';
  if (o.status !== 'PAID') return null; // 결제 대기 · 실패 주문은 할 일 없음 (대기는 서버가 정리)
  const confirmPurchase = () => {
    if (!window.confirm('구매확정하면 반품 · 교환을 신청할 수 없어요. 구매확정할까요?')) return;
    toast('구매확정 되었어요. 리뷰를 작성할 수 있어요');
  };
  switch (l.status) {
    case '결제완료': return <button className={b} onClick={() => nav(`/mypage/claim/${l.lineId}?type=취소`)}>주문취소</button>;
    case '배송중': return <Link className={b} to={`/mypage/orders/${o.id}`}>배송조회</Link>;
    case '배송완료': return (<>
      <button className="btn btn-ink btn-xs" onClick={confirmPurchase}>구매확정</button>
      <button className={b} onClick={() => nav(`/mypage/claim/${l.lineId}?type=반품`)}>반품요청</button>
      <button className={b} onClick={() => nav(`/mypage/claim/${l.lineId}?type=교환`)}>교환요청</button>
    </>);
    case '구매확정': return writableOf(l) && <button className="btn btn-point btn-xs" onClick={() => onReview({ line: l })}>리뷰쓰기</button>;
    case '반품요청': return l.claim && canWithdraw(l.claim) && <button className={b} onClick={() => toast('반품 요청을 철회했어요')}>반품철회</button>;
    case '교환요청': return l.claim && canWithdraw(l.claim) && <button className={b} onClick={() => toast('교환 요청을 철회했어요')}>교환철회</button>;
    default: return null;
  }
}

// 결제 대기 · 실패 안내 — 결제 대기 만료는 서버 스케줄러가 처리하고 화면은 상태만 보여 준다
function OrderNotice({ status }) {
  if (status === 'PENDING') return <div className="px-4 py-2.5 text-[12px] bg-cream border-b border-line text-ink-2">결제가 아직 확인되지 않았어요. 결제를 마치지 않으면 잠시 후 주문이 자동 취소되고 사용한 포인트는 돌려드려요.</div>;
  if (status === 'FAILED') return <div className="px-4 py-2.5 text-[12px] bg-cream border-b border-line text-rust">결제 시간이 지났거나 결제가 확인되지 않아 주문이 취소되었어요. 사용한 포인트는 돌려드렸어요.</div>;
  return null;
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
        {sortedOrders.map((o) => (
          <div key={o.id} className="border border-line">
            <div className="flex items-center justify-between px-4 h-11 bg-cream border-b border-line text-[13px]">
              <span><b>{ymd(o.date)}</b> <span className="text-mute num ml-2">주문번호 {o.id}</span></span>
              <Link to={`/mypage/orders/${o.id}`} className="flex items-center text-ink-2 hover:text-ink">상세보기 <ChevronRight size={14} /></Link>
            </div>
            <OrderNotice status={o.status} />
            {o.items.map((l) => {
              const p = productById[l.productId];
              return (
                <div key={l.lineId} className="flex flex-wrap sm:flex-nowrap gap-4 p-4 border-b border-line last:border-0">
                  <Link to={`/products/${p.id}`}><img src={p.images[0]} alt="" className="w-20 h-24 object-cover" /></Link>
                  <div className="flex-1 min-w-0 text-[13px]">
                    <StatusPill s={lineStatusLabel(o, l)} />
                    <div className="mt-1.5 text-mute">{storeById[p.storeId].name}</div>
                    <Link to={`/products/${p.id}`} className="font-medium text-[14px] hover:underline">{p.name}</Link>
                    <div className="text-mute mt-0.5">{l.option || '단일상품'} · {l.qty}개 · <b className="text-ink num">{won(l.unitPrice * l.qty)}</b></div>
                    {l.status === '배송완료' && <div className="text-[12px] text-moss mt-1">{ymd(deliveredAt(l))} 배송완료 · 7일 뒤 자동 구매확정</div>}
                  </div>
                  <div className="w-full sm:w-auto flex sm:flex-col gap-1.5 sm:items-stretch sm:min-w-[96px]"><LineActions o={o} l={{ ...l, orderId: o.id }} onReview={setReview} /></div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <ReviewModal target={review} onClose={() => setReview(null)} />
    </div>
  );
}

// 배송 진행 — 상품주문 시각으로 최신 단계부터 (주문 접수 · 결제 완료 · 발송 · 배송완료 · 구매확정)
function trackingOf(o, l) {
  const delivered = l.invoice && l.status !== '배송중';
  return [
    l.status === '구매확정' && { at: confirmedAt(l), what: '구매확정되었습니다' },
    delivered && { at: deliveredAt(l), what: '배송이 완료되었습니다' },
    l.invoice && { at: shippedAt(l), what: `상품이 발송되었습니다 (${l.courier} ${l.invoice})` },
    o.status === 'PAID' && { at: new Date(o.date.getTime() + 6e4), what: '결제가 완료되었습니다' },
    { at: o.date, what: '주문이 접수되었습니다' },
  ].filter(Boolean);
}

export function MyOrderDetail() {
  const { id } = useParams();
  const o = myOrders.find((x) => x.id === id) || myOrders.find((x) => x.id === '20260928-000017');
  const shipped = o.items.find((l) => l.invoice) || o.items[0];
  const pay = orderPay(o);
  const ended = (l) => l.status === '취소완료' || l.status === '반품완료';
  const refunded = o.items.filter(ended).reduce((a, l) => a + refundOf(o, l, l.claim.type, l.claim.reason).cash, 0);
  const earned = o.items.filter((l) => !ended(l)).reduce((a, l) => a + linePoints(o, l).earned, 0);
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
                <div className="flex-1"><StatusPill s={lineStatusLabel(o, l)} /><div className="font-medium text-[14px] mt-1.5">{p.name}</div><div className="text-mute">{storeById[l.storeId].name} · {l.option || '단일상품'} · {l.qty}개</div></div>
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
          <div className="text-[12px] text-mute mb-4">{shipped.invoice ? <>{shipped.courier} <span className="num">{shipped.invoice}</span></> : '송장 등록 전'}</div>
          <ol className="border-l border-line ml-1.5">
            {trackingOf(o, shipped).map((t, i) => (
              <li key={t.what} className="relative pl-5 pb-4 last:pb-0">
                <span className={cx('absolute -left-[5px] top-1 w-[9px] h-[9px] rounded-full', i === 0 ? 'bg-point' : 'bg-line-2')} />
                <div className={cx('text-[13px]', i === 0 ? 'font-bold' : 'text-ink-2')}>{t.what}</div>
                <div className="text-[11.5px] text-mute num">{ymdhm(t.at)}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div>
          <div className="font-bold mb-2">배송지</div>
          <div className="border-t border-ink text-[13px]">
            {[['받는 분', o.ship.name], ['연락처', o.ship.phone], ['주소', `(${o.ship.zip}) ${o.ship.addr} ${o.ship.detail ?? ''}`], ['요청사항', o.ship.memo || '없음']].map(([k, v]) => <div key={k} className="flex py-2.5 border-b border-line"><span className="w-24 text-mute">{k}</span>{v}</div>)}
          </div>
        </div>
        <div>
          <div className="font-bold mb-2">결제 정보</div>
          <div className="border-t border-ink text-[13px]">
            {[['상품금액', won(pay.goods)], ['배송비', pay.ship ? `+${won(pay.ship)}` : '무료'], ['포인트 사용', pay.used ? `−${comma(pay.used)}P` : '0P'], ['결제수단', payMethodLabel(o.payment)]].map(([k, v]) => <div key={k} className="flex justify-between py-2.5 border-b border-line"><span className="text-mute">{k}</span><span className="num">{v}</span></div>)}
            <div className="flex justify-between py-3 font-bold border-b border-line"><span>실결제금액</span><span className="num text-[16px]">{won(pay.paid)}</span></div>
            {refunded > 0 && <div className="flex justify-between py-2.5 border-b border-line text-rust"><span>환불 금액</span><span className="num">−{won(refunded)}</span></div>}
            <div className="flex justify-between py-2.5 text-[13px]"><span className="text-mute">{o.items.every((l) => l.status === '구매확정') ? '적립 포인트' : '적립 예정 포인트 (구매확정 시 적립)'}</span><span className="num font-semibold text-moss">+{comma(earned)}P</span></div>
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
// 신청할 수 있는 클레임 — 결제완료: 즉시 취소, 배송완료: 반품 · 교환(7일 이내는 서버가 판단). 배송준비 취소요청은 없음
const CLAIM_ALLOWED = { 결제완료: ['취소'], 배송완료: ['반품', '교환'] };
// 클레임 사유 (backend ClaimReasonCode) — 취소는 판매자 귀책 사유 없음
const CLAIM_REASONS = [
  { label: '단순 변심', types: ['취소', '반품', '교환'] },
  { label: '배송 지연', types: ['취소'] },
  { label: '상품 불량 · 파손', types: ['반품', '교환'], sellerFault: true },
  { label: '오배송', types: ['반품', '교환'], sellerFault: true },
  { label: '기타 (상세 사유에 적어 주세요)', types: ['취소', '반품', '교환'] },
];
const isSellerFault = (reason) => CLAIM_REASONS.some((r) => r.label === reason && r.sellerFault);
const reasonLabel = (reason) => reason.replace(/ \(.*\)$/, '');

/* 환불 예정액 (실제는 서버 claims/preview)
   취소: 그 스토어의 마지막 상품주문이면 배송비 환불 · 반품: 구매자 사유면 왕복 배송비 차감 · 교환: 금액 0
   결제수단 환불 = 상품금액 ± 배송비 − 그 상품주문분 사용 포인트(환원). 적립은 구매확정 때라 회수할 적립 포인트 없음 */
function refundOf(o, l, type, reason) {
  const amount = l.unitPrice * l.qty;
  if (type === '교환') return { amount, ship: 0, pointBack: 0, cash: 0 };
  const store = storeById[l.storeId];
  let ship = 0;
  if (type === '취소') {
    const others = o.items.filter((x) => x.lineId !== l.lineId && x.storeId === l.storeId && !['취소완료', '반품완료'].includes(x.status));
    if (!others.length) ship = shipFeeFor(store, amount);
  } else if (!isSellerFault(reason)) ship = -(store.shipFee || 3000) * 2;
  const pointBack = linePoints(o, l).used;
  return { amount, ship, pointBack, cash: Math.max(0, amount + ship - pointBack) };
}

function PreviewBox({ r, type, reason }) {
  const row = (k, v, cls = '') => <div className={cx('flex justify-between', cls)}><span className="text-ink-2">{k}</span><span className="num">{v}</span></div>;
  if (!reason) return <div className="bg-cream p-5 text-[13px] text-mute">사유를 고르면 환불 예정 금액을 알려 드려요.</div>;
  return (
    <div className="bg-cream p-5 text-[14px] space-y-2">
      {row('상품 금액', won(r.amount))}
      {type === '교환'
        ? row('교환 배송비', '판매자 부담 · 같은 옵션으로 다시 보내 드려요')
        : <>
          {type === '취소'
            ? row('배송비 환불', r.ship ? `+${won(r.ship)}` : '없음 (같은 스토어 상품이 남아 있어요)')
            : row('반품 배송비 차감', r.ship ? `−${won(Math.abs(r.ship))}` : '판매자 부담')}
          {row('사용 포인트 환원', r.pointBack ? `+${comma(r.pointBack)}P` : '0P', 'text-moss')}
          <div className="flex justify-between font-bold border-t border-line-2 pt-2"><span>결제수단 환불 예정 금액</span><span className="num">{won(r.cash)}</span></div>
        </>}
    </div>
  );
}

const DONE_MESSAGE = { 취소: '주문을 취소했어요. 결제 금액은 결제수단으로 돌려드려요.', 반품: '반품을 신청했어요. 판매자 확인 후 회수해 드려요.', 교환: '교환을 신청했어요. 판매자 확인 후 회수해 드려요.' };

export function ClaimRequest() {
  const { lineId } = useParams();
  const l = allLines.find((x) => x.lineId === lineId);
  if (!l) return <p className="text-mute py-10 text-center">상품주문을 찾을 수 없어요</p>;
  return <ClaimRequestBody key={l.lineId} l={l} />; // key: 다른 상품주문으로 이동하면 유형 · 사유 초기화
}

function ClaimRequestBody({ l }) {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { toast } = useApp();
  const o = orderOfLine(l.lineId);
  const p = productById[l.productId];
  const store = storeById[p.storeId];
  const types = o.status === 'PAID' ? CLAIM_ALLOWED[l.status] || [] : [];
  const [type, setType] = useState(types.includes(sp.get('type')) ? sp.get('type') : types[0]);
  const [reason, setReason] = useState('');
  const r = refundOf(o, l, type, reason);
  return (
    <div>
      <H>취소 · 반품 · 교환 신청</H>
      <div className="flex gap-4 border border-line p-4 text-[13px]">
        <img src={p.images[0]} alt="" className="w-16 h-20 object-cover" />
        <div className="flex-1"><div className="text-mute">{store.name}</div><div className="font-medium text-[14px]">{p.name}</div><div className="text-mute">{l.option || '단일상품'} · {l.qty}개 · {won(r.amount)}</div></div>
        <div><StatusPill s={lineStatusLabel(o, l)} /></div>
      </div>
      {!types.length ? (
        <div className="mt-6 text-center text-[14px] text-ink-2">
          <p>지금은 취소 · 반품 · 교환을 신청할 수 없는 상품이에요.</p>
          <p className="text-[12px] text-mute mt-1">결제완료: 취소 / 배송완료 후 7일 이내: 반품 · 교환 (배송준비 중 취소는 고객센터로 문의해 주세요)</p>
          <Link to="/mypage/orders" className="btn btn-line mt-5">주문 내역으로</Link>
        </div>
      ) : (
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
            <p className="text-[12px] text-mute mt-1.5">결제완료: 취소 / 배송완료 후 7일 이내: 반품 · 교환 (구매확정 후에는 신청할 수 없어요)</p>
          </div>
          <div>
            <label className="label">{type} 사유</label>
            <div className="grid sm:grid-cols-2 gap-2">
              {CLAIM_REASONS.filter((x) => x.types.includes(type)).map((x) => (
                <button key={x.label} onClick={() => setReason(x.label)} className={cx('h-11 border text-left px-3 text-[14px]', reason === x.label ? 'border-ink border-2 font-semibold' : 'border-line-2')}>{x.label}</button>
              ))}
            </div>
          </div>
          <div><label className="label">상세 사유</label><textarea rows={4} maxLength={500} className="field" placeholder="판매자에게 전달할 내용을 적어주세요" /></div>
          {type !== '취소' && (
            <div>
              <label className="label">사진 첨부 {isSellerFault(reason) && <span className="text-point">(필수)</span>}</label>
              <button className="w-20 h-20 border border-dashed border-line-2 text-mute flex flex-col items-center justify-center gap-1 text-[11px]"><Upload size={18} />추가</button>
            </div>
          )}
          {type !== '취소' && (
            <div><label className="label">회수 방법</label>
              <div className="grid grid-cols-2 gap-2"><button className="h-11 border-2 border-ink text-sm font-semibold">판매자 지정 택배 회수</button><button className="h-11 border border-line-2 text-sm">직접 발송</button></div>
            </div>
          )}
          <PreviewBox r={r} type={type} reason={reason} />
          <p className="text-[12px] text-mute -mt-3">{type === '취소' ? '결제완료 상태는 판매자 확인 없이 바로 취소되고 결제수단으로 환불돼요.' : type === '반품' ? '판매자가 회수 상품을 확인한 후 환불됩니다. (영업일 1~3일)' : '교환은 결제 · 재고 변동 없이 회수 확인 후 같은 옵션으로 재배송됩니다.'}</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => nav(-1)} className="btn btn-line">이전으로</button>
            <button disabled={!reason} onClick={() => { toast(DONE_MESSAGE[type]); nav('/mypage/orders'); }} className="btn btn-ink px-8">{type} 신청하기</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MyClaims() {
  const { toast } = useApp();
  const [type, setType] = useState('전체');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const all = allLines.filter((l) => l.claim).sort((a, b) => b.claim.requested - a.claim.requested);
  const counts = { 전체: all.length, 취소: 0, 반품: 0, 교환: 0 };
  all.forEach((l) => { counts[l.claim.type] += 1; });
  const kw = q.trim();
  const lines = all
    .filter((l) => type === '전체' || l.claim.type === type)
    .filter((l) => !kw || `${productById[l.productId].name} ${l.option} ${l.claim.reason}`.includes(kw));
  const cur = open && all.find((l) => l.lineId === open);
  const curRefund = cur && refundOf(orderOfLine(cur.lineId), cur, cur.claim.type, cur.claim.reason);
  return (
    <div>
      <H>취소 · 반품 · 교환</H>
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <Segments items={['전체', '취소', '반품', '교환']} value={type} onChange={setType} counts={counts} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="상품 · 옵션 · 사유" className="field field-sm w-56 ml-auto" />
      </div>
      <table className="w-full text-[13px] border-t border-ink">
        <thead><tr className="text-left text-ink-2 border-b border-line"><th className="py-3 font-semibold">상품</th><th className="font-semibold">유형</th><th className="font-semibold hidden sm:table-cell">사유</th><th className="font-semibold hidden sm:table-cell">신청일</th><th className="font-semibold">상태</th><th /></tr></thead>
        <tbody>
          {lines.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-mute">신청한 클레임이 없어요</td></tr>}
          {lines.map((l) => {
            const p = productById[l.productId];
            return (
              <tr key={l.lineId} className="border-b border-line">
                <td className="py-3"><div className="flex items-center gap-3"><img src={p.images[0]} alt="" className="w-12 h-14 object-cover" /><span className="font-medium">{p.name}<br /><span className="text-mute font-normal">{l.option || '단일상품'}</span></span></div></td>
                <td>{l.claim.type}</td><td className="text-ink-2 hidden sm:table-cell">{reasonLabel(l.claim.reason)}</td><td className="num hidden sm:table-cell">{ymd(l.claim.requested)}</td><td><StatusPill s={claimStatusLabel(l.claim)} /></td>
                <td className="text-right"><button onClick={() => setOpen(l.lineId)} className="btn btn-line btn-xs">상세</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-6 bg-cream p-5 text-[13px] text-ink-2 leading-relaxed">
        <b className="text-ink">처리 안내</b><br />
        · 결제완료 상태: 즉시 취소<br />
        · 반품/교환: 배송완료 후 7일 이내 신청 가능 · 구매확정 후에는 신청 불가 · 판매자 승인 → 회수 → 환불(반품) · 재배송(교환)<br />
        · 취소 · 반품 완료 시 그 상품주문분 사용 포인트는 환원됩니다. (적립은 구매확정 때라 회수할 적립 포인트가 없어요)
      </div>

      <Modal open={!!cur} onClose={() => setOpen(null)} title={cur ? `${cur.claim.type} 상세` : ''} width={560}
        footer={<>
          {cur && canWithdraw(cur.claim) && <button className="btn btn-line btn-sm" onClick={() => { toast(`${cur.claim.type} 요청을 철회했어요`); setOpen(null); }}>요청 철회</button>}
          <button className="btn btn-line btn-sm" onClick={() => setOpen(null)}>닫기</button>
        </>}>
        {cur && (
          <div className="space-y-4">
            <div className="text-[13px] space-y-1.5">
              <div><span className="text-mute w-24 inline-block">상품주문번호</span><span className="num">{cur.lineId}</span></div>
              <div><span className="text-mute w-24 inline-block">사유</span>{reasonLabel(cur.claim.reason)}{cur.claim.detail && ` · ${cur.claim.detail}`}</div>
              <div><span className="text-mute w-24 inline-block">신청일</span><span className="num">{ymd(cur.claim.requested)}</span></div>
              <div><span className="text-mute w-24 inline-block">처리 상태</span>{claimProgress(cur.claim)}</div>
              {cur.claim.type === '교환' && cur.claim.reship && <div><span className="text-mute w-24 inline-block">재배송</span><span className="num">{cur.claim.reship.courier} {cur.claim.reship.trackingNo}</span></div>}
            </div>
            {cur.claim.type !== '교환' && !['REJECTED', 'WITHDRAWN'].includes(cur.claim.step) && (
              <div className="bg-cream p-5 text-[14px] space-y-2">
                <div className="flex justify-between"><span className="text-ink-2">상품 금액</span><span className="num">{won(curRefund.amount)}</span></div>
                <div className="flex justify-between text-moss"><span className="text-ink-2">사용 포인트 환원</span><span className="num">+{comma(curRefund.pointBack)}P</span></div>
                <div className="flex justify-between font-bold border-t border-line-2 pt-2"><span>결제수단 환불{cur.claim.step === 'COMPLETED' ? '' : ' 예정'} 금액</span><span className="num">{won(curRefund.cash)}</span></div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ─────────── 리뷰 관리 ─────────── */
export function MyReviews() {
  const { toast } = useApp();
  const [tab, setTab] = useState('todo');
  const [target, setTarget] = useState(null); // { line } 작성 · { review } 수정
  const [deleting, setDeleting] = useState(null);
  const todo = allLines.filter(writableOf);
  const mine = reviews.filter((r) => r.userId === ME.id).slice(0, 6);
  // 작성 기한까지 남은 날 (서버 만료일 기준) — 오늘이 마지막 날이면 D-0
  const dDay = (l) => Math.max(0, Math.floor((reviewExpiresAt(l) - Date.now()) / DAY));
  return (
    <div>
      <H>리뷰 관리</H>
      <div className="flex gap-6 border-b border-line mb-5">
        <button onClick={() => setTab('todo')} className={cx('tab', tab === 'todo' && 'tab-on')}>작성 가능한 리뷰 <span className="num text-point">{todo.length}</span></button>
        <button onClick={() => setTab('done')} className={cx('tab', tab === 'done' && 'tab-on')}>내가 쓴 리뷰 <span className="num">{mine.length}</span></button>
      </div>
      {tab === 'todo' ? (
        <div className="space-y-3">
          <p className="text-[13px] text-mute mb-2">구매확정된 상품주문 1건당 1개 · 확정 후 30일 이내 · 별점과 사진(최대 {MAX_IMAGES}장)을 남길 수 있어요</p>
          {todo.length === 0 && <Empty title="작성 가능한 리뷰가 없어요" desc="구매확정한 상품의 리뷰를 여기서 쓸 수 있어요" />}
          {todo.map((l) => {
            const p = productById[l.productId];
            return (
              <div key={l.lineId} className="flex items-center gap-4 border border-line p-4">
                <img src={p.images[0]} alt="" className="w-16 h-20 object-cover" />
                <div className="flex-1 text-[13px]">
                  <div className="font-medium text-[14px]">{p.name}</div>
                  <div className="text-mute">{l.option && `${l.option} · `}{ymd(confirmedAt(l))} 구매확정</div>
                  <div className="text-point text-[12px] mt-1">작성기한 D-{dDay(l)}</div>
                </div>
                <button onClick={() => setTarget({ line: l })} className="btn btn-ink btn-sm">리뷰 쓰기</button>
              </div>
            );
          })}
        </div>
      ) : (
        <ul>
          {mine.length === 0 && <Empty title="아직 쓴 리뷰가 없어요" />}
          {mine.map((r) => {
            const p = productById[r.productId];
            return (
              <li key={r.id} className="py-5 border-b border-line flex gap-4">
                <img src={p.images[0]} alt="" className="w-16 h-20 object-cover" />
                <div className="flex-1 text-[13px]">
                  <div className="font-medium">{p.name}</div>
                  <div className="flex items-center gap-2 text-mute mt-0.5">
                    <Stars value={r.rating} size={11} /> {ymd(r.date)}
                    {r.option && <span>· {r.option}</span>}
                    {r.fit && <span>· 사이즈 {r.fit}</span>}
                    {r.blinded && <Pill tone="rust">블라인드</Pill>}
                  </div>
                  {r.blinded && <p className="mt-2 text-[12px] text-rust">관리자에 의해 블라인드 처리된 리뷰예요. 다른 구매자에게 보이지 않아요.</p>}
                  <p className="mt-2 text-ink-2 whitespace-pre-line">{r.body}</p>
                  {r.photos.length > 0 && <div className="mt-2 flex gap-2">{r.photos.map((src) => <img key={src} src={src} alt="" className="w-16 h-16 object-cover" />)}</div>}
                  {r.reply && <p className="mt-2 bg-cream p-3 text-ink-2"><b className="text-ink">판매자 답글</b> {r.reply}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  {!r.blinded && <button onClick={() => setTarget({ review: r })} className="btn btn-line btn-xs">수정</button>}
                  <button onClick={() => setDeleting(r)} className="btn btn-ghost btn-xs">삭제</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ReviewModal target={target} onClose={() => setTarget(null)} />
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="리뷰 삭제"
        footer={<>
          <button onClick={() => setDeleting(null)} className="btn btn-line btn-sm">취소</button>
          <button onClick={() => { toast('리뷰를 삭제했어요'); setDeleting(null); }} className="btn btn-ink btn-sm">삭제</button>
        </>}>
        <p className="text-[13px] text-ink-2">삭제하면 되돌릴 수 없고, 이 상품주문에는 다시 리뷰를 쓸 수 없어요.</p>
      </Modal>
    </div>
  );
}

// 상품 문의 — 내가 쓴 문의 · 판매자 답변 (카드형 목록). 답변 전까지만 수정, 삭제는 언제든 (실제 review/components/MyQna.jsx)
export function MyQna() {
  const { toast } = useApp();
  const [list, setList] = useState(() => qnas.filter((q) => q.userId === ME.id).sort((a, b) => b.date - a.date));
  const [target, setTarget] = useState(null); // { inquiry } 수정
  const [deleting, setDeleting] = useState(null);
  const submit = ({ content, secret }) => {
    setList(list.map((q) => (q.id === target.inquiry.id ? { ...q, q: content, secret } : q)));
    toast('문의를 수정했어요');
    setTarget(null);
  };
  const confirmDelete = () => { setList(list.filter((q) => q.id !== deleting.id)); toast('문의를 삭제했어요'); setDeleting(null); };
  return (
    <div>
      <H>상품 문의</H>
      {list.length === 0 && (
        <Empty title="작성한 문의가 없어요" desc="상품 상세 페이지의 Q&A 탭에서 문의할 수 있어요." action={<Link to="/help" className="btn btn-line btn-sm">고객센터 FAQ 보기</Link>} />
      )}
      <ul>
        {list.map((q) => {
          const p = productById[q.productId];
          return (
            <li key={q.id} className="py-5 border-b border-line flex gap-4">
              <Link to={`/products/${p.id}#qna`}><img src={p.images[0]} alt="" className="w-16 h-20 object-cover" /></Link>
              <div className="flex-1 text-[13px] min-w-0">
                <Link to={`/products/${p.id}#qna`} className="font-medium hover:underline">{p.name}</Link>
                <div className="flex items-center gap-2 text-mute mt-0.5">
                  <Pill tone={q.a ? 'mute' : 'line'}>{q.a ? '답변완료' : '답변대기'}</Pill>
                  {ymd(q.date)}
                  {q.secret && <span className="inline-flex items-center gap-1"><Lock size={12} /> 비밀글</span>}
                </div>
                <p className="mt-2 text-ink-2 whitespace-pre-line"><b className="mr-2 text-ink">Q</b>{q.q}</p>
                {q.a && <p className="mt-2 bg-cream p-3 text-ink-2 whitespace-pre-line"><b className="mr-2 text-point">A</b>{q.a}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                {!q.a && <button onClick={() => setTarget({ inquiry: q })} className="btn btn-line btn-xs">수정</button>}
                <button onClick={() => setDeleting(q)} className="btn btn-ghost btn-xs">삭제</button>
              </div>
            </li>
          );
        })}
      </ul>
      <InquiryModal target={target} onClose={() => setTarget(null)} onSubmit={submit} />
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="문의 삭제"
        footer={<>
          <button onClick={() => setDeleting(null)} className="btn btn-line btn-sm">취소</button>
          <button onClick={confirmDelete} className="btn btn-ink btn-sm">삭제</button>
        </>}>
        <p className="text-[13px] text-ink-2">삭제하면 되돌릴 수 없어요. 판매자 답변도 함께 보이지 않게 돼요.</p>
      </Modal>
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
  const [q, setQ] = useState('');
  const counts = Object.fromEntries([['전체', myPointHistory.length], ...POINT_TYPES.map((t) => [t, myPointHistory.filter((r) => r.type === t).length])]);
  const kw = q.trim();
  const rows = myPointHistory
    .filter((r) => type === '전체' || r.type === type)
    .filter((r) => !kw || `${r.desc} ${r.ref}`.includes(kw));
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
      <div className="mt-6 mb-4 flex flex-wrap gap-3 items-center">
        <Segments items={['전체', ...POINT_TYPES]} value={type} onChange={setType} counts={counts} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="내용 · 주문번호" className="field field-sm w-56 ml-auto" />
      </div>
      <table className="w-full text-[13px] border-t border-ink">
        <thead><tr className="text-left text-ink-2 border-b border-line"><th className="py-3 font-semibold w-28">일자</th><th className="font-semibold w-16">구분</th><th className="font-semibold">내용</th><th className="font-semibold text-right">포인트</th><th className="font-semibold text-right hidden sm:table-cell">잔액</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-mute">포인트 내역이 없어요</td></tr>}
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
        · 구매확정 시 실결제금액(포인트 사용분 제외)의 {POINT_RATE * 100}%가 적립되며, 다음 결제부터 사용할 수 있어요.<br />
        · 사용 · 적립 포인트는 상품주문 단위로 금액 비율에 따라 나뉘어 기록돼요.<br />
        · 취소 · 반품이 완료되면 그 상품주문분 사용 포인트는 환원됩니다.
      </div>
    </div>
  );
}

/* ─────────── 회원정보 수정 — 내 정보 수정 · 비밀번호 변경 · 탈퇴 ─────────── */
const SIGNUP_PROVIDER_LABELS = { KAKAO: '카카오', NAVER: '네이버', GOOGLE: 'Google' };

export function MyProfile() {
  const { toast } = useApp();
  const [modal, setModal] = useState(null); // 'password' | 'withdraw'
  // 소셜 가입(signupProvider 가 LOCAL 이 아님)이면 비밀번호가 없어 변경 불가 (목업 회원은 이메일 가입)
  const provider = ME.signupProvider ?? 'LOCAL';
  const social = provider !== 'LOCAL';
  return (
    <div>
      <H>회원정보 수정</H>
      <div className="max-w-[520px] space-y-4">
        <img src={ME.avatar} alt="" className="w-16 h-16 rounded-full object-cover" />
        <div><label className="label">이메일</label><input className="field bg-cream text-mute" defaultValue={ME.email} readOnly /></div>
        <div><label className="label">이름</label><input className="field" defaultValue={ME.name} /></div>
        <div><label className="label">닉네임 <span className="font-normal text-mute">(선택 · 비우면 삭제)</span></label><input className="field" defaultValue={ME.nick} /></div>
        <div><label className="label">휴대폰</label><input type="tel" className="field" placeholder="010-0000-0000" defaultValue={ME.phone} /></div>
        <div className="flex justify-end"><button onClick={() => toast('회원정보가 수정되었어요')} className="btn btn-ink px-8">저장</button></div>
        <div className="border-t border-line pt-4">
          <label className="label">비밀번호</label>
          {social
            ? <p className="text-[13px] text-mute">{SIGNUP_PROVIDER_LABELS[provider] ?? provider} 계정으로 가입해 비밀번호가 없어요</p>
            : <button type="button" onClick={() => setModal('password')} className="btn btn-line btn-sm">비밀번호 변경</button>}
        </div>
        <div className="pt-4">
          <button type="button" onClick={() => setModal('withdraw')} className="text-[12px] text-mute underline">회원 탈퇴</button>
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
      {modal === 'password' && <PasswordModal onClose={() => setModal(null)} />}
      {modal === 'withdraw' && <WithdrawModal onClose={() => setModal(null)} />}
    </div>
  );
}

// 비밀번호 변경 — 성공해도 로그인 상태는 그대로
function PasswordModal({ onClose }) {
  const { toast } = useApp();
  const fields = [['현재 비밀번호', 'current-password'], ['새 비밀번호', 'new-password', '영문 · 특수문자 포함 8자 이상'], ['새 비밀번호 확인', 'new-password']];
  return (
    <Modal open onClose={onClose} title="비밀번호 변경" width={420}
      footer={<><button className="btn btn-line btn-sm" onClick={onClose}>취소</button><button className="btn btn-ink btn-sm" onClick={() => { toast('비밀번호를 변경했어요'); onClose(); }}>변경</button></>}>
      <div className="space-y-3">
        {fields.map(([label, autoComplete, placeholder]) => (
          <div key={label}><label className="label">{label}</label><input type="password" autoComplete={autoComplete} placeholder={placeholder} className="field" /></div>
        ))}
      </div>
    </Modal>
  );
}

// 탈퇴 — 되돌릴 수 없고 같은 이메일로 다시 가입할 수 없음. 판매자는 스토어 폐점 후
function WithdrawModal({ onClose }) {
  const { toast, logout } = useApp();
  const nav = useNavigate();
  const [agreed, setAgreed] = useState(false);
  return (
    <Modal open onClose={onClose} title="회원 탈퇴" width={420}
      footer={<><button className="btn btn-line btn-sm" onClick={onClose}>취소</button><button className="btn btn-ink btn-sm" disabled={!agreed} onClick={() => { logout(); toast('탈퇴가 완료되었어요'); nav('/', { replace: true }); }}>탈퇴하기</button></>}>
      <ul className="space-y-1.5 text-[13px] text-ink-2 list-disc pl-4">
        <li>탈퇴하면 되돌릴 수 없고, <b className="text-ink">같은 이메일로 다시 가입할 수 없어요.</b></li>
        <li>남은 포인트는 사라져요.</li>
        <li>판매자는 스토어를 폐점한 뒤에 탈퇴할 수 있어요.</li>
      </ul>
      <Checkbox className="mt-4" checked={agreed} onChange={setAgreed} label="위 내용을 확인했어요" />
    </Modal>
  );
}

/* ─────────── 배송지 관리 — 등록 / 수정 / 삭제 / 기본 지정 (최대 5개) ─────────── */
const MAX_ADDRESSES = 5;
const EMPTY_ADDRESS = { label: '', name: '', phone: '', zip: '', addr: '', detail: '', main: false };
// 목업: 카카오 우편번호 검색창 대신 예시 결과 (실제는 PostcodeSearch — 모달 안에 펼쳐 넣는 embed)
const POSTCODE_SAMPLES = [
  { zip: '04779', addr: '서울특별시 성동구 왕십리로 115' },
  { zip: '04790', addr: '서울특별시 성동구 성수이로 113' },
  { zip: '06236', addr: '서울특별시 강남구 테헤란로 152' },
];

export function MyAddresses() {
  const { toast } = useApp();
  const [addresses, setAddresses] = useState(myAddresses);
  const [editing, setEditing] = useState(null); // null · { mode: 'create' } · { mode: 'edit', address }
  const [deleting, setDeleting] = useState(null);
  const full = addresses.length >= MAX_ADDRESSES;
  const setDefault = (a) => {
    setAddresses((list) => list.map((x) => ({ ...x, main: x.id === a.id })));
    toast(`${a.label}을(를) 기본 배송지로 지정했어요`);
  };
  const save = (form) => {
    const id = editing.address?.id ?? `a${Date.now()}`;
    setAddresses((list) => {
      const next = editing.address ? list.map((x) => (x.id === id ? { ...x, ...form } : x)) : [...list, { ...form, id }];
      return form.main ? next.map((x) => ({ ...x, main: x.id === id })) : next;
    });
    toast(editing.address ? '배송지를 수정했어요' : '배송지를 추가했어요');
    setEditing(null);
  };
  return (
    <div>
      <H right={<button onClick={() => setEditing({ mode: 'create' })} disabled={full} className="btn btn-ink btn-sm" title={full ? `배송지는 최대 ${MAX_ADDRESSES}개까지 등록할 수 있어요` : undefined}>+ 배송지 추가</button>}>배송지 관리</H>
      {full && <p className="mb-3 text-[12px] text-mute">배송지는 최대 {MAX_ADDRESSES}개까지 등록할 수 있어요. 새로 추가하려면 하나를 삭제해주세요.</p>}
      {addresses.length === 0 && <p className="text-mute py-10 text-center">등록된 배송지가 없어요. 배송지를 추가해주세요</p>}
      <div className="space-y-3">
        {addresses.map((a) => (
          <div key={a.id} className="border border-line p-5 flex justify-between gap-4 text-[13px]">
            <div>
              <div className="font-bold text-[14px]">{a.label} · {a.name} {a.main && <span className="text-point text-[11px] ml-1">기본배송지</span>}</div>
              <div className="text-ink-2 mt-1">{a.phone}</div><div className="text-ink-2">({a.zip}) {a.addr} {a.detail}</div>
            </div>
            <div className="flex gap-1.5 items-start shrink-0">
              {!a.main && <button onClick={() => setDefault(a)} className="btn btn-line btn-xs">기본으로</button>}
              <button onClick={() => setEditing({ mode: 'edit', address: a })} className="btn btn-line btn-xs">수정</button>
              {/* 기본 배송지는 삭제 불가 — 다른 배송지를 기본으로 지정한 뒤 삭제 */}
              {!a.main && <button onClick={() => setDeleting(a)} className="btn btn-ghost btn-xs">삭제</button>}
            </div>
          </div>
        ))}
      </div>
      {editing && <AddressFormModal key={editing.address?.id ?? 'new'} address={editing.address} onSave={save} onClose={() => setEditing(null)} />}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="배송지 삭제" width={400}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setDeleting(null)}>취소</button><button className="btn btn-ink btn-sm" onClick={() => { setAddresses((list) => list.filter((x) => x.id !== deleting.id)); toast('배송지를 삭제했어요'); setDeleting(null); }}>삭제</button></>}>
        {deleting && <>
          <p className="text-[14px]"><b>{deleting.label}</b> 배송지를 삭제할까요?</p>
          <p className="mt-1 text-[13px] text-ink-2">({deleting.zip}) {deleting.addr} {deleting.detail}</p>
        </>}
      </Modal>
    </div>
  );
}

// 등록 · 수정 — 같은 폼. 우편번호 · 기본 주소는 주소 검색으로만 채운다, 등록은 연락처를 내 휴대폰으로 미리 채운다
function AddressFormModal({ address, onSave, onClose }) {
  const editMode = !!address;
  const [form, setForm] = useState(() => (address ? { ...EMPTY_ADDRESS, ...address } : { ...EMPTY_ADDRESS, phone: ME.phone }));
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    if (!form.label.trim() || !form.name.trim() || !form.phone.trim()) return setError('배송지명 · 받는 분 · 연락처를 입력해주세요');
    if (!form.zip) return setError('주소 검색으로 주소를 입력해주세요');
    onSave(form);
  };
  return (
    <Modal open onClose={onClose} title={editMode ? '배송지 수정' : '배송지 추가'}
      footer={<><button className="btn btn-line btn-sm" onClick={onClose}>취소</button><button className="btn btn-ink btn-sm" onClick={submit}>저장</button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2"><input className="field" placeholder="배송지명 (예: 집)" value={form.label} onChange={set('label')} /><input className="field" placeholder="받는 분" value={form.name} onChange={set('name')} /></div>
        <input type="tel" className="field" placeholder="휴대폰 (010-0000-0000)" value={form.phone} onChange={set('phone')} />
        <div className="flex gap-2">
          <input className="field bg-cream" placeholder="우편번호" value={form.zip} readOnly />
          <button onClick={() => setSearching((s) => !s)} className="btn btn-line shrink-0">{searching ? '검색 닫기' : '주소 검색'}</button>
        </div>
        {searching && (
          <div className="border border-line-2">
            <div className="px-3 py-2 text-[11.5px] text-mute border-b border-line bg-cream">카카오 우편번호 검색 (목업 — 예시 결과)</div>
            {POSTCODE_SAMPLES.map((s) => (
              <button key={s.zip} onClick={() => { setForm((f) => ({ ...f, ...s })); setSearching(false); }} className="block w-full text-left px-3 py-2.5 text-[13px] border-b border-line last:border-0 hover:bg-cream">
                <span className="num text-mute mr-2">{s.zip}</span>{s.addr}
              </button>
            ))}
          </div>
        )}
        <input className="field bg-cream" placeholder="기본 주소 (주소 검색)" value={form.addr} readOnly />
        <input className="field" placeholder="상세 주소 (선택)" value={form.detail} onChange={set('detail')} />
        {!(editMode && address.main) && <Checkbox checked={form.main} onChange={(checked) => setForm((f) => ({ ...f, main: checked }))} label="기본 배송지로 설정" />}
        {error && <p role="alert" className="text-[13px] text-rust">{error}</p>}
      </div>
    </Modal>
  );
}
