const express = require('express');
const sanitizeHtml = require('sanitize-html');
const pool = require('../db');
const { requireAuth, requireMerchant } = require('../middleware/auth');
const { logSecurity } = require('../utils/logger');
const { generateQrToken, verifyQrToken, buildQrUrl, generateStoreQrToken, verifyStoreQrToken, buildStoreQrUrl, verifyTimedStoreQrToken, buildTimedStoreQrUrl } = require('../utils/qr');
const { generatePromoTextAI, generatePromoTextAIEn, generatePromoTextAIZh } = require('../utils/promo');

const router = express.Router();

// 공개 API — 지역별 승인된 상점 수 (랜딩 지도용)
router.get('/region-counts', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT region, COUNT(*) as count FROM stores WHERE status = 'approved' GROUP BY region`
    );
    const counts = {};
    rows.forEach(r => { counts[r.region] = parseInt(r.count); });
    res.json(counts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/public/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;
    const ip = req.ip;

    const { rows } = await pool.query(`
      SELECT p.*, s.name as store_name, s.status as store_status, s.region as store_region
      FROM products p JOIN stores s ON p.store_id = s.id WHERE p.id = $1
    `, [id]);
    const product = rows[0];

    if (!product) {
      await logSecurity({ eventType: 'FAKE_QR_ACCESS', ipAddress: ip, detail: `Product not found: id=${id}, token=${token}`, severity: 'critical' });
      return res.json({ status: 'danger', message: '존재하지 않거나 위조 가능성이 있는 QR입니다.' });
    }
    if (!product.is_active) {
      await logSecurity({ eventType: 'FAKE_QR_ACCESS', ipAddress: ip, detail: `Inactive product accessed: id=${id}`, severity: 'high' });
      return res.json({ status: 'danger', message: '비활성화된 상품입니다.' });
    }
    if (!token || !verifyQrToken(product.id, product.created_at, token)) {
      await logSecurity({ eventType: 'FAKE_QR_ACCESS', ipAddress: ip, detail: `Invalid QR token for product_id=${id}: token=${token}`, severity: 'critical' });
      return res.json({ status: 'danger', message: '토큰이 일치하지 않습니다. 위조된 QR일 수 있습니다.' });
    }
    if (product.qr_expires_at && Date.now() > Number(product.qr_expires_at)) {
      return res.json({ status: 'danger', message: 'QR이 만료되었습니다.' });
    }
    if (product.store_status === 'pending') return res.json({ status: 'warning', message: '승인 대기 중인 상점입니다.', product });
    if (product.store_status === 'flagged') return res.json({ status: 'warning', message: '신고가 접수된 상점입니다.', product });
    return res.json({ status: 'safe', message: '공식 인증된 대충실드 QR 페이지입니다.', product });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: '서버 오류' });
  }
});

router.get('/store-public/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;
    const ip = req.ip;

    const { rows: storeRows } = await pool.query('SELECT * FROM stores WHERE id=$1', [id]);
    const store = storeRows[0];

    if (!store) {
      await logSecurity({ eventType: 'FAKE_QR_ACCESS', ipAddress: ip, detail: `Store not found: id=${id}, token=${token}`, severity: 'critical' });
      return res.json({ status: 'danger', message: '존재하지 않거나 위조 가능성이 있는 QR입니다.' });
    }

    const { rows: products } = await pool.query(
      `SELECT * FROM products WHERE store_id=$1 AND is_active=1 ORDER BY created_at DESC`,
      [id]
    );

    // 토큰 없음 = 지도/웹에서 직접 접근 → QR 검증 없이 상점 정보 표시
    if (!token) {
      if (store.status !== 'approved') {
        return res.json({ status: 'warning', message: '승인 대기 중인 상점입니다.', store, products });
      }
      return res.json({
        status: 'map',
        message: '지도에서 접속한 공식 인증 상점입니다.',
        store,
        products,
      });
    }

    // 토큰 있음 = QR 스캔 → 회전 토큰 검증
    if (!verifyTimedStoreQrToken(store.id, token)) {
      await logSecurity({ eventType: 'FAKE_QR_ACCESS', ipAddress: ip, detail: `Invalid/expired store QR token for store_id=${id}: token=${token}`, severity: 'critical' });
      return res.json({ status: 'danger', message: '토큰이 만료되었거나 위조된 QR입니다.' });
    }

    const statusMap = { approved: 'safe', pending: 'warning', flagged: 'warning' };
    const msgMap = {
      approved: '공식 인증된 대충실드 QR 페이지입니다.',
      pending: '승인 대기 중인 상점입니다.',
      flagged: '신고가 접수된 상점입니다.',
    };
    return res.json({
      status: statusMap[store.status] || 'warning',
      message: msgMap[store.status] || '확인 중인 상점입니다.',
      store,
      products,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: '서버 오류' });
  }
});

router.get('/my', requireMerchant, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, s.name as store_name, s.status as store_status, s.region
      FROM products p JOIN stores s ON p.store_id = s.id
      WHERE p.owner_id = $1 AND p.is_active = 1 ORDER BY p.created_at DESC
    `, [req.user.id]);
    return res.json({ products: rows.map(p => ({ ...p, qr_url: buildQrUrl(p.id, p.qr_token) })) });
  } catch (e) {
    return res.status(500).json({ error: '서버 오류' });
  }
});

