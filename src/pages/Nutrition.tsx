import React, { useState, useEffect } from 'react';
import { ChevronLeft, Search, ChevronRight, X, AlertTriangle, Info } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { MEAT_DATABASE, SUPPLEMENTS, MeatNutrient, Supplement } from '../data/mock';
import {
  CATEGORY_ORDER,
  ROLE_META,
  IngredientNutrients,
  formatIngredientNutrientValue,
  getConfidenceBadgeInfo,
} from '../lib/nutritionEngine';

const INGREDIENT_DETAIL_FIELDS: Array<{
  key: keyof IngredientNutrients;
  label: string;
  unit: string;
  decimals?: number;
}> = [
  { key: 'kcal', label: '热量 (ME)', unit: 'kcal', decimals: 1 },
  { key: 'protein_g', label: '蛋白质', unit: 'g', decimals: 2 },
  { key: 'fat_g', label: '脂肪', unit: 'g', decimals: 2 },
  { key: 'water_g', label: '水分', unit: 'g', decimals: 2 },
  { key: 'carb_g', label: '碳水化合物', unit: 'g', decimals: 2 },
  { key: 'calcium_mg', label: '钙 (Ca)', unit: 'mg', decimals: 2 },
  { key: 'phosphorus_mg', label: '磷 (P)', unit: 'mg', decimals: 2 },
  { key: 'potassium_mg', label: '钾 (K)', unit: 'mg', decimals: 2 },
  { key: 'sodium_mg', label: '钠 (Na)', unit: 'mg', decimals: 2 },
  { key: 'magnesium_mg', label: '镁 (Mg)', unit: 'mg', decimals: 2 },
  { key: 'iron_mg', label: '铁 (Fe)', unit: 'mg', decimals: 2 },
  { key: 'zinc_mg', label: '锌 (Zn)', unit: 'mg', decimals: 2 },
  { key: 'copper_mg', label: '铜 (Cu)', unit: 'mg', decimals: 3 },
  { key: 'manganese_mg', label: '锰 (Mn)', unit: 'mg', decimals: 3 },
  { key: 'iodine_ug', label: '碘 (I)', unit: 'μg', decimals: 2 },
  { key: 'selenium_ug', label: '硒 (Se)', unit: 'μg', decimals: 2 },
  { key: 'taurine_mg', label: '牛磺酸', unit: 'mg', decimals: 2 },
  { key: 'choline_mg', label: '胆碱', unit: 'mg', decimals: 2 },
  { key: 'epa_mg', label: 'EPA', unit: 'mg', decimals: 2 },
  { key: 'dha_mg', label: 'DHA', unit: 'mg', decimals: 2 },
  { key: 'epa_dha_mg', label: 'EPA + DHA', unit: 'mg', decimals: 2 },
  { key: 'va_iu', label: '维生素 A', unit: 'IU', decimals: 1 },
  { key: 'vd_iu', label: '维生素 D', unit: 'IU', decimals: 1 },
  { key: 've_mg', label: '维生素 E (α-生育酚)', unit: 'mg', decimals: 2 },
  { key: 'vb1_mg', label: '维生素 B1', unit: 'mg', decimals: 3 },
  { key: 'vb2_mg', label: '维生素 B2', unit: 'mg', decimals: 3 },
  { key: 'vb3_mg', label: '维生素 B3 (烟酸)', unit: 'mg', decimals: 2 },
  { key: 'vb5_mg', label: '维生素 B5 (泛酸)', unit: 'mg', decimals: 3 },
  { key: 'vb6_mg', label: '维生素 B6', unit: 'mg', decimals: 3 },
  { key: 'vb7_ug', label: '维生素 B7 (生物素)', unit: 'μg', decimals: 2 },
  { key: 'vb9_ug', label: '维生素 B9 (叶酸)', unit: 'μg', decimals: 2 },
  { key: 'vb12_ug', label: '维生素 B12', unit: 'μg', decimals: 2 },
];

