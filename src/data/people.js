import { daysAgo } from '../lib/format';

/* ─────────── 구매회원 ───────────
   grade: 최근 6개월 구매금액 기준 등급 (일반 < 실버 30만 < 골드 80만 < VIP 200만) */
const av = (n) => `/images/avatar/u-${n}.jpg`;
export const users = [
  { id: 'u1', name: '김서연', nick: '서연이네', email: 'seoyeon.k@example.com', phone: '010-2384-5512', grade: '골드', joined: daysAgo(820), orders: 47, spent: 1842300, point: 12450, status: '정상', avatar: av(1), lastLogin: daysAgo(0, 1) },
  { id: 'u2', name: '이도현', nick: '도현', email: 'dohyun.lee@example.com', phone: '010-9921-0034', grade: 'VIP', joined: daysAgo(1400), orders: 132, spent: 5320000, point: 48200, status: '정상', avatar: av(2), lastLogin: daysAgo(0, 4) },
  { id: 'u3', name: '박지민', nick: '지민찡', email: 'jimin.p@example.com', phone: '010-4410-7782', grade: '실버', joined: daysAgo(400), orders: 21, spent: 512000, point: 3100, status: '정상', avatar: av(3), lastLogin: daysAgo(2) },
  { id: 'u4', name: '최유나', nick: '유나', email: 'yuna.choi@example.com', phone: '010-3002-1188', grade: '일반', joined: daysAgo(60), orders: 3, spent: 98000, point: 1200, status: '정상', avatar: av(4), lastLogin: daysAgo(5) },
  { id: 'u5', name: '정하준', nick: '하준아빠', email: 'hajun.dad@example.com', phone: '010-7710-2290', grade: '골드', joined: daysAgo(980), orders: 58, spent: 1210000, point: 8800, status: '정상', avatar: av(5), lastLogin: daysAgo(1) },
  { id: 'u6', name: '윤채원', nick: '채원', email: 'chaewon.y@example.com', phone: '010-5531-6620', grade: '실버', joined: daysAgo(300), orders: 14, spent: 402000, point: 2050, status: '정상', avatar: av(6), lastLogin: daysAgo(3) },
  { id: 'u7', name: '강민호', nick: '민호', email: 'minho.kang@example.com', phone: '010-8812-3301', grade: '일반', joined: daysAgo(30), orders: 1, spent: 32000, point: 500, status: '정상', avatar: av(7), lastLogin: daysAgo(12) },
  { id: 'u8', name: '조은비', nick: '은비', email: 'eunbi.cho@example.com', phone: '010-2219-4471', grade: 'VIP', joined: daysAgo(1650), orders: 201, spent: 7710000, point: 61000, status: '정상', avatar: av(8), lastLogin: daysAgo(0, 9) },
  { id: 'u9', name: '임재현', nick: 'jh_lim', email: 'jaehyun.lim@example.com', phone: '010-6640-9902', grade: '일반', joined: daysAgo(720), orders: 6, spent: 140000, point: 0, status: '휴면', avatar: av(9), lastLogin: daysAgo(390) },
  { id: 'u10', name: '한소희', nick: '소소', email: 'sohee.han@example.com', phone: '010-1180-2271', grade: '실버', joined: daysAgo(250), orders: 19, spent: 388000, point: 4100, status: '정상', avatar: av(10), lastLogin: daysAgo(1) },
  { id: 'u11', name: '오준서', nick: '블랙컨슈머아님', email: 'junseo.oh@example.com', phone: '010-9031-5512', grade: '일반', joined: daysAgo(90), orders: 9, spent: 210000, point: 0, status: '이용정지', avatar: av(11), lastLogin: daysAgo(20), memo: '허위 리뷰 반복 작성 (신고 4건) — 30일 이용정지' },
  { id: 'u12', name: '서다인', nick: '다인', email: 'dain.seo@example.com', phone: '010-4402-8813', grade: '골드', joined: daysAgo(1100), orders: 66, spent: 1530000, point: 9900, status: '정상', avatar: av(12), lastLogin: daysAgo(0, 2) },
  { id: 'u13', name: '문태양', nick: '태양', email: 'taeyang.m@example.com', phone: '010-7720-1039', grade: '일반', joined: daysAgo(8), orders: 0, spent: 0, point: 3000, status: '정상', avatar: av(13), lastLogin: daysAgo(0, 20) },
  { id: 'u14', name: '배수빈', nick: '수빈', email: 'subin.bae@example.com', phone: '010-3391-0098', grade: '실버', joined: daysAgo(510), orders: 25, spent: 610000, point: 5200, status: '정상', avatar: av(14), lastLogin: daysAgo(6) },
];
export const userById = Object.fromEntries(users.map((u) => [u.id, u]));
export const ME = users[0];