router.post('/', requireMerchant, async (req, res) => {
  try {
    const { store_id, name, price, description, origin, allergy, image_url } = req.body;
    const ip = req.ip;

    if (!name || !price || !store_id) return res.status(400).json({ error: '필수 항목을 입력해주세요.' });

    const { rows: storeRows } = await pool.query('SELECT * FROM stores WHERE id=$1', [store_id]);
    const store = storeRows[0];
    if (!store || store.owner_id !== req.user.id) {
      await logSecurity({ userId: req.user.id, eventType: 'IDOR_ATTEMPT', ipAddress: ip, detail: `User ${req.user.id} attempted product creation with unauthorized store_id=${store_id}`, severity: 'medium' });
      return res.status(403).json({ error: '해당 상점의 권한이 없습니다.' });
    }

    let cleanDescription = description || '';
    const xssPatterns = ['<script', 'onerror=', 'onload=', 'javascript:', 'onclick=', 'alert('];
    if (xssPatterns.some(p => cleanDescription.toLowerCase().includes(p))) {
      await logSecurity({ userId: req.user.id, eventType: 'XSS_ATTEMPT', ipAddress: ip, detail: `XSS payload detected in description: ${cleanDescription.slice(0, 200)}`, severity: 'critical' });
    }
    cleanDescription = sanitizeHtml(cleanDescription, { allowedTags: [], allowedAttributes: {} });

    const createdAt = Date.now();

    // Gemini AI 홍보 문구 3개국어 병렬 생성
    const [promoText, promoTextEn, promoTextZh] = await Promise.all([
      generatePromoTextAI({ name, region: store.region, origin: origin || store.region, allergy, description: cleanDescription }),
      generatePromoTextAIEn({ name, name_en: name, region_en: store.region, origin_en: origin || store.region, allergy_en: allergy, description_en: cleanDescription }),
      generatePromoTextAIZh({ name, name_zh: name, region_zh: store.region, origin_zh: origin || store.region, allergy_zh: allergy, description_zh: cleanDescription }),
    ]);

    const { rows: [{ id: productId }] } = await pool.query(`
      INSERT INTO products
        (store_id, owner_id, name, price, description, origin, allergy, image_url,
         ai_promo_text, ai_promo_text_en, ai_promo_text_zh,
         qr_token, qr_expires_at, is_active, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8, $9,$10,$11, '',$12,1,$13)
      RETURNING id
    `, [store_id, req.user.id, name, parseInt(price), cleanDescription,
        origin || '', allergy || '', image_url || '',
        promoText, promoTextEn, promoTextZh,
        Date.now() + 30 * 24 * 60 * 60 * 1000, createdAt]);

    const token = generateQrToken(productId, createdAt);
    await pool.query('UPDATE products SET qr_token=$1 WHERE id=$2', [token, productId]);

    const { rows: [product] } = await pool.query('SELECT * FROM products WHERE id=$1', [productId]);
    return res.status(201).json({ product: { ...product, qr_url: buildQrUrl(productId, token) } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: '서버 오류' });
  }
});

