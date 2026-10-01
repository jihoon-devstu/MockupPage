import { products, productById } from './catalog';
import { users } from './people';
import { seeded, pick, daysAgo } from '../lib/format';

/* 리뷰 정책
   - 구매확정된 주문상품 1건당 1개 작성 가능 (작성 기한: 구매확정 후 30일)
   - 포토리뷰 500P / 텍스트리뷰 100P 적립
   - 신고 3회 이상 누적 시 자동 블라인드 → 관리자 검토 */

const POOL = {
  fashion: [
    ['핏이 진짜 예뻐요', '평소 M 입는데 M 주문했고 어깨가 살짝 내려오는 오버핏이에요. 세탁 한 번 했더니 더 부드러워졌어요. 색은 사진보다 살짝 더 따뜻한 톤입니다.'],
    ['두께감 만족', '얇을 줄 알았는데 생각보다 도톰해서 간절기에 딱이에요. 비침도 거의 없어요.'],
    ['재구매합니다', '작년에 샀던 게 좋아서 다른 색으로 하나 더 샀어요. 봉제가 꼼꼼하고 실밥 하나 없어요.'],
    ['길이가 조금 길어요', '키 160인데 기장이 살짝 길어서 수선했어요. 그 외에는 원단도 좋고 만족합니다.'],
    ['구김은 어쩔 수 없네요', '리넨이라 구김은 각오했는데 그것도 멋이라 생각하면 괜찮아요. 스팀 한 번이면 정리됩니다.'],
    ['배송 빨라요', '오후에 주문했는데 다음날 받았어요. 포장도 깔끔했고 손편지가 들어있어서 기분 좋았어요.'],
    ['사이즈 교환했어요', '생각보다 커서 한 치수 내려서 교환했는데 처리가 빨랐습니다. 사이즈표 꼭 확인하세요.'],
  ],
  'shoes-bags': [
    ['길들이니 편해요', '처음 3일은 뒤꿈치가 조금 아팠는데 지금은 운동화보다 편해요. 가죽 냄새도 좋아요.'],
    ['수납력 최고', '13인치 노트북에 파우치, 텀블러까지 다 들어가요. 어깨끈이 넓어서 무거워도 덜 아파요.'],
    ['정사이즈 추천', '평소 250 신고 250 샀는데 딱 맞아요. 발볼 넓은 편인데도 괜찮습니다.'],
    ['마감이 아쉬워요', '디자인은 마음에 드는데 안쪽 마감 실밥이 하나 튀어나와 있었어요. 문의하니 친절하게 답변 주셨어요.'],
    ['선물용으로 샀어요', '아버지 선물로 드렸는데 너무 좋아하세요. 박스 포장이 고급스러워요.'],
    ['색감 예뻐요', '사진보다 실물이 더 예뻐요. 쓸수록 색이 짙어지는 게 매력입니다.'],
  ],
  living: [
    ['손맛이 느껴져요', '하나하나 모양이 조금씩 달라서 오히려 좋아요. 커피 담아 마시면 기분이 달라요.'],
    ['포장이 정말 꼼꼼', '깨질까봐 걱정했는데 뽁뽁이로 세 겹 싸서 왔어요. 하나도 안 깨졌습니다.'],
    ['분위기 바뀌었어요', '침실에 두었더니 호텔 같아졌어요. 전구색 추천합니다.'],
    ['생각보다 작아요', '사이즈 확인 안 하고 샀더니 생각보다 작네요. 그래도 예뻐서 만족해요.'],
    ['세탁해도 괜찮아요', '세탁기 울코스로 돌렸는데 수축 거의 없고 더 부드러워졌어요.'],
    ['향이 은은해요', '무화과 잎 향 샀는데 진하지 않고 은은하게 퍼져요. 그을음도 없어요.'],
  ],
  food: [
    ['당도 미쳤어요', '하나 까먹고 바로 한 박스 더 주문했어요. 껍질 얇고 새콤달콤 딱 좋아요.'],
    ['산미가 좋아요', '예가체프 특유의 꽃향이 확 올라와요. 로스팅 날짜가 3일 전이라 신선했어요.'],
    ['아이들이 좋아해요', '첨가물 없어서 아이 간식으로 안심하고 먹여요. 너무 달지 않아서 좋아요.'],
    ['몇 개 상했어요', '배송 중에 눌렸는지 2~3개 무른 게 있었어요. 사진 보내드리니 바로 보상해주셨어요.'],
    ['매년 사먹어요', '해마다 이 집에서만 사요. 올해 것도 역시 맛있네요.'],
    ['선물했어요', '부모님 댁으로 보내드렸는데 포장이 정갈해서 선물용으로 좋아요.'],
  ],
  beauty: [
    ['진정 효과 확실', '트러블 올라올 때 화장솜에 적셔서 올려두면 다음날 확실히 가라앉아요.'],
    ['순해요', '민감성인데 따가움 전혀 없어요. 향도 거의 없어서 좋아요.'],
    ['보습은 조금 약해요', '여름엔 딱인데 겨울엔 크림 하나 더 발라야 할 것 같아요.'],
    ['백탁 없어요', '무기자차인데 백탁이 거의 없어서 놀랐어요. 화장 밀림도 없어요.'],
    ['선물용 추천', '3입이라 친구들한테 하나씩 나눠줬어요. 패키지가 예뻐요.'],
  ],
  digital: [
    ['타건감 최고', '35g 샀는데 손가락이 정말 편해요. 사무실에서 써도 소음 민원 없어요.'],
    ['책상이 넓어졌어요', '모니터 받침대 아래 키보드 넣어두니 책상이 훨씬 넓어졌어요. 원목 마감도 좋아요.'],
    ['노캔 성능 괜찮아요', '지하철 소음 거의 안 들려요. 다만 장시간 쓰면 귀가 조금 더워요.'],
    ['가성비 좋음', '이 가격에 이 정도면 충분히 만족합니다. 배송도 빨랐어요.'],
    ['냄새가 조금', '처음 개봉했을 때 가죽 냄새가 좀 났는데 이틀 지나니 없어졌어요.'],
  ],
};

