import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { categories, products, visibleProducts, stores, storeById, productById } from '../../data/catalog';
import { reviews } from '../../data/reviews';
import { userById } from '../../data/people';
import ProductCard from '../../components/ProductCard';
import { SectionHead, Stars } from '../../components/ui';
import { cx, comma, maskName } from '../../lib/format';

const BANNERS = [
  { img: '/images/banner/b1-1.jpg', kicker: 'LIVING · 10월 기획전', title: '해가 짧아지는 계절,\n방 안을 데우는 물건들', sub: '조명 · 패브릭 · 캔들 최대 30%', to: '/products?cat=living' },
  { img: '/images/banner/b2-1.jpg', kicker: 'STORE PICK · 오롯이 리넨', title: '간절기에도\n리넨을 입는 이유', sub: '성수동 작업실에서 직접 만든 F/W 리넨', to: '/store/s1' },
  { img: '/images/banner/b3-1.jpg', kicker: 'FOOD · 로스터리 하루', title: '볶은 지 3일,\n가장 맛있는 원두만', sub: '월·목 로스팅 / 화·금 발송', to: '/store/s7' },
  { img: '/images/banner/b4-1.jpg', kicker: 'HANDMADE · 토담공방', title: '같은 모양은\n하나도 없습니다', sub: '전주 공방의 손빚음 식기', to: '/store/s4' },
];

