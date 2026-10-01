import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { categories, catById, visibleProducts, storeById } from '../../data/catalog';
import ProductCard from '../../components/ProductCard';
import { Checkbox, Empty, Pager } from '../../components/ui';
import { cx, salePrice } from '../../lib/format';

const SORTS = [
  ['rank', '판매량순'],
  ['new', '신상품순'],
  ['low', '낮은 가격순'],
  ['high', '높은 가격순'],
  ['review', '리뷰 많은순'],
  ['rating', '평점 높은순'],
];
const PRICES = [[0, 30000, '3만원 이하'], [30000, 80000, '3만 ~ 8만원'], [80000, 150000, '8만 ~ 15만원'], [150000, 1e9, '15만원 이상']];
const BENEFITS = ['무료배송', '오늘출발', '산지직송', '핸드메이드', 'NEW'];

export default function ProductList() {
  const [sp, setSp] = useSearchParams();
  const cat = sp.get('cat'), sub = sp.get('sub'), q = sp.get('q') || '', tag = sp.get('tag');
  const sort = sp.get('sort') || 'rank';
  const [price, setPrice] = useState(null);
  const [tags, setTags] = useState(tag ? [tag] : []);
  const [excludeSoldOut, setExcludeSoldOut] = useState(false);
  const [mobileFilter, setMobileFilter] = useState(false);

  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); if (k === 'cat') n.delete('sub'); setSp(n); };

  const list = useMemo(() => {
    let l = visibleProducts.filter((p) =>
      (!cat || p.cat === cat) && (!sub || p.sub === sub) &&
      (!q || (p.name + storeById[p.storeId].name + p.sub).includes(q)) &&
      (!price || (salePrice(p) >= price[0] && salePrice(p) < price[1])) &&
      tags.every((t) => p.tags.includes(t)) &&
      (!excludeSoldOut || p.status !== '품절'));
    const by = {
      rank: (a, b) => b.sold - a.sold, new: (a, b) => b.created - a.created,
      low: (a, b) => salePrice(a) - salePrice(b), high: (a, b) => salePrice(b) - salePrice(a),
      review: (a, b) => b.reviews - a.reviews, rating: (a, b) => b.rating - a.rating,
    };
    return l.sort(by[sort]);
  }, [cat, sub, q, price, tags, excludeSoldOut, sort]);

  const c = cat && catById[cat];
  const title = q ? `‘${q}’ 검색 결과` : tag ? tag : c ? c.name : sort === 'new' ? '신상품' : sort === 'rank' ? '랭킹' : '전체 상품';

  const Filters = (
    <div className="space-y-8 text-sm">
      <div>
        <div className="font-bold mb-3">카테고리</div>
        <ul className="space-y-1.5">
          <li><button onClick={() => set('cat', null)} className={cx(!cat ? 'font-bold' : 'text-ink-2 hover:text-ink')}>전체</button></li>
          {categories.map((x) => (
            <li key={x.id}>
              <button onClick={() => set('cat', x.id)} className={cx(cat === x.id ? 'font-bold' : 'text-ink-2 hover:text-ink')}>{x.name}</button>
              {cat === x.id && (
                <ul className="mt-1.5 ml-3 pl-3 border-l border-line space-y-1">
                  {x.subs.map((s) => <li key={s}><button onClick={() => set('sub', sub === s ? null : s)} className={cx('text-[13px]', sub === s ? 'font-bold' : 'text-mute hover:text-ink')}>{s}</button></li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="font-bold mb-3">가격</div>
        <div className="space-y-2">
          {PRICES.map((pr) => <Checkbox key={pr[2]} checked={price === pr} onChange={() => setPrice(price === pr ? null : pr)} label={pr[2]} />)}
        </div>
      </div>
      <div>
        <div className="font-bold mb-3">혜택 · 배송</div>
        <div className="space-y-2">
          {BENEFITS.map((b) => <Checkbox key={b} checked={tags.includes(b)} onChange={() => setTags(tags.includes(b) ? tags.filter((t) => t !== b) : [...tags, b])} label={b} />)}
        </div>
      </div>
      <Checkbox checked={excludeSoldOut} onChange={setExcludeSoldOut} label="품절 상품 제외" />
    </div>
  );

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-8">
      <div className="text-[12px] text-mute mb-2"><Link to="/" className="hover:text-ink">홈</Link> / {c ? <>{c.name}{sub && ` / ${sub}`}</> : title}</div>
      <div className="flex items-end justify-between border-b border-ink pb-4">
        <h1 className="text-[28px] font-bold tracking-tight">{title}{c && <span className="ml-2 text-sm font-mono text-mute font-normal">{c.en}</span>}</h1>
        <button className="lg:hidden btn btn-line btn-sm" onClick={() => setMobileFilter(true)}><SlidersHorizontal size={14} /> 필터</button>
      </div>

      {c && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-4 border-b border-line">
          <button onClick={() => set('sub', null)} className={cx('h-8 px-3.5 text-[13px] border shrink-0', !sub ? 'bg-ink text-white border-ink' : 'border-line-2')}>전체</button>
          {c.subs.map((s) => <button key={s} onClick={() => set('sub', s)} className={cx('h-8 px-3.5 text-[13px] border shrink-0', sub === s ? 'bg-ink text-white border-ink' : 'border-line-2 hover:border-ink')}>{s}</button>)}
        </div>
      )}

      <div className="flex gap-10 pt-6">
        <aside className="hidden lg:block w-[190px] shrink-0">{Filters}</aside>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="text-[13px] text-ink-2">총 <b className="num text-ink">{list.length}</b>개
              {(price || tags.length > 0) && (
                <span className="ml-3 inline-flex flex-wrap gap-1.5 align-middle">
                  {price && <button onClick={() => setPrice(null)} className="inline-flex items-center gap-1 h-6 px-2 bg-sand text-[12px]">{price[2]}<X size={12} /></button>}
                  {tags.map((t) => <button key={t} onClick={() => setTags(tags.filter((x) => x !== t))} className="inline-flex items-center gap-1 h-6 px-2 bg-sand text-[12px]">{t}<X size={12} /></button>)}
                </span>
              )}
            </div>
            <div className="flex gap-3 text-[13px]">
              {SORTS.map(([k, l]) => (
                <button key={k} onClick={() => set('sort', k)} className={cx(sort === k ? 'font-bold text-ink' : 'text-mute hover:text-ink', 'hidden sm:inline')}>{l}</button>
              ))}
              <select value={sort} onChange={(e) => set('sort', e.target.value)} className="sm:hidden field field-sm w-auto">
                {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </div>
          {list.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
              {list.map((p, i) => <ProductCard key={p.id} p={p} rank={sort === 'rank' && !q ? i + 1 : undefined} />)}
            </div>
          ) : (
            <Empty title="조건에 맞는 상품이 없어요" desc="필터를 줄이거나 다른 검색어를 입력해보세요." action={<Link to="/products" className="btn btn-line btn-sm">전체 상품 보기</Link>} />
          )}
          {list.length > 8 && <Pager total={3} className="mt-14" />}
        </div>
      </div>

      {mobileFilter && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setMobileFilter(false)}>
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-[340px] bg-white p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><b>필터</b><button onClick={() => setMobileFilter(false)}><X size={20} /></button></div>
            {Filters}
            <button className="btn btn-ink w-full mt-8" onClick={() => setMobileFilter(false)}>{list.length}개 상품 보기</button>
          </div>
        </div>
      )}
    </div>
  );
}
