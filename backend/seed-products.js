require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./db');
const { generateQrToken, buildQrUrl } = require('./utils/qr');

const PRODUCTS = [
  // ── 청년떡집 (store_id=2, owner_id=2) ──
  {
    store_id: 2, owner_id: 2,
    name: '모듬 인절미', name_en: 'Assorted Injeolmi', name_zh: '什锦糯米糕',
    price: 12000,
    description: '국산 찹쌀과 콩고물로 만든 전통 인절미 모듬',
    description_en: 'Traditional injeolmi made with Korean glutinous rice and soybean powder',
    description_zh: '用韩国糯米和豆粉制作的传统糯米糕',
    origin: '대전', origin_en: 'Daejeon', origin_zh: '大田',
    allergy: '대두', allergy_en: 'Soybean', allergy_zh: '大豆',
  },

  // ── 성심당 베이커리 (store_id=5, owner_id=6) ──
  {
    store_id: 5, owner_id: 6,
    name: '튀김소보로', name_en: 'Fried Soboro Bun', name_zh: '炸酥粒面包',
    price: 2500,
    description: '바삭한 소보로 크림빵, 성심당 대표 메뉴',
    description_en: 'Crispy soboro cream bun, signature item of Sungsimdang',
    description_zh: '酥脆奶油面包，圣心堂招牌产品',
    origin: '대전', origin_en: 'Daejeon', origin_zh: '大田',
    allergy: '밀, 우유, 달걀', allergy_en: 'Wheat, Milk, Egg', allergy_zh: '小麦、牛奶、鸡蛋',
  },
  {
    store_id: 5, owner_id: 6,
    name: '판타롱 부추빵', name_en: 'Pantalong Chive Bread', name_zh: '韭菜面包',
    price: 3000,
    description: '대전 명물 부추 크림치즈빵',
    description_en: 'Daejeon specialty chive cream cheese bread',
    description_zh: '大田特产韭菜奶油奶酪面包',
    origin: '대전', origin_en: 'Daejeon', origin_zh: '大田',
    allergy: '밀, 우유, 달걀', allergy_en: 'Wheat, Milk, Egg', allergy_zh: '小麦、牛奶、鸡蛋',
  },

  // ── 대전 한방삼계탕 (store_id=6, owner_id=7) ──
  {
    store_id: 6, owner_id: 7,
    name: '한방삼계탕', name_en: 'Herbal Chicken Soup', name_zh: '汉方参鸡汤',
    price: 18000,
    description: '10가지 한약재로 우려낸 국산 토종닭 삼계탕',
    description_en: 'Korean native chicken soup brewed with 10 medicinal herbs',
    description_zh: '用10种中药材炖制的韩国土鸡参鸡汤',
    origin: '대전', origin_en: 'Daejeon', origin_zh: '大田',
    allergy: '없음', allergy_en: 'None', allergy_zh: '无',
  },
  {
    store_id: 6, owner_id: 7,
    name: '흑삼계탕', name_en: 'Black Ginseng Chicken Soup', name_zh: '黑参鸡汤',
    price: 22000,
    description: '흑삼을 넣어 더욱 진한 풍미의 프리미엄 삼계탕',
    description_en: 'Premium chicken soup with black ginseng for richer flavor',
    description_zh: '加入黑参，风味更浓郁的高级参鸡汤',
    origin: '대전', origin_en: 'Daejeon', origin_zh: '大田',
    allergy: '없음', allergy_en: 'None', allergy_zh: '无',
  },

  // ── 세종 로컬푸드 직판장 (store_id=7, owner_id=8) ──
  {
    store_id: 7, owner_id: 8,
    name: '세종 친환경 쌀 5kg', name_en: 'Sejong Organic Rice 5kg', name_zh: '世宗有机大米5kg',
    price: 25000,
    description: '세종 금강변 청정지역에서 재배한 친환경 인증 쌀',
    description_en: 'Eco-certified rice grown in the clean Sejong Geumgang riverside area',
    description_zh: '在世宗锦江河畔清净地区种植的环保认证大米',
    origin: '세종', origin_en: 'Sejong', origin_zh: '世宗',
    allergy: '없음', allergy_en: 'None', allergy_zh: '无',
  },
  {
    store_id: 7, owner_id: 8,
    name: '제철 꾸러미 채소박스', name_en: 'Seasonal Vegetable Box', name_zh: '时令蔬菜礼盒',
    price: 18000,
    description: '당일 수확 세종 로컬 농가 제철 채소 7~9종 구성',
    description_en: 'Same-day harvest seasonal vegetables (7-9 kinds) from local Sejong farms',
    description_zh: '当日采摘的世宗本地农场时令蔬菜7-9种',
    origin: '세종', origin_en: 'Sejong', origin_zh: '世宗',
    allergy: '없음', allergy_en: 'None', allergy_zh: '无',
  },

  // ── 조치원 떡방앗간 (store_id=8, owner_id=9) ──
  {
    store_id: 8, owner_id: 9,
    name: '조치원 복숭아 찰떡', name_en: 'Jochiwon Peach Glutinous Rice Cake', name_zh: '鸟致院水蜜桃糯米糕',
    price: 9000,
    description: '조치원 특산 복숭아를 넣은 촉촉한 찰떡',
    description_en: 'Moist glutinous rice cake with Jochiwon specialty peach',
    description_zh: '加入鸟致院特产水蜜桃的湿润糯米糕',
    origin: '세종', origin_en: 'Sejong', origin_zh: '世宗',
    allergy: '없음', allergy_en: 'None', allergy_zh: '无',
  },
  {
    store_id: 8, owner_id: 9,
    name: '쑥 개떡', name_en: 'Mugwort Rice Cake', name_zh: '艾草糯米糕',
    price: 7000,
    description: '봄 쑥을 넣어 향긋한 전통 개떡',
    description_en: 'Fragrant traditional rice cake with spring mugwort',
    description_zh: '加入春季艾草的香醇传统米糕',
    origin: '세종', origin_en: 'Sejong', origin_zh: '世宗',
    allergy: '없음', allergy_en: 'None', allergy_zh: '无',
  },

  // ── 천안 호두과자 본점 (store_id=9, owner_id=10) ──
  {
    store_id: 9, owner_id: 10,
    name: '천안 호두과자 30개입', name_en: 'Cheonan Walnut Cookie 30pcs', name_zh: '天安核桃饼30个装',
    price: 10000,
    description: '천안 명물 수제 호두과자, 국산 호두 100% 사용',
    description_en: 'Cheonan specialty handmade walnut cookies with 100% Korean walnuts',
    description_zh: '天安特产手工核桃饼，使用100%韩国核桃',
    origin: '충남', origin_en: 'South Chungcheong', origin_zh: '忠清南道',
    allergy: '밀, 달걀, 호두', allergy_en: 'Wheat, Egg, Walnut', allergy_zh: '小麦、鸡蛋、核桃',
  },
  {
    store_id: 9, owner_id: 10,
    name: '호두 앙금빵', name_en: 'Walnut Red Bean Paste Bun', name_zh: '核桃红豆馅面包',
    price: 2000,
    description: '고소한 호두와 달콤한 팥앙금이 어우러진 빵',
    description_en: 'Bread filled with savory walnut and sweet red bean paste',
    description_zh: '香醇核桃与甜蜜红豆馅完美融合的面包',
    origin: '충남', origin_en: 'South Chungcheong', origin_zh: '忠清南道',
    allergy: '밀, 달걀, 호두', allergy_en: 'Wheat, Egg, Walnut', allergy_zh: '小麦、鸡蛋、核桃',
  },

  // ── 홍성 한우 정육점 (store_id=10, owner_id=11) ──
  {
    store_id: 10, owner_id: 11,
    name: '홍성 한우 등심 300g', name_en: 'Hongseong Hanwoo Sirloin 300g', name_zh: '洪城韩牛西冷300g',
    price: 55000,
    description: '홍성 청정 목장에서 자란 1++ 등급 한우 등심',
    description_en: '1++ grade Hanwoo sirloin from clean Hongseong ranch',
    description_zh: '洪城清净牧场饲养的1++级韩牛西冷',
    origin: '충남', origin_en: 'South Chungcheong', origin_zh: '忠清南道',
    allergy: '없음', allergy_en: 'None', allergy_zh: '无',
  },
  {
    store_id: 10, owner_id: 11,
    name: '한우 불고기용 500g', name_en: 'Hanwoo Bulgogi 500g', name_zh: '韩牛烤肉用500g',
    price: 45000,
    description: '얇게 썬 홍성 한우 불고기용, 마블링 풍부',
    description_en: 'Thinly sliced Hongseong Hanwoo for bulgogi, richly marbled',
    description_zh: '薄切洪城韩牛烤肉用，大理石纹路丰富',
    origin: '충남', origin_en: 'South Chungcheong', origin_zh: '忠清南道',
    allergy: '없음', allergy_en: 'None', allergy_zh: '无',
  },

  // ── 청주 성안길 전통주점 (store_id=11, owner_id=12) ──
  {
    store_id: 11, owner_id: 12,
    name: '청주 막걸리 1.5L', name_en: 'Cheongju Makgeolli 1.5L', name_zh: '清州米酒1.5L',
    price: 8000,
    description: '충북 청주 전통 방식으로 빚은 생 막걸리',
    description_en: 'Fresh makgeolli brewed in traditional Cheongju style',
    description_zh: '以忠北清州传统方式酿制的生米酒',
    origin: '충북', origin_en: 'North Chungcheong', origin_zh: '忠清北道',
    allergy: '없음', allergy_en: 'None', allergy_zh: '无',
  },
  {
    store_id: 11, owner_id: 12,
    name: '오미자 약주 375ml', name_en: 'Omija Berry Wine 375ml', name_zh: '五味子药酒375ml',
    price: 18000,
    description: '속리산 오미자로 담근 충북 전통 약주',
    description_en: 'Traditional Chungbuk herbal wine brewed with Songnisan omija berries',
    description_zh: '用俗离山五味子酿制的忠北传统药酒',
    origin: '충북', origin_en: 'North Chungcheong', origin_zh: '忠清北道',
    allergy: '없음', allergy_en: 'None', allergy_zh: '无',
  },

  // ── 제천 약초 건강원 (store_id=12, owner_id=13) ──
  {
    store_id: 12, owner_id: 13,
    name: '제천 황기 진액 30포', name_en: 'Jecheon Astragalus Extract 30pcs', name_zh: '堤川黄芪浓缩液30包',
    price: 45000,
    description: '제천 의림지 인근에서 재배한 황기로 만든 건강 진액',
    description_en: 'Health extract made from astragalus grown near Jecheon Uirimji',
    description_zh: '用堤川义林池附近种植的黄芪制成的健康浓缩液',
    origin: '충북', origin_en: 'North Chungcheong', origin_zh: '忠清北道',
    allergy: '없음', allergy_en: 'None', allergy_zh: '无',
  },
  {
    store_id: 12, owner_id: 13,
    name: '약초 혼합 차 선물세트', name_en: 'Herbal Tea Gift Set', name_zh: '药草混合茶礼盒',
    price: 32000,
    description: '제천 10대 약초 엄선 혼합 차 10종 구성 선물세트',
    description_en: 'Gift set of 10 teas selected from Jecheon\'s top 10 medicinal herbs',
    description_zh: '精选堤川十大药草混合茶10种礼盒装',
    origin: '충북', origin_en: 'North Chungcheong', origin_zh: '忠清北道',
    allergy: '없음', allergy_en: 'None', allergy_zh: '无',
  },
];

