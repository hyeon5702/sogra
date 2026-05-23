import React, { useState, useEffect, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { loc } from '../utils/locale';

const GEO_URL =
  'https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-provinces-2018-topo.json';

const REGION_MAP = [
  { key: '대전', label: { ko: '대전', en: 'Daejeon',       zh: '大田' }, coords: [127.385, 36.35], color: '#6366f1', geoNames: ['대전광역시'] },
  { key: '세종', label: { ko: '세종', en: 'Sejong',         zh: '世宗' }, coords: [127.289, 36.48], color: '#a78bfa', geoNames: ['세종특별자치시'] },
  { key: '충남', label: { ko: '충남', en: 'S.Chungcheong', zh: '忠南' }, coords: [126.8,   36.62], color: '#06b6d4', geoNames: ['충청남도'] },
  { key: '충북', label: { ko: '충북', en: 'N.Chungcheong', zh: '忠北' }, coords: [127.73,  36.77], color: '#10b981', geoNames: ['충청북도'] },
];

const GEO_NAME_TO_KEY = Object.fromEntries(
  REGION_MAP.flatMap(r => r.geoNames.map(n => [n, r.key]))
);
const GEO_COLOR_MAP = Object.fromEntries(
  REGION_MAP.flatMap(r => r.geoNames.map(n => [n, r.color]))
);

const FILTER_REGIONS = [
  { value: '전체', i18nKey: 'storeMap.regionAll' },
  { value: '대전', i18nKey: 'storeMap.regionDaejeon' },
  { value: '세종', i18nKey: 'storeMap.regionSejong' },
  { value: '충남', i18nKey: 'storeMap.regionChungnam' },
  { value: '충북', i18nKey: 'storeMap.regionChungbuk' },
];

function regionColor(key) {
  return REGION_MAP.find(r => r.key === key)?.color || '#a1a1aa';
}

export default function MapKorea({ storeCounts = {} }) {
  const { i18n, t } = useTranslation();
  const lang = i18n.language?.slice(0, 2) || 'ko';
  const navigate = useNavigate();

  const [geoLoaded, setGeoLoaded]         = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [stores, setStores]               = useState([]);
  const [search, setSearch]               = useState('');
  const [region, setRegion]               = useState('전체');

  useEffect(() => {
    api.getPublicStores()
      .then(d => setStores(d.stores || []))
      .catch(() => {});
  }, []);

  // 검색어는 모든 다국어 필드에서 검색
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stores.filter(s => {
      const matchR = region === '전체' || s.region === region;
      const matchQ = !q
        || (s.name        || '').toLowerCase().includes(q)
        || (s.name_en     || '').toLowerCase().includes(q)
        || (s.name_zh     || '').toLowerCase().includes(q)
        || (s.location    || '').toLowerCase().includes(q)
        || (s.location_en || '').toLowerCase().includes(q)
        || (s.location_zh || '').toLowerCase().includes(q);
      return matchR && matchQ;
    });
  }, [stores, search, region]);

  function visitStore(store) {
    navigate(`/store/${store.id}`);
  }

  function handleRegionClick(key) {
    setRegion(prev => (prev === key ? '전체' : key));
    setSearch('');
  }

  const activeRegionData = REGION_MAP.find(r => r.key === region);

  return (
    <div className="w-full select-none">

      {/* ── 검색 + 지역 필터 버튼 ── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder={t('storeMap.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTER_REGIONS.map(r => (
            <button
              key={r.value}
              onClick={() => { setRegion(r.value); setSearch(''); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                region === r.value
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {t(r.i18nKey)}
            </button>
          ))}
        </div>
      </div>

      {/* ── 지도 ── */}
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [127.8, 36.5], scale: 4800 }}
        width={640}
        height={580}
        style={{ width: '100%', height: 'auto' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) => {
            if (!geoLoaded && geographies.length > 0) setGeoLoaded(true);
            return geographies.map(geo => {
              const name      = geo.properties.name_kor || geo.properties.name || '';
              const svcColor  = GEO_COLOR_MAP[name];
              const regionKey = GEO_NAME_TO_KEY[name];
              const isService = !!svcColor;
              const isActive   = isService && region !== '전체' && regionKey === region;
              const isInactive = isService && region !== '전체' && regionKey !== region;
              const isHovGeo   = hoveredRegion === regionKey;

              const fillDefault = isActive   ? svcColor + '77'
                                : isInactive ? svcColor + '18'
                                : isHovGeo   ? svcColor + '55'
                                : isService  ? svcColor + '33'
                                :              '#27272a';

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={isService ? () => handleRegionClick(regionKey) : undefined}
                  onMouseEnter={isService ? () => setHoveredRegion(regionKey) : undefined}
                  onMouseLeave={isService ? () => setHoveredRegion(null) : undefined}
                  style={{
                    default: {
                      fill: fillDefault,
                      stroke: isService ? svcColor : '#3f3f46',
                      strokeWidth: isActive ? 2.5 : isService ? 1.5 : 0.8,
                      outline: 'none',
                      cursor: isService ? 'pointer' : 'default',
                    },
                    hover: {
                      fill: isInactive ? svcColor + '33' : isService ? svcColor + '66' : '#3f3f46',
                      stroke: isService ? svcColor : '#52525b',
                      strokeWidth: isService ? 2 : 0.8,
                      outline: 'none',
                      cursor: isService ? 'pointer' : 'default',
                    },
                    pressed: { outline: 'none' },
                  }}
                />
              );
            });
          }}
        </Geographies>

        {/* 지역 대표 마커 — 클릭 시 필터 */}
        {REGION_MAP.map(r => {
          const isHov    = hoveredRegion === r.key;
          const isActive = region === r.key;
          return (
            <Marker
              key={`rgn-${r.key}`}
              coordinates={r.coords}
              onMouseEnter={() => setHoveredRegion(r.key)}
              onMouseLeave={() => setHoveredRegion(null)}
              onClick={() => handleRegionClick(r.key)}
            >
              <circle r={isHov || isActive ? 24 : 17} fill={r.color} fillOpacity={0.13}>
                <animate attributeName="r"            from={isHov || isActive ? 24 : 17} to={isHov || isActive ? 36 : 28} dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="fill-opacity" from="0.15" to="0" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <circle
                r={isActive ? 11 : isHov ? 10 : 7}
                fill={isActive ? '#fff' : r.color}
                stroke={r.color}
                strokeWidth={isActive ? 2.5 : 1.5}
                style={{ cursor: 'pointer', transition: 'all .2s' }}
              />
              <text
                textAnchor="middle" y={-19}
                style={{
                  fontSize: isActive || isHov ? '13px' : '11px',
                  fontWeight: 700,
                  fill: r.color,
                  paintOrder: 'stroke',
                  stroke: '#18181b',
                  strokeWidth: 3,
                  transition: 'font-size .2s',
                  pointerEvents: 'none',
                }}
              >
                {r.label[lang] || r.label.ko}
              </text>
            </Marker>
          );
        })}
      </ComposableMap>

      {/* ── 범례 (클릭 가능) ── */}
      <div className="flex flex-wrap justify-center gap-3 mt-2 mb-6">
        {REGION_MAP.map(r => (
          <button
            key={r.key}
            onClick={() => handleRegionClick(r.key)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all"
            style={{
              background: region === r.key ? r.color + '44' : r.color + '22',
              border: `1px solid ${region === r.key ? r.color : r.color + '55'}`,
              color: r.color,
              boxShadow: region === r.key ? `0 0 10px ${r.color}44` : 'none',
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
            {r.label[lang] || r.label.ko}
            <span className="opacity-70">· {storeCounts[r.key] || 0}{t('storeMap.storeCountLabel')}</span>
          </button>
        ))}
      </div>

      {/* ── 상점 목록 ── */}
      <div>
        {/* 섹션 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {activeRegionData ? (
              <span
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{ color: activeRegionData.color, background: activeRegionData.color + '22', border: `1px solid ${activeRegionData.color}44` }}
              >
                {activeRegionData.label[lang] || activeRegionData.label.ko}
              </span>
            ) : (
              <span className="text-sm font-bold text-zinc-300">{t('storeMap.regionAll')}</span>
            )}
            <span className="text-xs text-zinc-500">{t('storeMap.certifiedCount', { count: filtered.length })}</span>
          </div>
          {region !== '전체' && (
            <button
              onClick={() => { setRegion('전체'); setSearch(''); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ✕ {t('storeMap.regionAll')}
            </button>
          )}
        </div>

        {/* 빈 상태 */}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-zinc-500 text-sm">
            {t('storeMap.noStores')}
          </div>
        )}

        {/* 상점 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((store, i) => {
              const color = regionColor(store.region);
              const rLabel = REGION_MAP.find(r => r.key === store.region);
              return (
                <motion.div
                  key={store.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-4 flex flex-col gap-2 hover:border-opacity-100 transition-all"
                  style={{ '--tw-border-opacity': 1 }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = color + '88'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = ''}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ color, background: color + '22' }}
                    >
                      {rLabel ? (rLabel.label[lang] || rLabel.label.ko) : store.region}
                    </span>
                    <span className="text-xs text-emerald-400 font-semibold">✅ {t('storeMap.certified')}</span>
                  </div>

                  <p className="font-bold text-zinc-100 text-base leading-snug">
                    🏪 {loc(store, 'name', lang)}
                  </p>
                  <p className="text-xs text-zinc-400">📍 {loc(store, 'location', lang)}</p>
                  <p className="text-xs text-zinc-500">🛍️ {t('storeMap.productCount', { count: store.product_count })}</p>

                  <button
                    onClick={() => visitStore(store)}
                    className="mt-1 w-full py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                    style={{ background: color }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    {t('storeMap.viewStore')}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
