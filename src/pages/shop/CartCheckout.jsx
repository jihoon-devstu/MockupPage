import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { X, Minus, Plus, Check, ChevronRight } from 'lucide-react';
import { storeById } from '../../data/catalog';
import { myAddresses, myCoupons, ME } from '../../data/people';
import { shipFeeFor } from '../../data/orders';
import { useApp } from '../../lib/store';
import { Checkbox, Empty, Modal } from '../../components/ui';
import { cx, won, comma } from '../../lib/format';

/* 스토어별로 묶어서 배송비 계산 (스마트스토어 방식: 같은 스토어 상품은 묶음배송) */
function groupByStore(lines) {
  const g = {};
  lines.forEach((l) => { (g[l.product.storeId] ||= []).push(l); });
  return Object.entries(g).map(([sid, ls]) => {
    const store = storeById[sid];
    const subtotal = ls.reduce((a, l) => a + l.unit * l.qty, 0);
    return { store, lines: ls, subtotal, ship: shipFeeFor(store, subtotal) };
  });
}

function Summary({ groups, discount = 0, point = 0, cta }) {
  const list = groups.reduce((a, g) => a + g.lines.reduce((b, l) => b + l.product.price * l.qty, 0), 0);
  const sale = groups.reduce((a, g) => a + g.subtotal, 0);
  const ship = groups.reduce((a, g) => a + g.ship, 0);
  const pay = sale + ship - discount - point;
  return (
    <div className="border border-ink">
      <div className="p-5 space-y-2.5 text-[14px]">
        <div className="flex justify-between"><span className="text-ink-2">상품금액</span><span className="num">{won(list)}</span></div>
        <div className="flex justify-between"><span className="text-ink-2">상품할인</span><span className="num text-point">−{won(list - sale)}</span></div>
        {discount > 0 && <div className="flex justify-between"><span className="text-ink-2">쿠폰할인</span><span className="num text-point">−{won(discount)}</span></div>}
        {point > 0 && <div className="flex justify-between"><span className="text-ink-2">포인트</span><span className="num text-point">−{won(point)}</span></div>}
        <div className="flex justify-between"><span className="text-ink-2">배송비</span><span className="num">{ship ? `+${won(ship)}` : '무료'}</span></div>
      </div>
      <div className="px-5 py-4 border-t border-line flex justify-between items-baseline">
        <span className="font-bold">결제 예정금액</span>
        <span className="text-[24px] font-bold num">{won(Math.max(0, pay))}</span>
      </div>
      <div className="px-5 pb-5">{cta(pay)}</div>
      <p className="px-5 pb-4 -mt-2 text-[11.5px] text-mute">구매 시 <b className="num">{comma(sale * 0.01)}P</b> 적립 예정 ({ME.grade} 등급 1%)</p>
    </div>
  );
}

