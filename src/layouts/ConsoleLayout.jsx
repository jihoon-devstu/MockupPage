import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, Menu, X, ExternalLink, ChevronDown } from 'lucide-react';
import { Wordmark } from './ShopLayout';
import { cx } from '../lib/format';

/**
 * 판매자센터 / 관리자 공용 콘솔 레이아웃
 * - 상단: 먹색 바 (콘솔 이름 + 알림 + 계정)
 * - 좌측: 그룹형 메뉴 (네이버 스마트스토어센터 / Shopify Admin 구성 참고)
 */
export default function ConsoleLayout({ kind, groups, account, badge, notices = [] }) {
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); setBell(false); window.scrollTo(0, 0); }, [loc.pathname]);

  const Side = (
    <nav className="py-4 text-[14px]">
      {groups.map((g) => (
        <div key={g.title} className="mb-4">
          <div className="px-5 mb-1 text-[11px] font-semibold tracking-[0.12em] text-mute uppercase">{g.title}</div>
          {g.items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end}
              className={({ isActive }) => cx('flex items-center gap-2.5 mx-2 px-3 h-9', isActive ? 'bg-ink text-white font-semibold' : 'text-ink-2 hover:bg-sand')}>
              <it.icon size={16} strokeWidth={1.7} />
              <span className="flex-1">{it.label}</span>
              {it.count ? <span className="min-w-5 h-5 px-1.5 text-[11px] font-bold bg-point text-white flex items-center justify-center num">{it.count}</span> : null}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-work">
      <header className="sticky top-0 z-40 h-14 bg-ink text-white flex items-center px-4 gap-4">
        <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="메뉴"><Menu size={22} strokeWidth={1.6} /></button>
        <Link to={kind === 'seller' ? '/seller' : '/admin'} className="flex items-center gap-3">
          <Wordmark dark sub={kind === 'seller' ? 'SELLER' : 'ADMIN'} />
        </Link>
        <span className={cx('hidden sm:inline text-[11px] font-bold px-2 py-0.5', kind === 'seller' ? 'bg-[#c9f26b] text-ink' : 'bg-point text-white')}>{badge}</span>
        <div className="ml-auto flex items-center gap-4 text-[13px]">
          <Link to="/" className="hidden md:flex items-center gap-1 text-white/70 hover:text-white">쇼핑몰 보기 <ExternalLink size={13} /></Link>
          <div className="relative">
            <button onClick={() => setBell(!bell)} className="relative p-1" aria-label="알림">
              <Bell size={19} strokeWidth={1.6} />
              {notices.length > 0 && <span className="absolute right-0.5 top-0.5 w-2 h-2 rounded-full bg-point" />}
            </button>
            {bell && (
              <div className="absolute right-0 top-10 w-80 bg-white text-ink border border-line shadow-xl">
                <div className="px-4 h-11 flex items-center border-b border-line font-bold text-sm">알림 <span className="ml-1.5 text-point num">{notices.length}</span></div>
                {notices.map((n, i) => (
                  <Link key={i} to={n.to} className="block px-4 py-3 border-b border-line hover:bg-cream">
                    <div className="text-[13px] leading-snug">{n.text}</div>
                    <div className="text-[11px] text-mute mt-1">{n.time}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <img src={account.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
            <div className="hidden sm:block leading-tight">
              <div className="text-[13px] font-semibold">{account.name}</div>
              <div className="text-[11px] text-white/55">{account.role}</div>
            </div>
            <ChevronDown size={14} className="text-white/50" />
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:block w-[228px] shrink-0 bg-white border-r border-line sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">{Side}</aside>
        {open && (
          <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
            <aside className="w-[260px] h-full bg-white overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="h-14 flex items-center justify-between px-5 border-b border-line"><Wordmark sub={kind === 'seller' ? 'SELLER' : 'ADMIN'} /><button onClick={() => setOpen(false)}><X size={20} /></button></div>
              {Side}
            </aside>
          </div>
        )}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1440px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
