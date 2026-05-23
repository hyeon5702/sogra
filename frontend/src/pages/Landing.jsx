import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import MapKorea from '../components/MapKorea';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.45, delay, ease: 'easeOut' },
});

export default function Landing() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ stores: 0, products: 0 });
  const [storeCounts, setStoreCounts] = useState({});

  useEffect(() => {
    fetch('/api/products/public-stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setStats({ stores: d.totalStores, products: d.totalProducts });
      })
      .catch(() => {});

    fetch('/api/products/region-counts')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStoreCounts(d); })
      .catch(() => {});
  }, []);

  const features = [
    { icon: '🔐', titleKey: 'landing.feature1Title', descKey: 'landing.feature1Desc' },
    { icon: '🔍', titleKey: 'landing.feature2Title', descKey: 'landing.feature2Desc' },
    { icon: '📊', titleKey: 'landing.feature3Title', descKey: 'landing.feature3Desc' },
    { icon: '🎯', titleKey: 'landing.feature4Title', descKey: 'landing.feature4Desc' },
  ];

  const flowSteps = [
    { icon: '🏪', roleKey: 'landing.flow1Role', actionKey: 'landing.flow1Action' },
    { icon: '🔐', roleKey: 'landing.flow2Role', actionKey: 'landing.flow2Action' },
    { icon: '📱', roleKey: 'landing.flow3Role', actionKey: 'landing.flow3Action' },
    { icon: '🛡️', roleKey: 'landing.flow4Role', actionKey: 'landing.flow4Action' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative px-4 py-24 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 bg-indigo-950/50 border border-indigo-700/50 rounded-full px-4 py-2 text-indigo-400 text-sm mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            {t('landing.badge')}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl font-bold text-zinc-100 mb-6 leading-tight"
          >
            {t('landing.heroLine1')}<br />
            <span className="text-indigo-400">{t('landing.heroLine2')}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto"
          >
            {t('landing.heroDesc')}
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex justify-center gap-8 mb-12"
          >
            {[
              { value: stats.stores, labelKey: 'landing.statStores', color: 'text-indigo-400' },
              null,
              { value: stats.products, labelKey: 'landing.statProducts', color: 'text-emerald-400' },
              null,
              { value: '5', labelKey: 'landing.statSecurity', color: 'text-amber-400' },
            ].map((item, i) =>
              item === null ? (
                <div key={i} className="w-px bg-zinc-800" />
              ) : (
                <div key={i} className="text-center">
                  <div className={`text-3xl font-bold ${item.color}`}>{item.value}</div>
                  <div className="text-sm text-zinc-500">{t(item.labelKey)}</div>
                </div>
              )
            )}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link to="/register" className="btn-primary text-lg py-3 px-8 text-center block">
                {t('landing.ctaMerchant')}
              </Link>
            </motion.div>
<motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link to="/admin" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-lg py-3 px-8 rounded-lg transition-colors text-center block">
                {t('landing.ctaAdmin')}
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 max-w-6xl mx-auto">
        <motion.h2 {...fadeUp()} className="text-2xl font-bold text-center text-zinc-100 mb-12">
          {t('landing.featuresTitle')}
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.titleKey}
              className="card text-center"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-zinc-100 mb-2">{t(f.titleKey)}</h3>
              <p className="text-sm text-zinc-400">{t(f.descKey)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Map */}
      <section className="px-4 py-16 max-w-3xl mx-auto">
        <motion.h2 {...fadeUp()} className="text-2xl font-bold text-center text-zinc-100 mb-4">
          {t('landing.mapTitle')}
        </motion.h2>
        <motion.p {...fadeUp(0.1)} className="text-center text-zinc-500 mb-8">
          {t('landing.mapDesc')}
        </motion.p>
        <motion.div {...fadeUp(0.15)}>
          <MapKorea storeCounts={storeCounts} />
        </motion.div>
      </section>

      {/* Flow */}
      <section className="px-4 py-16 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto">
          <motion.h2 {...fadeUp()} className="text-2xl font-bold text-center text-zinc-100 mb-12">
            {t('landing.flowTitle')}
          </motion.h2>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
            {flowSteps.map((item, i) => (
              <React.Fragment key={item.roleKey}>
                {i > 0 && <div className="text-2xl text-zinc-600 hidden md:block">→</div>}
                <motion.div
                  className="card text-center min-w-32"
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.1 }}
                  whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-xs text-zinc-500 mb-1">{t(item.roleKey)}</div>
                  <div className="text-sm font-semibold text-zinc-200">{t(item.actionKey)}</div>
                </motion.div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-4 py-8 text-center text-zinc-600 text-sm">
        <p>{t('landing.footer')}</p>
        <p className="mt-1">
          <Link to="/demo/attacker" className="text-zinc-500 hover:text-zinc-400">{t('landing.attackerView')}</Link>
        </p>
      </footer>
    </div>
  );
}