async function seed() {
  console.log('🌱 상품 시드 시작...\n');

  for (const p of PRODUCTS) {
    const createdAt = Date.now();
    const { rows: [{ id: productId }] } = await pool.query(`
      INSERT INTO products
        (store_id, owner_id, name, name_en, name_zh,
         price, description, description_en, description_zh,
         origin, origin_en, origin_zh,
         allergy, allergy_en, allergy_zh,
         image_url,
         ai_promo_text, ai_promo_text_en, ai_promo_text_zh,
         qr_token, qr_expires_at, is_active, created_at)
      VALUES
        ($1,$2,$3,$4,$5,
         $6,$7,$8,$9,
         $10,$11,$12,
         $13,$14,$15,
         '',
         '','','',
         '',$16,1,$17)
      RETURNING id
    `, [
      p.store_id, p.owner_id, p.name, p.name_en, p.name_zh,
      p.price, p.description, p.description_en, p.description_zh,
      p.origin, p.origin_en, p.origin_zh,
      p.allergy, p.allergy_en, p.allergy_zh,
      Date.now() + 30 * 24 * 60 * 60 * 1000, createdAt,
    ]);

    const token = generateQrToken(productId, createdAt);
    await pool.query('UPDATE products SET qr_token=$1 WHERE id=$2', [token, productId]);

    console.log(`✅ [store_id=${p.store_id}] ${p.name} (id=${productId})`);
  }

  console.log(`\n✅ 총 ${PRODUCTS.length}개 상품 생성 완료!`);
  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
