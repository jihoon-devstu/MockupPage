import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { productById } from '../data/catalog';
import { salePrice } from './format';

/* 목업 전용 전역 상태 (새로고침하면 초기화)
   - 장바구니, 찜, 토스트 알림
   실제 개발 시: 장바구니는 서버(회원) / localStorage(비회원) 병행 */
const Ctx = createContext(null);

const INITIAL_CART = [
  { key: 'p402|S+M+L', productId: 'p402', option: 'S+M+L', qty: 1, checked: true },
  { key: 'p702|하루 (산미)', productId: 'p702', option: '하루 (산미)', qty: 2, checked: true },
  { key: 'p303|탄', productId: 'p303', option: '탄', qty: 1, checked: false },
];

export function AppProvider({ children }) {
  const [cart, setCart] = useState(INITIAL_CART);
  const [wish, setWish] = useState(new Set(['p202', 'p403', 'p901', 'p303']));
  const [toastMsg, setToastMsg] = useState(null);

  const toast = useCallback((msg) => {
    setToastMsg({ msg, id: Date.now() });
    setTimeout(() => setToastMsg((t) => (t && Date.now() - t.id >= 2200 ? null : t)), 2300);
  }, []);

  const addToCart = useCallback((productId, option, qty = 1) => {
    setCart((c) => {
      const key = `${productId}|${option}`;
      const hit = c.find((i) => i.key === key);
      if (hit) return c.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i));
      return [...c, { key, productId, option, qty, checked: true }];
    });
  }, []);

  const value = useMemo(() => {
    const lines = cart.map((i) => ({ ...i, product: productById[i.productId], unit: salePrice(productById[i.productId]) }));
    return {
      cart: lines,
      cartCount: cart.length,
      addToCart,
      setQty: (key, qty) => setCart((c) => c.map((i) => (i.key === key ? { ...i, qty: Math.max(1, qty) } : i))),
      toggleLine: (key) => setCart((c) => c.map((i) => (i.key === key ? { ...i, checked: !i.checked } : i))),
      toggleAll: (on) => setCart((c) => c.map((i) => ({ ...i, checked: on }))),
      removeLines: (keys) => setCart((c) => c.filter((i) => !keys.includes(i.key))),
      clearChecked: () => setCart((c) => c.filter((i) => !i.checked)),
      wish,
      toggleWish: (pid) => setWish((w) => { const n = new Set(w); n.has(pid) ? n.delete(pid) : n.add(pid); return n; }),
      toast,
      toastMsg,
    };
  }, [cart, wish, toast, toastMsg, addToCart]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
