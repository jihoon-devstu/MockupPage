import { daysAgo } from '../lib/format';

/* ─────────── 구매회원 ───────────
   grade: 누적 구매확정 금액 기준 회원등급 (NORMAL < SILVER < GOLD) · 혜택은 표시만, 적립률은 5% 고정 */
export const GRADES = [
  { id: 'NORMAL', label: '일반', min: 0 },
  { id: 'SILVER', label: '실버', min: 300000 },
  { id: 'GOLD', label: '골드', min: 800000 },
];
export const gradeById = Object.fromEntries(GRADES.map((g) => [g.id, g]));
export const nextGrade = (spent) => GRADES.find((g) => g.min > spent) || null;
const av = (n) => `/images/avatar/u-${n}.jpg`;
export const users = [
  { id: 'u1', name: '김서연', nick: '서연이네', email: 'seoyeon.k@example.com', phone: '010-0000-0010', grade: 'GOLD', joined: daysAgo(820), orders: 47, spent: 1842300, point: 30181, status: '정상', avatar: av(1), lastLogin: daysAgo(0, 1) },
  { id: 'u2', name: '이도현', nick: '도현', email: 'dohyun.lee@example.com', phone: '010-0000-0011', grade: 'GOLD', joined: daysAgo(1400), orders: 132, spent: 5320000, point: 48200, status: '정상', avatar: av(2), lastLogin: daysAgo(0, 4) },
  { id: 'u3', name: '박지민', nick: '지민찡', email: 'jimin.p@example.com', phone: '010-0000-0012', grade: 'SILVER', joined: daysAgo(400), orders: 21, spent: 512000, point: 3100, status: '정상', avatar: av(3), lastLogin: daysAgo(2) },
  { id: 'u4', name: '최유나', nick: '유나', email: 'yuna.choi@example.com', phone: '010-0000-0013', grade: 'NORMAL', joined: daysAgo(60), orders: 3, spent: 98000, point: 1200, status: '정상', avatar: av(4), lastLogin: daysAgo(5) },
  { id: 'u5', name: '정하준', nick: '하준아빠', email: 'hajun.dad@example.com', phone: '010-0000-0014', grade: 'GOLD', joined: daysAgo(980), orders: 58, spent: 1210000, point: 8800, status: '정상', avatar: av(5), lastLogin: daysAgo(1) },
  { id: 'u6', name: '윤채원', nick: '채원', email: 'chaewon.y@example.com', phone: '010-0000-0015', grade: 'SILVER', joined: daysAgo(300), orders: 14, spent: 402000, point: 2050, status: '정상', avatar: av(6), lastLogin: daysAgo(3) },
  { id: 'u7', name: '강민호', nick: '민호', email: 'minho.kang@example.com', phone: '010-0000-0016', grade: 'NORMAL', joined: daysAgo(30), orders: 1, spent: 32000, point: 500, status: '정상', avatar: av(7), lastLogin: daysAgo(12) },
  { id: 'u8', name: '조은비', nick: '은비', email: 'eunbi.cho@example.com', phone: '010-0000-0017', grade: 'GOLD', joined: daysAgo(1650), orders: 201, spent: 7710000, point: 61000, status: '정상', avatar: av(8), lastLogin: daysAgo(0, 9) },
  { id: 'u9', name: '임재현', nick: 'jh_lim', email: 'jaehyun.lim@example.com', phone: '010-0000-0018', grade: 'NORMAL', joined: daysAgo(720), orders: 6, spent: 140000, point: 0, status: '정상', avatar: av(9), lastLogin: daysAgo(40) },
  { id: 'u10', name: '한소희', nick: '소소', email: 'sohee.han@example.com', phone: '010-0000-0019', grade: 'SILVER', joined: daysAgo(250), orders: 19, spent: 388000, point: 4100, status: '정상', avatar: av(10), lastLogin: daysAgo(1) },
  { id: 'u11', name: '오준서', nick: '블랙컨슈머아님', email: 'junseo.oh@example.com', phone: '010-0000-0020', grade: 'NORMAL', joined: daysAgo(90), orders: 9, spent: 210000, point: 0, status: '이용정지', avatar: av(11), lastLogin: daysAgo(20), memo: '허위 리뷰 반복 작성 — 30일 이용정지', suspendedUntil: daysAgo(-10) },
  { id: 'u12', name: '서다인', nick: '다인', email: 'dain.seo@example.com', phone: '010-0000-0021', grade: 'GOLD', joined: daysAgo(1100), orders: 66, spent: 1530000, point: 9900, status: '정상', avatar: av(12), lastLogin: daysAgo(0, 2) },
  { id: 'u13', name: '문태양', nick: '태양', email: 'taeyang.m@example.com', phone: '010-0000-0022', grade: 'NORMAL', joined: daysAgo(8), orders: 0, spent: 0, point: 3000, status: '정상', avatar: av(13), lastLogin: daysAgo(0, 20) },
  { id: 'u14', name: '배수빈', nick: '수빈', email: 'subin.bae@example.com', phone: '010-0000-0023', grade: 'SILVER', joined: daysAgo(510), orders: 25, spent: 610000, point: 5200, status: '정상', avatar: av(14), lastLogin: daysAgo(6) },
];
export const userById = Object.fromEntries(users.map((u) => [u.id, u]));
export const ME = users[0];