export function Cart() {
  const { cart, setQty, toggleLine, toggleAll, removeLines, toast } = useApp();
  const nav = useNavigate();
  const checked = cart.filter((l) => l.checked);
  const groups = groupByStore(cart);
  const checkedGroups = groupByStore(checked);
  const allOn = cart.length > 0 && checked.length === cart.length;

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-10">
      <div className="flex items-end justify-between border-b border-ink pb-4">
        <h1 className="text-[28px] font-bold tracking-tight">장바구니 <span className="num text-point">{cart.length}</span></h1>
        <ol className="hidden sm:flex text-[13px] text-mute gap-2 items-center"><li className="text-ink font-bold">01 장바구니</li><ChevronRight size={14} /><li>02 주문/결제</li><ChevronRight size={14} /><li>03 주문완료</li></ol>
      </div>
      {cart.length === 0 ? (
        <Empty title="장바구니가 비어 있어요" desc="마음에 드는 상품을 담아보세요." action={<Link to="/products" className="btn btn-ink">쇼핑하러 가기</Link>} />
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-8 pt-5">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <Checkbox checked={allOn} onChange={toggleAll} label={`전체선택 (${checked.length}/${cart.length})`} />
              <button onClick={() => { removeLines(checked.map((l) => l.key)); toast('선택한 상품을 삭제했어요'); }} className="text-[13px] text-mute hover:text-ink">선택삭제</button>
            </div>
            {groups.map((g) => (
              <div key={g.store.id} className="mt-6 border border-line">
                <div className="flex items-center justify-between px-4 h-12 bg-cream border-b border-line">
                  <Link to={`/store/${g.store.id}`} className="font-bold text-[14px] hover:underline">{g.store.name}</Link>
                  <span className="text-[12px] text-ink-2">
                    {g.ship === 0 ? '무료배송' : <>배송비 {won(g.ship)} · <span className="text-point">{won(g.store.freeOver - g.subtotal)} 더 담으면 무료배송</span></>}
                  </span>
                </div>
                {g.lines.map((l) => (
                  <div key={l.key} className="flex gap-4 p-4 border-b border-line last:border-0">
                    <Checkbox checked={l.checked} onChange={() => toggleLine(l.key)} />
                    <Link to={`/products/${l.productId}`}><img src={l.product.images[0]} alt="" className="w-20 h-24 object-cover" /></Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <Link to={`/products/${l.productId}`} className="text-[14px] font-medium hover:underline line-clamp-2">{l.product.name}</Link>
                        <button onClick={() => removeLines([l.key])} className="text-mute hover:text-ink shrink-0"><X size={18} /></button>
                      </div>
                      {l.option && <div className="text-[12.5px] text-mute mt-1">{l.option}</div>}
                      <div className="mt-3 flex items-end justify-between">
                        <div className="flex items-center border border-line-2 h-8">
                          <button className="w-8 h-full flex items-center justify-center hover:bg-sand" onClick={() => setQty(l.key, l.qty - 1)}><Minus size={13} /></button>
                          <span className="w-9 text-center text-[13px] num">{l.qty}</span>
                          <button className="w-8 h-full flex items-center justify-center hover:bg-sand" onClick={() => setQty(l.key, l.qty + 1)}><Plus size={13} /></button>
                        </div>
                        <div className="text-right">
                          {l.product.discount > 0 && <div className="text-[12px] text-mute line-through num">{won(l.product.price * l.qty)}</div>}
                          <div className="font-bold num">{won(l.unit * l.qty)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="lg:sticky lg:top-24 self-start">
            <Summary groups={checkedGroups} cta={() => (
              <button disabled={!checked.length} onClick={() => nav('/checkout')} className="btn btn-ink btn-lg w-full">{checked.length}개 상품 주문하기</button>
            )} />
          </div>
        </div>
      )}
    </div>
  );
}

const PAY_METHODS = ['신용/체크카드', '곳간페이', '카카오페이', '네이버페이', '토스페이', '무통장입금'];

function Section({ n, title, children, right }) {
  return (
    <section className="border-t border-ink pt-5 pb-8">
      <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-[17px]"><span className="num text-point mr-2 text-sm">{n}</span>{title}</h2>{right}</div>
      {children}
    </section>
  );
}

export function Checkout() {
  const { cart, clearChecked } = useApp();
  const nav = useNavigate();
  const lines = cart.filter((l) => l.checked);
  const groups = groupByStore(lines);
  const [addr, setAddr] = useState(myAddresses[0]);
  const [addrModal, setAddrModal] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [point, setPoint] = useState(0);
  const [method, setMethod] = useState(PAY_METHODS[0]);
  const [agree, setAgree] = useState(false);
  const sale = groups.reduce((a, g) => a + g.subtotal, 0);
  const cp = myCoupons.find((c) => c.id === coupon);
  const discount = cp ? (cp.rate ? Math.min(cp.max, Math.round(sale * cp.rate)) : cp.amount) : 0;

  if (!lines.length) return <Empty title="주문할 상품이 없어요" action={<Link to="/cart" className="btn btn-ink">장바구니로</Link>} />;


  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-10">
      <div className="flex items-end justify-between border-b border-line pb-4 mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">주문/결제</h1>
        <ol className="hidden sm:flex text-[13px] text-mute gap-2 items-center"><li>01 장바구니</li><ChevronRight size={14} /><li className="text-ink font-bold">02 주문/결제</li><ChevronRight size={14} /><li>03 주문완료</li></ol>
      </div>
      <div className="grid lg:grid-cols-[1fr_360px] gap-10">
        <div>
          <Section n="01" title="배송지" right={<button onClick={() => setAddrModal(true)} className="btn btn-line btn-xs">변경</button>}>
            <div className="text-[14px] leading-relaxed">
              <div className="font-bold">{addr.name} <span className="ml-1 text-[11px] font-semibold border border-line-2 px-1.5 py-0.5">{addr.label}</span>{addr.main && <span className="ml-1 text-[11px] text-point font-semibold">기본배송지</span>}</div>
              <div className="text-ink-2">{addr.phone}</div>
              <div className="text-ink-2">({addr.zip}) {addr.addr} {addr.detail}</div>
            </div>
            <select className="field mt-4"><option>배송 요청사항을 선택해주세요</option><option>문 앞에 놓아주세요</option><option>경비실에 맡겨주세요</option><option>배송 전 연락 바랍니다</option><option>직접 입력</option></select>
          </Section>

          <Section n="02" title={`주문상품 ${lines.length}개`}>
            {groups.map((g) => (
              <div key={g.store.id} className="mb-4 border border-line">
                <div className="px-4 h-10 flex items-center justify-between bg-cream text-[13px]"><b>{g.store.name}</b><span className="text-ink-2">배송비 {g.ship ? won(g.ship) : '무료'}</span></div>
                {g.lines.map((l) => (
                  <div key={l.key} className="flex gap-3 p-3 border-t border-line text-[13px]">
                    <img src={l.product.images[0]} alt="" className="w-14 h-16 object-cover" />
                    <div className="flex-1"><div className="font-medium">{l.product.name}</div><div className="text-mute">{l.option || '단일상품'} · {l.qty}개</div></div>
                    <div className="font-bold num">{won(l.unit * l.qty)}</div>
                  </div>
                ))}
              </div>
            ))}
          </Section>

          <Section n="03" title="할인 · 포인트">
            <div className="grid sm:grid-cols-[100px_1fr] gap-3 items-center text-[14px]">
              <span className="text-ink-2">쿠폰</span>
              <select value={coupon} onChange={(e) => setCoupon(e.target.value)} className="field">
                <option value="">쿠폰 선택 (보유 {myCoupons.length}장)</option>
                {myCoupons.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.cond}</option>)}
              </select>
              <span className="text-ink-2">포인트</span>
              <div className="flex gap-2">
                <input value={point || ''} onChange={(e) => setPoint(Math.min(ME.point, Number(e.target.value.replace(/\D/g, '')) || 0))} className="field num" placeholder="0" />
                <button onClick={() => setPoint(ME.point)} className="btn btn-line shrink-0">전액사용</button>
              </div>
              <span />
              <span className="text-[12px] text-mute -mt-1">보유 {comma(ME.point)}P · 1,000P 이상부터 사용 가능</span>
            </div>
          </Section>

          <Section n="04" title="결제수단">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PAY_METHODS.map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={cx('h-12 border text-[14px]', method === m ? 'border-ink border-2 font-bold' : 'border-line-2 hover:border-ink')}>{m}</button>
              ))}
            </div>
            {method === '신용/체크카드' && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <select className="field"><option>카드사 선택</option><option>현대카드</option><option>신한카드</option><option>삼성카드</option><option>KB국민카드</option></select>
                <select className="field"><option>일시불</option><option>2개월 무이자</option><option>3개월 무이자</option></select>
              </div>
            )}
            {method === '무통장입금' && <p className="mt-3 text-[13px] text-ink-2 bg-cream p-3">주문 후 24시간 이내 미입금 시 자동 취소됩니다. 가상계좌가 발급됩니다.</p>}
          </Section>

          <section className="border-t border-ink pt-5 text-[13px] space-y-2">
            <Checkbox checked={agree} onChange={setAgree} label="주문 내용을 확인했으며, 아래 내용에 모두 동의합니다." />
            <ul className="pl-7 text-mute space-y-1 text-[12px]">
              <li>(필수) 개인정보 수집·이용 및 판매자 제3자 제공 동의</li>
              <li>(필수) 전자결제대행 이용 동의</li>
              <li>곳간은 통신판매중개자이며, 상품·거래 책임은 각 판매자에게 있습니다.</li>
            </ul>
          </section>
        </div>

        <div className="lg:sticky lg:top-24 self-start">
          <Summary groups={groups} discount={discount} point={point} cta={(pay) => (
            <button disabled={!agree} onClick={() => { clearChecked(); nav('/order/complete', { state: { pay, method } }); }} className="btn btn-point btn-lg w-full">{won(pay)} 결제하기</button>
          )} />
          {!agree && <p className="text-[12px] text-mute mt-2 text-center">약관에 동의해야 결제할 수 있어요</p>}
        </div>
      </div>

      <Modal open={addrModal} onClose={() => setAddrModal(false)} title="배송지 선택">
        <div className="space-y-2">
          {myAddresses.map((a) => (
            <button key={a.id} onClick={() => { setAddr(a); setAddrModal(false); }} className={cx('w-full text-left border p-4 text-[13px]', addr.id === a.id ? 'border-ink border-2' : 'border-line-2')}>
              <div className="font-bold">{a.label} · {a.name}{a.main && <span className="ml-2 text-point text-[11px]">기본</span>}</div>
              <div className="text-ink-2 mt-1">{a.addr} {a.detail}</div>
            </button>
          ))}
          <Link to="/mypage/addresses" className="btn btn-line w-full">+ 새 배송지 추가</Link>
        </div>
      </Modal>
    </div>
  );
}

