import { Link } from 'react-router-dom';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { productsOfStore, productById } from '../../data/catalog';
import { sellerOrders, sellerDaily, settlements, pendingThisWeek } from '../../data/orders';
import { reviewsOfStore, ratingSummary } from '../../data/reviews';
import { userById } from '../../data/people';
import { Kpi, BarChart, PageHead, Stars, StatusPill } from '../../components/ui';
import { won, comma, ymd, maskName, cx } from '../../lib/format';
import { MY_STORE, myStoreQna } from './SellerLayout';

export default function SellerDashboard() {
  const cnt = (s) => sellerOrders.filter((o) => o.status === s).length;
  const todo = [
    ['신규주문', cnt('결제완료'), '/seller/orders?s=결제완료', true],
    ['배송준비', cnt('배송준비'), '/seller/orders?s=배송준비'],
    ['배송중', cnt('배송중'), '/seller/orders?s=배송중'],
    ['취소요청', cnt('취소요청'), '/seller/claims', true],
    ['반품요청', cnt('반품요청'), '/seller/claims', true],
    ['교환요청', cnt('교환요청'), '/seller/claims', true],
    ['미답변 문의', myStoreQna.filter((q) => !q.a).length, '/seller/qna', true],
  ];
  const today = sellerDaily.at(-1), yday = sellerDaily.at(-2);
  const mySet = settlements.filter((s) => s.storeId === MY_STORE.id);
  const revs = reviewsOfStore(MY_STORE.id);
  const sum = ratingSummary(revs);
  const prods = productsOfStore(MY_STORE.id);
  const lowStock = prods.filter((p) => p.stock < 20);
  const top = [...prods].sort((a, b) => b.sold - a.sold).slice(0, 5);
  const month = sellerDaily.reduce((a, d) => a + d.amount, 0);

  return (
    <div>
      <PageHead title={`${MY_STORE.owner} 대표님, 좋은 아침이에요`} desc={`${ymd(new Date('2026-10-01'))} (목) · ${MY_STORE.name} 스토어 현황`}
        right={<Link to="/seller/products/new" className="btn btn-ink btn-sm">+ 상품 등록</Link>} />

      {/* 할 일 */}
      <div className="panel grid grid-cols-4 md:grid-cols-7">
        {todo.map(([k, n, to, urgent], i) => (
          <Link key={k} to={to} className={cx('px-4 py-4 hover:bg-cream border-line', i % 4 && 'border-l', i >= 4 && 'border-t md:border-t-0', i % 7 && 'md:border-l')}>
            <div className="text-[12.5px] text-ink-2">{k}</div>
            <div className={cx('mt-1 text-[24px] font-bold num', n && urgent ? 'text-point' : n ? 'text-ink' : 'text-line-2')}>{n}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
        <Kpi label="오늘 결제금액" value={comma(today.amount)} unit="원" delta={((today.amount - yday.amount) / yday.amount) * 100} sub="전일 대비" />
        <Kpi label="최근 30일 매출" value={comma(month / 10000)} unit="만원" delta={12.4} sub="직전 30일 대비" />
        <Kpi label="이번 주 정산 예정" value={comma(mySet[0].payout)} unit="원" sub={`${ymd(mySet[0].pay)} 지급`} />
        <Kpi label="스토어 평점" value={sum.avg.toFixed(2)} unit="/ 5" sub={`리뷰 ${comma(sum.total)}개 (최근 90일)`} />
      </div>

      <div className="grid xl:grid-cols-[1fr_340px] gap-4 mt-4">
        <div className="panel">
          <div className="panel-head"><span className="panel-title">일별 결제금액 · 최근 30일</span><span className="text-[12px] text-mute">막대에 마우스를 올리면 상세 금액</span></div>
          <div className="p-5"><BarChart data={sellerDaily} /></div>
        </div>
        <div className="panel">
          <div className="panel-head"><span className="panel-title">많이 팔린 상품</span><Link to="/seller/products" className="text-[12px] text-mute">전체</Link></div>
          <ol>
            {top.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-line last:border-0">
                <span className="w-4 num text-[13px] font-bold">{i + 1}</span>
                <img src={p.images[0]} alt="" className="w-10 h-10 object-cover" />
                <div className="flex-1 min-w-0"><div className="text-[13px] truncate">{p.name}</div><div className="text-[11.5px] text-mute num">{comma(p.sold)}개 · 재고 {p.stock}</div></div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-4 mt-4">
        <div className="panel xl:col-span-2">
          <div className="panel-head"><span className="panel-title">최근 주문</span><Link to="/seller/orders" className="text-[12px] text-mute flex items-center gap-1">주문 관리 <ArrowRight size={12} /></Link></div>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>상품주문번호</th><th>상품</th><th>구매자</th><th className="text-right">금액</th><th>상태</th></tr></thead>
              <tbody>
                {sellerOrders.slice(0, 6).map((o) => (
                  <tr key={o.lineId}>
                    <td><Link to={`/seller/orders/${o.lineId}`} className="num text-sky hover:underline">{o.lineId}</Link></td>
                    <td className="max-w-[220px] truncate">{productById[o.productId].name}</td>
                    <td>{maskName(o.receiver)}</td>
                    <td className="text-right num">{won(o.unitPrice * o.qty)}</td>
                    <td><StatusPill s={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          {lowStock.length > 0 && (
            <div className="panel border-amber/40">
              <div className="panel-head"><span className="panel-title flex items-center gap-1.5"><AlertTriangle size={15} className="text-amber" /> 재고 부족</span></div>
              {lowStock.map((p) => (
                <Link key={p.id} to={`/seller/products/${p.id}/edit`} className="flex items-center justify-between px-5 py-2.5 border-b border-line last:border-0 text-[13px] hover:bg-cream">
                  <span className="truncate pr-3">{p.name}</span><span className={cx('num font-bold', p.stock === 0 ? 'text-rust' : 'text-amber')}>{p.stock === 0 ? '품절' : `${p.stock}개`}</span>
                </Link>
              ))}
            </div>
          )}
          <div className="panel">
            <div className="panel-head"><span className="panel-title">새 리뷰</span><Link to="/seller/reviews" className="text-[12px] text-mute">답글 달기</Link></div>
            {revs.slice(0, 3).map((r) => (
              <div key={r.id} className="px-5 py-3 border-b border-line last:border-0">
                <div className="flex items-center gap-2 text-[12px]"><Stars value={r.rating} size={11} /><span className="text-mute">{maskName(userById[r.userId].name)} · {ymd(r.date)}</span></div>
                <p className="text-[13px] mt-1 line-clamp-2 text-ink-2">{r.body}</p>
              </div>
            ))}
          </div>
          <div className="panel p-5 bg-ink text-white border-ink">
            <div className="text-[12px] text-white/60">곳간 공지</div>
            <div className="font-semibold mt-1 text-[14px]">10월 추석 연휴 정산 일정 안내</div>
            <p className="text-[12.5px] text-white/70 mt-1.5 leading-relaxed">10/5(월) ~ 10/9(금) 연휴 기간 구매확정분은 10/15(목)에 일괄 지급됩니다.</p>
          </div>
        </div>
      </div>
      <p className="text-[12px] text-mute mt-4">이번 주(9/28~) 구매확정 누적 {won(pendingThisWeek.s1.confirmed)} · 다음 주 목요일 정산 예정</p>
    </div>
  );
}
