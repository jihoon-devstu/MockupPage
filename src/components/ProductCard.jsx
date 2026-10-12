import { Link } from 'react-router-dom';
import { storeById } from '../data/catalog';
import { comma, cx } from '../lib/format';
import { Price } from './ui';

export default function ProductCard({ p, rank, showStore = true }) {
  const store = storeById[p.storeId];
  const soldOut = p.status === '품절';
  return (
    <div className="group relative">
      <Link to={`/products/${p.id}`} className="block">
        <div className="relative aspect-[4/5] bg-sand overflow-hidden">
          <img src={p.images[0]} alt={p.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          {soldOut && <div className="absolute inset-0 bg-white/55 flex items-center justify-center"><span className="bg-ink text-white text-xs font-bold px-3 py-1.5">일시품절</span></div>}
          {rank && <span className="absolute left-0 top-0 min-w-7 h-7 px-1.5 bg-ink text-white text-[13px] font-bold num flex items-center justify-center">{rank}</span>}
        </div>
        <div className="pt-2.5">
          {showStore && <div className="text-[12px] font-bold text-ink-2 mb-0.5">{store.name}</div>}
          <div className="text-[13px] text-ink-2 leading-snug line-clamp-2 min-h-[2.4em]">{p.name}</div>
          <div className="mt-1"><Price p={p} /></div>
          <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-mute">
            <span className="text-ink">★ {p.rating.toFixed(1)}</span>
            <span className="num">({comma(p.reviews)})</span>
          </div>
          {p.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {p.tags.slice(0, 2).map((t) => (
                <span key={t} className={cx('text-[10.5px] px-1.5 py-0.5 border', t === 'NEW' ? 'border-point text-point' : 'border-line-2 text-ink-2')}>{t}</span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
