require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const pool = require('./db');
const { generateStoreQrToken } = require('./utils/qr');

// 지역별 좌표 (가게별로 조금씩 분산)
const COORDS = {
  '대전': [
    { lat: 36.3263, lng: 127.4215 },  // 중앙시장
    { lat: 36.3504, lng: 127.3845 },  // 둔산동
  ],
  '세종': [
    { lat: 36.4800, lng: 127.2890 },  // 세종시청 인근
    { lat: 36.5051, lng: 127.2618 },  // 조치원
  ],
  '충남': [
    { lat: 36.8000, lng: 127.1500 },  // 천안
    { lat: 36.6545, lng: 126.6730 },  // 홍성
  ],
  '충북': [
    { lat: 36.6357, lng: 127.4917 },  // 청주 성안길
    { lat: 37.1399, lng: 128.2066 },  // 제천
  ],
};

const MERCHANTS = [
  // ── 대전 ──
  {
    email: 'daejeon1@sogra.com', password: '1234',
    bizNum: '1010101010',
    store: {
      name: '성심당 베이커리', name_en: 'Sungsimdang Bakery', name_zh: '圣心堂面包店',
      region: '대전', location: '대전 중구 대종로 480', location_en: '480 Daejong-ro, Jung-gu, Daejeon', location_zh: '大田市中区大钟路480号',
      coordIdx: 0,
    },
  },
  {
    email: 'daejeon2@sogra.com', password: '1234',
    bizNum: '1010101011',
    store: {
      name: '대전 한방삼계탕', name_en: 'Daejeon Herbal Samgyetang', name_zh: '大田汉方参鸡汤',
      region: '대전', location: '대전 동구 판암동 15-3', location_en: '15-3 Panam-dong, Dong-gu, Daejeon', location_zh: '大田市东区判岩洞15-3',
      coordIdx: 1,
    },
  },

  // ── 세종 ──
  {
    email: 'sejong1@sogra.com', password: '1234',
    bizNum: '2020202020',
    store: {
      name: '세종 로컬푸드 직판장', name_en: 'Sejong Local Food Market', name_zh: '世宗本地食品直销店',
      region: '세종', location: '세종특별자치시 한누리대로 2130', location_en: '2130 Hannuri-daero, Sejong', location_zh: '世宗特别自治市韩努里大路2130',
      coordIdx: 0,
    },
  },
  {
    email: 'sejong2@sogra.com', password: '1234',
    bizNum: '2020202021',
    store: {
      name: '조치원 떡방앗간', name_en: 'Jochiwon Rice Cake Shop', name_zh: '鸟致院打糕店',
      region: '세종', location: '세종특별자치시 조치원읍 충현로 38', location_en: '38 Chunghyeon-ro, Jochiwon-eup, Sejong', location_zh: '世宗特别自治市鸟致院邑忠贤路38',
      coordIdx: 1,
    },
  },

  // ── 충남 ──
  {
    email: 'chungnam1@sogra.com', password: '1234',
    bizNum: '3030303030',
    store: {
      name: '천안 호두과자 본점', name_en: 'Cheonan Walnut Cookie Original', name_zh: '天安核桃饼总店',
      region: '충남', location: '충남 천안시 동남구 봉정로 10', location_en: '10 Bongjeong-ro, Dongnam-gu, Cheonan', location_zh: '忠南天安市东南区凤亭路10',
      coordIdx: 0,
    },
  },
  {
    email: 'chungnam2@sogra.com', password: '1234',
    bizNum: '3030303031',
    store: {
      name: '홍성 한우 정육점', name_en: 'Hongseong Hanwoo Butcher', name_zh: '洪城韩牛肉铺',
      region: '충남', location: '충남 홍성군 홍성읍 홍주로 65', location_en: '65 Hongju-ro, Hongseong-eup, Hongseong', location_zh: '忠南洪城郡洪城邑洪州路65',
      coordIdx: 1,
    },
  },

  // ── 충북 ──
  {
    email: 'chungbuk1@sogra.com', password: '1234',
    bizNum: '4040404040',
    store: {
      name: '청주 성안길 전통주점', name_en: 'Cheongju Traditional Liquor Shop', name_zh: '清州成安街传统酒店',
      region: '충북', location: '충북 청주시 상당구 성안로 82', location_en: '82 Sungan-ro, Sangdang-gu, Cheongju', location_zh: '忠北清州市上党区城安路82',
      coordIdx: 0,
    },
  },
  {
    email: 'chungbuk2@sogra.com', password: '1234',
    bizNum: '4040404041',
    store: {
      name: '제천 약초 건강원', name_en: 'Jecheon Herbal Health Center', name_zh: '堤川药草健康院',
      region: '충북', location: '충북 제천시 의림대로 172', location_en: '172 Uirimdae-ro, Jecheon', location_zh: '忠北堤川市义林大路172',
      coordIdx: 1,
    },
  },
];

async function seed() {
  console.log('🌱 시드 데이터 생성 시작...\n');

  for (const m of MERCHANTS) {
    // 이미 존재하는 이메일 스킵
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email=$1', [m.email]);
    if (existing.length > 0) {
      console.log(`⏭  ${m.email} 이미 존재, 스킵`);
      continue;
    }

    // 1. 유저 생성
    const hash = await bcrypt.hash(m.password, 10);
    const { rows: [user] } = await pool.query(
      'INSERT INTO users (email, password_hash, role, business_number, business_verified, created_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [m.email, hash, 'merchant', m.bizNum, true, Date.now()]
    );
    console.log(`✅ 유저 생성: ${m.email} (id=${user.id})`);

    // 2. 가게 생성 (status: approved)
    const coords = COORDS[m.store.region][m.store.coordIdx];
    const createdAt = Date.now();
    const { rows: [store] } = await pool.query(
      `INSERT INTO stores
        (owner_id, name, name_en, name_zh, region, location, location_en, location_zh,
         status, latitude, longitude, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'approved',$9,$10,$11)
       RETURNING id, created_at`,
      [user.id, m.store.name, m.store.name_en, m.store.name_zh,
       m.store.region, m.store.location, m.store.location_en, m.store.location_zh,
       coords.lat, coords.lng, createdAt]
    );

    // 3. QR 토큰 발급
    const qrToken = generateStoreQrToken(store.id, store.created_at);
    const qrExpiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
    await pool.query(
      'UPDATE stores SET qr_token=$1, qr_expires_at=$2 WHERE id=$3',
      [qrToken, qrExpiresAt, store.id]
    );

    console.log(`   🏪 가게 생성: ${m.store.name} (id=${store.id}, ${m.store.region})\n`);
  }

  console.log('✅ 시드 완료!');
  console.log('\n📋 생성된 계정 (비밀번호 모두 1234):');
  MERCHANTS.forEach(m => console.log(`  ${m.email.padEnd(28)} → ${m.store.name}`));
  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