export const myAddresses = [
  { id: 'a1', label: '집', name: '김서연', phone: '010-2384-5512', zip: '04779', addr: '서울특별시 성동구 왕십리로 115', detail: '헤이그라운드 9층 902호', main: true },
  { id: 'a2', label: '회사', name: '김서연', phone: '010-2384-5512', zip: '06236', addr: '서울특별시 강남구 테헤란로 152', detail: '강남파이낸스센터 21층', main: false },
  { id: 'a3', label: '본가', name: '김영숙', phone: '010-5521-0087', zip: '48058', addr: '부산광역시 해운대구 센텀중앙로 79', detail: '센텀파크 101동 1203호', main: false },
];

export const myCoupons = [
  { id: 'c1', name: '가을맞이 리빙 10% 할인', cond: '리빙·인테리어 3만원 이상', rate: 0.1, max: 10000, until: '2026.10.15' },
  { id: 'c2', name: '골드 등급 감사 쿠폰', cond: '전 상품 5만원 이상', amount: 5000, until: '2026.10.31' },
  { id: 'c3', name: '첫 리뷰 작성 감사 쿠폰', cond: '전 상품 2만원 이상', amount: 2000, until: '2026.11.30' },
];

/* ─────────── 입점 신청 ───────────
   상태 흐름: 심사대기 → (보완요청) → 승인 / 반려
   승인 시 스토어 생성 + 판매자 계정 활성화 */
export const applications = [
  { id: 'AP-2609-031', storeName: '숲속제과', owner: '노은재', cat: 'food', bizType: '개인', bizNo: '418-22-71830', ecomNo: '2026-전북전주-0412', phone: '010-4431-2290', email: 'forest.bake@example.com', applied: daysAgo(0, 3), status: '심사대기', expected: '월 800만원', products: ['우리밀 통밀 사워도우', '무화과 깜빠뉴', '쑥 스콘 6입'], intro: '전주에서 천연발효종으로 빵을 굽습니다. 오프라인 매장 4년 운영, 온라인 첫 입점입니다.', docs: { biz: true, ecom: true, bank: true, sample: true } },
  { id: 'AP-2609-030', storeName: '실과바늘', owner: '마현정', cat: 'fashion', bizType: '개인', bizNo: '107-19-55201', ecomNo: '2025-서울마포-2291', phone: '010-2201-8873', email: 'silbanul@example.com', applied: daysAgo(1, 2), status: '심사대기', expected: '월 1,200만원', products: ['핸드니팅 모헤어 가디건', '울 비니', '니트 머플러'], intro: '모든 니트를 손으로 뜹니다. 인스타그램 팔로워 2.1만, 자사몰 운영 중.', docs: { biz: true, ecom: true, bank: true, sample: false } },
  { id: 'AP-2609-028', storeName: '모노클 오디오', owner: '황보석', cat: 'digital', bizType: '법인', bizNo: '220-87-90012', ecomNo: '2024-서울강남-1180', phone: '02-555-0193', email: 'biz@monocle-audio.example', applied: daysAgo(3), status: '보완요청', expected: '월 5,000만원', products: ['진공관 블루투스 앰프', '패시브 북쉘프 스피커'], intro: '국내 설계·조립 오디오 브랜드. 전파인증(KC) 서류 준비 중.', docs: { biz: true, ecom: true, bank: true, sample: true }, note: 'KC 전파인증서 사본 미제출 → 보완 요청 (2026.09.28)' },
  { id: 'AP-2609-025', storeName: '바다내음 수산', owner: '김태식', cat: 'food', bizType: '개인', bizNo: '609-11-22045', ecomNo: '2026-경남통영-0091', phone: '010-9030-1144', email: 'tongyeong.sea@example.com', applied: daysAgo(6), status: '승인', expected: '월 3,000만원', products: ['통영 생굴 1kg', '반건조 우럭', '멸치 선물세트'], intro: '통영 앞바다 직송 수산물.', docs: { biz: true, ecom: true, bank: true, sample: true }, decided: daysAgo(4) },
  { id: 'AP-2609-022', storeName: '럭키딜 직구', owner: '이상훈', cat: 'beauty', bizType: '개인', bizNo: '000-00-00000', ecomNo: '-', phone: '010-0000-1111', email: 'luckydeal@example.com', applied: daysAgo(9), status: '반려', expected: '월 1억', products: ['해외 명품 화장품 정품 병행수입'], intro: '해외 정품 최저가', docs: { biz: false, ecom: false, bank: true, sample: false }, decided: daysAgo(8), note: '사업자등록번호 조회 불가, 정품 증빙 불가 → 반려' },
];