function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % BANNERS.length), 5500); return () => clearInterval(t); }, []);
  const b = BANNERS[i];
  return (
    <section className="max-w-[1280px] mx-auto md:px-6 md:pt-6">
      <div className="relative grid md:grid-cols-[1fr_380px] bg-ink text-white">
        <Link to={b.to} className="relative block aspect-[16/10] md:aspect-auto md:h-[460px] overflow-hidden">
          {BANNERS.map((x, k) => (
            <img key={x.img} src={x.img} alt="" className={cx('absolute inset-0 w-full h-full object-cover transition-opacity duration-700', k === i ? 'opacity-100' : 'opacity-0')} />
          ))}
        </Link>
        <div className="p-6 md:p-9 flex flex-col">
          <div className="eyebrow text-white/50">{b.kicker}</div>
          <h1 className="mt-4 text-[28px] md:text-[34px] font-bold leading-[1.25] tracking-tight whitespace-pre-line">{b.title}</h1>
          <p className="mt-4 text-sm text-white/70">{b.sub}</p>
          <Link to={b.to} className="mt-6 md:mt-auto inline-flex items-center gap-2 text-sm font-semibold border-b border-white w-fit pb-1 hover:text-point hover:border-point">보러가기 <ArrowRight size={15} /></Link>
          <div className="mt-8 flex items-center gap-4">
            <span className="num text-sm"><b>{String(i + 1).padStart(2, '0')}</b><span className="text-white/40"> / {String(BANNERS.length).padStart(2, '0')}</span></span>
            <div className="flex-1 flex gap-1">
              {BANNERS.map((_, k) => <button key={k} onClick={() => setI(k)} className={cx('h-[3px] flex-1', k === i ? 'bg-white' : 'bg-white/20')} aria-label={`${k + 1}번 배너`} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [rankCat, setRankCat] = useState('all');
  const ranked = [...visibleProducts]
    .filter((p) => rankCat === 'all' || p.cat === rankCat)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10);
  const fresh = [...visibleProducts].sort((a, b) => b.created - a.created).slice(0, 8);
  const featured = stores[3]; // 토담공방
  const featuredItems = visibleProducts.filter((p) => p.storeId === featured.id).slice(0, 3);
  const photoReviews = reviews.filter((r) => r.photos.length && r.rating >= 4 && !r.blinded && storeById[r.storeId].status === '운영중').slice(0, 10);

  return (
    <div>
      <Hero />

      {/* 카테고리 */}
      <section className="max-w-[1280px] mx-auto px-4 md:px-6 mt-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-t border-l border-line">
          {categories.map((c) => {
            const cover = visibleProducts.find((p) => p.cat === c.id) || products.find((p) => p.cat === c.id);
            return (
              <Link key={c.id} to={`/products?cat=${c.id}`} className="group border-r border-b border-line p-3 md:p-4 flex items-center gap-3 hover:bg-cream">
                <img src={cover.images[0]} alt="" className="w-11 h-11 object-cover shrink-0 grayscale group-hover:grayscale-0 transition" />
                <div className="min-w-0">
                  <div className="text-[13px] md:text-sm font-bold truncate">{c.name}</div>
                  <div className="text-[10.5px] font-mono text-mute truncate">{c.en}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 랭킹 */}
      <section className="max-w-[1280px] mx-auto px-4 md:px-6 mt-16">
        <SectionHead eyebrow="Ranking · 최근 7일 판매량" title="지금 가장 많이 담기는 상품" right={<Link to="/products?sort=rank" className="text-[13px] text-ink-2 flex items-center gap-1 hover:text-ink">전체보기 <ArrowRight size={14} /></Link>} />
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-6">
          {[{ id: 'all', name: '전체' }, ...categories].map((c) => (
            <button key={c.id} onClick={() => setRankCat(c.id)} className={cx('h-9 px-4 text-[13px] border shrink-0', rankCat === c.id ? 'bg-ink text-white border-ink font-semibold' : 'border-line-2 text-ink-2 hover:border-ink')}>{c.name}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-9">
          {ranked.map((p, i) => <ProductCard key={p.id} p={p} rank={i + 1} />)}
        </div>
      </section>

      {/* 이번 주의 가게 */}
      <section className="mt-20 bg-cream">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-14 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
          <div className="relative">
            <img src={featured.cover} alt="" className="w-full aspect-[16/10] object-cover" />
            <div className="absolute left-4 bottom-4 bg-white px-3 py-2 text-[12px]"><span className="font-bold">{featured.name}</span> · 전북 전주 · 입점 {Math.round((Date.now() - featured.since) / 864e5 / 30)}개월</div>
          </div>
          <div>
            <div className="eyebrow">Store of the week</div>
            <h2 className="mt-3 text-[30px] font-bold leading-tight tracking-tight">“흙을 고르는 데만<br />한 달이 걸려요”</h2>
            <p className="mt-4 text-[15px] text-ink-2 leading-relaxed max-w-md">{featured.intro} 이번 주, 토담공방 이수아 작가의 작업실을 찾아가 가마를 여는 날의 이야기를 들었습니다.</p>
            <div className="mt-7 grid grid-cols-3 gap-3">
              {featuredItems.map((p) => (
                <Link key={p.id} to={`/products/${p.id}`} className="group">
                  <img src={p.images[0]} alt="" className="w-full aspect-square object-cover" />
                  <div className="mt-2 text-[12px] text-ink-2 line-clamp-1 group-hover:underline">{p.name}</div>
                  <div className="text-[13px] font-bold num">{comma(p.price)}원</div>
                </Link>
              ))}
            </div>
            <Link to={`/store/${featured.id}`} className="btn btn-ink mt-7">스토어 방문하기 <ArrowUpRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* 신상 */}
      <section className="max-w-[1280px] mx-auto px-4 md:px-6 mt-20">
        <SectionHead eyebrow="New in" title="이번 주 새로 들어온 상품" right={<Link to="/products?sort=new" className="text-[13px] text-ink-2 flex items-center gap-1 hover:text-ink">더보기 <ArrowRight size={14} /></Link>} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-9">
          {fresh.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* 포토 리뷰 */}
      <section className="max-w-[1280px] mx-auto px-4 md:px-6 mt-20">
        <SectionHead eyebrow="Real reviews" title="구매자들이 직접 찍은 사진" />
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          {photoReviews.map((r) => {
            const p = productById[r.productId];
            return (
              <Link to={`/products/${p.id}#reviews`} key={r.id} className="w-[220px] shrink-0 group">
                <img src={r.photos[0]} alt="" className="w-full aspect-square object-cover" />
                <div className="mt-2.5 flex items-center gap-2"><Stars value={r.rating} size={11} /><span className="text-[11px] text-mute">{maskName(userById[r.userId].name)}</span></div>
                <p className="mt-1 text-[13px] leading-snug line-clamp-2 text-ink-2">{r.body}</p>
                <div className="mt-2 flex items-center gap-2 border-t border-line pt-2">
                  <img src={p.images[0]} alt="" className="w-8 h-8 object-cover" />
                  <span className="text-[11.5px] text-mute line-clamp-1 group-hover:text-ink">{p.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 입점 CTA */}
      <section className="max-w-[1280px] mx-auto px-4 md:px-6 mt-20">
        <div className="border border-ink grid md:grid-cols-[1fr_1.4fr]">
          <div className="p-8 md:p-10 bg-ink text-white">
            <div className="eyebrow text-white/50">For sellers</div>
            <h2 className="mt-3 text-[28px] font-bold leading-tight">작은 가게도<br />곳간에선 잘 팔립니다</h2>
            <p className="mt-4 text-sm text-white/70">신규 입점 첫 3개월, 판매수수료 50% 지원</p>
            <Link to="/seller/apply" className="btn btn-point mt-7">입점 신청하기 <ArrowRight size={16} /></Link>
          </div>
          <ol className="grid sm:grid-cols-3">
            {[
              ['01', '입점 신청', '카테고리와 판매 예정 상품, 사업자 서류를 제출합니다.'],
              ['02', '심사 (영업일 3일)', '서류 · 상품 적합성 검토 후 승인/보완 요청을 드립니다.'],
              ['03', '스토어 오픈', '판매자센터에서 상품을 등록하면 바로 판매가 시작됩니다.'],
            ].map(([n, t, d], k) => (
              <li key={n} className={cx('p-7 md:p-8', k && 'border-t sm:border-t-0 sm:border-l border-line')}>
                <div className="num text-point text-sm font-medium">{n}</div>
                <div className="mt-3 font-bold">{t}</div>
                <p className="mt-2 text-[13px] text-ink-2 leading-relaxed">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
