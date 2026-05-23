import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { loc } from '../utils/locale';
import { getUser } from '../auth';
import { SkeletonCard } from '../components/Skeleton';

export default function MerchantDashboard() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'ko';
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreQr, setSelectedStoreQr] = useState(null);
  const [liveQrUrl, setLiveQrUrl] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const [toast, setToast] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const countdownRef = useRef(30);
  const user = getUser();

  // 30초 회전 QR — 모달 열릴 때 시작, 닫힐 때 정리
  useEffect(() => {
    if (!selectedStoreQr) {
      setLiveQrUrl(null);
      return;
    }
    async function refresh() {
      try {
        const data = await api.getStoreLiveQr(selectedStoreQr.id);
        setLiveQrUrl(data.url);
        countdownRef.current = Math.ceil(data.expiresIn / 1000);
        setCountdown(countdownRef.current);
      } catch {}
    }
    refresh();
    const tick = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) refresh();
    }, 1000);
    return () => clearInterval(tick);
  }, [selectedStoreQr?.id]);

  useEffect(() => {
    Promise.all([api.getMyProducts(), api.getMyStores()])
      .then(([pd, sd]) => {
        setProducts(pd.products || []);
        setStores(sd.stores || []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!confirm(t('dashboard.deleteConfirm'))) return;
    await api.deleteProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast(t('dashboard.deleteSuccess'));
  }

  function openEdit(p) {
    setEditingProduct(p);
    setEditForm({
      name: p.name,
      price: p.price,
      description: p.description || '',
      origin: p.origin || '',
      allergy: p.allergy || '',
      image_url: p.image_url || '',
    });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setEditLoading(true);
    try {
      await api.updateProduct(editingProduct.id, editForm);
      setProducts(prev => prev.map(p =>
        p.id === editingProduct.id ? { ...p, ...editForm, price: Number(editForm.price) } : p
      ));
      setEditingProduct(null);
      showToast('상품이 수정되었습니다.');
    } catch (err) {
      showToast('수정 실패: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const statusBadge = (status) => ({
    approved: <span className="badge-safe">{t('dashboard.statusApproved')}</span>,
    pending: <span className="badge-warning">{t('dashboard.statusPending')}</span>,
    flagged: <span className="badge-danger">{t('dashboard.statusFlagged')}</span>,
  }[status] || null);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-20 right-4 bg-emerald-800 text-emerald-200 px-4 py-2 rounded-lg shadow-lg z-50"
          >
            ✅ {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{t('dashboard.title')}</h1>
          <p className="text-zinc-500 text-sm mt-1">{user?.email}</p>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link to="/merchant/products/new" className="btn-primary">{t('dashboard.addProduct')}</Link>
        </motion.div>
      </div>

      {/* Store approval banner */}
      {!loading && stores.length > 0 && (() => {
        const allApproved = stores.every(s => s.status === 'approved');
        const anyFlagged = stores.some(s => s.status === 'flagged');
        const anyPending = stores.some(s => s.status === 'pending');
        if (allApproved) {
          return (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-emerald-900/20 border border-emerald-700/40 rounded-2xl px-5 py-4 flex items-center gap-3"
            >
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-emerald-400">{t('dashboard.bannerApprovedTitle')}</p>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {t('dashboard.bannerApprovedDesc').split(t('dashboard.bannerApprovedHighlight')).map((part, i, arr) =>
                    i < arr.length - 1
                      ? <React.Fragment key={i}>{part}<strong className="text-emerald-400">{t('dashboard.bannerApprovedHighlight')}</strong></React.Fragment>
                      : part
                  )}
                </p>
              </div>
            </motion.div>
          );
        }
        if (anyFlagged) {
          return (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-red-900/20 border border-red-700/40 rounded-2xl px-5 py-4 flex items-center gap-3"
            >
              <span className="text-2xl">🚨</span>
              <div>
                <p className="font-semibold text-red-400">{t('dashboard.bannerFlaggedTitle')}</p>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {t('dashboard.bannerFlaggedDesc').split(t('dashboard.bannerFlaggedHighlight')).map((part, i, arr) =>
                    i < arr.length - 1
                      ? <React.Fragment key={i}>{part}<strong className="text-amber-400">{t('dashboard.bannerFlaggedHighlight')}</strong></React.Fragment>
                      : part
                  )}
                </p>
              </div>
            </motion.div>
          );
        }
        if (anyPending) {
          return (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-amber-900/20 border border-amber-700/40 rounded-2xl px-5 py-4 flex items-center gap-3"
            >
              <span className="text-2xl">⏳</span>
              <div>
                <p className="font-semibold text-amber-400">{t('dashboard.bannerPendingTitle')}</p>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {t('dashboard.bannerPendingDesc').split(t('dashboard.bannerPendingHighlight')).map((part, i, arr) =>
                    i < arr.length - 1
                      ? <React.Fragment key={i}>{part}<strong className="text-amber-400">{t('dashboard.bannerPendingHighlight')}</strong></React.Fragment>
                      : part
                  )}
                </p>
              </div>
            </motion.div>
          );
        }
      })()}

      {/* Stores */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-300 mb-4">{t('dashboard.storesTitle')}</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1].map(i => (
              <div key={i} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="skeleton h-5 w-1/2 mb-2 rounded" />
                    <div className="skeleton h-4 w-2/3 rounded" />
                  </div>
                  <div className="skeleton h-6 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-zinc-500 mb-4">{t('dashboard.storesEmpty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stores.map((s, i) => (
              <motion.div
                key={s.id}
                className="card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.07 }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-zinc-100">{s.name}</h3>
                    <p className="text-sm text-zinc-500 mt-1">{s.region} · {s.location}</p>
                  </div>
                  {statusBadge(s.status)}
                </div>
                {s.store_qr_url ? (
                  <motion.button
                    onClick={() => setSelectedStoreQr(s)}
                    className="btn-primary text-sm py-1.5 w-full"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {t('dashboard.storeQrButton')}
                  </motion.button>
                ) : (
                  <p className="text-xs text-zinc-600">{t('dashboard.qrGenerating')}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Products */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-300 mb-4">
          {t('dashboard.productsTitle')} {!loading && `(${products.length})`}
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-zinc-500 mb-4">{t('dashboard.productsEmpty')}</p>
            <Link to="/merchant/products/new" className="btn-primary">{t('dashboard.productsAddFirst')}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p, i) => (
              <motion.div
                key={p.id}
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
              >
                {p.image_url && (
                  <img src={p.image_url} alt={p.name} className="w-full h-40 object-cover rounded-xl mb-4" onError={e => e.target.style.display='none'} />
                )}
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-zinc-100">{p.name}</h3>
                </div>
                <p className="text-indigo-400 font-bold mb-1">{p.price.toLocaleString()}{t('common.priceUnit')}</p>
                <p className="text-xs text-zinc-500 mb-3">{p.store_name} · {p.region}</p>
                {p.ai_promo_text && (
                  <p className="text-xs text-zinc-400 bg-zinc-800 rounded-lg p-2 mb-3 whitespace-pre-line">{loc(p, 'ai_promo_text', lang)}</p>
                )}
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => openEdit(p)}
                    className="btn-ghost text-sm py-1.5 flex-1"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    ✏️ 수정
                  </motion.button>
                  <motion.button
                    onClick={() => handleDelete(p.id)}
                    className="btn-danger text-sm py-1.5 flex-1"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {t('dashboard.deleteButton')}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {editingProduct && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingProduct(null)}
          >
            <motion.div
              className="card max-w-lg w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-zinc-100 text-lg">✏️ 상품 수정</h3>
                <button onClick={() => setEditingProduct(null)} className="text-zinc-500 hover:text-zinc-300 text-xl">✕</button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">상품명</label>
                    <input
                      className="input"
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">가격 (원)</label>
                    <input
                      type="number"
                      className="input"
                      value={editForm.price}
                      onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                      required
                      min="0"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">상품 설명</label>
                  <textarea
                    className="input min-h-24 resize-none"
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="상품에 대한 설명을 입력하세요"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">원산지</label>
                    <input
                      className="input"
                      value={editForm.origin}
                      onChange={e => setEditForm(f => ({ ...f, origin: e.target.value }))}
                      placeholder="예: 대전, 충남 서산"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">알레르기</label>
                    <input
                      className="input"
                      value={editForm.allergy}
                      onChange={e => setEditForm(f => ({ ...f, allergy: e.target.value }))}
                      placeholder="예: 밀, 우유, 달걀"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">이미지 URL</label>
                  <input
                    className="input"
                    value={editForm.image_url}
                    onChange={e => setEditForm(f => ({ ...f, image_url: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                  />
                  {editForm.image_url && (
                    <img
                      src={editForm.image_url}
                      alt="미리보기"
                      className="mt-2 w-full h-32 object-cover rounded-lg"
                      onError={e => e.target.style.display = 'none'}
                    />
                  )}
                </div>

                <div className="flex gap-3">
                  <motion.button
                    type="submit"
                    disabled={editLoading}
                    className="btn-primary flex-1 py-2.5"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {editLoading ? '저장 중...' : '💾 저장'}
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="btn-ghost px-6"
                  >
                    취소
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Store QR Modal */}
      <AnimatePresence>
        {selectedStoreQr && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedStoreQr(null)}
          >
            <motion.div
              className="card max-w-sm w-full"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-zinc-100">{t('dashboard.storeQrModalTitle')}</h3>
                <button onClick={() => setSelectedStoreQr(null)} className="text-zinc-500 hover:text-zinc-300 text-xl">✕</button>
              </div>
              {/* 카운트다운 진행바 */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-500">🔄 {t('dashboard.qrRotating')}</span>
                  <span className={`font-mono font-bold ${countdown <= 5 ? 'text-amber-400' : 'text-indigo-400'}`}>
                    {countdown}s
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${countdown <= 5 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                    animate={{ width: `${(countdown / 30) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              <div className="flex justify-center mb-4">
                <div className="bg-white p-4 rounded-xl">
                  {liveQrUrl
                    ? <QRCodeSVG value={liveQrUrl} size={180} />
                    : <div className="w-[180px] h-[180px] flex items-center justify-center text-zinc-400 text-sm">로딩 중...</div>
                  }
                </div>
              </div>
              <p className="text-center font-semibold text-zinc-200 mb-1">{selectedStoreQr.name}</p>
              <p className="text-center text-sm text-zinc-500 mb-3">{selectedStoreQr.region} · {selectedStoreQr.location}</p>
              <div className="bg-zinc-800 rounded-lg p-3 mb-4">
                <p className="text-xs text-zinc-500 mb-1">{t('dashboard.storeQrModalLink')}</p>
                <p className="text-xs font-mono text-zinc-300 break-all">{liveQrUrl || '...'}</p>
              </div>
              <div className="flex gap-2">
                <a href={liveQrUrl || '#'} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm py-2 flex-1 text-center">
                  {t('dashboard.storeQrModalOpen')}
                </a>
                <button
                  onClick={() => { if (liveQrUrl) { navigator.clipboard.writeText(liveQrUrl); showToast(t('dashboard.storeQrModalCopied')); } }}
                  className="btn-ghost text-sm py-2 px-4"
                >{t('dashboard.storeQrModalCopy')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
