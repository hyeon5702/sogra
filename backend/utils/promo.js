const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ── Gemini AI 홍보 문구 생성 ──────────────────────────────────
async function generatePromoTextAI({ name, region, origin, allergy, description }) {
  if (!genAI) return fallbackPromoText({ name, region, origin });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
당신은 한국 전통시장 로컬 상품 홍보 전문가입니다.
아래 상품 정보를 보고 감성적이고 매력적인 SNS 홍보 문구를 작성해주세요.

[상품 정보]
- 상품명: ${name}
- 지역: ${region}
- 원산지: ${origin || region}
- 알레르기: ${allergy || '없음'}
- 상품 설명: ${description || ''}

[작성 규칙]
1. 2~3문장 이내로 간결하게
2. 지역 특색과 신선함 강조
3. 이모지 1~2개 포함
4. 마지막 줄에 해시태그 3~4개 (예: #대전 #로컬푸드 #대충실드인증)
5. 과장 없이 진정성 있게

홍보 문구만 출력하세요. 설명이나 부가 텍스트는 제외.
`.trim();

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    console.error('[Gemini] 홍보 문구 생성 실패, 폴백 사용:', e.message);
    return fallbackPromoText({ name, region, origin });
  }
}

async function generatePromoTextAIEn({ name, name_en, region_en, origin_en, allergy_en, description_en }) {
  if (!genAI) return fallbackPromoTextEn({ name_en, region_en, origin_en });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
You are a marketing copywriter specializing in Korean local market products.
Write an engaging and authentic SNS promotional text for the product below.

[Product Info]
- Name: ${name_en || name}
- Region: ${region_en}
- Origin: ${origin_en || region_en}
- Allergens: ${allergy_en || 'None'}
- Description: ${description_en || ''}

[Rules]
1. 2-3 sentences, concise
2. Highlight local character and freshness
3. Include 1-2 emojis
4. End with 3-4 hashtags (e.g. #Daejeon #LocalFood #DaechungShieldCertified)
5. Authentic, no exaggeration

Output only the promotional text. No explanations.
`.trim();

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    console.error('[Gemini] EN promo generation failed, using fallback:', e.message);
    return fallbackPromoTextEn({ name_en, region_en, origin_en });
  }
}

async function generatePromoTextAIZh({ name, name_zh, region_zh, origin_zh, allergy_zh, description_zh }) {
  if (!genAI) return fallbackPromoTextZh({ name_zh, region_zh, origin_zh });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
您是韩国传统市场本地商品营销文案专家。
请根据以下商品信息，撰写吸引人且真实的SNS宣传文案。

【商品信息】
- 商品名称: ${name_zh || name}
- 地区: ${region_zh}
- 产地: ${origin_zh || region_zh}
- 过敏原: ${allergy_zh || '无'}
- 商品描述: ${description_zh || ''}

【规则】
1. 2-3句话，简洁有力
2. 突出地方特色和新鲜感
3. 包含1-2个表情符号
4. 最后加3-4个话题标签（例：#大田 #本地美食 #大充实德认证）
5. 真实自然，不夸张

只输出宣传文案，不需要解释。
`.trim();

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    console.error('[Gemini] ZH promo generation failed, using fallback:', e.message);
    return fallbackPromoTextZh({ name_zh, region_zh, origin_zh });
  }
}

// ── 폴백 템플릿 (API 키 없거나 오류 시) ──────────────────────
function fallbackPromoText({ name, region, origin }) {
  const hooks = [
    `🔥 ${region} 대표 ${name}, 한 번 맛보면 잊을 수 없어요!`,
    `✨ ${origin} 직송 ${name} — 지역의 자부심을 담았습니다.`,
    `🌟 진짜 ${region} 맛집 ${name}, 이 가격에 이 퀄리티?`,
  ];
  const tags = `#${region} #로컬푸드 #${name.replace(/\s/g, '')} #대충실드인증`;
  return `${hooks[Math.floor(Math.random() * 3)]}\n\n${tags}`;
}

function fallbackPromoTextEn({ name_en, region_en, origin_en }) {
  const hooks = [
    `🔥 ${name_en} — the pride of ${region_en}. One bite and you'll never forget!`,
    `✨ ${name_en}, delivered fresh from ${origin_en}. Taste the local difference.`,
    `🌟 Real ${region_en} flavor: ${name_en}. This quality at this price?`,
  ];
  const tags = `#${region_en} #LocalFood #${name_en.replace(/\s/g, '')} #DaechungShieldCertified`;
  return `${hooks[Math.floor(Math.random() * 3)]}\n\n${tags}`;
}

function fallbackPromoTextZh({ name_zh, region_zh, origin_zh }) {
  const hooks = [
    `🔥 ${region_zh}代表美食${name_zh}，一口难忘！`,
    `✨ ${name_zh}，${origin_zh}直送 — 承载着地方的骄傲。`,
    `🌟 真正的${region_zh}美味${name_zh}，这个价格这个品质？`,
  ];
  const tags = `#${region_zh} #本地美食 #${name_zh.replace(/\s/g, '')} #大充实德认证`;
  return `${hooks[Math.floor(Math.random() * 3)]}\n\n${tags}`;
}

// 기존 동기 함수 (seed.js 호환용 — 폴백만 사용)
function generatePromoText({ name, region, origin }) {
  return fallbackPromoText({ name, region, origin });
}
function generatePromoTextEn({ name_en, region_en, origin_en }) {
  return fallbackPromoTextEn({ name_en, region_en, origin_en });
}
function generatePromoTextZh({ name_zh, region_zh, origin_zh }) {
  return fallbackPromoTextZh({ name_zh, region_zh, origin_zh });
}

module.exports = {
  generatePromoTextAI,
  generatePromoTextAIEn,
  generatePromoTextAIZh,
  generatePromoText,
  generatePromoTextEn,
  generatePromoTextZh,
};