export const myAddresses = [
  { id: 'a1', label: '집', name: '김서연', phone: '010-0000-0010', zip: '04779', addr: '서울특별시 성동구 왕십리로 115', detail: '헤이그라운드 9층 902호', main: true },
  { id: 'a2', label: '회사', name: '김서연', phone: '010-0000-0010', zip: '06236', addr: '서울특별시 강남구 테헤란로 152', detail: '강남파이낸스센터 21층', main: false },
  { id: 'a3', label: '본가', name: '김영숙', phone: '010-0000-0024', zip: '48058', addr: '부산광역시 해운대구 센텀중앙로 79', detail: '센텀파크 101동 1203호', main: false },
];

/* ─────────── 입점 신청 ───────────
   상태 흐름: 심사대기 → (보완요청) → 승인 / 반려
   승인 시 스토어 생성 + 판매자 권한 부여 (신청자의 다음 로그인부터)
   - id = applicationId(숫자, 경로 · 식별용) · no = 접수번호 AP-{제출 연월 yyMM}-{id 3자리} (표시 전용, store.md)
   - documents: 서류마다 원래 파일명, 보완으로 다시 낸 서류는 이전 제출본(current: false)도 남는다
   - history: 처리 이력 (처리자는 종류만 — 신청자 · 곳간 운영팀 · 자동 처리)
   - sameBizRegNo: 같은 사업자번호로 낸 다른 신청 · 스토어 */