const SUPP_NUTRIENT_LABELS: Array<{
  key: keyof Supplement['nutrients'];
  label: string;
  unit: string;
}> = [
  { key: 'calcium_mg', label: '元素钙 (Ca)', unit: 'mg' },
  { key: 'potassium_mg', label: '钾 (K)', unit: 'mg' },
  { key: 'sodium_mg', label: '钠 (Na)', unit: 'mg' },
  { key: 'iodine_ug', label: '碘 (I)', unit: 'μg' },
  { key: 'taurine_mg', label: '牛磺酸', unit: 'mg' },
  { key: 'choline_mg', label: '元素胆碱', unit: 'mg' },
  { key: 'epa_mg', label: 'EPA', unit: 'mg' },
  { key: 'dha_mg', label: 'DHA', unit: 'mg' },
  { key: 'epa_dha_mg', label: 'EPA + DHA', unit: 'mg' },
  { key: 've_mg', label: '维生素 E (α-生育酚)', unit: 'mg' },
  { key: 'vb1_mg', label: '维生素 B1', unit: 'mg' },
  { key: 'vb2_mg', label: '维生素 B2', unit: 'mg' },
  { key: 'vb3_mg', label: '维生素 B3 (烟酸)', unit: 'mg' },
  { key: 'vb5_mg', label: '维生素 B5 (泛酸)', unit: 'mg' },
  { key: 'vb6_mg', label: '维生素 B6', unit: 'mg' },
  { key: 'vb7_ug', label: '维生素 B7 (生物素)', unit: 'μg' },
  { key: 'vb9_ug', label: '维生素 B9 (叶酸)', unit: 'μg' },
  { key: 'vb12_ug', label: '维生素 B12', unit: 'μg' },
];