router.put('/:id', requireMerchant, async (req, res) => {
  try {
    const { id } = req.params;
    const ip = req.ip;

    const { rows } = await pool.query('SELECT * FROM products WHERE id=$1', [id]);
    const product = rows[0];
    if (!product) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    if (product.owner_id !== req.user.id && req.user.role !== 'admin') {
      await logSecurity({ userId: req.user.id, eventType: 'IDOR_ATTEMPT', ipAddress: ip, detail: `User ${req.user.id} (${req.user.email}) attempted to modify product owned by user ${product.owner_id} (product_id: ${id})`, severity: 'medium' });
      return res.status(403).json({ error: '이 상품을 수정할 권한이 없습니다.' });
    }

    const { name, price, description, origin, allergy, image_url } = req.body;
    let cleanDescription = description || product.description;
    const xssPatterns = ['<script', 'onerror=', 'onload=', 'javascript:', 'onclick=', 'alert('];
    if (xssPatterns.some(p => cleanDescription.toLowerCase().includes(p))) {
      await logSecurity({ userId: req.user.id, eventType: 'XSS_ATTEMPT', ipAddress: ip, detail: `XSS payload in product update: ${cleanDescription.slice(0, 200)}`, severity: 'critical' });
    }
    cleanDescription = sanitizeHtml(cleanDescription, { allowedTags: [], allowedAttributes: {} });

    await pool.query(
      'UPDATE products SET name=$1, price=$2, description=$3, origin=$4, allergy=$5, image_url=$6 WHERE id=$7',
      [name || product.name, parseInt(price) || product.price, cleanDescription, origin || product.origin, allergy || product.allergy, image_url || product.image_url, id]
    );
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: '서버 오류' });
  }
});

router.delete('/:id', requireMerchant, async (req, res) => {
  try {
    const { id } = req.params;
    const ip = req.ip;

    const { rows } = await pool.query('SELECT * FROM products WHERE id=$1', [id]);
    const product = rows[0];
    if (!product) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    if (product.owner_id !== req.user.id && req.user.role !== 'admin') {
      await logSecurity({ userId: req.user.id, eventType: 'IDOR_ATTEMPT', ipAddress: ip, detail: `User ${req.user.id} attempted to delete product owned by user ${product.owner_id} (product_id: ${id})`, severity: 'medium' });
      return res.status(403).json({ error: '이 상품을 삭제할 권한이 없습니다.' });
    }
    await pool.query('UPDATE products SET is_active=0 WHERE id=$1', [id]);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: '서버 오류' });
  }
});

router.get('/stores/my', requireMerchant, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM stores WHERE owner_id=$1', [req.user.id]);
    return res.json({
      stores: rows.map(s => ({
        ...s,
        store_qr_url: s.qr_token ? buildStoreQrUrl(s.id, s.qr_token) : null,
      })),
    });
  } catch (e) {
    return res.status(500).json({ error: '서버 오류' });
  }
});

// 30초 회전 QR URL 발급 (상점 소유자 전용)
router.get('/stores/:id/live-qr', requireMerchant, async (req, res) => {
  try {
    const storeId = parseInt(req.params.id);
    const { rows } = await pool.query('SELECT id, owner_id FROM stores WHERE id=$1', [storeId]);
    const store = rows[0];
    if (!store) return res.status(404).json({ error: '상점을 찾을 수 없습니다.' });
    if (store.owner_id !== req.user.id) return res.status(403).json({ error: '권한이 없습니다.' });

    const { url, expiresIn } = buildTimedStoreQrUrl(storeId);
    return res.json({ url, expiresIn });
  } catch (e) {
    return res.status(500).json({ error: '서버 오류' });
  }
});

router.post('/stores', requireMerchant, async (req, res) => {
  try {
    const { name, region, location } = req.body;
    if (!name || !region) return res.status(400).json({ error: '상점명과 지역을 입력해주세요.' });
    const validRegions = ['대전', '세종', '충남', '충북'];
    if (!validRegions.includes(region)) return res.status(400).json({ error: '유효하지 않은 지역입니다.' });

    // 지역 기본 좌표 (지도 표시용)
    const REGION_COORDS = {
      '대전': { lat: 36.3504, lng: 127.3845 },
      '세종': { lat: 36.4800, lng: 127.2890 },
      '충남': { lat: 36.5184, lng: 126.8000 },
      '충북': { lat: 36.6357, lng: 127.4917 },
    };
    const coords = REGION_COORDS[region];

    const createdAt = Date.now();
    const { rows: [newStore] } = await pool.query(
      'INSERT INTO stores (owner_id, name, region, location, status, latitude, longitude, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [req.user.id, name, region, location || '', 'pending', coords.lat, coords.lng, createdAt]
    );
    const storeToken = generateStoreQrToken(newStore.id, createdAt);
    await pool.query('UPDATE stores SET qr_token=$1, qr_expires_at=$2 WHERE id=$3',
      [storeToken, createdAt + 365 * 24 * 60 * 60 * 1000, newStore.id]);
    const store = { ...newStore, qr_token: storeToken, store_qr_url: buildStoreQrUrl(newStore.id, storeToken) };
    return res.status(201).json({ store });
  } catch (e) {
    return res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