const doc = (documentId, docType, originalName, current = true) => ({ documentId, docType, originalName, current });
const photos = (from, names) => names.map((n, i) => doc(from + i, 'PRODUCT_PHOTO', n));
export const applications = [
  {
    id: 31, no: 'AP-2609-031', storeName: '숲속제과', owner: '노은재', companyName: '숲속제과', cat: 'food', bizType: '개인', bizNo: '000-00-00010', ecomNo: '2026-전북전주-0412',
    phone: '010-0000-0025', email: 'forest.bake@example.com', address: '전북특별자치도 전주시 완산구 홍산로 00, 1층', channel: '오프라인 매장 · 인스타그램',
    account: { bank: '전북은행', number: '000-00-0000-010', holder: '노은재' }, slug: 'forest-bake',
    applied: daysAgo(0, 3), status: '심사대기', expected: '월 500만 ~ 2,000만원',
    products: [{ name: '우리밀 통밀 사워도우', subCategory: '베이커리', price: 9500 }, { name: '무화과 깜빠뉴', subCategory: '베이커리', price: 8000 }, { name: '쑥 스콘 6입', subCategory: '베이커리', price: 15000 }],
    intro: '전주에서 천연발효종으로 빵을 굽습니다. 오프라인 매장 4년 운영, 온라인 첫 입점입니다.',
    documents: [doc(301, 'BUSINESS_REG', '숲속제과_사업자등록증.pdf'), doc(302, 'ECOMMERCE_REG', '통신판매업신고증_숲속제과.pdf'), doc(303, 'BANK_COPY', '전북은행_통장사본.jpg'), ...photos(304, ['sourdough_01.jpg', 'campagne_02.jpg', 'scone_03.jpg'])],
    history: [{ from: null, to: '심사대기', reason: null, at: daysAgo(0, 3), by: '신청자' }],
    sameBizRegNo: { applications: [], stores: [] },
  },
  {
    id: 30, no: 'AP-2609-030', storeName: '실과바늘', owner: '마현정', companyName: '실과바늘 니트', cat: 'fashion', bizType: '개인', bizNo: '000-00-00011', ecomNo: '2025-서울마포-2291',
    phone: '010-0000-0026', email: 'silbanul@example.com', address: '서울특별시 마포구 와우산로 00, 3층', channel: '자사몰 · 인스타그램',
    account: { bank: '국민은행', number: '000000-00-000011', holder: '마현정' }, slug: 'silbanul',
    applied: daysAgo(1, 2), status: '심사대기', expected: '월 500만 ~ 2,000만원',
    products: [{ name: '핸드니팅 모헤어 가디건', subCategory: '니트', price: 168000 }, { name: '울 비니', subCategory: '모자', price: 38000 }, { name: '니트 머플러', subCategory: '머플러', price: 54000 }],
    intro: '모든 니트를 손으로 뜹니다. 인스타그램 팔로워 2.1만, 자사몰 운영 중.',
    documents: [doc(311, 'BUSINESS_REG', '사업자등록증_실과바늘.pdf'), doc(312, 'ECOMMERCE_REG', '통신판매업_신고증.pdf'), doc(313, 'BANK_COPY', '통장사본.png')],
    history: [{ from: null, to: '심사대기', reason: null, at: daysAgo(1, 2), by: '신청자' }],
    sameBizRegNo: { applications: [{ applicationId: 12, applicationNo: 'AP-2607-012', storeName: '실과바늘', status: 'REJECTED' }], stores: [] },
  },
  {
    id: 28, no: 'AP-2609-028', storeName: '소리결 오디오', owner: '황보석', companyName: '(주)소리결', cat: 'digital', bizType: '법인', bizNo: '000-00-00012', ecomNo: '2024-서울강남-1180',
    phone: '02-0000-0027', email: 'biz@sorigyeol-audio.example.com', address: '서울특별시 강남구 논현로 00, 5층', channel: '자사몰',
    account: { bank: '기업은행', number: '000-000000-00-012', holder: '(주)소리결' }, slug: 'sorigyeol-audio',
    applied: daysAgo(3), status: '보완요청', expected: '월 2,000만 ~ 1억원',
    products: [{ name: '진공관 블루투스 앰프', subCategory: '음향', price: 389000 }, { name: '패시브 북쉘프 스피커', subCategory: '음향', price: 459000 }],
    intro: '국내 설계·조립 오디오 브랜드입니다.',
    documents: [doc(321, 'BUSINESS_REG', '(주)소리결_사업자등록증_구.pdf', false), doc(324, 'BUSINESS_REG', '(주)소리결_사업자등록증.pdf'), doc(322, 'ECOMMERCE_REG', '통신판매업신고증.pdf'), doc(323, 'BANK_COPY', '법인통장_사본.pdf'), ...photos(325, ['amp_front.jpg', 'amp_back.jpg', 'speaker_pair.jpg'])],
    note: '사업자등록증 주소가 신청서와 달라요. 최신 등록증으로 다시 제출해 주세요. (2026.09.28)',
    history: [
      { from: null, to: '심사대기', reason: null, at: daysAgo(3, 2), by: '신청자' },
      { from: '심사대기', to: '보완요청', reason: '사업자등록증 주소가 신청서와 달라요. 최신 등록증으로 다시 제출해 주세요.', at: daysAgo(3), by: '곳간 운영팀' },
    ],
    sameBizRegNo: { applications: [], stores: [] },
  },
  {
    id: 25, no: 'AP-2609-025', storeName: '바다내음 수산', owner: '김태식', companyName: '바다내음', cat: 'food', bizType: '개인', bizNo: '000-00-00013', ecomNo: '2026-경남통영-0091',
    phone: '010-0000-0028', email: 'tongyeong.sea@example.com', address: '경상남도 통영시 해송정로 00', channel: '전화 주문 · 밴드',
    account: { bank: '농협은행', number: '000-0000-0000-13', holder: '김태식' }, slug: 'tongyeong-sea',
    applied: daysAgo(6), status: '승인', expected: '월 2,000만 ~ 1억원',
    products: [{ name: '통영 생굴 1kg', subCategory: '수산', price: 19900 }, { name: '반건조 우럭', subCategory: '수산', price: 24000 }, { name: '멸치 선물세트', subCategory: '수산', price: 39000 }],
    intro: '통영 앞바다 직송 수산물.',
    documents: [doc(331, 'BUSINESS_REG', '사업자등록증.pdf'), doc(332, 'ECOMMERCE_REG', '통신판매신고증.pdf'), doc(333, 'BANK_COPY', '농협_통장.jpg'), ...photos(334, ['oyster.jpg', 'rockfish.jpg', 'anchovy_set.jpg'])],
    decided: daysAgo(4),
    history: [
      { from: null, to: '심사대기', reason: null, at: daysAgo(6), by: '신청자' },
      { from: '심사대기', to: '승인', reason: null, at: daysAgo(4), by: '곳간 운영팀' },
    ],
    sameBizRegNo: { applications: [], stores: [] },
  },
  {
    id: 22, no: 'AP-2609-022', storeName: '럭키딜 직구', owner: '이상훈', companyName: '럭키딜', cat: 'beauty', bizType: '개인', bizNo: '000-00-00000', ecomNo: '-',
    phone: '010-0000-0029', email: 'luckydeal@example.com', address: '-', channel: '-',
    account: null, slug: 'luckydeal',
    applied: daysAgo(9), status: '반려', expected: '월 1억원 이상',
    products: [{ name: '해외 명품 화장품 정품 병행수입', subCategory: '스킨케어', price: 59000 }],
    intro: '해외 정품 최저가',
    documents: [doc(341, 'BANK_COPY', 'KakaoTalk_20260922.jpg')],
    decided: daysAgo(8), note: '사업자 정보 확인 불가 — 사업자등록번호 조회 불가',
    history: [
      { from: null, to: '심사대기', reason: null, at: daysAgo(9), by: '신청자' },
      { from: '심사대기', to: '반려', reason: '사업자 정보 확인 불가 — 사업자등록번호 조회 불가', at: daysAgo(8), by: '곳간 운영팀' },
    ],
    sameBizRegNo: { applications: [], stores: [] },
  },
];
