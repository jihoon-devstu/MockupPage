export const won = (n) => `${Math.round(n).toLocaleString('ko-KR')}원`;
export const comma = (n) => Math.round(n).toLocaleString('ko-KR');
export const pct = (r, d = 0) => `${(r * 100).toFixed(d)}%`;

/** 1억 이상은 '억', 1만 이상은 '만' 단위로 줄여 표기 */
export const shortWon = (n) => {
  if (n >= 1e8) return `${(n / 1e8).toFixed(n >= 1e9 ? 0 : 1)}억`;
  if (n >= 1e4) return `${comma(n / 1e4)}만`;
  return comma(n);
};

export const salePrice = (p) => Math.round((p.price * (1 - (p.discount || 0))) / 10) * 10;

export const maskName = (name) => (name.length <= 2 ? name[0] + '*' : name[0] + '*'.repeat(name.length - 2) + name.at(-1));

// 결정적 난수 (데이터가 새로고침마다 바뀌지 않도록)
export function seeded(seed = 1) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

// 날짜: 목업 기준일은 2026-10-01
export const TODAY = new Date('2026-10-01T10:00:00+09:00');
export const daysAgo = (d, h = 0) => new Date(TODAY.getTime() - d * 864e5 - h * 36e5);
const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
export const ymdhm = (d) => `${ymd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const md = (d) => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;

export const cx = (...a) => a.filter(Boolean).join(' ');