const REPLIES = [
  '소중한 후기 감사합니다. 다음에도 만족하실 수 있도록 더 꼼꼼히 준비하겠습니다.',
  '불편을 드려 죄송합니다. 말씀해주신 부분은 바로 개선하겠습니다. 감사합니다!',
  '예쁘게 입어주셔서 감사해요 :) 세탁은 찬물 단독세탁 추천드려요.',
  '좋게 봐주셔서 감사합니다. 다음 시즌 신상도 기대해주세요!',
];

const rnd = seeded(20261001);
const author = users.filter((u) => u.status !== '이용정지' && u.orders > 0);

export const reviews = [];
let seq = 1;
for (const p of products) {
  const n = 6 + Math.floor(rnd() * 6);
  for (let i = 0; i < n; i++) {
    const [title, body] = pick(rnd, POOL[p.cat]);
    const r = rnd();
    const rating = r < 0.62 ? 5 : r < 0.86 ? 4 : r < 0.94 ? 3 : r < 0.98 ? 2 : 1;
    const opt = p.options.map((o) => pick(rnd, o.values)).join(' / ');
    const hasPhoto = rnd() < 0.42;
    reviews.push({
      id: `r${seq++}`,
      productId: p.id,
      storeId: p.storeId,
      userId: pick(rnd, author).id,
      rating,
      title,
      body,
      option: opt,
      photos: hasPhoto ? [p.images[1 + Math.floor(rnd() * 2)]] : [],
      date: daysAgo(Math.floor(rnd() * 90), Math.floor(rnd() * 20)),
      helpful: Math.floor(rnd() * 40),
      fit: p.cat === 'fashion' || p.cat === 'shoes-bags' ? pick(rnd, ['작아요', '정사이즈', '정사이즈', '정사이즈', '커요']) : null,
      reply: rnd() < 0.45 ? pick(rnd, REPLIES) : null,
      reports: 0,
      blinded: false,
    });
  }
}
reviews.sort((a, b) => b.date - a.date);

// 신고 접수된 리뷰 (관리자 검토 대상)
const reported = [
  { idx: 3, reports: 4, reason: '광고/홍보성 내용', body: '여기보다 ○○몰이 더 싸요 검색해보세요 ㅋㅋ 링크 프로필에 있음' },
  { idx: 11, reports: 3, reason: '욕설/비방', body: '판매자 대응 진짜 최악. 이딴 걸 돈 받고 파냐 ㅡㅡ' },
  { idx: 27, reports: 2, reason: '상품과 무관한 내용', body: '배송기사님이 문 앞에 안 두고 경비실에 두셨네요. 별 하나 뺍니다.' },
  { idx: 40, reports: 5, reason: '개인정보 노출', body: '판매자 번호 010-XXXX-XXXX 로 연락하니 바로 환불 해주네요' },
];
for (const r of reported) {
  Object.assign(reviews[r.idx], { reports: r.reports, reportReason: r.reason, body: r.body, rating: 1, blinded: r.reports >= 3, userId: 'u11' });
}

export const reviewsOf = (pid) => reviews.filter((r) => r.productId === pid && !r.blinded);
export const reviewsOfStore = (sid) => reviews.filter((r) => r.storeId === sid);

export function ratingSummary(list) {
  const dist = [5, 4, 3, 2, 1].map((s) => ({ star: s, count: list.filter((r) => r.rating === s).length }));
  const avg = list.length ? list.reduce((a, r) => a + r.rating, 0) / list.length : 0;
  return { avg, dist, total: list.length };
}

/* ─────────── 상품 Q&A ─────────── */
export const qnas = [
  { id: 'q1', productId: 'p101', userId: 'u4', q: '키 165에 55kg인데 M이랑 L 중 어떤 걸 추천하시나요?', a: 'M 추천드립니다! 오버핏이라 L은 많이 클 수 있어요.', date: daysAgo(1), secret: false },
  { id: 'q2', productId: 'p101', userId: 'u6', q: '세이지 컬러 재입고 언제 되나요?', a: null, date: daysAgo(0, 5), secret: false },
  { id: 'q3', productId: 'p102', userId: 'u10', q: '허리 밴딩인가요? 끈도 있나요?', a: '네, 뒷밴딩 + 내부 스트링 구성입니다.', date: daysAgo(4), secret: false },
  { id: 'q4', productId: 'p101', userId: 'u3', q: '배송지 변경 가능할까요? (비밀글)', a: null, date: daysAgo(0, 2), secret: true },
  { id: 'q5', productId: 'p104', userId: 'u12', q: '세탁기 사용 가능한가요?', a: null, date: daysAgo(0, 7), secret: false },
  { id: 'q6', productId: 'p103', userId: 'u14', q: '아이보리 재입고 알림 신청했는데 언제쯤일까요?', a: '10월 둘째 주 재입고 예정입니다. 알림 드릴게요!', date: daysAgo(6), secret: false },
];

export const productOfReview = (r) => productById[r.productId];
