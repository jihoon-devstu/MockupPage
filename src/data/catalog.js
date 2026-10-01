import { daysAgo } from '../lib/format';

/* ─────────── 카테고리 & 수수료 정책 ───────────
   commission : 카테고리별 판매수수료 (정산 시 차감)
   PG 결제수수료는 카테고리 무관 2.2% 일괄 (PAYMENT_FEE) */
export const PAYMENT_FEE = 0.022;

export const categories = [
  { id: 'fashion', name: '패션의류', en: 'Apparel', commission: 0.11, subs: ['셔츠', '팬츠', '원피스', '니트', '아우터', '티셔츠'] },
  { id: 'shoes-bags', name: '신발·가방', en: 'Shoes & Bags', commission: 0.11, subs: ['로퍼', '스니커즈', '토트백', '백팩', '크로스백'] },
  { id: 'living', name: '리빙·인테리어', en: 'Living', commission: 0.09, subs: ['식기', '화병', '조명', '침구', '수납', '캔들'] },
  { id: 'food', name: '식품', en: 'Food', commission: 0.07, subs: ['과일', '꿀·잼', '쌀·잡곡', '커피'] },
  { id: 'beauty', name: '뷰티', en: 'Beauty', commission: 0.1, subs: ['스킨케어', '바디·핸드', '립', '선케어'] },
  { id: 'digital', name: '디지털·가전', en: 'Digital', commission: 0.06, subs: ['키보드', '음향', '데스크'] },
];
export const catById = Object.fromEntries(categories.map((c) => [c.id, c]));

