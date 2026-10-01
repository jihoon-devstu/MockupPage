import { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Heart, Share2, X, Minus, Plus, Lock, ThumbsUp, ChevronRight, Truck, Camera } from 'lucide-react';
import { productById, storeById, catById, visibleProducts } from '../../data/catalog';
import { reviewsOf, ratingSummary, qnas } from '../../data/reviews';
import { userById } from '../../data/people';
import { useApp } from '../../lib/store';
import { Stars, Price, Modal, Checkbox, Pager, Pill } from '../../components/ui';
import ProductCard from '../../components/ProductCard';
import { cx, comma, won, salePrice, ymd, maskName } from '../../lib/format';

function Qty({ value, onChange }) {
  return (
    <div className="flex items-center border border-line-2 bg-white h-8">
      <button className="w-8 h-full flex items-center justify-center hover:bg-sand" onClick={() => onChange(value - 1)}><Minus size={13} /></button>
      <span className="w-9 text-center text-[13px] num">{value}</span>
      <button className="w-8 h-full flex items-center justify-center hover:bg-sand" onClick={() => onChange(value + 1)}><Plus size={13} /></button>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const p = productById[id];
  const nav = useNavigate();
  const loc = useLocation();
  const { addToCart, wish, toggleWish, toast } = useApp();
  const [img, setImg] = useState(0);
  const [pick, setPick] = useState({});
  const [lines, setLines] = useState([]);
  const [tab, setTab] = useState('info');
  const [cartModal, setCartModal] = useState(false);
  const [qnaModal, setQnaModal] = useState(false);
  const [photoOnly, setPhotoOnly] = useState(false);
  const [starFilter, setStarFilter] = useState(0);
  const [rsort, setRsort] = useState('recent');
  const [helped, setHelped] = useState(new Set());

  useEffect(() => { setImg(0); setPick({}); setLines([]); }, [id]);
  useEffect(() => { if (loc.hash === '#reviews') setTimeout(() => document.getElementById('reviews')?.scrollIntoView(), 50); }, [loc.hash]);

  const revs = useMemo(() => reviewsOf(id), [id]);
  const sum = ratingSummary(revs);
  const filtered = useMemo(() => {
    let l = revs.filter((r) => (!photoOnly || r.photos.length) && (!starFilter || r.rating === starFilter));
    const by = { recent: (a, b) => b.date - a.date, helpful: (a, b) => b.helpful - a.helpful, high: (a, b) => b.rating - a.rating, low: (a, b) => a.rating - b.rating };
    return [...l].sort(by[rsort]);
  }, [revs, photoOnly, starFilter, rsort]);

  if (!p) return <div className="p-20 text-center">상품을 찾을 수 없습니다. <Link to="/" className="underline">홈으로</Link></div>;
  const store = storeById[p.storeId];
  const cat = catById[p.cat];
  const unit = salePrice(p);
  const soldOut = p.status === '품절';
  const fits = p.cat === 'fashion' || p.cat === 'shoes-bags' ? ['작아요', '정사이즈', '커요'].map((f) => ({ f, n: revs.filter((r) => r.fit === f).length })) : null;
  const myQna = qnas.filter((q) => q.productId === id);
  const photos = revs.filter((r) => r.photos.length);
  const total = lines.reduce((a, l) => a + l.qty * unit, 0);
  const ship = store.freeOver && total >= store.freeOver ? 0 : store.shipFee;
  const others = visibleProducts.filter((x) => x.storeId === p.storeId && x.id !== p.id).slice(0, 4);

  const choose = (name, v) => {
    const next = { ...pick, [name]: v };
    if (p.options.every((o) => next[o.name])) {
      const label = p.options.map((o) => next[o.name]).join(' / ');
      if (!lines.find((l) => l.label === label)) setLines([...lines, { label, qty: 1 }]);
      setPick({});
    } else setPick(next);
  };
  const ensureLines = () => {
    if (p.options.length === 0) return lines.length ? lines : [{ label: '', qty: 1 }];
    if (!lines.length) { toast('옵션을 선택해주세요'); return null; }
    return lines;
  };
  const onCart = () => { const ls = ensureLines(); if (!ls) return; ls.forEach((l) => addToCart(p.id, l.label, l.qty)); setCartModal(true); };
  const onBuy = () => { const ls = ensureLines(); if (!ls) return; ls.forEach((l) => addToCart(p.id, l.label, l.qty)); nav('/checkout'); };

  const TABS = [['info', '상품정보'], ['reviews', `리뷰 ${comma(p.reviews)}`], ['qna', `Q&A ${myQna.length}`], ['ship', '배송/교환/반품']];
  const go = (k) => { setTab(k); document.getElementById(k)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-6">
      <div className="text-[12px] text-mute mb-5 flex items-center gap-1">
        <Link to="/" className="hover:text-ink">홈</Link><ChevronRight size={12} />
        <Link to={`/products?cat=${cat.id}`} className="hover:text-ink">{cat.name}</Link><ChevronRight size={12} />
        <Link to={`/products?cat=${cat.id}&sub=${p.sub}`} className="hover:text-ink">{p.sub}</Link>
      </div>

      <div className="grid lg:grid-cols-[1fr_440px] gap-8 lg:gap-14">
        {/* 갤러리 */}
        <div className="flex flex-col-reverse md:flex-row gap-3">
          <div className="flex md:flex-col gap-2">
            {p.images.map((s, i) => (
              <button key={s} onMouseEnter={() => setImg(i)} onClick={() => setImg(i)} className={cx('w-16 h-20 border-2 shrink-0', i === img ? 'border-ink' : 'border-transparent')}>
                <img src={s} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <div className="relative flex-1 bg-sand aspect-[4/5] overflow-hidden">
            <img src={p.images[img]} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
            {soldOut && <span className="absolute left-4 top-4 bg-ink text-white text-xs font-bold px-3 py-1.5">일시품절 · 재입고 알림 신청 가능</span>}
          </div>
        </div>

        {/* 구매 정보 */}
        <div className="lg:sticky lg:top-24 self-start">
          <Link to={`/store/${store.id}`} className="inline-flex items-center gap-2 text-[13px] font-bold hover:underline">
            <span className="w-5 h-5 text-[10px] text-white flex items-center justify-center" style={{ background: store.color }}>{store.name[0]}</span>
            {store.name} <ChevronRight size={14} />
          </Link>
          <h1 className="mt-2 text-[22px] font-bold leading-snug tracking-tight">{p.name}</h1>
          <button onClick={() => go('reviews')} className="mt-2 flex items-center gap-2 text-[13px]">
            <Stars value={p.rating} size={13} /> <b>{p.rating.toFixed(1)}</b> <span className="text-mute underline">리뷰 {comma(p.reviews)}개</span>
          </button>
          <div className="mt-5 pb-5 border-b border-line"><Price p={p} size="lg" /></div>

          <dl className="py-4 border-b border-line text-[13px] grid grid-cols-[72px_1fr] gap-y-2.5">
            <dt className="text-mute">적립</dt><dd>최대 <b className="num">{comma(unit * 0.01)}P</b> 적립 <span className="text-mute">(리뷰 작성 시 +500P)</span></dd>
            <dt className="text-mute">배송</dt>
            <dd>
              <div className="flex items-center gap-1.5"><Truck size={14} strokeWidth={1.6} /> {store.courier} · {store.shipFee ? `${comma(store.shipFee)}원` : '무료배송'}</div>
              {store.freeOver > 0 && store.shipFee > 0 && <div className="text-mute mt-0.5">{comma(store.freeOver)}원 이상 구매 시 무료 (스토어 묶음배송)</div>}
              <div className="text-moss mt-0.5 font-medium">{store.dispatch}</div>
            </dd>
            <dt className="text-mute">쿠폰</dt><dd><button onClick={() => toast('쿠폰 2장을 받았어요')} className="underline">스토어 쿠폰 받기</button> <span className="text-mute">· 첫 구매 3,000원</span></dd>
          </dl>

          {/* 옵션 */}
          {!soldOut && (
            <div className="pt-5 space-y-2.5">
              {p.options.map((o, oi) => (
                <select key={o.name} value={pick[o.name] || ''} disabled={oi > 0 && !pick[p.options[oi - 1].name]} onChange={(e) => choose(o.name, e.target.value)} className="field disabled:bg-cream disabled:text-mute">
                  <option value="">{o.name} 선택</option>
                  {o.values.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              ))}
              {lines.map((l) => (
                <div key={l.label} className="bg-cream p-3.5 flex items-center justify-between gap-3">
                  <div className="text-[13px] min-w-0">
                    <div className="truncate">{l.label}</div>
                    <div className="mt-2"><Qty value={l.qty} onChange={(q) => setLines(lines.map((x) => (x.label === l.label ? { ...x, qty: Math.max(1, q) } : x)))} /></div>
                  </div>
                  <div className="text-right">
                    <button onClick={() => setLines(lines.filter((x) => x.label !== l.label))} className="text-mute hover:text-ink"><X size={16} /></button>
                    <div className="mt-2 font-bold num text-sm">{won(unit * l.qty)}</div>
                  </div>
                </div>
              ))}
              {p.options.length === 0 && !lines.length && (
                <div className="bg-cream p-3.5 flex items-center justify-between text-[13px]">
                  <span>{p.name}</span><Qty value={1} onChange={(q) => setLines([{ label: '', qty: Math.max(1, q) }])} />
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex items-baseline justify-between">
            <span className="text-[13px] text-ink-2">총 상품금액 <span className="text-mute">(배송비 {ship ? won(ship) : '무료'})</span></span>
            <span className="text-[24px] font-bold num">{won(total)}</span>
          </div>
          <div className="mt-4 grid grid-cols-[52px_1fr_1fr] gap-2">
            <button onClick={() => { toggleWish(p.id); toast(wish.has(p.id) ? '찜 해제했어요' : '찜했어요'); }} className="btn btn-line btn-lg px-0" aria-label="찜"><Heart size={20} strokeWidth={1.6} className={wish.has(p.id) ? 'fill-point text-point' : ''} /></button>
            {soldOut ? (
              <button onClick={() => toast('재입고 알림을 신청했어요')} className="btn btn-ink btn-lg col-span-2">재입고 알림 신청</button>
            ) : (
              <>
                <button onClick={onCart} className="btn btn-line btn-lg">장바구니</button>
                <button onClick={onBuy} className="btn btn-ink btn-lg">바로 구매</button>
              </>
            )}
          </div>
          <button onClick={() => toast('링크를 복사했어요')} className="mt-3 text-[12px] text-mute flex items-center gap-1 hover:text-ink"><Share2 size={13} /> 공유하기</button>
        </div>
      </div>

      {/* 탭 */}
      <div className="sticky top-16 z-30 bg-white border-b border-line mt-16 flex gap-8 overflow-x-auto no-scrollbar">
        {TABS.map(([k, l]) => <button key={k} onClick={() => go(k)} className={cx('tab shrink-0', tab === k && 'tab-on')}>{l}</button>)}
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-12">
        <div className="min-w-0">
          {/* 상품정보 */}
          <section id="info" className="scroll-mt-32 pt-10">
            <div className="max-w-[720px] mx-auto">
              <p className="text-center eyebrow">Detail</p>
              <h3 className="text-center text-[22px] font-bold mt-2">{p.name}</h3>
              <p className="text-center text-sm text-ink-2 mt-3 leading-relaxed">{store.intro}</p>
              <div className="mt-8 space-y-2">
                {p.images.map((s) => <img key={s} src={s} alt="" className="w-full" />)}
              </div>
              <h4 className="mt-12 mb-3 font-bold text-[15px]">상품정보 제공고시</h4>
              <table className="w-full text-[13px] border-t border-ink">
                <tbody>
                  {[['소재', p.material], ['제조국', p.origin], ['제조자/수입자', store.name], ['품질보증기준', '관련 법 및 소비자분쟁해결 기준에 따름'], ['A/S 책임자', `${store.name} ${store.phone}`]].map(([k, v]) => (
                    <tr key={k} className="border-b border-line"><th className="w-36 bg-cream text-left font-medium px-3 py-2.5 text-ink-2">{k}</th><td className="px-3 py-2.5">{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 리뷰 */}
          <section id="reviews" className="scroll-mt-32 pt-16">
            <div className="flex items-baseline justify-between border-b border-ink pb-3">
              <h3 className="text-[20px] font-bold">리뷰 <span className="num">{comma(p.reviews)}</span></h3>
              <span className="text-[12px] text-mute">구매확정 후 작성된 리뷰만 노출됩니다</span>
            </div>
            <div className="grid sm:grid-cols-[200px_1fr_1fr] gap-8 py-8 border-b border-line">
              <div className="text-center sm:border-r border-line sm:pr-8">
                <div className="text-[46px] font-bold leading-none num">{p.rating.toFixed(1)}</div>
                <Stars value={p.rating} size={16} className="mt-2" />
                <div className="text-[12px] text-mute mt-2">상위 {p.rating >= 4.8 ? 3 : 12}% 만족도</div>
              </div>
              <ul className="space-y-1.5 text-[12.5px]">
                {sum.dist.map((d) => (
                  <li key={d.star}>
                    <button onClick={() => setStarFilter(starFilter === d.star ? 0 : d.star)} className={cx('w-full flex items-center gap-2.5', starFilter && starFilter !== d.star && 'opacity-40')}>
                      <span className="w-6 text-left">{d.star}점</span>
                      <span className="flex-1 h-1.5 bg-sand"><span className="block h-full bg-ink" style={{ width: `${(d.count / sum.total) * 100}%` }} /></span>
                      <span className="w-9 text-right num text-mute">{Math.round((d.count / sum.total) * 100)}%</span>
                    </button>
                  </li>
                ))}
              </ul>
              {fits ? (
                <div className="text-[12.5px]">
                  <div className="font-semibold mb-2">사이즈</div>
                  {fits.map(({ f, n }) => {
                    const tot = fits.reduce((a, x) => a + x.n, 0) || 1;
                    const top = n === Math.max(...fits.map((x) => x.n));
                    return (
                      <div key={f} className="flex items-center gap-2.5 mb-1.5">
                        <span className={cx('w-12', top && 'font-bold')}>{f}</span>
                        <span className="flex-1 h-1.5 bg-sand"><span className={cx('block h-full', top ? 'bg-point' : 'bg-line-2')} style={{ width: `${(n / tot) * 100}%` }} /></span>
                        <span className="w-9 text-right num text-mute">{Math.round((n / tot) * 100)}%</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[12.5px] space-y-2">
                  <div className="font-semibold">구매자 한마디</div>
                  <div className="flex flex-wrap gap-1.5">{['포장이 꼼꼼해요', '재구매 의사 있어요', '선물용 추천', '배송 빨라요'].map((k) => <span key={k} className="px-2 py-1 bg-cream">{k}</span>)}</div>
                </div>
              )}
            </div>

            {photos.length > 0 && (
              <div className="py-6 border-b border-line">
                <div className="text-[13px] font-semibold mb-3 flex items-center gap-1.5"><Camera size={15} strokeWidth={1.7} /> 포토 리뷰 <span className="num text-mute">{photos.length}</span></div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {photos.map((r) => <img key={r.id} src={r.photos[0]} alt="" className="w-24 h-24 object-cover shrink-0" />)}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 py-4 border-b border-line text-[13px]">
              <div className="flex items-center gap-4">
                <Checkbox checked={photoOnly} onChange={setPhotoOnly} label="포토 리뷰만" />
                {starFilter > 0 && <button onClick={() => setStarFilter(0)} className="inline-flex items-center gap-1 h-7 px-2 bg-sand">{starFilter}점만<X size={12} /></button>}
              </div>
              <div className="flex gap-3">
                {[['recent', '최신순'], ['helpful', '도움순'], ['high', '평점 높은순'], ['low', '평점 낮은순']].map(([k, l]) => (
                  <button key={k} onClick={() => setRsort(k)} className={rsort === k ? 'font-bold' : 'text-mute'}>{l}</button>
                ))}
              </div>
            </div>

            <ul>
              {filtered.map((r) => {
                const u = userById[r.userId];
                return (
                  <li key={r.id} className="py-6 border-b border-line">
                    <div className="flex items-center gap-2.5">
                      <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <div className="text-[13px] font-semibold">{maskName(u.nick)} <span className="ml-1 text-[11px] font-normal text-mute">{u.grade}</span></div>
                        <div className="flex items-center gap-2 text-[11.5px] text-mute"><Stars value={r.rating} size={11} /> {ymd(r.date)}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-[12px] text-mute">{r.option && <>옵션: {r.option}</>}{r.fit && <> · 사이즈 <b className="text-ink-2">{r.fit}</b></>}</div>
                    <p className="mt-2 text-[14px] font-semibold">{r.title}</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{r.body}</p>
                    {r.photos.length > 0 && <img src={r.photos[0]} alt="" className="mt-3 w-28 h-28 object-cover" />}
                    {r.reply && (
                      <div className="mt-4 bg-cream p-4 text-[13px]">
                        <div className="font-bold mb-1">{store.name} <span className="font-normal text-mute text-[11px] ml-1">판매자 답글</span></div>
                        <p className="text-ink-2 leading-relaxed">{r.reply}</p>
                      </div>
                    )}
                    <div className="mt-4 flex items-center gap-4 text-[12px]">
                      <button onClick={() => setHelped((h) => { const n = new Set(h); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })}
                        className={cx('inline-flex items-center gap-1.5 h-7 px-2.5 border', helped.has(r.id) ? 'border-ink bg-ink text-white' : 'border-line-2 text-ink-2')}>
                        <ThumbsUp size={12} /> 도움돼요 <span className="num">{r.helpful + (helped.has(r.id) ? 1 : 0)}</span>
                      </button>
                      <button onClick={() => toast('신고가 접수되었어요. 검토 후 처리됩니다.')} className="text-mute hover:text-ink">신고</button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pager total={5} className="mt-8" />
          </section>

          {/* Q&A */}
          <section id="qna" className="scroll-mt-32 pt-16">
            <div className="flex items-center justify-between border-b border-ink pb-3">
              <h3 className="text-[20px] font-bold">Q&A <span className="num">{myQna.length}</span></h3>
              <button onClick={() => setQnaModal(true)} className="btn btn-line btn-sm">문의하기</button>
            </div>
            <ul>
              {myQna.length === 0 && <li className="py-10 text-center text-sm text-mute">등록된 문의가 없습니다.</li>}
              {myQna.map((q) => (
                <li key={q.id} className="py-4 border-b border-line text-[13.5px]">
                  <div className="flex items-center gap-2 text-[12px] text-mute">
                    <Pill tone={q.a ? 'mute' : 'line'}>{q.a ? '답변완료' : '답변대기'}</Pill>
                    {maskName(userById[q.userId].name)} · {ymd(q.date)}
                  </div>
                  {q.secret ? (
                    <p className="mt-2 flex items-center gap-1.5 text-mute"><Lock size={13} /> 비밀글입니다.</p>
                  ) : (
                    <>
                      <p className="mt-2"><b className="mr-2">Q</b>{q.q}</p>
                      {q.a && <p className="mt-2 text-ink-2"><b className="mr-2 text-point">A</b>{q.a}</p>}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* 배송/교환/반품 */}
          <section id="ship" className="scroll-mt-32 pt-16">
            <h3 className="text-[20px] font-bold border-b border-ink pb-3">배송 / 교환 / 반품 안내</h3>
            <table className="w-full text-[13px] mt-0">
              <tbody>
                {[
                  ['배송 방법', `${store.courier} 택배`],
                  ['배송비', store.shipFee ? `${won(store.shipFee)} (${won(store.freeOver)} 이상 무료) · 제주/도서산간 3,000원 추가` : '무료배송'],
                  ['출고', store.dispatch],
                  ['교환/반품 신청', '배송 완료 후 7일 이내, 마이페이지 > 주문/배송에서 신청'],
                  ['반품 배송비', `단순 변심: 왕복 ${won((store.shipFee || 3000) * 2)} / 상품 하자·오배송: 판매자 부담`],
                  ['교환/반품 불가', '착용 흔적·세탁·택 제거 시, 신선식품 단순 변심, 주문 제작 상품'],
                  ['구매 확정', '배송 완료 7일 후 자동 구매확정 (확정 이후에는 교환/반품 불가)'],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-line"><th className="w-40 bg-cream text-left font-medium px-3 py-3 text-ink-2 align-top">{k}</th><td className="px-3 py-3 leading-relaxed">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        {/* 우측 스토어 카드 */}
        <aside className="hidden lg:block pt-10">
          <div className="sticky top-32 border border-line">
            <img src={store.cover} alt="" className="w-full aspect-[16/9] object-cover" />
            <div className="p-5">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 text-white text-sm font-bold flex items-center justify-center" style={{ background: store.color }}>{store.name[0]}</span>
                <div>
                  <div className="font-bold text-[15px]">{store.name}</div>
                  <div className="text-[11.5px] text-mute">{store.grade} 판매자 · 관심고객 {comma(store.followers)}</div>
                </div>
              </div>
              <p className="mt-3 text-[12.5px] text-ink-2 leading-relaxed">{store.intro}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => toast(`${store.name} 알림받기 완료`)} className="btn btn-line btn-sm">+ 알림받기</button>
                <Link to={`/store/${store.id}`} className="btn btn-ink btn-sm">스토어 홈</Link>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {others.length > 0 && (
        <section className="mt-20">
          <h3 className="text-[20px] font-bold mb-5">{store.name}의 다른 상품</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">{others.map((x) => <ProductCard key={x.id} p={x} showStore={false} />)}</div>
        </section>
      )}

      <Modal open={cartModal} onClose={() => setCartModal(false)} title="장바구니에 담았어요" width={400}
        footer={<><button className="btn btn-line btn-sm" onClick={() => setCartModal(false)}>쇼핑 계속하기</button><Link to="/cart" className="btn btn-ink btn-sm">장바구니 보기</Link></>}>
        <div className="flex gap-3">
          <img src={p.images[0]} alt="" className="w-16 h-20 object-cover" />
          <div className="text-[13px]"><div className="font-semibold">{p.name}</div><div className="text-mute mt-1">{lines.map((l) => l.label).filter(Boolean).join(', ') || '단일 상품'}</div></div>
        </div>
      </Modal>

      <Modal open={qnaModal} onClose={() => setQnaModal(false)} title="상품 문의하기"
        footer={<><button className="btn btn-line btn-sm" onClick={() => setQnaModal(false)}>취소</button><button className="btn btn-ink btn-sm" onClick={() => { setQnaModal(false); toast('문의가 등록되었어요. 판매자 답변 시 알림을 드려요.'); }}>등록</button></>}>
        <label className="label">문의 유형</label>
        <select className="field mb-4"><option>상품</option><option>배송</option><option>교환/반품</option><option>기타</option></select>
        <label className="label">내용</label>
        <textarea rows={5} className="field" placeholder="상품에 대해 궁금한 점을 남겨주세요. (개인정보 입력 금지)" />
        <Checkbox className="mt-3" checked label="비밀글로 문의하기" />
      </Modal>
    </div>
  );
}