export function OrderComplete() {
  const st = useLocation().state || {};
  return (
    <div className="max-w-[640px] mx-auto px-4 pt-20 text-center">
      <div className="mx-auto w-14 h-14 bg-ink text-white flex items-center justify-center"><Check size={28} strokeWidth={2.5} /></div>
      <h1 className="mt-6 text-[26px] font-bold tracking-tight">주문이 완료되었습니다</h1>
      <p className="mt-2 text-sm text-ink-2">판매자가 주문을 확인하면 알림톡으로 알려드려요.</p>
      <div className="mt-10 border-t border-ink text-left text-[14px]">
        {[['주문번호', <span className="num">2026100110231187</span>], ['결제수단', st.method || '신용/체크카드'], ['결제금액', <b className="num">{won(st.pay || 0)}</b>], ['배송지', `${myAddresses[0].addr} ${myAddresses[0].detail}`]].map(([k, v]) => (
          <div key={k} className="flex py-3.5 border-b border-line"><span className="w-28 text-mute">{k}</span><span className="flex-1">{v}</span></div>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-2">
        <Link to="/mypage/orders" className="btn btn-line btn-lg">주문 상세보기</Link>
        <Link to="/" className="btn btn-ink btn-lg">쇼핑 계속하기</Link>
      </div>
    </div>
  );
}
