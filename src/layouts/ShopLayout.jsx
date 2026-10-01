import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, User, Menu, X } from 'lucide-react';
import { categories } from '../data/catalog';
import { useApp } from '../lib/store';
import { cx } from '../lib/format';
import { useEffect } from 'react';

export function Wordmark({ dark = false, sub }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={cx('text-[26px] font-black tracking-[-0.06em] leading-none', dark ? 'text-white' : 'text-ink')}>곳간</span>
      <span className={cx('text-[10px] font-mono font-medium tracking-[0.2em]', dark ? 'text-white/50' : 'text-mute')}>{sub || 'GOTGAN'}</span>
    </span>
  );
}

const NAV = [
  { to: '/products?sort=rank', label: '랭킹' },
  { to: '/products?sort=new', label: '신상' },
  { to: '/products?tag=산지직송', label: '산지직송' },
  { to: '/products?tag=핸드메이드', label: '핸드메이드' },
  { to: '/stores', label: '스토어' },
];

export default function ShopLayout() {
  const { cartCount } = useApp();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); setMenu(false); }, [loc.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* 띠배너 */}
      <div className="bg-ink text-white text-[12px] h-8 overflow-hidden flex items-center">
        <div className="marquee flex whitespace-nowrap gap-12 pl-12">
          {[0, 1].map((k) => (
            <span key={k} className="flex gap-12">
              <span>지금 가입하면 3,000P 즉시 지급</span><span className="text-point">●</span>
              <span>서귀포 노지 햇감귤 첫 수확 — 산지직송</span><span className="text-point">●</span>
              <span>10월 리빙 기획전 · 최대 30% 할인</span><span className="text-point">●</span>
              <span>작은 가게 사장님, 곳간에 입점하세요 → 수수료 첫 3개월 50%</span><span className="text-point">●</span>
            </span>
          ))}
        </div>
      </div>

      {/* 유틸 바 */}
      <div className="hidden md:block border-b border-line">
        <div className="max-w-[1280px] mx-auto px-6 h-9 flex items-center justify-end gap-5 text-[12px] text-ink-2">
          <Link to="/login" className="hover:text-ink">로그인</Link>
          <Link to="/signup" className="hover:text-ink">회원가입</Link>
          <Link to="/mypage/orders" className="hover:text-ink">주문조회</Link>
          <Link to="/help" className="hover:text-ink">고객센터</Link>
          <span className="w-px h-3 bg-line-2" />
          <Link to="/seller/apply" className="font-semibold text-ink hover:text-point">입점 신청</Link>
          <Link to="/seller" className="hover:text-ink">판매자센터</Link>
        </div>
      </div>

      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-line">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 h-16 flex items-center gap-4 md:gap-10">
          <button className="md:hidden -ml-1 p-1" onClick={() => setMenu(true)} aria-label="메뉴"><Menu size={22} strokeWidth={1.6} /></button>
          <Link to="/"><Wordmark /></Link>
          <nav className="hidden md:flex items-center gap-6 text-[15px] font-semibold">
            <div className="relative group">
              <button className="h-16 flex items-center gap-1.5"><Menu size={17} strokeWidth={1.8} />카테고리</button>
              <div className="absolute left-0 top-full hidden group-hover:block bg-white border border-line shadow-[0_12px_30px_-12px_rgba(0,0,0,.18)] w-[560px] p-6">
                <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                  {categories.map((c) => (
                    <div key={c.id}>
                      <Link to={`/products?cat=${c.id}`} className="text-sm font-bold hover:text-point">{c.name}</Link>
                      <ul className="mt-2 space-y-1">
                        {c.subs.map((s) => <li key={s}><Link to={`/products?cat=${c.id}&sub=${s}`} className="text-[13px] font-normal text-ink-2 hover:underline">{s}</Link></li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {NAV.map((n) => (
              <NavLink key={n.label} to={n.to} className="hover:text-point">{n.label}</NavLink>
            ))}
          </nav>
          <form className="ml-auto hidden sm:flex items-center border-b-2 border-ink w-full max-w-[300px]" onSubmit={(e) => { e.preventDefault(); nav(`/products?q=${encodeURIComponent(q)}`); }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="리넨 셔츠, 햇감귤, 머그컵" className="flex-1 h-9 text-sm outline-none bg-transparent placeholder:text-mute" />
            <button aria-label="검색"><Search size={19} strokeWidth={1.8} /></button>
          </form>
          <div className="ml-auto sm:ml-0 flex items-center gap-3">
            <Link to="/products?q=" className="sm:hidden" aria-label="검색"><Search size={22} strokeWidth={1.6} /></Link>
            <Link to="/mypage" aria-label="마이페이지"><User size={22} strokeWidth={1.6} /></Link>
            <Link to="/cart" className="relative" aria-label="장바구니">
              <ShoppingBag size={22} strokeWidth={1.6} />
              {cartCount > 0 && <span className="absolute -right-1.5 -top-1 min-w-4 h-4 px-1 bg-point text-white text-[10px] font-bold flex items-center justify-center rounded-full num">{cartCount}</span>}
            </Link>
          </div>
        </div>
      </header>

      {/* 모바일 메뉴 */}
      {menu && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setMenu(false)}>
          <div className="w-[82%] max-w-[340px] h-full bg-white p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><Wordmark /><button onClick={() => setMenu(false)}><X size={22} /></button></div>
            <div className="grid grid-cols-2 gap-2 mb-6">
              <Link to="/login" className="btn btn-line btn-sm">로그인</Link>
              <Link to="/seller/apply" className="btn btn-ink btn-sm">입점 신청</Link>
            </div>
            {categories.map((c) => (
              <Link key={c.id} to={`/products?cat=${c.id}`} className="flex justify-between py-3 border-b border-line text-[15px] font-semibold">{c.name}<span className="text-mute text-xs font-mono">{c.en}</span></Link>
            ))}
            <div className="mt-5 space-y-3 text-sm">
              {NAV.map((n) => <Link key={n.label} to={n.to} className="block">{n.label}</Link>)}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1"><Outlet /></main>

      <footer className="mt-24 border-t border-ink bg-white">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-12 grid gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-4 text-[13px] text-ink-2 leading-relaxed">작은 가게들의 큰 장터.<br />동네 공방, 산지 농부, 1인 브랜드가 모여 있습니다.</p>
            <div className="mt-5 text-[22px] font-bold num">1588-0000</div>
            <p className="text-xs text-mute mt-1">평일 10:00 – 17:00 (점심 12:00 – 13:00)</p>
          </div>
          {[
            ['쇼핑', ['카테고리', '랭킹', '신상', '스토어 둘러보기']],
            ['고객지원', ['공지사항', '자주 묻는 질문', '1:1 문의', '배송·반품 안내']],
            ['판매자', ['입점 신청', '판매자센터', '수수료 안내', '판매자 이용약관']],
          ].map(([t, items]) => (
            <div key={t}>
              <div className="eyebrow text-ink mb-3">{t}</div>
              <ul className="space-y-2 text-[13px] text-ink-2">{items.map((i) => <li key={i}><a className="hover:underline cursor-pointer">{i}</a></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="border-t border-line">
          <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6 text-[11.5px] text-mute leading-relaxed">
            <p>(주)곳간 · 대표 홍길동 · 사업자등록번호 000-00-00000 · 통신판매업신고 2026-서울성동-0000 · 서울특별시 성동구 성수이로 00, 0층</p>
            <p className="mt-1">곳간은 통신판매중개자로서 통신판매의 당사자가 아니며, 입점 판매자가 등록한 상품정보 및 거래에 대한 책임은 각 판매자에게 있습니다.</p>
            <p className="mt-3 text-ink-2">※ 본 사이트는 팀 프로젝트용 목업이며 실제 거래가 이루어지지 않습니다. 이미지 출처: Unsplash</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
