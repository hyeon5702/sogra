import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { loc } from '../utils/locale';

export default function PublicStore() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'ko';

  useEffect(() => {
    api.getPublicStore(id, token)
      .then(d => setResult(d))
      .catch(() => setResult({ status: 'danger', message: t('publicStore.dangerTitle') }))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500 text-lg">🔍 {t('publicStore.verifying')}</div>
      </div>
    );
  }

  const { status, message, store, products = [] } = result || {};

  if (status === 'danger') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="card border-red-700/50 text-center py-10">
            <div className="text-6xl mb-6">🚨</div>
            <div className="badge-danger inline-block mb-4 text-base px-4 py-2">{t('publicStore.dangerBadge')}</div>
            <h2 className="text-xl font-bold text-red-400 mb-3">{t('publicStore.dangerTitle')}</h2>
            <p className="text-zinc-400 mb-2">{message}</p>
            <p className="text-zinc-500 text-sm mb-8">{t('publicStore.dangerWarning')}</p>
            <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4 mb-6">
              <p className="text-red-400 text-sm font-semibold">{t('publicStore.dangerSecurityTitle')}</p>
              <p className="text-red-300/70 text-xs mt-1">{t('publicStore.dangerSecurityNote')}</p>
            </div>
            <Link to="/" className="btn-ghost inline-block">{t('publicStore.goHome')}</Link>
          </div>
        </div>
      </div>
    );
  }

  const statusBorder = status === 'safe'
    ? 'border-emerald-700/50'
    : status === 'map'
      ? 'border-indigo-700/50'
      : 'border-amber-700/50';
  const statusIcon = status === 'safe' ? '✅' : status === 'map' ? '🗺️' : '⚠️';
  const statusBadge = status === 'safe'
    ? <span className="badge-safe">{t('publicStore.certifiedBadge')}</span>
    : status === 'map'
      ? <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-900/40 text-indigo-300 border border-indigo-700/50">{t('publicStore.mapBadge')}</span>
      : <span className="badge-warning">{t('publicStore.warningBadge')}</span>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className={`card ${statusBorder} mb-6`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{statusIcon}</span>
          <div>
            {statusBadge}
            <p className="text-sm text-zinc-400 mt-1">{message}</p>
          </div>
        </div>
      </div>

      {store && (
        <>
          <div className="card mb-6">
            <h1 className="text-2xl font-bold text-zinc-100 mb-1">{loc(store, 'name', lang)}</h1>
            <p className="text-sm text-zinc-400">
              📍 {store.region}
              {store.location && ` · ${loc(store, 'location', lang)}`}
            </p>
          </div>

          <h2 className="text-lg font-semibold text-zinc-300 mb-4">
            {t('publicStore.productsTitle')}
            <span className="text-zinc-500 text-sm font-normal ml-2">
              ({products.length}{t('publicStore.productCount')})
            </span>
          </h2>

          {products.length === 0 ? (
            <div className="card text-center py-10 text-zinc-500">
              {t('publicStore.productsEmpty')}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {products.map(p => (
                <ProductCard key={p.id} product={p} t={t} lang={lang} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProductCard({ product: p, t, lang }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card">
      <div className="flex gap-4">
        {p.image_url && (
          <img
            src={p.image_url}
            alt={p.name}
            className="w-24 h-24 object-cover rounded-xl flex-shrink-0"
            onError={e => e.target.style.display = 'none'}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-zinc-100 text-lg leading-tight">{loc(p, 'name', lang)}</h3>
            <span className="text-indigo-400 font-bold whitespace-nowrap">{p.price.toLocaleString()}{t('common.priceUnit')}</span>
          </div>
          {p.origin && (
            <p className="text-sm text-zinc-500 mt-1">🌾 {t('publicStore.originLabel')}: {loc(p, 'origin', lang)}</p>
          )}
          {p.allergy && (
            <p className="text-sm text-amber-500/80 mt-0.5">⚠️ {t('publicStore.allergyLabel')}: {loc(p, 'allergy', lang)}</p>
          )}
          <button
            onClick={() => setOpen(v => !v)}
            className="text-xs text-zinc-500 hover:text-zinc-300 mt-2 underline underline-offset-2"
          >
            {open ? t('publicStore.hideDetail') : t('publicStore.showDetail')}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          {p.description && (
            <p className="text-sm text-zinc-400 bg-zinc-800 rounded-lg p-3 mb-3">{loc(p, 'description', lang)}</p>
          )}
          {p.ai_promo_text && (
            <div className="bg-indigo-950/30 border border-indigo-800/30 rounded-xl p-3">
              <p className="text-xs text-indigo-400 mb-1">{t('publicStore.aiPromoLabel')}</p>
              <p className="text-sm text-zinc-300 whitespace-pre-line">{loc(p, 'ai_promo_text', lang)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
