/**
 * patch-images-promo.js
 * 이미지 URL 또는 AI 홍보 문구가 없는 상품들을 일괄 업데이트합니다.
 * 실행: node backend/patch-images-promo.js
 */
require('dotenv').config();
const pool = require('./db');
const { generatePromoTextAI, generatePromoTextAIEn, generatePromoTextAIZh } = require('./utils/promo');

// ── 상품명 키워드 → Unsplash 이미지 매핑 ───────────────────────────
const IMAGE_MAP = [
  { keywords: ['족발', '보쌈'], url: 'https://images.unsplash.com/photo-1583224994559-170e8f04af22?w=600' },
  { keywords: ['돼지', '삼겹', '구이'], url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600' },
  { keywords: ['갈치', '생선', '수산', '고등어', '조기', '민어'], url: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=600' },
  { keywords: ['굴', '새우', '해산물', '낙지', '오징어', '게'], url: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600' },
  { keywords: ['인삼', '홍삼'], url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600' },
  { keywords: ['막걸리', '동동주', '전통주'], url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600' },
  { keywords: ['식혜', '수정과', '전통음료'], url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600' },
  { keywords: ['빵', '소보로', '베이커리', '케이크', '도넛'], url: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=600' },
  { keywords: ['떡', '찹쌀', '송편', '인절미'], url: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=600' },
  { keywords: ['두부', '순두부', '콩'], url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600' },
  { keywords: ['김치', '깍두기', '나물', '반찬'], url: 'https://images.unsplash.com/photo-1583224994559-170e8f04af22?w=600' },
  { keywords: ['사과', '배', '감', '과일'], url: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=600' },
  { keywords: ['딸기', '포도', '복숭아'], url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600' },
  { keywords: ['채소', '야채', '시금치', '브로콜리', '당근'], url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600' },
  { keywords: ['고구마', '감자', '버섯'], url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600' },
  { keywords: ['꿀', '벌꿀'], url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600' },
  { keywords: ['된장', '고추장', '간장', '장류'], url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600' },
  { keywords: ['한우', '소고기', '육우'], url: 'https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?w=600' },
  { keywords: ['닭', '오리', '계란'], url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c4?w=600' },
  { keywords: ['곶감', '건과일', '건조'], url: 'https://images.unsplash.com/photo-1601469037574-a08e4d8975c8?w=600' },
];

// 기본 이미지 (매핑 없는 경우)
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1506802913710-b8c2d33cc733?w=600';

function pickImageUrl(name) {
  const lower = name.toLowerCase();
  for (const entry of IMAGE_MAP) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.url;
    }
  }
  return DEFAULT_IMAGE;
}

async function main() {
  console.log('🔍 이미지/홍보문구 없는 상품 조회 중...');

  const { rows: products } = await pool.query(`
    SELECT p.*, s.region as store_region
    FROM products p
    JOIN stores s ON p.store_id = s.id
    WHERE p.is_active = 1
      AND (p.image_url IS NULL OR p.image_url = ''
           OR p.ai_promo_text IS NULL OR p.ai_promo_text = ''
           OR p.ai_promo_text_en IS NULL OR p.ai_promo_text_en = ''
           OR p.ai_promo_text_zh IS NULL OR p.ai_promo_text_zh = '')
    ORDER BY p.id
  `);

  if (products.length === 0) {
    console.log('✅ 모든 상품에 이미지와 홍보문구가 있습니다!');
    await pool.end();
    return;
  }

  console.log(`📦 ${products.length}개 상품 업데이트 시작...\n`);

  for (const p of products) {
    const name = p.name;
    const region = p.store_region || p.region || '대전';

    console.log(`🛍️  [${p.id}] ${name} (${region})`);

    // 이미지 URL 결정
    const imageUrl = (p.image_url && p.image_url.trim()) ? p.image_url : pickImageUrl(name);
    if (!p.image_url || !p.image_url.trim()) {
      console.log(`   📷 이미지: ${imageUrl}`);
    }

    // AI 홍보문구 생성 (없는 것만)
    let promoKo = p.ai_promo_text;
    let promoEn = p.ai_promo_text_en;
    let promoZh = p.ai_promo_text_zh;

    const needsPromo = !promoKo || !promoKo.trim() || !promoEn || !promoEn.trim() || !promoZh || !promoZh.trim();

    if (needsPromo) {
      console.log(`   🤖 Gemini AI 홍보문구 생성 중...`);
      try {
        const [ko, en, zh] = await Promise.all([
          (!promoKo || !promoKo.trim())
            ? generatePromoTextAI({ name, region, origin: p.origin || region, allergy: p.allergy, description: p.description })
            : Promise.resolve(promoKo),
          (!promoEn || !promoEn.trim())
            ? generatePromoTextAIEn({ name, name_en: p.name_en || name, region_en: region, origin_en: p.origin || region, allergy_en: p.allergy_en || p.allergy, description_en: p.description_en || p.description })
            : Promise.resolve(promoEn),
          (!promoZh || !promoZh.trim())
            ? generatePromoTextAIZh({ name, name_zh: p.name_zh || name, region_zh: region, origin_zh: p.origin || region, allergy_zh: p.allergy_zh || p.allergy, description_zh: p.description_zh || p.description })
            : Promise.resolve(promoZh),
        ]);
        promoKo = ko;
        promoEn = en;
        promoZh = zh;
        console.log(`   ✅ 홍보문구 생성 완료`);
      } catch (e) {
        console.error(`   ❌ 홍보문구 생성 실패: ${e.message}`);
      }
    }

    // DB 업데이트
    await pool.query(
      `UPDATE products
       SET image_url = $1,
           ai_promo_text = $2,
           ai_promo_text_en = $3,
           ai_promo_text_zh = $4
       WHERE id = $5`,
      [imageUrl, promoKo || '', promoEn || '', promoZh || '', p.id]
    );

    console.log(`   💾 저장 완료\n`);

    // Gemini API 속도 제한 방지 (500ms 딜레이)
    if (needsPromo) await new Promise(r => setTimeout(r, 500));
  }

  console.log('🎉 모든 상품 패치 완료!');
  await pool.end();
}

main().catch(e => {
  console.error('💥 오류 발생:', e);
  process.exit(1);
});