const MeatDetailModal = ({ meat, onClose }: { meat: MeatNutrient; onClose: () => void }) => {
  const roleInfo = ROLE_META[meat.role] || ROLE_META.red_meat;
  const confidence = getConfidenceBadgeInfo(meat);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}>
      <div className="bg-white w-full sm:w-[420px] rounded-t-3xl sm:rounded-3xl p-6 pb-8 max-h-[88vh] flex flex-col shadow-xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-3 shrink-0 gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-xl shrink-0">
              {roleInfo.icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-stone-800 leading-snug">{meat.name}</h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleInfo.badgeBg} ${roleInfo.badgeText}`}>
                  {roleInfo.label}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${confidence.className}`}>
                  {confidence.fullLabel}
                </span>
                {meat.state && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                    {meat.state}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {confidence.isProxy && (
          <div className="mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <span className="font-bold">近似估算数据，建议优先选用实测肉类。</span>
              {meat.match_status && <span className="block text-[11px] text-amber-700/90 mt-0.5">{meat.match_status}</span>}
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1 pr-2 -mr-2">
          <div className="space-y-0">
            {meat.dry_matter_g !== null && meat.dry_matter_g !== undefined && (
              <div className="flex justify-between items-center py-2.5 border-b border-stone-100">
                <span className="text-stone-500 text-sm">干物质 (DM)</span>
                <span className="text-stone-800 font-medium text-sm">{meat.dry_matter_g} g</span>
              </div>
            )}
            {INGREDIENT_DETAIL_FIELDS.map((field) => {
              const formatted = formatIngredientNutrientValue(meat, field.key, field.unit, field.decimals ?? 2);
              return (
                <div key={field.key} className="flex justify-between items-center py-2.5 border-b border-stone-100 last:border-0">
                  <span className="text-stone-500 text-sm">{field.label}</span>
                  {formatted.isMissing ? (
                    <span className="text-stone-400 italic text-xs bg-stone-50 px-2 py-0.5 rounded">未报告</span>
                  ) : formatted.isTrace ? (
                    <span className="text-amber-700 font-medium text-xs bg-amber-50 px-2 py-0.5 rounded">微量 (Tr)</span>
                  ) : (
                    <span className="text-stone-800 font-medium text-sm">{formatted.text}</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 rounded-2xl bg-stone-50 border border-stone-100 space-y-1.5 text-[11px] text-stone-500">
            <div className="flex justify-between">
              <span>主数据源编号</span>
              <span className="font-medium text-stone-700">{meat.source_code || '—'}</span>
            </div>
            {meat.taurine_source && (
              <div className="flex justify-between gap-3">
                <span className="shrink-0">牛磺酸来源</span>
                <span className="text-right text-stone-600">{meat.taurine_source}</span>
              </div>
            )}
            {meat.choline_source && (
              <div className="flex justify-between gap-3">
                <span className="shrink-0">胆碱来源</span>
                <span className="text-right text-stone-600">{meat.choline_source}</span>
              </div>
            )}
            {meat.source_note && (
              <p className="pt-1 border-t border-stone-200/70 leading-relaxed text-[10px] text-stone-400">
                {meat.source_note}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-100 text-center shrink-0">
          <span className="text-xs text-stone-400 bg-stone-50 px-4 py-1.5 rounded-full">
            以上数据按每 100g 生鲜可食部计 · 缺测项标为“未报告”
          </span>
        </div>
      </div>
    </div>
  );
};

const SuppDetailModal = ({ supp, onClose }: { supp: Supplement; onClose: () => void }) => {
  const suppIcon =
    supp.type === 'fish_oil' ? '🐟' :
    supp.type === 've' ? '✨' :
    supp.type === 'vb' ? '⚡' :
    supp.type === 'calcium' ? '🦴' :
    supp.type === 'taurine' ? '🐂' :
    supp.type === 'iodine' ? '🧂' : '💊';

  const rows = SUPP_NUTRIENT_LABELS.map((item) => {
    const val = supp.nutrients[item.key];
    const isUnquantified = supp.unquantified_fields.includes(item.key);
    return { ...item, val, isUnquantified };
  }).filter((row) => row.isUnquantified || (row.val !== null && row.val !== undefined && row.val > 0));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}>
      <div className="bg-white w-full sm:w-[420px] rounded-t-3xl sm:rounded-3xl p-6 pb-8 max-h-[85vh] flex flex-col shadow-xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4 shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-xl shrink-0">
              {suppIcon}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-stone-800 leading-snug">{supp.name}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFFAF5] text-[#FF7B4A] border border-orange-100 font-medium">
                  {supp.category}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                  核算基准：{supp.unit_label}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-2 -mr-2">
          <div className="space-y-0">
            {rows.length > 0 ? rows.map((item) => (
              <div key={item.key} className="flex justify-between items-center py-3 border-b border-stone-100 last:border-0">
                <span className="text-stone-500 text-sm">{item.label}</span>
                {item.isUnquantified ? (
                  <span className="text-amber-700 font-medium text-xs bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                    未定量（不计入）
                  </span>
                ) : (
                  <span className="text-stone-800 font-medium text-sm">
                    {item.val} {item.unit}
                  </span>
                )}
              </div>
            )) : (
              <div className="py-8 text-center text-stone-400 text-sm">暂无详细营养数据</div>
            )}
          </div>

          {supp.note && (
            <div className="mt-4 p-3 rounded-2xl bg-[#FFFAF5] border border-orange-100 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#FF7B4A] shrink-0 mt-0.5" />
              <p className="text-xs text-stone-600 leading-relaxed">{supp.note}</p>
            </div>
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-stone-100 text-center shrink-0">
          <span className="text-xs text-stone-400 bg-stone-50 px-4 py-1.5 rounded-full">
            以上数据以 {supp.unit_label}（{supp.unit}）为单一核算基准
          </span>
        </div>
      </div>
    </div>
  );
};

export default function Nutrition() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialType = queryParams.get('type') === 'supplements' ? 'supplements' : 'ingredients';

  const [activeTab, setActiveTab] = useState<'ingredients' | 'supplements'>(initialType);
  const [selectedMeat, setSelectedMeat] = useState<MeatNutrient | null>(null);
  const [selectedSupp, setSelectedSupp] = useState<Supplement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSuppCategory, setActiveSuppCategory] = useState('all');
  const [activeSidebarGroup, setActiveSidebarGroup] = useState<string>('');

  useEffect(() => {
    setActiveTab(initialType);
  }, [initialType]);

  const categories = [
    { id: 'all', name: '全部', icon: '🥩' },
    { id: 'white_meat', name: '白肉', icon: '🍗' },
    { id: 'red_meat', name: '红肉', icon: '🥩' },
    { id: 'heart', name: '心脏', icon: '❤️' },
    { id: 'fish', name: '鱼类', icon: '🐟' },
    { id: 'mussel', name: '青口贝', icon: '🦪' },
    { id: 'liver', name: '肝脏', icon: '🩸' },
    { id: 'other_organ', name: '其他内脏', icon: '🍖' },
    { id: 'egg', name: '蛋类', icon: '🥚' },
    { id: 'fat', name: '油脂', icon: '🧈' },
  ];

  const suppCategories = [
    { id: 'all', name: '全部', icon: '💊' },
    { id: 'calcium', name: '钙粉', icon: '🦴' },
    { id: 'fish_oil', name: '鱼油', icon: '🐟' },
    { id: 'iodine', name: '碘/钾', icon: '🧂' },
    { id: 'vb', name: '复合维B', icon: '⚡' },
    { id: 've', name: '维E', icon: '✨' },
    { id: 'taurine', name: '牛磺酸', icon: '🐂' },
  ];

  const q = searchQuery.trim().toLowerCase();

  const filteredMeats = MEAT_DATABASE.filter(meat => {
    const matchesSearch =
      !q ||
      meat.name.toLowerCase().includes(q) ||
      meat.category.toLowerCase().includes(q) ||
      (meat.source_code && meat.source_code.toLowerCase().includes(q));
    const matchesCategory = activeCategory === 'all' || meat.role === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedMeats = filteredMeats.reduce((acc, meat) => {
    const group = meat.category || '其他';
    if (!acc[group]) acc[group] = [];
    acc[group].push(meat);
    return acc;
  }, {} as Record<string, MeatNutrient[]>);

  const sortedGroups = Object.entries(groupedMeats).sort(([a], [b]) => {
    const indexA = CATEGORY_ORDER.indexOf(a);
    const indexB = CATEGORY_ORDER.indexOf(b);
    return (indexA !== -1 ? indexA : 99) - (indexB !== -1 ? indexB : 99);
  });

  useEffect(() => {
    if (activeTab !== 'ingredients' || sortedGroups.length === 0) return;

    const container = document.querySelector('main');
    if (!container) return;

    const handleScroll = () => {
      let currentGroup = sortedGroups[0][0];
      for (const [groupName] of sortedGroups) {
        const anchor = document.getElementById(`group-anchor-${groupName}`);
        if (anchor) {
          const rect = anchor.getBoundingClientRect();
          if (rect.top <= 260) {
            currentGroup = groupName;
          }
        }
      }
      setActiveSidebarGroup(prev => prev !== currentGroup ? currentGroup : prev);
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeTab, sortedGroups]);

  const filteredSupps = SUPPLEMENTS.filter(supp => {
    const matchesSearch =
      !q ||
      supp.name.toLowerCase().includes(q) ||
      supp.category.toLowerCase().includes(q) ||
      supp.brand.toLowerCase().includes(q);
    const matchesCategory = activeSuppCategory === 'all' || supp.type === activeSuppCategory;
    return matchesSearch && matchesCategory;
  });

  const scrollToGroup = (groupName: string) => {
    setActiveSidebarGroup(groupName);
    const anchor = document.getElementById(`group-anchor-${groupName}`);
    const container = document.querySelector('main');
    if (anchor && container) {
      const containerTop = container.getBoundingClientRect().top;
      const anchorTop = anchor.getBoundingClientRect().top;
      const targetY = container.scrollTop + (anchorTop - containerTop) - 200;
      container.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-stone-50 min-h-screen pb-24">
      <header className="px-4 h-14 flex items-center justify-between bg-white sticky top-0 z-30 shadow-sm shrink-0">
        <Link to="/" className="text-stone-800 hover:text-stone-600 p-1">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-lg font-bold text-stone-900 absolute left-1/2 -translate-x-1/2">
          {activeTab === 'ingredients' ? `食材数据 (${MEAT_DATABASE.length})` : `营养剂数据 (${SUPPLEMENTS.length})`}
        </h1>
        <div className="w-8"></div>
      </header>

      <div className="sticky top-14 z-20 bg-stone-50/95 backdrop-blur-md pt-4 px-4 pb-2 border-b border-stone-200/50 shadow-sm shrink-0">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            placeholder={activeTab === 'ingredients' ? '搜索 176 项食材名称、动物分类...' : '搜索 10 款补剂名称或品牌...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-stone-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7B4A]/20 shadow-sm"
          />
        </div>

        {activeTab === 'ingredients' && (
          <div className="flex overflow-x-auto gap-5 pb-2 scrollbar-hide px-1">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="flex flex-col items-center min-w-[48px] gap-2 relative shrink-0"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-colors ${activeCategory === cat.id ? 'bg-[#FF7B4A] text-white shadow-md' : 'bg-white text-stone-600 shadow-sm border border-stone-100'}`}>
                  {cat.icon}
                </div>
                <span className={`text-xs whitespace-nowrap ${activeCategory === cat.id ? 'text-[#FF7B4A] font-medium' : 'text-stone-500'}`}>{cat.name}</span>
                {activeCategory === cat.id && (
                  <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-[#FF7B4A]"></div>
                )}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'supplements' && (
          <div className="flex overflow-x-auto gap-5 pb-2 scrollbar-hide px-1">
            {suppCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveSuppCategory(cat.id)}
                className="flex flex-col items-center min-w-[48px] gap-2 relative shrink-0"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-colors ${activeSuppCategory === cat.id ? 'bg-[#FF7B4A] text-white shadow-md' : 'bg-white text-stone-600 shadow-sm border border-stone-100'}`}>
                  {cat.icon}
                </div>
                <span className={`text-xs whitespace-nowrap ${activeSuppCategory === cat.id ? 'text-[#FF7B4A] font-medium' : 'text-stone-500'}`}>{cat.name}</span>
                {activeSuppCategory === cat.id && (
                  <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-[#FF7B4A]"></div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="relative pb-6">
          {activeTab === 'ingredients' ? (
            sortedGroups.length > 0 ? (
              <div className="flex items-start gap-3">
                {/* 侧边栏 */}
                <div className="sticky top-[200px] w-14 shrink-0 flex flex-col gap-1 z-10 max-h-[calc(100vh-240px)] overflow-y-auto scrollbar-hide">
                  {sortedGroups.map(([groupName]) => (
                    <button
                      key={`sidebar-${groupName}`}
                      onClick={() => scrollToGroup(groupName)}
                      className={`text-center px-1 py-2 text-[11px] font-medium rounded-xl transition-colors shrink-0 ${
                        activeSidebarGroup === groupName
                          ? 'bg-white text-[#FF7B4A] shadow-sm border border-stone-100'
                          : 'text-stone-500 hover:bg-stone-100'
                      }`}
                    >
                      {groupName.length > 3 ? groupName.slice(0, 2) : groupName}
                    </button>
                  ))}
                </div>

                {/* 列表内容 */}
                <div className="flex-1 min-w-0 space-y-6">
                  {sortedGroups.map(([groupName, meats]) => (
                    <div key={groupName} id={`group-anchor-${groupName}`} className="scroll-mt-[200px]">
                      <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-[#FF7B4A] rounded-full inline-block"></span>
                          {groupName}
                        </span>
                        <span className="text-[11px] font-normal text-stone-400">{meats.length} 项</span>
                      </h3>
                      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-stone-100/50">
                        {meats.map((meat, idx) => {
                          const roleInfo = ROLE_META[meat.role] || ROLE_META.red_meat;
                          const confidence = getConfidenceBadgeInfo(meat);
                          return (
                            <div
                              key={meat.id}
                              onClick={() => setSelectedMeat(meat)}
                              className={`flex justify-between items-center p-3.5 cursor-pointer hover:bg-stone-50 transition-colors ${idx !== meats.length - 1 ? 'border-b border-stone-50' : ''}`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                                <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-xl border border-stone-100/50 shrink-0">
                                  {roleInfo.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-stone-800 text-sm truncate">{meat.name}</div>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    <span className="text-[11px] text-stone-400">{meat.nutrients.kcal} kcal / 100g</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${confidence.className}`}>
                                      {confidence.shortLabel}
                                    </span>
                                  </div>
                                  {confidence.isProxy && (
                                    <div className="text-[10px] text-amber-700 mt-1 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3 shrink-0 text-amber-600" />
                                      <span className="truncate">近似估算数据，建议优先选用实测肉类</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-xs text-[#FF7B4A] bg-[#FFFAF5] border border-orange-100 px-2 py-1 rounded-md whitespace-nowrap">详情</span>
                                <ChevronRight className="w-4 h-4 text-stone-300" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-stone-500">没有找到匹配的食材</div>
            )
          ) : (
            filteredSupps.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-stone-100/50">
                {filteredSupps.map((supp, idx) => (
                  <div
                    key={supp.id}
                    onClick={() => setSelectedSupp(supp)}
                    className={`flex justify-between items-center p-4 cursor-pointer hover:bg-stone-50 transition-colors ${idx !== filteredSupps.length - 1 ? 'border-b border-stone-50' : ''}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-xl border border-stone-100/50 shrink-0">
                        {suppCategories.find(c => c.id === supp.type)?.icon || '💊'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-stone-800 text-sm truncate">{supp.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-400">
                          <span>{supp.category}</span>
                          <span>·</span>
                          <span>{supp.unit_label}</span>
                          {supp.unquantified_fields.includes('ve_mg') && (
                            <span className="text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">VE未定量</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-[#FF7B4A] bg-[#FFFAF5] border border-orange-100 px-2 py-1 rounded-md whitespace-nowrap">详情</span>
                      <ChevronRight className="w-4 h-4 text-stone-300" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-stone-500">没有找到匹配的营养剂</div>
            )
          )}
        </div>
      </div>

      {selectedMeat && <MeatDetailModal meat={selectedMeat} onClose={() => setSelectedMeat(null)} />}
      {selectedSupp && <SuppDetailModal supp={selectedSupp} onClose={() => setSelectedSupp(null)} />}
    </div>
  );
}