/* ─────────── 스토어 (입점 승인 완료) ─────────── */
const cover = (n) => `/images/store/cover-${n}.jpg`;
export const stores = [
  { id: 's1', name: '오롯이 리넨', slug: 'orot-linen', cat: 'fashion', owner: '한지우', bizNo: '214-87-30125', phone: '02-332-1945', email: 'hello@orotlinen.kr', intro: '여름이 아니어도 입고 싶은 리넨. 성수동 작업실에서 직접 패턴을 뜨고 봉제합니다.', since: daysAgo(612), grade: '파워', followers: 18240, color: '#5b6b4a', cover: cover(1), status: '운영중', courier: 'CJ대한통운', shipFee: 3000, freeOver: 50000, dispatch: '평일 14시 이전 결제 시 당일 출고' },
  { id: 's2', name: '무드앤로우', slug: 'mood-and-row', cat: 'fashion', owner: '오세훈', bizNo: '120-88-01942', phone: '070-4412-0098', email: 'cs@moodrow.co', intro: '매일 입는 옷을 더 오래. 두꺼운 원단, 단정한 핏의 베이직 웨어.', since: daysAgo(890), grade: '빅파워', followers: 42110, color: '#2b2b2b', cover: cover(2), status: '운영중', courier: '롯데택배', shipFee: 0, freeOver: 0, dispatch: '결제 후 1~2영업일 출고' },
  { id: 's3', name: '걸음상회', slug: 'georum', cat: 'shoes-bags', owner: '최민재', bizNo: '613-81-55203', phone: '051-742-3321', email: 'georum@georum.kr', intro: '부산 신발 공장 3대째. 오래 걸어도 편한 가죽 신발과 가방.', since: daysAgo(1320), grade: '빅파워', followers: 30560, color: '#7a4b2a', cover: cover(3), status: '운영중', courier: '우체국택배', shipFee: 3000, freeOver: 70000, dispatch: '주문 제작 상품 3~5영업일' },
  { id: 's4', name: '토담공방', slug: 'todam', cat: 'living', owner: '이수아', bizNo: '402-91-11873', phone: '063-281-0904', email: 'todam.pottery@gmail.com', intro: '전주 한옥마을 옆 작은 도자기 공방. 손으로 빚어 하나하나 모양이 다릅니다.', since: daysAgo(455), grade: '파워', followers: 9870, color: '#8c6d4f', cover: cover(4), status: '운영중', courier: 'CJ대한통운', shipFee: 3500, freeOver: 50000, dispatch: '결제 후 2영업일 출고 (파손 대비 3중 포장)' },
  { id: 's5', name: '볕드는집', slug: 'byeot-house', cat: 'living', owner: '정다은', bizNo: '135-26-78410', phone: '031-8017-2201', email: 'house@byeot.kr', intro: '햇볕 잘 드는 방을 위한 조명과 패브릭.', since: daysAgo(301), grade: '새싹', followers: 4120, color: '#c08a2e', cover: cover(5), status: '휴면', courier: '한진택배', shipFee: 3000, freeOver: 40000, dispatch: '평일 13시 이전 결제 시 당일 출고' },
  { id: 's6', name: '산골농부 박씨네', slug: 'park-farm', cat: 'food', owner: '박영철', bizNo: '503-12-90876', phone: '064-733-1004', email: 'parkfarm@naver.com', intro: '제주 서귀포에서 3대째 귤 농사를 짓습니다. 따는 날 바로 보내드려요.', since: daysAgo(980), grade: '빅파워', followers: 51200, color: '#d0701f', cover: cover(6), status: '운영중', courier: '우체국택배', shipFee: 0, freeOver: 0, dispatch: '수확 후 당일 발송 (일요일 휴무)' },
  { id: 's7', name: '로스터리 하루', slug: 'haru-roastery', cat: 'food', owner: '윤하루', bizNo: '220-30-44512', phone: '02-6203-7781', email: 'roast@haru.coffee', intro: '월·목 로스팅, 화·금 발송. 볶은 지 3일 이내 원두만 보냅니다.', since: daysAgo(540), grade: '파워', followers: 12890, color: '#3d2b22', cover: cover(7), status: '운영중', courier: 'CJ대한통운', shipFee: 3000, freeOver: 30000, dispatch: '화·금 발송' },
  { id: 's8', name: '피부정원', slug: 'skin-garden', cat: 'beauty', owner: '강예린', bizNo: '317-87-22091', phone: '02-511-2290', email: 'garden@skingarden.kr', intro: '성분은 줄이고 효과는 그대로. 민감 피부를 위한 저자극 스킨케어.', since: daysAgo(720), grade: '파워', followers: 23400, color: '#6f8f7a', cover: cover(8), status: '운영중', courier: '롯데택배', shipFee: 2500, freeOver: 30000, dispatch: '결제 후 1영업일 출고' },
  { id: 's9', name: '데스크테리어랩', slug: 'deskterior-lab', cat: 'digital', owner: '서준호', bizNo: '144-81-66027', phone: '070-7788-1212', email: 'lab@deskterior.io', intro: '하루 8시간 앉는 책상을 위한 도구들.', since: daysAgo(210), grade: '새싹', followers: 6050, color: '#34495e', cover: cover(9), status: '운영중', courier: 'CJ대한통운', shipFee: 3000, freeOver: 50000, dispatch: '평일 15시 이전 결제 시 당일 출고' },
];
export const storeById = Object.fromEntries(stores.map((s) => [s.id, s]));

/* ─────────── 상품 ───────────
   imgKey 로 /images/p/{key}-{1..3}.jpg 를 갤러리로 사용 */
const P = (o) => ({
  discount: 0,
  status: '판매중',
  options: [],
  tags: [],
  ...o,
  images: [1, 2, 3].map((n) => `/images/p/${o.img || o.id}-${n}.jpg`),
});

const SIZE = { name: '사이즈', values: ['S', 'M', 'L', 'XL'] };
const FREE = { name: '사이즈', values: ['FREE'] };

