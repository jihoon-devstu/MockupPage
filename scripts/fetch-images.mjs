// 목업 이미지 수집 스크립트
// Unsplash 공개 검색 엔드포인트에서 키워드별 사진을 찾아 public/images 아래에 저장한다.
// (Unsplash License: 상업/비상업 무료 사용 가능. 실서비스 전환 시 실제 상품 이미지로 교체할 것)
//
// 사용법: npm run fetch:images            (이미 받은 파일은 건너뜀)
//         node scripts/fetch-images.mjs --credits   (CREDITS.txt 만 다시 생성)

import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('public/images');

// [저장 키, 검색어, 장수, 가로, 세로]
const JOBS = [
  // ---- 상품 (id, query) : 3장씩 = 상세 갤러리
  ['p/p101', 'linen shirt flat lay', 3],
  ['p/p102', 'linen trousers', 3],
  ['p/p103', 'linen dress', 3],
  ['p/p104', 'sweater vest fashion', 3],
  ['p/p201', 'white t-shirt minimal', 3],
  ['p/p202', 'wool coat', 3],
  ['p/p203', 'wool sweater folded', 3],
  ['p/p204', 'denim jeans folded', 3],
  ['p/p301', 'leather loafers', 3],
  ['p/p302', 'canvas sneakers', 3],
  ['p/p303', 'leather tote bag', 3],
  ['p/p304', 'backpack minimal', 3],
  ['p/p305', 'crossbody bag', 3],
  ['p/p401', 'ceramic mug handmade', 3],
  ['p/p402', 'ceramic plates', 3],
  ['p/p403', 'ceramic vase', 3],
  ['p/p404', 'tea cup set', 3],
  ['p/p501', 'table lamp', 3],
  ['p/p502', 'linen bedding', 3],
  ['p/p503', 'rattan basket', 3],
  ['p/p504', 'soy candle', 3],
  ['p/p601', 'tangerines', 3],
  ['p/p602', 'honey jar', 3],
  ['p/p603', 'rice grains', 3],
  ['p/p604', 'strawberry jam', 3],
  ['p/p701', 'coffee beans', 3],
  ['p/p702', 'drip coffee', 3],
  ['p/p703', 'cold brew bottle', 3],
  ['p/p704', 'pour over kettle', 3],
  ['p/p801', 'skincare bottle minimal', 3],
  ['p/p802', 'face cream jar', 3],
  ['p/p803', 'hand cream tube', 3],
  ['p/p804', 'lip balm', 3],
  ['p/p805', 'cosmetic tube minimal', 3],
  ['p/p901', 'mechanical keyboard', 3],
  ['p/p902', 'headphones', 3],
  ['p/p903', 'wooden desk setup', 3],
  ['p/p904', 'desk mat', 3],
  // ---- 메인 배너 (가로형)
  ['banner/b1', 'minimal living room interior', 1, 1800, 760],
  ['banner/b2', 'fashion editorial linen', 1, 1800, 760],
  ['banner/b3', 'coffee roastery', 1, 1800, 760],
  ['banner/b4', 'ceramic studio', 1, 1800, 760],
  // ---- 스토어 커버
  ['store/cover', 'small shop storefront', 9, 1400, 500],
  // ---- 사용자 아바타
  ['avatar/u', 'portrait face', 14, 240, 240],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (f) => access(f).then(() => true, () => false);

async function search(query, count) {
  const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=30`;
  let res = await fetch(url);
  for (let t = 1; res.status === 429 && t <= 6; t++) {
    console.log('  rate limited, wait', t * 20, 's');
    await sleep(t * 20000);
    res = await fetch(url);
  }
  if (!res.ok) throw new Error(`search ${query}: ${res.status}`);
  const json = await res.json();
  return json.results
    .filter((r) => !r.premium && !r.urls.raw.includes('plus.unsplash.com'))
    .slice(0, count)
    .map((r) => ({ raw: r.urls.raw, author: r.user?.name, link: r.links?.html }));
}

const credits = [];
const CREDITS_ONLY = process.argv.includes('--credits');

for (const [key, query, count, w = 800, h = 800] of JOBS) {
  const dir = path.join(ROOT, path.dirname(key));
  await mkdir(dir, { recursive: true });
  const base = path.basename(key);
  const first = path.join(dir, `${base}-1.jpg`);
  if (CREDITS_ONLY) {
    const photos = await search(query, count);
    photos.forEach((p, i) => credits.push(`${key}-${i + 1}.jpg | ${p.author} | ${p.link}`));
    console.log('cred', key);
    await sleep(1500);
    continue;
  }
  if (await exists(first)) { console.log('skip', key); continue; }

  const photos = await search(query, count);
  await Promise.all(
    photos.map(async (p, i) => {
      const src = `${p.raw}&w=${w}&h=${h}&fit=crop&crop=entropy&q=72&fm=jpg`;
      const buf = Buffer.from(await (await fetch(src)).arrayBuffer());
      await writeFile(path.join(dir, `${base}-${i + 1}.jpg`), buf);
      credits.push(`${key}-${i + 1}.jpg | ${p.author} | ${p.link}`);
    }),
  );
  console.log('ok  ', key, photos.length);
  await sleep(1500);
}

await writeFile(path.join(ROOT, 'CREDITS.txt'), credits.sort().join('\n') + '\n', { flag: CREDITS_ONLY ? 'w' : 'a' });
console.log('done');
