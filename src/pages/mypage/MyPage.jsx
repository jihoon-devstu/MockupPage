import { useState } from 'react';
import { Link, NavLink, Outlet, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Star, Camera, Upload } from 'lucide-react';
import { productById, storeById } from '../../data/catalog';
import { ME, myAddresses, myCoupons } from '../../data/people';
import { myOrders, FLOW, trackingOf, orderTotal } from '../../data/orders';
import { reviews } from '../../data/reviews';
import { useApp } from '../../lib/store';
import { StatusPill, Modal, Checkbox, Stars, Empty, Pill } from '../../components/ui';
import ProductCard from '../../components/ProductCard';
import { cx, won, comma, ymd, ymdhm } from '../../lib/format';

const allLines = myOrders.flatMap((o) => o.items.map((l) => ({ ...l, orderId: o.id })));

/* ─────────── 레이아웃 ─────────── */
const MENU = [
  ['쇼핑', [['/mypage/orders', '주문 · 배송'], ['/mypage/claims', '취소 · 반품 · 교환'], ['/cart', '장바구니'], ['/mypage/wishlist', '찜한 상품']]],
  ['활동', [['/mypage/reviews', '리뷰 관리'], ['/mypage/qna', '상품 문의']]],
  ['혜택', [['/mypage/coupons', '쿠폰 · 포인트']]],
  ['내 정보', [['/mypage/profile', '회원정보 수정'], ['/mypage/addresses', '배송지 관리']]],
];