export const products = [
  // s1 오롯이 리넨
  P({ id: 'p101', storeId: 's1', cat: 'fashion', sub: '셔츠', name: '프렌치 리넨 오버핏 셔츠', price: 89000, discount: 0.15, rating: 4.8, reviews: 1284, sold: 5620, stock: 142, created: daysAgo(160), options: [{ name: '컬러', values: ['오트밀', '화이트', '세이지'] }, SIZE], tags: ['무료배송', '오늘출발'], material: '리넨 100% (프랑스산 원사)', origin: '대한민국' }),
  P({ id: 'p102', storeId: 's1', cat: 'fashion', sub: '팬츠', name: '워싱 리넨 와이드 이지팬츠', price: 69000, discount: 0.1, rating: 4.7, reviews: 860, sold: 3920, stock: 88, created: daysAgo(140), options: [{ name: '컬러', values: ['샌드', '차콜'] }, SIZE], tags: ['오늘출발'], material: '리넨 55% 코튼 45%', origin: '대한민국' }),
  P({ id: 'p103', storeId: 's1', cat: 'fashion', sub: '원피스', name: '리넨 셔링 롱 원피스', price: 119000, discount: 0.2, rating: 4.9, reviews: 412, sold: 1530, stock: 0, status: '품절', created: daysAgo(120), options: [{ name: '컬러', values: ['아이보리', '블랙'] }, FREE], tags: [], material: '리넨 100%', origin: '대한민국' }),
  P({ id: 'p104', storeId: 's1', cat: 'fashion', sub: '니트', name: '코튼 케이블 니트 베스트', price: 59000, rating: 4.6, reviews: 233, sold: 980, stock: 61, created: daysAgo(18), options: [{ name: '컬러', values: ['크림', '그레이'] }, FREE], tags: ['NEW'], material: '코튼 100%', origin: '대한민국' }),
  P({ id: 'p105', storeId: 's1', img: 'p101', cat: 'fashion', sub: '셔츠', name: '리넨 반팔 셔츠 (시즌오프)', price: 59000, discount: 0.4, rating: 4.5, reviews: 141, sold: 702, stock: 12, status: '판매중지', created: daysAgo(300), options: [SIZE], tags: [], material: '리넨 100%', origin: '대한민국' }),

  // s2 무드앤로우
  P({ id: 'p201', storeId: 's2', cat: 'fashion', sub: '티셔츠', name: '330g 헤비웨이트 반팔 티셔츠', price: 32000, discount: 0.1, rating: 4.8, reviews: 5120, sold: 28340, stock: 1200, created: daysAgo(400), options: [{ name: '컬러', values: ['화이트', '블랙', '멜란지', '네이비'] }, SIZE], tags: ['무료배송', '베스트'], material: '코튼 100% (30수 싱글)', origin: '대한민국' }),
  P({ id: 'p202', storeId: 's2', cat: 'fashion', sub: '아우터', name: '울 블렌드 싱글 체스터 코트', price: 289000, discount: 0.25, rating: 4.7, reviews: 640, sold: 1210, stock: 34, created: daysAgo(10), options: [{ name: '컬러', values: ['카멜', '차콜'] }, SIZE], tags: ['무료배송', 'NEW'], material: '울 70% 나일론 30%', origin: '대한민국' }),
  P({ id: 'p203', storeId: 's2', cat: 'fashion', sub: '니트', name: '램스울 크루넥 니트', price: 79000, rating: 4.6, reviews: 1830, sold: 7420, stock: 310, created: daysAgo(35), options: [{ name: '컬러', values: ['오트', '포레스트', '버건디'] }, SIZE], tags: ['무료배송'], material: '램스울 100%', origin: '중국' }),
  P({ id: 'p204', storeId: 's2', cat: 'fashion', sub: '팬츠', name: '셀비지 데님 스트레이트 진', price: 98000, discount: 0.05, rating: 4.5, reviews: 922, sold: 3310, stock: 140, created: daysAgo(200), options: [{ name: '허리', values: ['28', '30', '32', '34'] }], tags: ['무료배송'], material: '코튼 100% 14oz', origin: '대한민국' }),

  // s3 걸음상회
  P({ id: 'p301', storeId: 's3', cat: 'shoes-bags', sub: '로퍼', name: '수제 페니 로퍼', price: 189000, discount: 0.12, rating: 4.9, reviews: 2210, sold: 6400, stock: 75, created: daysAgo(500), options: [{ name: '컬러', values: ['브라운', '블랙'] }, { name: '사이즈', values: ['230', '240', '250', '260', '270', '280'] }], tags: ['주문제작'], material: '소가죽 / 고무창', origin: '대한민국 (부산)' }),
  P({ id: 'p302', storeId: 's3', cat: 'shoes-bags', sub: '스니커즈', name: '캔버스 로우탑 스니커즈', price: 59000, rating: 4.4, reviews: 1460, sold: 9020, stock: 420, created: daysAgo(260), options: [{ name: '컬러', values: ['내추럴', '블랙'] }, { name: '사이즈', values: ['230', '240', '250', '260', '270', '280'] }], tags: [], material: '코튼 캔버스 / 고무창', origin: '대한민국' }),
  P({ id: 'p303', storeId: 's3', cat: 'shoes-bags', sub: '토트백', name: '베지터블 레더 데일리 토트백', price: 168000, discount: 0.1, rating: 4.8, reviews: 780, sold: 1890, stock: 22, created: daysAgo(80), options: [{ name: '컬러', values: ['탄', '다크브라운'] }], tags: ['무료배송'], material: '베지터블 태닝 소가죽', origin: '대한민국' }),
  P({ id: 'p304', storeId: 's3', cat: 'shoes-bags', sub: '백팩', name: '코듀라 나일론 롤탑 백팩', price: 129000, discount: 0.15, rating: 4.6, reviews: 512, sold: 2010, stock: 64, created: daysAgo(90), options: [{ name: '컬러', values: ['블랙', '올리브'] }], tags: ['무료배송'], material: '코듀라 나일론 500D', origin: '베트남' }),
  P({ id: 'p305', storeId: 's3', cat: 'shoes-bags', sub: '크로스백', name: '미니 하프문 크로스백', price: 79000, rating: 4.7, reviews: 340, sold: 1160, stock: 48, created: daysAgo(14), options: [{ name: '컬러', values: ['아이보리', '블랙', '버터'] }], tags: ['NEW'], material: '소가죽', origin: '대한민국' }),

  // s4 토담공방
  P({ id: 'p401', storeId: 's4', cat: 'living', sub: '식기', name: '분청 손잡이 머그 350ml', price: 28000, rating: 4.9, reviews: 1320, sold: 6810, stock: 95, created: daysAgo(380), options: [{ name: '유약', values: ['백토', '재유', '흑유'] }], tags: ['핸드메이드'], material: '분청토 / 무연유약', origin: '대한민국 (전주)' }),
  P({ id: 'p402', storeId: 's4', cat: 'living', sub: '식기', name: '백자 림 접시 3종 세트', price: 54000, discount: 0.1, rating: 4.8, reviews: 610, sold: 2240, stock: 40, created: daysAgo(210), options: [{ name: '구성', values: ['S+M+L', 'M 3장'] }], tags: ['핸드메이드', '무료배송'], material: '백자토', origin: '대한민국 (전주)' }),
  P({ id: 'p403', storeId: 's4', cat: 'living', sub: '화병', name: '물레 성형 미니 화병', price: 36000, rating: 4.7, reviews: 288, sold: 940, stock: 17, created: daysAgo(40), options: [{ name: '형태', values: ['호리병', '원통'] }], tags: ['핸드메이드'], material: '조합토', origin: '대한민국 (전주)' }),
  P({ id: 'p404', storeId: 's4', cat: 'living', sub: '식기', name: '다완 찻잔 2인 세트', price: 64000, discount: 0.08, rating: 4.9, reviews: 174, sold: 520, stock: 9, created: daysAgo(6), options: [], tags: ['NEW', '핸드메이드'], material: '분청토', origin: '대한민국 (전주)' }),

  // s5 볕드는집
  P({ id: 'p501', storeId: 's5', cat: 'living', sub: '조명', name: '오크 베이스 패브릭 테이블 램프', price: 119000, discount: 0.15, rating: 4.7, reviews: 402, sold: 1380, stock: 55, created: daysAgo(150), options: [{ name: '전구', values: ['전구색 2700K', '주백색 4000K'] }], tags: ['무료배송'], material: '오크 원목 / 린넨 갓', origin: '대한민국' }),
  P({ id: 'p502', storeId: 's5', cat: 'living', sub: '침구', name: '스톤워싱 리넨 침구 3종 세트', price: 239000, discount: 0.3, rating: 4.6, reviews: 930, sold: 2480, stock: 70, created: daysAgo(330), options: [{ name: '사이즈', values: ['SS', 'Q', 'K'] }, { name: '컬러', values: ['내추럴', '테라코타', '그레이'] }], tags: ['무료배송', '베스트'], material: '리넨 100%', origin: '리투아니아 원단 / 국내 봉제' }),
  P({ id: 'p503', storeId: 's5', cat: 'living', sub: '수납', name: '핸드위빙 라탄 바스켓', price: 42000, rating: 4.5, reviews: 260, sold: 1100, stock: 130, created: daysAgo(70), options: [{ name: '크기', values: ['S', 'M', 'L'] }], tags: [], material: '라탄', origin: '인도네시아' }),
  P({ id: 'p504', storeId: 's5', cat: 'living', sub: '캔들', name: '소이 왁스 우드윅 캔들 200g', price: 26000, rating: 4.6, reviews: 1540, sold: 8800, stock: 300, created: daysAgo(400), options: [{ name: '향', values: ['무화과 잎', '흰 차', '삼나무'] }], tags: ['선물포장'], material: '소이왁스 / 우드윅', origin: '대한민국' }),

  // s6 산골농부 박씨네
  P({ id: 'p601', storeId: 's6', cat: 'food', sub: '과일', name: '서귀포 노지 햇감귤 5kg', price: 32900, discount: 0.18, rating: 4.8, reviews: 8420, sold: 41200, stock: 900, created: daysAgo(4), options: [{ name: '크기', values: ['로얄과 (S~M)', '대과 (L)', '못난이 (혼합)'] }], tags: ['무료배송', '산지직송', 'NEW'], material: '감귤 (노지 재배)', origin: '제주 서귀포시' }),
  P({ id: 'p602', storeId: 's6', cat: 'food', sub: '꿀·잼', name: '지리산 야생화 꿀 1.2kg', price: 48000, rating: 4.9, reviews: 1290, sold: 3800, stock: 120, created: daysAgo(220), options: [], tags: ['무료배송'], material: '벌꿀 100% (야생화)', origin: '경남 하동군' }),
  P({ id: 'p603', storeId: 's6', cat: 'food', sub: '쌀·잡곡', name: '유기농 현미 4kg (2026년 햅쌀)', price: 29000, discount: 0.1, rating: 4.7, reviews: 640, sold: 2900, stock: 240, created: daysAgo(12), options: [{ name: '도정', values: ['현미', '7분도', '백미'] }], tags: ['무료배송', '산지직송'], material: '유기농 현미 100%', origin: '전남 해남군' }),
  P({ id: 'p604', storeId: 's6', cat: 'food', sub: '꿀·잼', name: '설향 딸기잼 무첨가 300g', price: 14500, rating: 4.6, reviews: 980, sold: 6100, stock: 410, created: daysAgo(180), options: [{ name: '수량', values: ['1병', '2병', '3병'] }], tags: [], material: '딸기 70% 비정제원당 30%', origin: '충남 논산시' }),

  // s7 로스터리 하루
  P({ id: 'p701', storeId: 's7', cat: 'food', sub: '커피', name: '에티오피아 예가체프 G1 원두 200g', price: 18000, rating: 4.9, reviews: 3020, sold: 15400, stock: 500, created: daysAgo(260), options: [{ name: '분쇄', values: ['홀빈', '핸드드립', '에스프레소', '모카포트'] }], tags: ['로스팅 D+3'], material: '아라비카 100%', origin: '에티오피아 / 국내 로스팅' }),
  P({ id: 'p702', storeId: 's7', cat: 'food', sub: '커피', name: '시그니처 블렌드 드립백 20개입', price: 22000, discount: 0.1, rating: 4.7, reviews: 2140, sold: 10900, stock: 380, created: daysAgo(310), options: [{ name: '블렌드', values: ['하루 (산미)', '밤 (고소)'] }], tags: ['선물포장'], material: '아라비카 100%', origin: '국내 로스팅' }),
  P({ id: 'p703', storeId: 's7', cat: 'food', sub: '커피', name: '콜드브루 원액 500ml × 2', price: 26000, rating: 4.6, reviews: 770, sold: 4100, stock: 0, status: '품절', created: daysAgo(100), options: [], tags: ['냉장배송'], material: '커피추출액 100%', origin: '국내 제조' }),
  P({ id: 'p704', storeId: 's7', cat: 'food', sub: '커피', name: '스테인리스 구스넥 드립 케틀 600ml', price: 54000, discount: 0.15, rating: 4.8, reviews: 410, sold: 1500, stock: 60, created: daysAgo(50), options: [{ name: '컬러', values: ['실버', '매트블랙'] }], tags: ['무료배송'], material: 'STS304', origin: '대만' }),

  // s8 피부정원 (휴면 스토어)
  P({ id: 'p801', storeId: 's8', cat: 'beauty', sub: '스킨케어', name: '시카 9 진정 토너 200ml', price: 24000, discount: 0.2, rating: 4.7, reviews: 4410, sold: 22000, stock: 800, created: daysAgo(420), options: [{ name: '구성', values: ['단품', '1+1'] }], tags: ['베스트'], material: '병풀추출물 외', origin: '대한민국' }),
  P({ id: 'p802', storeId: 's8', cat: 'beauty', sub: '스킨케어', name: '세라마이드 장벽 수분크림 50ml', price: 32000, discount: 0.1, rating: 4.8, reviews: 2890, sold: 13100, stock: 600, created: daysAgo(380), options: [], tags: [], material: '세라마이드NP 외', origin: '대한민국' }),
  P({ id: 'p803', storeId: 's8', cat: 'beauty', sub: '바디·핸드', name: '시어버터 핸드크림 50ml 3입', price: 19000, rating: 4.6, reviews: 1320, sold: 9400, stock: 900, created: daysAgo(150), options: [{ name: '향', values: ['무향', '베르가못', '라벤더'] }], tags: ['선물포장'], material: '시어버터 외', origin: '대한민국' }),
  P({ id: 'p804', storeId: 's8', cat: 'beauty', sub: '립', name: '비건 컬러 립밤', price: 12000, rating: 4.4, reviews: 860, sold: 5400, stock: 450, created: daysAgo(60), options: [{ name: '컬러', values: ['클리어', '로즈', '코랄'] }], tags: ['비건'], material: '호호바오일 외', origin: '대한민국' }),
  P({ id: 'p805', storeId: 's8', cat: 'beauty', sub: '선케어', name: '무기자차 데일리 선크림 SPF50+', price: 26000, discount: 0.15, rating: 4.5, reviews: 1900, sold: 11200, stock: 520, created: daysAgo(200), options: [], tags: [], material: '징크옥사이드 외', origin: '대한민국' }),

  // s9 데스크테리어랩
  P({ id: 'p901', storeId: 's9', cat: 'digital', sub: '키보드', name: '저소음 무접점 텐키리스 키보드', price: 219000, discount: 0.08, rating: 4.8, reviews: 690, sold: 1540, stock: 38, created: daysAgo(90), options: [{ name: '키압', values: ['35g', '45g'] }, { name: '배열', values: ['한글', '영문'] }], tags: ['무료배송'], material: 'PBT 키캡 / 정전용량 무접점', origin: '중국 (국내 기획)' }),
  P({ id: 'p902', storeId: 's9', cat: 'digital', sub: '음향', name: '노이즈캔슬링 무선 헤드폰', price: 249000, discount: 0.2, rating: 4.6, reviews: 1120, sold: 2700, stock: 52, created: daysAgo(130), options: [{ name: '컬러', values: ['샌드', '블랙'] }], tags: ['무료배송'], material: '-', origin: '중국' }),
  P({ id: 'p903', storeId: 's9', cat: 'digital', sub: '데스크', name: '월넛 원목 모니터 받침대', price: 89000, rating: 4.7, reviews: 380, sold: 1240, stock: 26, created: daysAgo(30), options: [{ name: '폭', values: ['600mm', '800mm'] }], tags: ['무료배송', 'NEW'], material: '북미산 월넛 원목', origin: '대한민국' }),
  P({ id: 'p904', storeId: 's9', cat: 'digital', sub: '데스크', name: '비건 레더 데스크 매트 900×400', price: 34000, discount: 0.1, rating: 4.5, reviews: 950, sold: 6100, stock: 210, created: daysAgo(240), options: [{ name: '컬러', values: ['토프', '블랙', '올리브'] }], tags: [], material: 'PU 레더 / 스웨이드 백', origin: '중국' }),
];
export const productById = Object.fromEntries(products.map((p) => [p.id, p]));

/** 쇼핑몰에 노출되는 상품: 판매중지 상품 & 휴면/정지 스토어 상품 제외 */
export const visibleProducts = products.filter(
  (p) => p.status !== '판매중지' && storeById[p.storeId].status === '운영중',
);
export const productsOfStore = (sid) => products.filter((p) => p.storeId === sid);