export function MyPageLayout() {
  const { wish } = useApp();
  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-8">
      {/* 상단 요약 */}
      <div className="bg-ink text-white grid md:grid-cols-[1fr_auto]">
        <div className="p-6 md:p-8 flex items-center gap-5">
          <img src={ME.avatar} alt="" className="w-16 h-16 rounded-full object-cover" />
          <div>
            <div className="text-[13px] text-white/60"><span className="text-[#e6c06a] font-bold">{ME.grade}</span> 회원 · 다음 등급까지 {won(2000000 - ME.spent)}</div>
            <div className="text-[22px] font-bold mt-0.5">{ME.name}님, 반가워요</div>
            <div className="mt-2 h-1 w-56 bg-white/15"><div className="h-full bg-[#e6c06a]" style={{ width: `${(ME.spent / 2000000) * 100}%` }} /></div>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t md:border-t-0 md:border-l border-white/10">
          {[['포인트', `${comma(ME.point)}P`, '/mypage/coupons'], ['쿠폰', `${myCoupons.length}장`, '/mypage/coupons'], ['찜', `${wish.size}개`, '/mypage/wishlist']].map(([k, v, to], i) => (
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
      footer={<><button className="btn btn-line btn-sm" onClick={onClose}>취소</button><button className="btn btn-ink btn-sm" onClick={() => { onClose(); toast(`리뷰 등록 완료 · ${photo ? 500 : 100}P 적립`); }}>등록하기</button></>}>
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
      <p className="mt-3 text-[12px] text-mute">텍스트 리뷰 100P · 포토 리뷰 500P 적립 · 상품과 무관한 내용, 욕설은 블라인드 처리될 수 있습니다.</p>
    </Modal>
  );
}

/* ─────────── 주문 · 배송 ─────────── */
function LineActions({ l, onReview }) {
  const { toast } = useApp();
  const nav = useNavigate();
  const b = 'btn btn-line btn-xs';
  switch (l.status) {
    case '결제완료': return <button className={b} onClick={() => toast('주문이 취소되었어요. 환불은 영업일 1~3일 소요')}>주문취소</button>;
    case '배송준비': return <button className={b} onClick={() => nav(`/mypage/claim/${l.lineId}?type=취소`)}>취소요청</button>;
    case '배송중': return <Link className={b} to={`/mypage/orders/${l.orderId}`}>배송조회</Link>;
    case '배송완료': return (<>
      <button className="btn btn-ink btn-xs" onClick={() => toast('구매확정 완료 · 적립금 지급')}>구매확정</button>
      <button className={b} onClick={() => nav(`/mypage/claim/${l.lineId}?type=반품`)}>반품요청</button>
      <button className={b} onClick={() => nav(`/mypage/claim/${l.lineId}?type=교환`)}>교환요청</button>
    </>);
    case '구매확정': return l.reviewed ? <span className="text-[12px] text-mute">리뷰 작성완료</span> : <button className="btn btn-point btn-xs" onClick={() => onReview(l)}>리뷰쓰기 +500P</button>;
    case '반품요청': return <button className={b} onClick={() => toast('반품 요청을 철회했어요')}>반품철회</button>;
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
  const total = orderTotal(o);
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
                <div className="font-bold num">{won(l.unitPrice * l.qty)}</div>
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
            {[['상품금액', won(total)], ['쿠폰할인', `−${won(o.payment.coupon)}`], ['포인트', `−${won(o.payment.point)}`], ['결제수단', `${o.payment.method} · ${o.payment.detail}`]].map(([k, v]) => <div key={k} className="flex justify-between py-2.5 border-b border-line"><span className="text-mute">{k}</span><span className="num">{v}</span></div>)}
            <div className="flex justify-between py-3 font-bold"><span>총 결제금액</span><span className="num text-[16px]">{won(total - o.payment.coupon - o.payment.point)}</span></div>
          </div>
          <button className="btn btn-line btn-sm mt-2">영수증 / 거래명세서</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── 클레임 신청 ─────────── */
export function ClaimRequest() {
  const { lineId } = useParams();
  const [sp] = useSearchParams();
  const type = sp.get('type') || '반품';
  const nav = useNavigate();
  const { toast } = useApp();
  const l = allLines.find((x) => x.lineId === lineId) || allLines[0];
  const p = productById[l.productId];
  const store = storeById[p.storeId];
  const [reason, setReason] = useState('');
  const sellerFault = ['상품 불량/파손', '오배송', '상품정보와 다름'].includes(reason);
  const fee = type === '취소' || sellerFault ? 0 : type === '교환' ? (store.shipFee || 3000) * 2 : (store.shipFee || 3000) * 2;
  const amount = l.unitPrice * l.qty;
  return (
    <div>
      <H>{type} 신청</H>
      <div className="flex gap-4 border border-line p-4 text-[13px]">
        <img src={p.images[0]} alt="" className="w-16 h-20 object-cover" />
        <div><div className="text-mute">{store.name}</div><div className="font-medium text-[14px]">{p.name}</div><div className="text-mute">{l.option} · {l.qty}개 · {won(amount)}</div></div>
      </div>
      <div className="mt-6 space-y-5">
        <div>
          <label className="label">{type} 사유</label>
          <div className="grid sm:grid-cols-2 gap-2">
            {(type === '취소' ? ['단순 변심', '다른 상품 잘못 주문', '배송 지연', '판매자 요청'] : ['단순 변심', '사이즈/색상 안 맞음', '상품 불량/파손', '오배송', '상품정보와 다름']).map((r) => (
              <button key={r} onClick={() => setReason(r)} className={cx('h-11 border text-left px-3 text-[14px]', reason === r ? 'border-ink border-2 font-semibold' : 'border-line-2')}>{r}</button>
            ))}
          </div>
        </div>
        {type === '교환' && <div><label className="label">교환 옵션</label><select className="field"><option>{l.option} → 다른 옵션 선택</option>{productById[l.productId].options.flatMap((o) => o.values).map((v) => <option key={v}>{v}</option>)}</select></div>}
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
        <div className="bg-cream p-5 text-[14px] space-y-2">
          <div className="flex justify-between"><span className="text-ink-2">상품 금액</span><span className="num">{won(amount)}</span></div>
          <div className="flex justify-between"><span className="text-ink-2">{type === '교환' ? '교환 배송비 (왕복)' : '반품 배송비 차감'}</span><span className="num">{fee ? `−${won(fee)}` : '판매자 부담'}</span></div>
          {type !== '교환' && <div className="flex justify-between font-bold border-t border-line-2 pt-2"><span>환불 예정 금액</span><span className="num">{won(amount - fee)}</span></div>}
          <p className="text-[12px] text-mute">{type === '취소' ? '판매자 승인 후 결제수단으로 환불됩니다.' : '판매자가 회수 상품을 확인한 후 환불/교환이 진행됩니다. (영업일 1~3일)'}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => nav(-1)} className="btn btn-line">취소</button>
          <button disabled={!reason} onClick={() => { toast(`${type} 신청이 접수되었어요`); nav('/mypage/claims'); }} className="btn btn-ink px-8">{type} 신청하기</button>
        </div>
      </div>
    </div>
  );
}

export function MyClaims() {
  const lines = allLines.filter((l) => l.claim);
  return (
    <div>
      <H>취소 · 반품 · 교환</H>
      <table className="w-full text-[13px] border-t border-ink">
        <thead><tr className="text-left text-ink-2 border-b border-line"><th className="py-3 font-semibold">상품</th><th className="font-semibold">유형</th><th className="font-semibold">사유</th><th className="font-semibold">신청일</th><th className="font-semibold">상태</th></tr></thead>
        <tbody>
          {lines.map((l) => {
            const p = productById[l.productId];
            return (
              <tr key={l.lineId} className="border-b border-line">
                <td className="py-3"><div className="flex items-center gap-3"><img src={p.images[0]} alt="" className="w-12 h-14 object-cover" /><span className="font-medium">{p.name}<br /><span className="text-mute font-normal">{l.option}</span></span></div></td>
                <td>{l.claim.type}</td><td className="text-ink-2">{l.claim.reason}</td><td className="num">{ymd(l.claim.requested)}</td><td><StatusPill s={l.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-6 bg-cream p-5 text-[13px] text-ink-2 leading-relaxed">
        <b className="text-ink">처리 안내</b><br />
        · 결제완료 상태: 즉시 취소 · 배송준비 상태: 판매자 승인 후 취소<br />
        · 반품/교환: 배송완료 후 7일 이내 신청 가능 · 구매확정 후에는 신청 불가<br />
        · 판매자가 3영업일 내 처리하지 않으면 곳간 고객센터가 직권 처리합니다.
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
          <p className="text-[13px] text-mute mb-2">구매확정 후 30일 이내 작성 가능 · 포토 리뷰 500P / 텍스트 100P</p>
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

export function MyWishlist() {
  const { wish } = useApp();
  const items = [...wish].map((id) => productById[id]);
  return (
    <div>
      <H>찜한 상품 <span className="num text-mute">{items.length}</span></H>
      {items.length ? <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <Empty title="찜한 상품이 없어요" />}
    </div>
  );
}

export function MyQna() {
  return (
    <div>
      <H>상품 문의</H>
      <Empty title="작성한 문의가 없어요" desc="상품 상세 페이지의 Q&A 탭에서 문의할 수 있어요." />
    </div>
  );
}

export function MyCoupons() {
  return (
    <div>
      <H>쿠폰 · 포인트</H>
      <div className="grid sm:grid-cols-2 gap-3">
        {myCoupons.map((c) => (
          <div key={c.id} className="flex border border-ink">
            <div className="w-28 bg-ink text-white flex flex-col items-center justify-center">
              <span className="text-[22px] font-bold num">{c.rate ? `${c.rate * 100}%` : comma(c.amount)}</span>
              {!c.rate && <span className="text-[11px]">원 할인</span>}
            </div>
            <div className="p-4 text-[13px] border-l border-dashed border-white">
              <div className="font-bold">{c.name}</div><div className="text-mute mt-1">{c.cond}{c.max && ` · 최대 ${comma(c.max)}원`}</div><div className="text-mute">~ {c.until}</div>
            </div>
          </div>
        ))}
      </div>
      <h2 className="font-bold mt-10 mb-3">포인트 내역 <span className="text-point num ml-1">{comma(ME.point)}P</span></h2>
      <table className="w-full text-[13px] border-t border-ink">
        <tbody>
          {[['2026.09.21', '리뷰 작성 (포토)', 500], ['2026.09.20', '구매확정 적립 · 다완 찻잔 2인 세트', 588], ['2026.09.17', '주문 사용', -1000], ['2026.08.31', '골드 등급 월간 적립', 3000], ['2026.08.12', '구매확정 적립 · 시카 9 진정 토너', 192]].map(([d, t, v]) => (
            <tr key={d + t} className="border-b border-line"><td className="py-3 w-28 text-mute num">{d}</td><td>{t}</td><td className={cx('text-right num font-semibold', v < 0 ? 'text-rust' : '')}>{v > 0 ? '+' : ''}{comma(v)}P</td></tr>
          ))}
        </tbody>
      </table>
      <p className="text-[12px] text-mute mt-3">이번 달 소멸 예정 포인트 0P · 포인트 유효기간은 적립일로부터 1년</p>
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
        <div className="font-bold mb-3">등급별 혜택 <span className="text-mute font-normal">· 최근 6개월 구매확정 금액 기준</span></div>
        <div className="grid grid-cols-4 gap-px bg-line">
          {[['일반', '-', '0.5%'], ['실버', '30만원', '1%'], ['골드', '80만원', '1% + 월 3,000P'], ['VIP', '200만원', '2% + 무료반품']].map(([g, c, b]) => (
            <div key={g} className={cx('p-3 text-center', g === ME.grade ? 'bg-ink text-white' : 'bg-white')}><div className="font-bold">{g}</div><div className="text-[11.5px] opacity-70 mt-1">{c}</div><div className="text-[11.5px] mt-1">{b}</div></div>
          ))}
        </div>
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
