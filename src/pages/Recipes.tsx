import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  ChevronRight,
  Activity,
  Info,
  Save,
  BookOpen,
  Edit2,
  Copy,
  Trash2,
  MoreVertical,
  Check,
  X,
  RefreshCw,
  Search,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import {
  MOCK_RECIPES,
  MOCK_CATS,
  MOCK_INVENTORY,
  MEAT_DATABASE,
  SUPPLEMENTS,
  Recipe,
  saveRecipes,
} from '../data/mock';
import {
  CATEGORY_ORDER,
  ROLE_META,
  StandardType,
  LifeStage,
  calculateRecipeNutrition,
  recommendSupplements,
  computeRecommendedAmountForSupplement,
  generateAutoRecipeIngredients,
  getConfidenceBadgeInfo,
  getSupplementById,
  inferLifeStageFromCats,
  searchIngredientsFuzzy,
  searchSupplementsFuzzy,
  parseNaturalIngredientsText,
  ParsedNaturalIngredientItem,
  NutrientEvaluation,
} from '../lib/nutritionEngine';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { setUnsavedRecipeGuard } from '../lib/unsavedGuard';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const ROLE_FILTER_TABS = [
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

const formatSafeDate = (dateStr: string | undefined) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '未知时间';
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return '未知时间';
  }
};

function formatBoundsText(ev: NutrientEvaluation): string {
  if (ev.key === 'ca_p_ratio') {
    return '1.1 ~ 1.4 : 1';
  }
  const parts: string[] = [];
  if (ev.min !== null) parts.push(`≥ ${ev.min}`);
  if (ev.max !== null) parts.push(`≤ ${ev.max}${ev.maxLabel ? ` (${ev.maxLabel})` : ''}`);
  if (parts.length === 0) return '参考值';
  return `${parts.join(' ~ ')} ${ev.unit}`.trim();
}

function TrafficLightBadge({ ev }: { ev: NutrientEvaluation }) {
  if (ev.status === 'neutral') {
    return (
      <span className="inline-flex items-center justify-center px-2 h-6 rounded-full bg-stone-100 text-stone-400 text-xs">
        —
      </span>
    );
  }
  if (ev.status === 'green') {
    return (
      <span
        title="达标"
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold"
      >
        ✓
      </span>
    );
  }
  if (ev.status === 'yellow') {
    return (
      <span
        title={ev.reason === 'high_warn' ? '略高于推荐范围' : '略低于推荐值'}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold"
      >
        {ev.reason === 'high_warn' ? '↑' : '↓'}
      </span>
    );
  }
  return (
    <span
      title={ev.reason === 'high_danger' ? '超过安全上限 (SUL/Max)' : '严重低于推荐值'}
      className="inline-flex items-center justify-center px-1.5 min-w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold"
    >
      {ev.reason === 'high_danger' ? '↑超标' : '↓'}
    </span>
  );
}

interface IngredientPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isReplacing: boolean;
  existingMeatIds?: string[];
  initialSelectedIds: string[];
  initialRoleFilter: string;
  onConfirm: (selectedIds: string[]) => void;
}

function IngredientPickerModal({
  isOpen,
  onClose,
  isReplacing,
  existingMeatIds = [],
  initialSelectedIds,
  initialRoleFilter,
  onConfirm,
}: IngredientPickerModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [roleFilter, setRoleFilter] = useState<string>(initialRoleFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSidebarGroup, setActiveSidebarGroup] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(initialSelectedIds);
      setRoleFilter(initialRoleFilter);
      setSearchQuery('');
    }
  }, [isOpen, initialSelectedIds, initialRoleFilter]);

  const query = searchQuery.trim();
  const roleMatchedMeats = MEAT_DATABASE.filter(
    (m) => roleFilter === 'all' || m.role === roleFilter
  );
  const filteredMeats = query ? searchIngredientsFuzzy(query, roleMatchedMeats) : roleMatchedMeats;

  const groupedMeats = filteredMeats.reduce((acc, meat) => {
    const group = meat.category || '其他';
    if (!acc[group]) acc[group] = [];
    acc[group].push(meat);
    return acc;
  }, {} as Record<string, typeof MEAT_DATABASE>);

  const sortedGroups = Object.entries(groupedMeats).sort(([a], [b]) => {
    const indexA = CATEGORY_ORDER.indexOf(a);
    const indexB = CATEGORY_ORDER.indexOf(b);
    return (indexA !== -1 ? indexA : 99) - (indexB !== -1 ? indexB : 99);
  });

  useEffect(() => {
    if (!isOpen || sortedGroups.length === 0) return;

    const container = document.getElementById('shared-picker-scroll-container');
    if (!container) return;

    const handleScroll = () => {
      let currentGroup = sortedGroups[0][0];
      for (const [groupName] of sortedGroups) {
        const anchor = document.getElementById(`shared-picker-group-${groupName}`);
        if (anchor) {
          const rect = anchor.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          if (rect.top - containerRect.top <= 60) {
            currentGroup = groupName;
          }
        }
      }
      setActiveSidebarGroup((prev) => (prev !== currentGroup ? currentGroup : prev));
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [isOpen, sortedGroups]);

  const scrollToGroup = (groupName: string) => {
    setActiveSidebarGroup(groupName);
    const anchor = document.getElementById(`shared-picker-group-${groupName}`);
    const container = document.getElementById('shared-picker-scroll-container');
    if (anchor && container) {
      const containerTop = container.getBoundingClientRect().top;
      const anchorTop = anchor.getBoundingClientRect().top;
      const targetY = container.scrollTop + (anchorTop - containerTop) - 20;
      container.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:w-[500px] rounded-t-3xl sm:rounded-3xl p-6 pb-8 max-h-[85vh] flex flex-col shadow-xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="text-xl font-bold text-stone-800">{isReplacing ? '替换食材' : '添加食材'}</h3>
          <button
            onClick={onClose}
            className="p-2 bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-4 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            placeholder="模糊搜索 176 项食材（如 兔脊 / 鸡胸 / 三文鱼）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7B4A]/20 shadow-sm"
          />
        </div>

        <div className="flex overflow-x-auto gap-4 pb-2 mb-4 scrollbar-hide px-1 shrink-0">
          {ROLE_FILTER_TABS.map((c) => (
            <button
              key={c.id}
              onClick={() => setRoleFilter(c.id)}
              className="flex flex-col items-center min-w-[48px] gap-2 relative shrink-0"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-colors ${
                  roleFilter === c.id
                    ? 'bg-[#FF7B4A] text-white shadow-md'
                    : 'bg-white text-stone-600 shadow-sm border border-stone-100'
                }`}
              >
                {c.icon}
              </div>
              <span
                className={`text-xs whitespace-nowrap ${
                  roleFilter === c.id ? 'text-[#FF7B4A] font-medium' : 'text-stone-500'
                }`}
              >
                {c.name}
              </span>
              {roleFilter === c.id && (
                <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-[#FF7B4A]"></div>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 flex gap-3">
          {sortedGroups.length > 0 && (
            <div className="w-14 shrink-0 flex flex-col gap-1 overflow-y-auto scrollbar-hide py-2">
              {sortedGroups.map(([groupName]) => (
                <button
                  key={`shared-picker-sidebar-${groupName}`}
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
          )}

          <div
            id="shared-picker-scroll-container"
            className="flex-1 overflow-y-auto min-h-0 bg-white rounded-2xl shadow-sm border border-stone-100/50 relative"
          >
            {sortedGroups.length > 0 ? (
              <div className="space-y-4 p-2">
                {sortedGroups.map(([groupName, meats]) => (
                  <div key={groupName} id={`shared-picker-group-${groupName}`}>
                    <h4 className="text-xs font-bold text-stone-500 mb-2 px-2 sticky top-0 bg-white/90 backdrop-blur py-1 z-10">
                      {groupName}
                    </h4>
                    <div className="space-y-1">
                      {meats.map((meat) => {
                        const roleInfo = ROLE_META[meat.role] || ROLE_META.red_meat;
                        const confidence = getConfidenceBadgeInfo(meat);
                        const isAlreadyAdded = existingMeatIds.includes(meat.id);

                        return (
                          <label
                            key={meat.id}
                            className={`flex justify-between items-center p-2.5 rounded-xl transition-colors border border-transparent gap-2 ${
                              isAlreadyAdded
                                ? 'opacity-50 cursor-not-allowed bg-stone-50/70'
                                : 'cursor-pointer hover:bg-stone-50 hover:border-stone-100'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-stone-50 flex items-center justify-center text-lg border border-stone-100/50 shrink-0">
                                {roleInfo.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-stone-800 text-sm truncate">{meat.name}</div>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[11px] text-stone-400">
                                    {meat.nutrients.kcal} kcal/100g
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded ${confidence.className}`}>
                                    {confidence.shortLabel}
                                  </span>
                                </div>
                                {confidence.isProxy && (
                                  <div className="text-[10px] text-amber-700 mt-0.5 truncate">
                                    ⚠ 近似估算数据，建议优先选用实测肉类
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center shrink-0">
                              {isAlreadyAdded ? (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-400 font-medium">
                                  已添加
                                </span>
                              ) : isReplacing ? (
                                <input
                                  type="radio"
                                  name="shared_meat_picker"
                                  checked={selectedIds.includes(meat.id)}
                                  onChange={() => setSelectedIds([meat.id])}
                                  className="text-[#FF7B4A] focus:ring-[#FF7B4A]/20 w-5 h-5 border-stone-300"
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(meat.id)}
                                  onChange={() => toggleSelection(meat.id)}
                                  className="text-[#FF7B4A] focus:ring-[#FF7B4A]/20 rounded w-5 h-5 border-stone-300"
                                />
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-stone-500 text-sm">没有找到匹配的食材</div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-stone-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(selectedIds)}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-[#FF7B4A] hover:bg-orange-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

interface SupplementPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isReplacing: boolean;
  existingSupplementIds: string[];
  initialSelectedIds: string[];
  onConfirm: (selectedIds: string[]) => void;
}

function SupplementPickerModal({
  isOpen,
  onClose,
  isReplacing,
  existingSupplementIds,
  initialSelectedIds,
  onConfirm,
}: SupplementPickerModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(initialSelectedIds);
      setSearchQuery('');
    }
  }, [isOpen, initialSelectedIds]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  if (!isOpen) return null;

  const visibleSupps = searchQuery.trim()
    ? searchSupplementsFuzzy(searchQuery, SUPPLEMENTS)
    : SUPPLEMENTS;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:w-[500px] rounded-t-3xl sm:rounded-3xl p-6 pb-8 max-h-[85vh] flex flex-col shadow-xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="text-xl font-bold text-stone-800">
            {isReplacing ? '更换营养补剂' : '添加营养补剂'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-4 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            placeholder="模糊搜索补剂（如 柠檬钙 / vb / 鱼油 / 牛磺酸）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7B4A]/20 shadow-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 bg-white rounded-2xl shadow-sm border border-stone-100/50">
          {visibleSupps.length > 0 ? (
            visibleSupps.map((supp, idx, arr) => {
              const isAlreadyAdded = existingSupplementIds.includes(supp.id);
              return (
                <label
                  key={supp.id}
                  className={`flex justify-between items-center p-4 transition-colors ${
                    isAlreadyAdded ? 'opacity-50 cursor-not-allowed bg-stone-50/70' : 'cursor-pointer hover:bg-stone-50'
                  } ${idx !== arr.length - 1 ? 'border-b border-stone-50' : ''}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                    <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-xl border border-stone-100/50 shrink-0">
                      💊
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-stone-800 text-sm truncate">{supp.name}</div>
                      <div className="text-xs text-stone-400 mt-0.5">
                        {supp.category} · {supp.unit_label}
                      </div>
                      {supp.note && (
                        <div className="text-[11px] text-[#FF7B4A] mt-1 flex items-start gap-1">
                          <Info className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>{supp.note}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center shrink-0">
                    {isAlreadyAdded ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-400 font-medium">
                        已添加
                      </span>
                    ) : isReplacing ? (
                      <input
                        type="radio"
                        name="shared_supp_picker"
                        checked={selectedIds.includes(supp.id)}
                        onChange={() => setSelectedIds([supp.id])}
                        className="text-[#FF7B4A] focus:ring-[#FF7B4A]/20 w-5 h-5 border-stone-300"
                      />
                    ) : (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(supp.id)}
                        onChange={() => toggleSelection(supp.id)}
                        className="text-[#FF7B4A] focus:ring-[#FF7B4A]/20 rounded w-5 h-5 border-stone-300"
                      />
                    )}
                  </div>
                </label>
              );
            })
          ) : (
            <div className="p-8 text-center text-stone-500 text-sm">没有找到匹配的营养剂</div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-stone-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(selectedIds)}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-[#FF7B4A] hover:bg-orange-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认并自动重算
          </button>
        </div>
      </div>
    </div>
  );
}

interface SmartIngredientParseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (items: ParsedNaturalIngredientItem[]) => void;
}

function SmartIngredientParseModal({ isOpen, onClose, onApply }: SmartIngredientParseModalProps) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parsed = parseNaturalIngredientsText(text);

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:w-[460px] rounded-t-3xl sm:rounded-3xl p-6 pb-8 max-h-[85vh] flex flex-col shadow-xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-3 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-stone-800 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-violet-600" />
              智能识别食材
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">像识别快递地址一样，粘贴食材与克重自动入方</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="示例：兔里脊500g兔腹肉500g 鸡心200克 猪肝50g 青口贝100g"
          className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none mb-3"
          autoFocus
        />

        {(parsed.matched.length > 0 || parsed.unmatched.length > 0) && (
          <div className="overflow-y-auto max-h-52 space-y-2 mb-4 pr-1">
            {parsed.matched.length > 0 && (
              <>
                <div className="text-xs font-semibold text-emerald-600">
                  已识别 {parsed.matched.length} 项食材：
                </div>
                {parsed.matched.map((item) => (
                  <div
                    key={item.meatId}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-50 border border-stone-100 text-xs"
                  >
                    <span className="font-medium text-stone-800 truncate pr-2">
                      {item.roleIcon} {item.name}
                    </span>
                    <span className="font-bold text-[#FF7B4A] shrink-0">{item.weight}g</span>
                  </div>
                ))}
              </>
            )}
            {parsed.unmatched.length > 0 && (
              <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                未识别片段：{parsed.unmatched.join('、')}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            disabled={parsed.matched.length === 0}
            onClick={() => onApply(parsed.matched)}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#FF7B4A] hover:bg-orange-600 rounded-xl transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
          >
            完成识别并添加{parsed.matched.length > 0 ? ` (${parsed.matched.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

function RecipeList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNoCatModal, setShowNoCatModal] = useState(false);
  const [, setForceRender] = useState(0);

  const handleOpenCreate = () => {
    if (MOCK_CATS.length === 0) {
      setShowNoCatModal(true);
      return;
    }
    navigate('/recipes/create');
  };

  const filteredRecipes = [...MOCK_RECIPES]
    .reverse()
    .filter((r) => {
      if (activeTab === 'active' && !r.isActive) return false;
      if (activeTab === 'completed' && (r.isActive || !r.endDate)) return false;
      if (activeTab === 'draft' && (r.isActive || r.endDate)) return false;
      const q = searchQuery.trim().toLowerCase();
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });

  const handleQuickStart = (e: React.MouseEvent, recipe: Recipe) => {
    e.preventDefault();
    e.stopPropagation();
    const now = new Date().toISOString();
    MOCK_RECIPES.forEach((r) => {
      if (r.isActive) {
        r.isActive = false;
        r.endDate = now;
      }
    });
    recipe.isActive = true;
    recipe.startDate = now;
    recipe.endDate = undefined;
    saveRecipes();
    setForceRender((n) => n + 1);
  };

  return (
    <div className="min-h-full bg-stone-50 flex flex-col pt-12 pb-24 px-5">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-stone-800">
          <span className="text-stone-400">🍽️</span>
          食谱管理
        </h1>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="bg-[#FF7B4A] text-white px-4 py-2 rounded-full font-medium shadow-sm hover:bg-orange-600 flex items-center gap-1 text-sm"
        >
          <Plus className="w-4 h-4" />
          新建食谱
        </button>
      </header>

      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-stone-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索食谱..."
          className="w-full bg-white border border-stone-100 rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7B4A]/20"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none">
        {['all', 'active', 'completed', 'draft'].map((tab) => {
          const isActive = activeTab === tab;
          let label = '';
          switch (tab) {
            case 'all': label = '全部'; break;
            case 'active': label = '执行中'; break;
            case 'completed': label = '已完成'; break;
            case 'draft': label = '草稿'; break;
          }
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                isActive ? 'bg-[#FF7B4A] text-white' : 'bg-white text-stone-500 border border-stone-100'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400 mt-10">
          <BookOpen className="w-16 h-16 mb-4 text-stone-200" />
          <p className="text-stone-500 font-medium mb-1">暂无食谱</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecipes.map((recipe) => {
            const recipeCats = MOCK_CATS.filter((c) => recipe.catIds.includes(c.id));
            const lifeStage: LifeStage = recipe.lifeStage || inferLifeStageFromCats(recipeCats);
            const calc = calculateRecipeNutrition(
              recipe.ingredients,
              recipe.supplements,
              recipe.standard || 'NRC',
              lifeStage
            );

            const proteinDisplay = Math.round(calc.macroME.proteinPct);
            const fatDisplay = Math.round(calc.macroME.fatPct);
            const carbDisplay = Math.max(0, 100 - proteinDisplay - fatDisplay);

            return (
              <Link
                key={recipe.id}
                to={`/recipes/${recipe.id}`}
                className="block bg-white rounded-3xl p-5 shadow-sm border border-stone-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-md font-medium',
                        recipe.isActive
                          ? 'bg-[#FFFAF5] text-[#FF7B4A] border border-orange-100'
                          : 'bg-stone-100 text-stone-500'
                      )}
                    >
                      {recipe.isActive ? '执行中' : recipe.endDate ? '已完成' : '草稿'}
                    </span>
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-medium">
                      {recipe.standard === 'AAFCO' ? 'AAFCO 2016/2026' : 'NRC 2006'} · {lifeStage === 'kitten' ? '幼猫' : '成猫'}
                    </span>
                    {calc.highRiskAlerts.length > 0 && (
                      <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-md font-medium">
                        ⚠ {calc.highRiskAlerts.length} 项超上限
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
                </div>

                <h2 className="text-lg font-bold text-stone-800 mb-2">{recipe.name}</h2>

                <div className="flex gap-2 mb-3 flex-wrap">
                  {recipeCats.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-1 bg-[#FFFAF5] border border-orange-100 px-2 py-1 rounded-md text-xs text-orange-600 font-medium"
                    >
                      <span>🐱</span> {cat.name}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-stone-500 mb-4 flex-wrap">
                  <span className="flex items-center gap-1">⌚ {recipe.days} 天周期</span>
                  <span className="flex items-center gap-1 text-[#FF7B4A]">
                    ✓ 已执行 {recipe.executedDays ?? 0} 天
                  </span>
                  <span>总量 {Math.round(calc.totalWeightG)}g</span>
                  <span>钙磷比 {calc.caPRatio.toFixed(2)}:1</span>
                </div>

                <div className="flex gap-2 flex-wrap mb-5">
                  {recipe.ingredients.slice(0, 4).map((item, idx) => {
                    const meat = MEAT_DATABASE.find((m) => m.id === item.meatId);
                    return (
                      <span key={idx} className="text-[11px] bg-stone-50 text-stone-500 px-2.5 py-1 rounded-full">
                        {meat ? meat.name.split('（')[0].split('(')[0].trim() : '未知食材'}
                      </span>
                    );
                  })}
                  {recipe.ingredients.length > 4 && (
                    <span className="text-[11px] bg-stone-50 text-stone-400 px-2.5 py-1 rounded-full">
                      +{recipe.ingredients.length - 4} 种
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-stone-500 font-medium">
                    <span>代谢能比例 (ME)</span>
                    <span>蛋白 {proteinDisplay}% · 脂肪 {fatDisplay}%</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 flex overflow-hidden">
                    <div className="bg-[#FF7B4A] h-2" style={{ width: `${proteinDisplay}%` }}></div>
                    <div className="bg-amber-400 h-2" style={{ width: `${fatDisplay}%` }}></div>
                    <div className="bg-emerald-500 h-2" style={{ width: `${carbDisplay}%` }}></div>
                  </div>
                  <div className="flex gap-4 text-[10px] text-stone-400 mt-1">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF7B4A]"></span>蛋白质
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>脂肪
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>碳水
                    </span>
                  </div>
                </div>

                {!recipe.isActive && (
                  <button
                    onClick={(e) => handleQuickStart(e, recipe)}
                    className="w-full mt-5 bg-[#FF7B4A] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors flex justify-center items-center gap-1"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                    开始执行
                  </button>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {showNoCatModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-5">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-xl border border-stone-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF7B4A] flex items-center justify-center mx-auto text-2xl">
              🐱
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-800 mb-1.5">请先填写猫咪档案</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                没有猫咪档案无法创建食谱，请先添加至少一只猫咪档案以自动匹配成猫/幼猫营养标准与过敏忌口。
              </p>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowNoCatModal(false)}
                className="flex-1 py-2.5 rounded-2xl bg-stone-100 text-stone-600 text-sm font-semibold hover:bg-stone-200 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNoCatModal(false);
                  navigate('/profile/cats/new');
                }}
                className="flex-1 py-2.5 rounded-2xl bg-[#FF7B4A] text-white text-sm font-bold shadow-sm hover:bg-orange-600 transition-colors"
              >
                去添加猫咪
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateOrEditRecipe() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const existingRecipe = isEditing ? MOCK_RECIPES.find((r) => r.id === id) : null;

  const [step, setStep] = useState(1);

  const [name, setName] = useState(existingRecipe?.name || '');
  const [selectedCats, setSelectedCats] = useState<string[]>(existingRecipe?.catIds || []);
  const [standard, setStandard] = useState<StandardType>(existingRecipe?.standard || 'NRC');
  const [lifeStage, setLifeStage] = useState<LifeStage>(existingRecipe?.lifeStage || 'adult');
  const [mode, setMode] = useState<'by_need' | 'by_inventory'>(
    existingRecipe?.mode === 'by_inventory' ? 'by_inventory' : 'by_need'
  );
  const [error, setError] = useState('');

  const initialDays = existingRecipe?.days?.toString() || '7';
  let initialDailyAmount = '150';
  if (existingRecipe) {
    const totalWeight = existingRecipe.ingredients.reduce((sum, item) => sum + item.weight, 0);
    initialDailyAmount = Math.round(totalWeight / Math.max(1, existingRecipe.days)).toString();
  }

  const [dailyAmount, setDailyAmount] = useState(initialDailyAmount);
  const [days, setDays] = useState(initialDays);

  const [previewIngredients, setPreviewIngredients] = useState<Array<{ meatId: string; weight: number | string }>>([]);
  const [previewSupplements, setPreviewSupplements] = useState<Array<{ supplementId: string; amount: number | string }>>([]);

  // Step 3 Picker Modal States
  const [showIngredientPicker, setShowIngredientPicker] = useState(false);
  const [replacingIngredientIdx, setReplacingIngredientIdx] = useState<number | null>(null);
  const [pickerInitialMeatIds, setPickerInitialMeatIds] = useState<string[]>([]);
  const [pickerInitialRole, setPickerInitialRole] = useState<string>('all');

  const [showSupplementPicker, setShowSupplementPicker] = useState(false);
  const [replacingSupplementIdx, setReplacingSupplementIdx] = useState<number | null>(null);
  const [pickerInitialSuppIds, setPickerInitialSuppIds] = useState<string[]>([]);
  const [showFullNutritionModal, setShowFullNutritionModal] = useState(false);
  const [showSmartParser, setShowSmartParser] = useState(false);
  const [showUnsavedLeaveModal, setShowUnsavedLeaveModal] = useState(false);

  const hasUnsavedDraft =
    isEditing || step >= 2 || name.trim().length > 0 || selectedCats.length > 0 || previewIngredients.length > 0;

  useEffect(() => {
    setUnsavedRecipeGuard(hasUnsavedDraft, '未保存食谱，确认返回？当前编辑内容将会丢失。');
    return () => {
      setUnsavedRecipeGuard(false);
    };
  }, [hasUnsavedDraft]);

  // 冰箱库存反推模式：汇总未过期可用库存克重
  const fridgeStockMap: Record<string, number> = {};
  if (mode === 'by_inventory') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    MOCK_INVENTORY.forEach((inv) => {
      const w = Number(inv.weight) || 0;
      if (w <= 0) return;
      if (inv.expiryDate) {
        const exp = new Date(inv.expiryDate);
        if (!isNaN(exp.getTime()) && exp.getTime() < todayStart.getTime()) return;
      }
      fridgeStockMap[inv.meatId] = (fridgeStockMap[inv.meatId] || 0) + w;
    });
  }

  const parsedPreviewIngredients = previewIngredients.map((i) => ({
    meatId: i.meatId,
    weight: typeof i.weight === 'string' ? parseFloat(i.weight) || 0 : i.weight,
  }));

  const parsedPreviewSupplements = previewSupplements.map((s) => ({
    supplementId: s.supplementId,
    amount: typeof s.amount === 'string' ? parseFloat(s.amount) || 0 : s.amount,
  }));

  const handleToggleCat = (catId: string) => {
    setSelectedCats((prev) => {
      const next = prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId];
      const cats = MOCK_CATS.filter((c) => next.includes(c.id));
      if (!isEditing) {
        setLifeStage(inferLifeStageFromCats(cats));
      }
      return next;
    });
  };

  const handleNextStep = () => {
    setError('');
    if (step === 1) {
      if (MOCK_CATS.length === 0) {
        setError('尚未填写猫咪档案，无法创建食谱，请先添加猫咪档案');
        return;
      }
      if (selectedCats.length === 0) {
        setError('请至少选择一只猫咪');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!name.trim()) {
        const catNames = selectedCats.map((cId) => MOCK_CATS.find((c) => c.id === cId)?.name).filter(Boolean).join('');
        setName(catNames ? `${catNames}的${standard}营养餐` : `我的${standard}营养餐`);
      }

      const totalDays = parseInt(days) || 7;
      const daily = parseInt(dailyAmount) || 150;
      const totalWeight = totalDays * daily;

      const selectedCatObjs = MOCK_CATS.filter((c) => selectedCats.includes(c.id));
      const combinedAllergies = Array.from(new Set(selectedCatObjs.flatMap((c) => c.allergies || [])));

      const generatedIngredients = existingRecipe?.ingredients
        ? existingRecipe.ingredients.map((i) => ({ ...i }))
        : generateAutoRecipeIngredients(totalWeight, {
            mode: mode === 'by_inventory' ? 'by_inventory' : 'custom',
            inventory: MOCK_INVENTORY,
            allergies: combinedAllergies,
          });

      const finalSupplements = existingRecipe?.supplements
        ? existingRecipe.supplements.map((s) => ({ ...s }))
        : recommendSupplements(generatedIngredients, standard, lifeStage);

      setPreviewIngredients(generatedIngredients);
      setPreviewSupplements(finalSupplements);
      setStep(3);
    } else if (step === 3) {
      const validIngs = parsedPreviewIngredients.filter((i) => i.weight > 0);
      if (validIngs.length === 0) {
        setError('请至少保留一种重量大于 0g 的食材');
        return;
      }
      setStep(4);
    }
  };

  // Step 3: Ingredient operations
  const handleOpenReplaceIngredient = (idx: number, role: string) => {
    setReplacingIngredientIdx(idx);
    setPickerInitialMeatIds([previewIngredients[idx].meatId]);
    setPickerInitialRole(role);
    setShowIngredientPicker(true);
  };

  const handleOpenAddIngredient = () => {
    setReplacingIngredientIdx(null);
    setPickerInitialMeatIds([]);
    setPickerInitialRole('all');
    setShowIngredientPicker(true);
  };

  const handleRemoveIngredient = (idx: number) => {
    setPreviewIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmIngredientPicker = (selectedIds: string[]) => {
    if (replacingIngredientIdx !== null) {
      if (selectedIds.length > 0) {
        const targetId = selectedIds[0];
        setPreviewIngredients((prev) => {
          const isDup = prev.some((item, idx) => idx !== replacingIngredientIdx && item.meatId === targetId);
          if (isDup) return prev;
          const next = [...prev];
          next[replacingIngredientIdx] = { ...next[replacingIngredientIdx], meatId: targetId };
          return next;
        });
      }
    } else {
      setPreviewIngredients((prev) => {
        const existingSet = new Set(prev.map((i) => i.meatId));
        const added = selectedIds
          .filter((meatId) => !existingSet.has(meatId))
          .map((meatId) => ({ meatId, weight: 0 }));
        return [...prev, ...added];
      });
    }
    setShowIngredientPicker(false);
  };

  const handleApplySmartParse = (matchedItems: ParsedNaturalIngredientItem[]) => {
    setPreviewIngredients((prev) => {
      const next = [...prev];
      matchedItems.forEach((item) => {
        const idx = next.findIndex((x) => x.meatId === item.meatId);
        if (idx !== -1) {
          const curW = typeof next[idx].weight === 'string' ? parseFloat(next[idx].weight) || 0 : next[idx].weight;
          next[idx] = { ...next[idx], weight: item.weight > 0 ? item.weight : curW };
        } else {
          next.push({ meatId: item.meatId, weight: item.weight });
        }
      });
      return next;
    });
    setShowSmartParser(false);
  };

  // Step 3 & Step 4: Supplement operations
  const handleAutoRecalcPreviewSupplements = () => {
    const recomputed = recommendSupplements(
      parsedPreviewIngredients,
      standard,
      lifeStage,
      previewSupplements
    );
    setPreviewSupplements(recomputed);
  };

  const handleOpenReplaceSupplement = (idx: number) => {
    setReplacingSupplementIdx(idx);
    setPickerInitialSuppIds([previewSupplements[idx].supplementId]);
    setShowSupplementPicker(true);
  };

  const handleOpenAddSupplement = () => {
    setReplacingSupplementIdx(null);
    setPickerInitialSuppIds([]);
    setShowSupplementPicker(true);
  };

  const handleRemoveSupplement = (idx: number) => {
    setPreviewSupplements((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmSupplementPicker = (selectedIds: string[]) => {
    const meatOnly = calculateRecipeNutrition(parsedPreviewIngredients, [], standard, lifeStage);
    if (replacingSupplementIdx !== null) {
      if (selectedIds.length > 0) {
        const newId = selectedIds[0];
        const supp = getSupplementById(newId);
        const recomputed = supp
          ? computeRecommendedAmountForSupplement(supp, meatOnly, standard, lifeStage)
          : 0;
        setPreviewSupplements((prev) => {
          const isDup = prev.some((s, idx) => idx !== replacingSupplementIdx && s.supplementId === newId);
          if (isDup) return prev;
          const next = [...prev];
          next[replacingSupplementIdx] = {
            supplementId: newId,
            amount: recomputed,
          };
          return next;
        });
      }
    } else {
      setPreviewSupplements((prev) => {
        const existingSet = new Set(prev.map((s) => s.supplementId));
        const added = selectedIds
          .filter((sId) => !existingSet.has(sId))
          .map((sId) => {
            const supp = getSupplementById(sId);
            const recomputed = supp
              ? computeRecommendedAmountForSupplement(supp, meatOnly, standard, lifeStage)
              : 0;
            return { supplementId: sId, amount: recomputed };
          });
        return [...prev, ...added];
      });
    }
    setShowSupplementPicker(false);
  };

  const handleSave = () => {
    if (MOCK_CATS.length === 0 || selectedCats.length === 0) {
      setError('尚未填写猫咪档案，无法创建食谱，请先添加猫咪档案');
      return;
    }
    const totalDays = parseInt(days) || 7;
    const validIngredients = parsedPreviewIngredients.filter((i) => i.weight > 0);
    if (validIngredients.length === 0) {
      setError('请至少保留一种重量大于 0g 的食材');
      return;
    }
    const validSupplements = parsedPreviewSupplements.filter((s) => s.amount > 0);

    const recipeData: Recipe = {
      id: isEditing ? existingRecipe!.id : `r${Date.now()}`,
      name: name.trim() || `我的${standard}营养餐`,
      catIds: selectedCats,
      standard,
      lifeStage,
      mode,
      days: totalDays,
      ingredients: validIngredients,
      supplements: validSupplements,
      createdAt: existingRecipe?.createdAt || new Date().toISOString().split('T')[0],
      isActive: existingRecipe ? existingRecipe.isActive : false,
      executedDays: existingRecipe ? existingRecipe.executedDays : 0,
      startDate: existingRecipe?.startDate,
      endDate: existingRecipe?.endDate,
    };

    if (isEditing) {
      const index = MOCK_RECIPES.findIndex((r) => r.id === id);
      if (index > -1) {
        MOCK_RECIPES[index] = recipeData;
      }
    } else {
      MOCK_RECIPES.push(recipeData);
    }

    saveRecipes();
    setUnsavedRecipeGuard(false);
    navigate(`/recipes/${recipeData.id}`);
  };

  const previewCalc =
    step >= 3
      ? calculateRecipeNutrition(parsedPreviewIngredients, parsedPreviewSupplements, standard, lifeStage)
      : null;

  const previewMacroData = previewCalc
    ? [
        { name: '蛋白质', value: previewCalc.totals.protein_g, me: previewCalc.macroME.proteinPct },
        { name: '脂肪', value: previewCalc.totals.fat_g, me: previewCalc.macroME.fatPct },
        { name: '碳水', value: previewCalc.totals.carb_g, me: previewCalc.macroME.carbPct },
      ]
    : [];

  const previewCatData = previewCalc
    ? Object.entries(previewCalc.roleWeights)
        .filter(([, w]) => w > 0)
        .map(([role, value]) => ({
          name: ROLE_META[role as keyof typeof ROLE_META]?.label || role,
          value,
        }))
    : [];

  const previewRedEvaluations = previewCalc ? previewCalc.evaluations.filter((ev) => ev.status === 'red') : [];
  const previewYellowEvaluations = previewCalc ? previewCalc.evaluations.filter((ev) => ev.status === 'yellow') : [];
  const previewUnqualified = [...previewRedEvaluations, ...previewYellowEvaluations];
  const previewUnqualifiedKeys = new Set(previewUnqualified.map((ev) => ev.key));
  const previewDisplayEvaluations = previewCalc
    ? [
        ...previewUnqualified,
        ...previewCalc.evaluations.filter((ev) => ev.core && !previewUnqualifiedKeys.has(ev.key)),
      ]
    : [];
  const previewUnqualifiedSummaryParts = [
    previewRedEvaluations.length > 0 ? `${previewRedEvaluations.length} 项红灯` : '',
    previewYellowEvaluations.length > 0 ? `${previewYellowEvaluations.length} 项黄灯` : '',
  ].filter(Boolean);

  const previewGroupedFullEvaluations = previewCalc
    ? previewCalc.evaluations.reduce((acc, ev) => {
        if (!acc[ev.group]) acc[ev.group] = [];
        acc[ev.group].push(ev);
        return acc;
      }, {} as Record<string, NutrientEvaluation[]>)
    : {};

  return (
    <div className="p-5 space-y-5 bg-[#F9F7F4] min-h-full pb-40">
      <header className="mb-6 flex items-center gap-2">
        <button
          onClick={() => {
            if (step > 1) {
              setStep(step - 1);
            } else if (isEditing || name.trim().length > 0 || previewIngredients.length > 0) {
              setShowUnsavedLeaveModal(true);
            } else {
              navigate(-1);
            }
          }}
          className="text-stone-500 hover:text-stone-700 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold text-stone-900">
            {isEditing ? '编辑食谱' : '新建食谱'} {step}/4
          </h1>
        </div>
        {step >= 2 ? (
          <button
            type="button"
            onClick={() => setShowUnsavedLeaveModal(true)}
            className="text-xs text-stone-500 hover:text-stone-700 px-2 py-1 rounded-lg"
          >
            退出
          </button>
        ) : (
          <div className="w-8" />
        )}
      </header>

      {/* Step Indicator */}
      <div className="flex justify-between items-center px-4 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-colors',
                step >= s ? 'bg-[#FF7B4A] text-white' : 'bg-white text-stone-300'
              )}
            >
              {s}
            </div>
            {s < 4 && (
              <div
                className={cn(
                  'w-12 h-1 mx-2 rounded-full transition-colors',
                  step > s ? 'bg-[#FF7B4A]' : 'bg-stone-200'
                )}
              ></div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-2xl text-sm font-medium border border-red-100 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {step === 1 && (
        <div className="animate-in slide-in-from-right-4 space-y-6">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-50">
            <h2 className="text-base font-bold text-stone-800 mb-4 flex items-center gap-2">
              <span className="text-stone-400">📝</span> 食谱名称
            </h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: 日常鸡猪均衡营养餐"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7B4A]/20 text-sm font-medium"
            />
            <p className="text-[10px] text-stone-400 mt-2 ml-1">不填将自动生成名称</p>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-50">
            <h2 className="text-base font-bold text-stone-800 mb-4 flex items-center gap-2">
              <span className="text-stone-400">🐾</span> 目标猫咪{' '}
              <span className="text-red-500 font-normal text-sm">*</span>
            </h2>
            {MOCK_CATS.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {MOCK_CATS.map((cat) => {
                  const isSelected = selectedCats.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleToggleCat(cat.id)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left',
                        isSelected
                          ? 'border-[#FF7B4A] bg-[#FFFAF5]'
                          : 'border-transparent bg-stone-50 hover:bg-stone-100'
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                        {cat.avatarUrl ? (
                          <img src={cat.avatarUrl} className="w-full h-full object-cover" />
                        ) : (
                          <span>🐱</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-stone-800 truncate">{cat.name}</div>
                        <div className="text-[10px] text-stone-500">
                          {cat.weight || '?'}kg · {cat.age < 1 ? '幼猫' : '成猫'}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="ml-auto w-5 h-5 rounded-full bg-[#FF7B4A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="bg-orange-50/70 border border-dashed border-orange-200 p-4 rounded-2xl text-center space-y-2.5">
                <p className="text-sm font-bold text-orange-700">⚠️ 尚未填写猫咪档案，无法创建食谱</p>
                <p className="text-xs text-stone-500">请先添加至少一只猫咪档案，系统才能准确匹配营养标准与过敏原。</p>
                <Link
                  to="/profile/cats/new"
                  className="inline-flex items-center gap-1 bg-[#FF7B4A] text-white px-4 py-2 rounded-full text-xs font-bold shadow-sm hover:bg-orange-600 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> 去添加猫咪档案
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-50 space-y-4">
            <div>
              <h2 className="text-base font-bold text-stone-800 mb-3 flex items-center gap-2">
                <span className="text-stone-400">📊</span> 营养标准 (每 1,000 kcal ME)
              </h2>
              <div className="flex gap-3">
                {(['NRC', 'AAFCO'] as const).map((std) => {
                  const isSelected = standard === std;
                  return (
                    <button
                      key={std}
                      onClick={() => setStandard(std)}
                      className={cn(
                        'flex-1 p-4 rounded-2xl border-2 font-bold transition-all text-center',
                        isSelected
                          ? 'border-[#FF7B4A] bg-[#FF7B4A] text-white shadow-md shadow-orange-500/20'
                          : 'border-transparent bg-stone-50 text-stone-500 hover:bg-stone-100'
                      )}
                    >
                      {std === 'NRC' ? 'NRC 2006' : 'AAFCO 2016/2026'}
                      <span className="block text-[10px] font-normal opacity-85 mt-1">
                        {std === 'NRC' ? '推荐日常熟自制' : '商业全价粮基准'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-stone-500 mb-2">生命阶段基准</p>
              <div className="flex gap-2">
                {([
                  { id: 'adult', label: '成猫维持期' },
                  { id: 'kitten', label: '幼猫生长期' },
                ] as const).map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => setLifeStage(stage.id)}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-xs font-medium border transition-colors',
                      lifeStage === stage.id
                        ? 'bg-[#FFFAF5] border-[#FF7B4A] text-[#FF7B4A]'
                        : 'bg-stone-50 border-transparent text-stone-500'
                    )}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in slide-in-from-right-4 space-y-6">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-50">
            <h2 className="text-base font-bold text-stone-800 mb-4 flex items-center gap-2">
              <span className="text-stone-400">⚙️</span> 制作模式
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => setMode('by_need')}
                className={cn(
                  'w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left',
                  mode === 'by_need' ? 'border-[#FF7B4A] bg-[#FFFAF5]' : 'border-stone-100 bg-white hover:bg-stone-50'
                )}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors',
                    mode === 'by_need' ? 'border-[#FF7B4A] bg-[#FF7B4A]' : 'border-stone-300'
                  )}
                >
                  {mode === 'by_need' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                </div>
                <div>
                  <h3 className="font-bold text-stone-800 mb-1 text-sm">按需定制 (推荐)</h3>
                  <p className="text-xs text-stone-500">
                    按科学部位配比（白肉35%、红肉25%、心脏15%、鱼类10%、青口贝5%、肝脏5%、其他内脏5%）优先选用实测肉类自动生成
                  </p>
                </div>
              </button>

              <button
                onClick={() => setMode('by_inventory')}
                className={cn(
                  'w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left',
                  mode === 'by_inventory' ? 'border-[#FF7B4A] bg-[#FFFAF5]' : 'border-stone-100 bg-white hover:bg-stone-50'
                )}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors',
                    mode === 'by_inventory' ? 'border-[#FF7B4A] bg-[#FF7B4A]' : 'border-stone-300'
                  )}
                >
                  {mode === 'by_inventory' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                </div>
                <div>
                  <h3 className="font-bold text-stone-800 mb-1 text-sm">按临期库存反推</h3>
                  <p className="text-xs text-stone-500">
                    优先匹配冰箱中临期食材，同时保持各营养角色比例达标
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-50">
            <h2 className="text-base font-bold text-stone-800 mb-4 flex items-center gap-2">
              <span className="text-stone-400">⚖️</span> 喂食参数
            </h2>
            <div className="space-y-5 flex flex-col">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-stone-800">总周期 (天)</label>
                  <span className="text-[#FF7B4A] font-bold">{days}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="w-full accent-[#FF7B4A]"
                />
                <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                  <span>1天</span>
                  <span>60天</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-stone-800">
                    单日总喂量 ({selectedCats.length > 1 ? `${selectedCats.length}只猫合计 ` : ''}g/天)
                  </label>
                  <span className="text-[#FF7B4A] font-bold">{dailyAmount}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="600"
                  step="10"
                  value={dailyAmount}
                  onChange={(e) => setDailyAmount(e.target.value)}
                  className="w-full accent-[#FF7B4A]"
                />
                <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                  <span>50g</span>
                  <span>600g</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-dashed border-stone-200">
              <div className="bg-[#FFFAF5] p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-xs text-stone-500 font-medium mb-1">预计需制备食材总计</p>
                  <p className="text-[10px] text-orange-400">
                    ({days}天 × {dailyAmount}g)
                  </p>
                </div>
                <div className="text-2xl font-bold text-[#FF7B4A]">
                  {Number(days) * Number(dailyAmount)}
                  <span className="text-sm ml-1">g</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-in slide-in-from-right-4 space-y-5">
          {/* 实时概览与安全预警 */}
          {previewCalc && (
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-50 space-y-2.5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-stone-50 rounded-2xl py-2.5 px-2">
                  <div className="text-[10px] text-stone-400">当前总重</div>
                  <div className="text-sm font-bold text-stone-800 mt-0.5">{Math.round(previewCalc.totalWeightG)}g</div>
                </div>
                <div className="bg-stone-50 rounded-2xl py-2.5 px-2">
                  <div className="text-[10px] text-stone-400">总热量 (ME)</div>
                  <div className="text-sm font-bold text-stone-800 mt-0.5">{Math.round(previewCalc.totalKcal)} kcal</div>
                </div>
                <div className="bg-stone-50 rounded-2xl py-2.5 px-2">
                  <div className="text-[10px] text-stone-400">实时钙磷比</div>
                  <div
                    className={cn(
                      'text-sm font-bold mt-0.5',
                      previewCalc.caPRatio >= 1.1 && previewCalc.caPRatio <= 1.4
                        ? 'text-emerald-600'
                        : previewCalc.caPRatio < 1.0 || previewCalc.caPRatio > 2.0
                        ? 'text-red-600'
                        : 'text-amber-600'
                    )}
                  >
                    {previewCalc.caPRatio.toFixed(2)}:1
                  </div>
                </div>
              </div>

              {previewCalc.highRiskAlerts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-start gap-2 text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>
                    超上限预警：
                    {previewCalc.highRiskAlerts
                      .map((ev) => `${ev.label} (${ev.per1000kcal.toFixed(ev.decimals)}${ev.unit})`)
                      .join('、')}
                  </span>
                </div>
              )}

              {previewCalc.proxyIngredients.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-start gap-2 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    近似估算数据，建议优先选用实测肉类（{previewCalc.proxyIngredients.map((p) => p.name).join('、')}）
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 可编辑食材清单 */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-50">
            <div className="flex justify-between items-center mb-2 gap-2">
              <h2 className="text-base font-bold text-stone-800 flex items-center gap-2">
                <span className="text-stone-400">🥩</span> 食材配方调整
              </h2>
              <button
                type="button"
                onClick={() => setShowSmartParser(true)}
                className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full hover:bg-violet-100 flex items-center gap-1 shrink-0 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" /> 智能识别
              </button>
            </div>
            <p className="text-xs text-stone-500 mb-3">
              默认按 {standard}（{lifeStage === 'kitten' ? '幼猫' : '成猫'}）角色比例生成，调整食材后可点击下方“智能重算补剂”。
            </p>

            {mode === 'by_inventory' && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center flex-wrap gap-2 text-[11px] text-sky-900">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-bold border border-sky-200">
                  🧊 冰箱库存
                </span>
                <span className="text-stone-500">来自冰箱可用库存</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-bold border border-orange-200">
                  🛒 需补购
                </span>
                <span className="text-stone-500">需额外采购补充</span>
              </div>
            )}

            <div className="space-y-3">
              {previewIngredients.map((item, idx) => {
                const meat = MEAT_DATABASE.find((m) => m.id === item.meatId);
                if (!meat) return null;
                const roleInfo = ROLE_META[meat.role] || ROLE_META.red_meat;
                const confidence = getConfidenceBadgeInfo(meat);
                const weightNum = typeof item.weight === 'string' ? parseFloat(item.weight) || 0 : item.weight;
                const totalW = previewCalc?.totalWeightG || 0;
                const percentage = totalW > 0 ? ((weightNum / totalW) * 100).toFixed(1) : '0.0';
                const fridgeStockG = Math.round(fridgeStockMap[item.meatId] || 0);
                const isFromFridge = mode === 'by_inventory' && fridgeStockG > 0;
                const needBuyG = mode === 'by_inventory' ? Math.max(0, Math.round(weightNum - fridgeStockG)) : 0;

                return (
                  <div
                    key={`${item.meatId}-${idx}`}
                    className="flex items-center justify-between py-2.5 px-3 rounded-2xl bg-stone-50 gap-2"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-lg shrink-0">
                        {roleInfo.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {mode === 'by_inventory' && isFromFridge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200 font-bold shrink-0">
                              🧊 冰箱 {fridgeStockG}g
                            </span>
                          )}
                          {mode === 'by_inventory' && !isFromFridge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-bold shrink-0">
                              🛒 需补购
                            </span>
                          )}
                          {mode === 'by_inventory' && isFromFridge && needBuyG > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-bold shrink-0">
                              🛒 补买{needBuyG}g
                            </span>
                          )}
                          <span className="font-bold text-sm text-stone-800 truncate">{meat.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-stone-500">
                            {roleInfo.label} · {percentage}%
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded ${confidence.className}`}>
                            {confidence.shortLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min="0"
                        value={item.weight}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPreviewIngredients((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], weight: val };
                            return next;
                          });
                        }}
                        className="w-16 px-2 py-1 text-right bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#FF7B4A] text-sm font-medium"
                        placeholder="重量"
                      />
                      <span className="text-xs text-stone-500">g</span>
                      <button
                        type="button"
                        onClick={() => handleOpenReplaceIngredient(idx, meat.role)}
                        className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg"
                        title="替换食材"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                        title="移除食材"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleOpenAddIngredient}
                className="w-full py-2.5 border-2 border-dashed border-stone-200 rounded-2xl text-stone-500 hover:border-[#FF7B4A] hover:text-[#FF7B4A] transition-colors flex items-center justify-center gap-1.5 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> 添加食材
              </button>
            </div>
          </div>

          {/* 可编辑营养剂清单 */}
          <div className="bg-[#FFFAF5] border border-orange-100 rounded-3xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4 gap-2">
              <h2 className="text-base font-bold text-orange-800 flex items-center gap-2">
                <span className="text-orange-400">💊</span> 营养补剂调整
              </h2>
              <button
                type="button"
                onClick={handleAutoRecalcPreviewSupplements}
                className="text-xs text-[#FF7B4A] bg-white font-medium border border-orange-200 px-2.5 py-1 hover:bg-orange-50 rounded-lg flex items-center gap-1 shrink-0 transition-colors"
              >
                <Activity className="w-3 h-3" /> 智能重算补剂
              </button>
            </div>

            <div className="space-y-3">
              {previewSupplements.length > 0 ? (
                previewSupplements.map((item, idx) => {
                  const supp = SUPPLEMENTS.find((s) => s.id === item.supplementId);
                  if (!supp) return null;

                  return (
                    <div
                      key={`${item.supplementId}-${idx}`}
                      className="py-2.5 px-3 bg-white/80 rounded-2xl border border-orange-100/80 space-y-2"
                    >
                      <div className="flex justify-between items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-orange-950 font-medium block truncate">{supp.name}</span>
                          <span className="text-[11px] text-orange-700/75">
                            {supp.category} · {supp.unit_label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.amount}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPreviewSupplements((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], amount: val };
                                return next;
                              });
                            }}
                            className="w-16 px-2 py-1 text-right bg-white border border-orange-200 rounded-lg focus:outline-none focus:border-[#FF7B4A] text-sm font-medium"
                            placeholder="用量"
                          />
                          <span className="text-xs text-stone-500 w-5">{supp.unit}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenReplaceSupplement(idx)}
                            className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg"
                            title="替换补剂"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSupplement(idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                            title="移除补剂"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-orange-600/70 text-center py-2">暂未添加营养补剂</p>
              )}

              <button
                type="button"
                onClick={handleOpenAddSupplement}
                className="w-full py-2.5 border-2 border-dashed border-orange-200 rounded-2xl text-orange-600 hover:border-[#FF7B4A] hover:bg-white/60 transition-colors flex items-center justify-center gap-1.5 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> 添加营养剂
              </button>
            </div>

            {previewCalc && (
              <div className="mt-3 pt-3 border-t border-orange-200/60 space-y-1 text-[11px] text-orange-800/80">
                {previewCalc.hasUnquantifiedFishOilVE && (
                  <p>• 提示：鱼油含混合生育酚抗氧化但未定量，VE 未计入营养汇总。</p>
                )}
                {previewCalc.hasSyntheticVEReminder && (
                  <p>• 提示：双鲸 VE 请核对天然/合成形式（合成 dl-α-生育酚乙酸酯按 α-生育酚当量需 ×0.45 折算）。</p>
                )}
                {previewCalc.hasBComplexCholineNote && (
                  <p>• 提示：复合维 B 已优先补齐 VB1 并同步累加按 41.1% 折算的元素胆碱。</p>
                )}
                {previewCalc.hasMissingData && (
                  <p>• 提示：含未检测项，不代表为 0。</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: 直接展示食谱详情页-编辑，方便用户实时对照标准微调并保存 */}
      {step === 4 && previewCalc && (
        <div className="animate-in slide-in-from-right-4 space-y-4">
          {/* 顶部概览卡片 + 双饼图 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <div className="flex justify-between items-start gap-2 mb-1">
              <h2 className="text-lg font-bold text-stone-800">{name.trim() || `我的${standard}营养餐`}</h2>
              <span className="text-[11px] bg-[#FFFAF5] text-[#FF7B4A] border border-orange-100 px-2 py-0.5 rounded-full font-medium shrink-0">
                详情编辑校验
              </span>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              总重量: {Math.round(previewCalc.totalWeightG)}g · 总热量: {Math.round(previewCalc.totalKcal)} kcal · 周期: {days}天 · 钙磷比: {previewCalc.caPRatio.toFixed(2)}:1
              {selectedCats.length > 0 && (
                <> · 🐱 {selectedCats.map((cId) => MOCK_CATS.find((c) => c.id === cId)?.name).filter(Boolean).join('、')}</>
              )}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-2">
              <div className="h-40">
                <h3 className="text-xs font-semibold text-center text-stone-600 mb-2">宏量营养素</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={previewMacroData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={40}
                      paddingAngle={2}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {previewMacroData.map((entry, index) => (
                        <Cell key={`step4-macro-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<MacroTooltip />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="h-40">
                <h3 className="text-xs font-semibold text-center text-stone-600 mb-2">食材角色配比</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={previewCatData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={40}
                      paddingAngle={2}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {previewCatData.map((entry, index) => (
                        <Cell key={`step4-cat-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<IngredientTooltip totalWeight={previewCalc.totalWeightG} />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 安全上限预警 & 近似映射提醒 */}
          {previewCalc.highRiskAlerts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 leading-relaxed">
                <p className="font-bold mb-1">安全上限预警（超过 SUL / Max）</p>
                <p>
                  以下重点营养素超出安全上限：
                  {previewCalc.highRiskAlerts
                    .map((ev) => `${ev.label} (${ev.per1000kcal.toFixed(ev.decimals)} ${ev.unit} > ${ev.max})`)
                    .join('、')}
                  ，请在下方直接调整肝脏、海鲜或补剂用量。
                </p>
              </div>
            </div>
          )}

          {previewCalc.proxyIngredients.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <span className="font-bold">近似估算数据，建议优先选用实测肉类：</span>
                当前包含 {previewCalc.proxyIngredients.map((p) => p.name).join('、')}（L3/L4 近似映射）。
              </div>
            </div>
          )}

          {/* 营养达标分析 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <div className="flex justify-between items-center mb-3 gap-2">
              <h3 className="font-semibold text-stone-800 text-sm">营养达标分析 (每 1,000 kcal ME)</h3>
              <button
                type="button"
                onClick={() => setShowFullNutritionModal(true)}
                className="text-[#FF7B4A] text-xs font-medium hover:text-orange-600 flex items-center gap-0.5 shrink-0"
              >
                全部 28 项 <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex bg-stone-100 p-0.5 rounded-lg text-[11px]">
                {(['NRC', 'AAFCO'] as const).map((std) => (
                  <button
                    key={std}
                    type="button"
                    onClick={() => setStandard(std)}
                    className={cn(
                      'px-2.5 py-1 rounded-md font-medium transition-colors',
                      standard === std ? 'bg-white text-[#FF7B4A] shadow-xs' : 'text-stone-500'
                    )}
                  >
                    {std === 'NRC' ? 'NRC 2006' : 'AAFCO'}
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                自动判定：{lifeStage === 'kitten' ? '幼猫生长期' : '成猫维持期'}
              </span>
            </div>

            {previewUnqualified.length > 0 ? (
              <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-200/80 text-xs font-semibold text-red-600">
                ⚠ 共 {previewUnqualified.length} 项未达标（{previewUnqualifiedSummaryParts.join(' · ')}），已置顶展示
              </div>
            ) : (
              <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-700">
                ✓ 全部营养指标均已达标
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-stone-500 bg-stone-50">
                  <tr>
                    <th className="px-2.5 py-2 rounded-l-lg font-medium">营养素</th>
                    <th className="px-2 py-2 font-medium">每1000kcal / 整份</th>
                    <th className="px-2 py-2 font-medium">标准范围</th>
                    <th className="px-2 py-2 rounded-r-lg font-medium text-center">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {previewDisplayEvaluations.map((ev) => (
                    <tr
                      key={ev.key}
                      className={cn(
                        ev.status === 'red' && 'bg-red-50/50',
                        ev.status === 'yellow' && 'bg-amber-50/50'
                      )}
                    >
                      <td className="px-2.5 py-2.5 text-stone-800 font-medium whitespace-nowrap">
                        {ev.label}
                        {ev.hasMissingSource && (
                          <span className="text-stone-400 ml-0.5" title="部分食材未报告此项">
                            *
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-stone-700 whitespace-nowrap">
                        <div className="font-semibold">
                          {ev.per1000kcal.toFixed(ev.decimals)} {ev.unit}
                          {ev.key !== 'ca_p_ratio' && <span className="text-[10px] font-normal text-stone-400">/千卡</span>}
                        </div>
                        {ev.key !== 'ca_p_ratio' && (
                          <div className="text-[10px] text-stone-400">
                            整份 {ev.totalAmount.toFixed(ev.decimals)} {ev.unit}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-stone-500 text-[11px]">{formatBoundsText(ev)}</td>
                      <td className="px-2 py-2.5 text-center">
                        <TrafficLightBadge ev={ev} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 space-y-1 text-[11px] text-stone-400">
                <p className="text-center">
                  * 主数值为每 1,000 kcal 代谢能含量（与标准比对），小字为整份 {Math.round(previewCalc.totalWeightG)}g 食谱总含量
                </p>
                {previewCalc.hasMissingData && (
                  <p className="text-center text-stone-400/90 flex items-center justify-center gap-1">
                    <Info className="w-3 h-3 shrink-0" />
                    <span>含未检测项，不代表为 0（标 * 项在部分肉类食材中未报告）</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 食材清单（编辑态） */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <div className="flex justify-between items-center mb-3 gap-2">
              <h3 className="font-semibold text-stone-800">食材清单（可直接调整含量）</h3>
              <button
                type="button"
                onClick={() => setShowSmartParser(true)}
                className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full hover:bg-violet-100 flex items-center gap-1 shrink-0 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" /> 智能识别
              </button>
            </div>
            {mode === 'by_inventory' && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center flex-wrap gap-2 text-[11px] text-sky-900">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-bold border border-sky-200">
                  🧊 冰箱库存
                </span>
                <span className="text-stone-500">来自冰箱可用库存</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-bold border border-orange-200">
                  🛒 需补购
                </span>
                <span className="text-stone-500">需额外采购补充</span>
              </div>
            )}
            <div className="space-y-3">
              {previewIngredients.map((item, idx) => {
                const meat = MEAT_DATABASE.find((m) => m.id === item.meatId);
                if (!meat) return null;
                const roleInfo = ROLE_META[meat.role] || ROLE_META.red_meat;
                const confidence = getConfidenceBadgeInfo(meat);
                const weightNum = typeof item.weight === 'string' ? parseFloat(item.weight) || 0 : item.weight;
                const fridgeStockG = Math.round(fridgeStockMap[item.meatId] || 0);
                const isFromFridge = mode === 'by_inventory' && fridgeStockG > 0;
                const needBuyG = mode === 'by_inventory' ? Math.max(0, Math.round(weightNum - fridgeStockG)) : 0;

                return (
                  <div
                    key={`step4-ing-${item.meatId}-${idx}`}
                    className="flex justify-between items-center py-2 border-b border-stone-50 last:border-0 gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {mode === 'by_inventory' && isFromFridge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200 font-bold shrink-0">
                            🧊 冰箱 {fridgeStockG}g
                          </span>
                        )}
                        {mode === 'by_inventory' && !isFromFridge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-bold shrink-0">
                            🛒 需补购
                          </span>
                        )}
                        {mode === 'by_inventory' && isFromFridge && needBuyG > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-bold shrink-0">
                            🛒 补买{needBuyG}g
                          </span>
                        )}
                        <p className="font-medium text-stone-800 text-sm truncate">{meat.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-stone-500">{roleInfo.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded ${confidence.className}`}>
                          {confidence.shortLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min="0"
                        value={item.weight}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPreviewIngredients((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], weight: val };
                            return next;
                          });
                        }}
                        className="w-16 px-2 py-1 text-right border border-stone-200 rounded focus:outline-none focus:border-[#FF7B4A] text-sm"
                        placeholder="重量"
                      />
                      <span className="text-xs text-stone-500">g</span>
                      <button
                        type="button"
                        onClick={() => handleOpenReplaceIngredient(idx, meat.role)}
                        className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                        title="替换食材"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        title="移除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={handleOpenAddIngredient}
                className="w-full py-2 border-2 border-dashed border-stone-200 rounded-xl text-stone-500 hover:border-[#FF7B4A] hover:text-[#FF7B4A] transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> 添加食材
              </button>
            </div>
          </div>

          {/* 营养补剂清单（编辑态） */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
            <div className="flex justify-between items-center mb-3 gap-2">
              <h3 className="font-semibold text-stone-800">营养补剂清单</h3>
              <button
                type="button"
                onClick={handleAutoRecalcPreviewSupplements}
                className="text-xs text-[#FF7B4A] bg-[#FFFAF5] font-medium border border-orange-200 px-2.5 py-1 hover:bg-orange-50 rounded-lg flex items-center gap-1 shrink-0 transition-colors"
              >
                <Activity className="w-3 h-3" /> 智能重算补剂
              </button>
            </div>

            <div className="space-y-3">
              {previewSupplements.length > 0 ? (
                previewSupplements.map((item, idx) => {
                  const supp = SUPPLEMENTS.find((s) => s.id === item.supplementId);
                  if (!supp) return null;

                  return (
                    <div
                      key={`step4-supp-${item.supplementId}-${idx}`}
                      className="flex justify-between items-center py-2 border-b border-stone-50 last:border-0 gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-800 text-sm truncate">{supp.name}</p>
                        <span className="text-[11px] text-stone-500">
                          {supp.category} · {supp.unit_label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.amount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPreviewSupplements((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], amount: val };
                              return next;
                            });
                          }}
                          className="w-16 px-2 py-1 text-right border border-stone-200 rounded focus:outline-none focus:border-[#FF7B4A] text-sm"
                          placeholder="用量"
                        />
                        <span className="text-xs text-stone-500 w-5">{supp.unit}</span>
                        <button
                          type="button"
                          onClick={() => handleOpenReplaceSupplement(idx)}
                          className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                          title="替换补剂"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSupplement(idx)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="移除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-stone-400 text-center py-2">暂未添加营养补剂</p>
              )}

              <button
                type="button"
                onClick={handleOpenAddSupplement}
                className="w-full py-2 border-2 border-dashed border-stone-200 rounded-xl text-stone-500 hover:border-[#FF7B4A] hover:text-[#FF7B4A] transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> 添加营养补剂
              </button>
            </div>

            {(previewCalc.hasUnquantifiedFishOilVE ||
              previewCalc.hasSyntheticVEReminder ||
              previewCalc.hasBComplexCholineNote) && (
              <div className="mt-3 pt-3 border-t border-stone-100 space-y-1 text-[11px] text-stone-500">
                {previewCalc.hasUnquantifiedFishOilVE && (
                  <p>• 提示：鱼油含混合生育酚抗氧化但未定量，VE 未计入营养汇总。</p>
                )}
                {previewCalc.hasSyntheticVEReminder && (
                  <p>• 提示：双鲸 VE 请核对天然/合成形式（合成 dl-α-生育酚乙酸酯按 α-生育酚当量需 ×0.45 折算）。</p>
                )}
                {previewCalc.hasBComplexCholineNote && (
                  <p>• 提示：复合维 B 已优先补齐 VB1 并同步累加按 41.1% 折算的元素胆碱。</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 固定在底部导航栏上方，避免被 h-14 导航栏遮挡 */}
      <div className="fixed bottom-14 left-0 w-full bg-white/95 backdrop-blur-md border-t border-stone-100 px-4 py-3 flex justify-center z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        <div className="max-w-md w-full px-1 flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 rounded-2xl font-bold transition-colors bg-stone-100 text-stone-600 hover:bg-stone-200"
            >
              上一步
            </button>
          )}

          {step === 1 && MOCK_CATS.length === 0 ? (
            <button
              type="button"
              onClick={() => navigate('/profile/cats/new')}
              className="flex-1 bg-[#FF7B4A] text-white px-4 py-3 rounded-2xl font-bold shadow-md hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              请先添加猫咪档案 <ChevronRight className="w-4 h-4" />
            </button>
          ) : step < 4 ? (
            <button
              onClick={handleNextStep}
              className="flex-1 bg-[#FF7B4A] text-white px-4 py-3 rounded-2xl font-bold shadow-md hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              {step === 3 ? '营养达标检查' : '下一步'} <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex-1 bg-[#FF7B4A] text-white px-4 py-3 rounded-2xl font-bold shadow-md shadow-orange-500/30 hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              保存食谱 <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Step 3 & Step 4 食材/补剂选择弹窗 */}
      <IngredientPickerModal
        isOpen={showIngredientPicker}
        onClose={() => setShowIngredientPicker(false)}
        isReplacing={replacingIngredientIdx !== null}
        existingMeatIds={previewIngredients
          .filter((_, idx) => idx !== replacingIngredientIdx)
          .map((i) => i.meatId)}
        initialSelectedIds={pickerInitialMeatIds}
        initialRoleFilter={pickerInitialRole}
        onConfirm={handleConfirmIngredientPicker}
      />

      <SupplementPickerModal
        isOpen={showSupplementPicker}
        onClose={() => setShowSupplementPicker(false)}
        isReplacing={replacingSupplementIdx !== null}
        existingSupplementIds={previewSupplements
          .filter((_, idx) => idx !== replacingSupplementIdx)
          .map((s) => s.supplementId)}
        initialSelectedIds={pickerInitialSuppIds}
        onConfirm={handleConfirmSupplementPicker}
      />

      <SmartIngredientParseModal
        isOpen={showSmartParser}
        onClose={() => setShowSmartParser(false)}
        onApply={handleApplySmartParse}
      />

      {/* 未保存食谱返回提醒弹窗 */}
      {showUnsavedLeaveModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowUnsavedLeaveModal(false)}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-stone-900 mb-2">未保存食谱</h3>
            <p className="text-sm text-stone-600 mb-6">未保存食谱，确认返回吗？当前编辑内容将会丢失。</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowUnsavedLeaveModal(false)}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                继续编辑
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedLeaveModal(false);
                  setUnsavedRecipeGuard(false);
                  navigate('/recipes');
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
              >
                确认返回
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4 全部 28 项营养明细弹窗 */}
      {showFullNutritionModal && previewCalc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowFullNutritionModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md max-h-[84vh] shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-stone-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  全部营养素分析 ({standard === 'NRC' ? 'NRC 2006' : 'AAFCO 2016/2026'} · {lifeStage === 'kitten' ? '幼猫' : '成猫'})
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  按每 1,000 kcal ME 统一折算 · 食谱总热量 {Math.round(previewCalc.totalKcal)} kcal
                </p>
              </div>
              <button onClick={() => setShowFullNutritionModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-5">
              {previewCalc.hasMissingData && (
                <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200/70 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>含未检测项，不代表为 0（标有 * 的营养素在部分食材中未报告，汇总已跳过）。</span>
                </div>
              )}

              {Object.entries(previewGroupedFullEvaluations).map(([group, items]) => (
                <div key={group}>
                  <h4 className="font-bold text-stone-800 mb-2 text-sm bg-stone-50 px-2.5 py-1.5 rounded-lg">
                    {group}
                  </h4>
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-stone-500 border-b border-stone-100">
                      <tr>
                        <th className="py-2 font-medium">营养素</th>
                        <th className="py-2 font-medium">每1000kcal</th>
                        <th className="py-2 font-medium">标准范围</th>
                        <th className="py-2 font-medium text-center">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {items.map((ev) => (
                        <tr key={ev.key}>
                          <td className="py-2.5 text-stone-800 font-medium pr-1">
                            {ev.label}
                            {ev.hasMissingSource && (
                              <span className="text-stone-400 ml-0.5" title="部分食材未报告此项">
                                *
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-stone-700 whitespace-nowrap pr-1">
                            <div className="font-medium">
                              {ev.per1000kcal.toFixed(ev.decimals)} {ev.unit}
                            </div>
                            {ev.key !== 'ca_p_ratio' && (
                              <div className="text-[10px] text-stone-400">
                                整份 {ev.totalAmount.toFixed(ev.decimals)} {ev.unit}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 text-stone-500 text-[11px] pr-1">{formatBoundsText(ev)}</td>
                          <td className="py-2.5 text-center">
                            <TrafficLightBadge ev={ev} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MacroTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-2 shadow-lg border border-stone-100 rounded-lg text-xs z-50">
        <p className="font-bold text-stone-800 mb-1">{data.name}</p>
        <p className="text-stone-600">重量: {Number(data.value || 0).toFixed(1)}g</p>
        <p className="text-stone-600">ME占比: {Number(data.me || 0).toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

const IngredientTooltip = ({ active, payload, totalWeight }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = totalWeight > 0 ? (data.value / totalWeight) * 100 : 0;
    return (
      <div className="bg-white p-2 shadow-lg border border-stone-100 rounded-lg text-xs z-50">
        <p className="font-bold text-stone-800 mb-1">{data.name}</p>
        <p className="text-stone-600">重量: {Number(data.value || 0).toFixed(1)}g</p>
        <p className="text-stone-600">占比: {percentage.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [, setForceRender] = useState(0);
  const recipe = MOCK_RECIPES.find((r) => r.id === id);

  const [showSettings, setShowSettings] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFullNutritionModal, setShowFullNutritionModal] = useState(false);
  const [copyName, setCopyName] = useState('');
  const [copyError, setCopyError] = useState('');

  const recipeCats = recipe ? MOCK_CATS.filter((c) => recipe.catIds.includes(c.id)) : [];
  const [activeStandard, setActiveStandard] = useState<StandardType>(recipe?.standard || 'NRC');
  // 根据关联猫咪自动判断成猫/幼猫，不提供手动切换
  const activeLifeStage: LifeStage =
    recipeCats.length > 0 ? inferLifeStageFromCats(recipeCats) : recipe?.lifeStage || 'adult';

  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [editedIngredients, setEditedIngredients] = useState<{ meatId: string; weight: number | string }[]>([]);
  const [showIngredientPicker, setShowIngredientPicker] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [pickerInitialMeatIds, setPickerInitialMeatIds] = useState<string[]>([]);
  const [pickerInitialRole, setPickerInitialRole] = useState<string>('all');

  const [editedSupplements, setEditedSupplements] = useState<{ supplementId: string; amount: number | string }[]>([]);
  const [showSupplementPicker, setShowSupplementPicker] = useState(false);
  const [replacingSupplementIndex, setReplacingSupplementIndex] = useState<number | null>(null);
  const [pickerInitialSuppIds, setPickerInitialSuppIds] = useState<string[]>([]);
  const [showSmartParser, setShowSmartParser] = useState(false);
  const [unsavedConfirmMode, setUnsavedConfirmMode] = useState<'none' | 'navigate' | 'cancel_edit'>('none');
  const [execReturnNotice, setExecReturnNotice] = useState('');
  const execReturnTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (recipe) {
      setActiveStandard(recipe.standard || 'NRC');
    }
  }, [recipe?.id]);

  useEffect(() => {
    setUnsavedRecipeGuard(isEditingRecipe, '未保存食谱，确认返回？当前修改将会丢失。');
    return () => {
      setUnsavedRecipeGuard(false);
    };
  }, [isEditingRecipe]);

  useEffect(() => {
    return () => {
      if (execReturnTimerRef.current) {
        window.clearTimeout(execReturnTimerRef.current);
        execReturnTimerRef.current = null;
      }
    };
  }, []);

  if (!recipe) return <div className="p-6 text-center text-stone-500">未找到该食谱</div>;

  const handleCopy = () => {
    if (!copyName.trim()) {
      setCopyError('请输入新食谱名称');
      return;
    }
    setCopyError('');
    const newRecipe: Recipe = {
      ...recipe,
      id: `r${Date.now()}`,
      name: copyName.trim(),
      isActive: false,
      createdAt: new Date().toISOString().split('T')[0],
      executedDays: 0,
      startDate: undefined,
      endDate: undefined,
    };
    MOCK_RECIPES.push(newRecipe);
    saveRecipes();
    setShowCopyModal(false);
    navigate(`/recipes/${newRecipe.id}`);
  };

  const handleDelete = () => {
    setShowSettings(false);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    const index = MOCK_RECIPES.findIndex((r) => r.id === recipe.id);
    if (index > -1) {
      MOCK_RECIPES.splice(index, 1);
      saveRecipes();
      navigate('/recipes');
    }
  };

  const handleEdit = () => {
    setShowSettings(false);
    navigate(`/recipes/edit/${recipe.id}`);
  };

  const handleEditRecipe = () => {
    setEditedIngredients(recipe.ingredients.map((i) => ({ ...i })));
    setEditedSupplements(recipe.supplements.map((s) => ({ ...s })));
    setIsEditingRecipe(true);
  };

  const hasUnsavedRecipeEdits = () => {
    if (!isEditingRecipe) return false;
    const normIng = (arr: Array<{ meatId: string; weight: number | string }>) =>
      JSON.stringify(arr.map((i) => ({ meatId: i.meatId, weight: Number(i.weight) || 0 })));
    const normSupp = (arr: Array<{ supplementId: string; amount: number | string }>) =>
      JSON.stringify(arr.map((s) => ({ supplementId: s.supplementId, amount: Number(s.amount) || 0 })));
    return (
      normIng(editedIngredients) !== normIng(recipe.ingredients) ||
      normSupp(editedSupplements) !== normSupp(recipe.supplements)
    );
  };

  const handleCancelEditRecipe = () => {
    if (hasUnsavedRecipeEdits()) {
      setUnsavedConfirmMode('cancel_edit');
    } else {
      setIsEditingRecipe(false);
    }
  };

  const handleBackToRecipes = () => {
    if (isEditingRecipe) {
      setUnsavedConfirmMode('navigate');
      return;
    }
    navigate('/recipes');
  };

  const handleSaveRecipe = () => {
    const validIngredients = editedIngredients
      .map((i) => ({
        meatId: i.meatId,
        weight: typeof i.weight === 'string' ? parseFloat(i.weight) || 0 : i.weight,
      }))
      .filter((i) => i.weight > 0);

    recipe.ingredients = validIngredients;

    const validSupplements = editedSupplements
      .map((s) => ({
        supplementId: s.supplementId,
        amount: typeof s.amount === 'string' ? parseFloat(s.amount) || 0 : s.amount,
      }))
      .filter((s) => s.amount > 0);

    recipe.supplements = validSupplements;
    recipe.standard = activeStandard;
    recipe.lifeStage = activeLifeStage;

    saveRecipes();
    setUnsavedRecipeGuard(false);
    setForceRender((prev) => prev + 1);
    setIsEditingRecipe(false);
  };

  const openReplacePicker = (index: number, role: string) => {
    setReplacingIndex(index);
    setPickerInitialRole(role);
    setPickerInitialMeatIds([editedIngredients[index].meatId]);
    setShowIngredientPicker(true);
  };

  const openAddPicker = () => {
    setReplacingIndex(null);
    setPickerInitialRole('all');
    setPickerInitialMeatIds([]);
    setShowIngredientPicker(true);
  };

  const removeIngredient = (index: number) => {
    const newArr = [...editedIngredients];
    newArr.splice(index, 1);
    setEditedIngredients(newArr);
  };

  const handleConfirmPicker = (selectedIds: string[]) => {
    if (replacingIndex !== null) {
      if (selectedIds.length > 0) {
        const targetId = selectedIds[0];
        const isDup = editedIngredients.some((item, idx) => idx !== replacingIndex && item.meatId === targetId);
        if (!isDup) {
          const newArr = [...editedIngredients];
          newArr[replacingIndex] = { ...newArr[replacingIndex], meatId: targetId };
          setEditedIngredients(newArr);
        }
      }
    } else {
      const existingSet = new Set(editedIngredients.map((i) => i.meatId));
      const newIngredients = selectedIds
        .filter((id) => !existingSet.has(id))
        .map((id) => ({ meatId: id, weight: 0 }));
      setEditedIngredients([...editedIngredients, ...newIngredients]);
    }
    setShowIngredientPicker(false);
  };

  const handleApplySmartParseDetail = (matchedItems: ParsedNaturalIngredientItem[]) => {
    setEditedIngredients((prev) => {
      const next = [...prev];
      matchedItems.forEach((item) => {
        const idx = next.findIndex((x) => x.meatId === item.meatId);
        if (idx !== -1) {
          const curW = typeof next[idx].weight === 'string' ? parseFloat(next[idx].weight) || 0 : next[idx].weight;
          next[idx] = { ...next[idx], weight: item.weight > 0 ? item.weight : curW };
        } else {
          next.push({ meatId: item.meatId, weight: item.weight });
        }
      });
      return next;
    });
    setShowSmartParser(false);
  };

  const currentIngredients = isEditingRecipe ? editedIngredients : recipe.ingredients;

  const parsedIngredients = currentIngredients.map((i) => ({
    meatId: i.meatId,
    weight: typeof i.weight === 'string' ? parseFloat(i.weight) || 0 : i.weight,
  }));

  const currentSupplements = isEditingRecipe ? editedSupplements : recipe.supplements;

  const parsedSupplements = currentSupplements.map((s) => ({
    supplementId: s.supplementId,
    amount: typeof s.amount === 'string' ? parseFloat(s.amount) || 0 : s.amount,
  }));

  const openReplaceSupplementPicker = (index: number) => {
    setReplacingSupplementIndex(index);
    setPickerInitialSuppIds([editedSupplements[index].supplementId]);
    setShowSupplementPicker(true);
  };

  const openAddSupplementPicker = () => {
    setReplacingSupplementIndex(null);
    setPickerInitialSuppIds([]);
    setShowSupplementPicker(true);
  };

  const removeSupplement = (index: number) => {
    const newArr = [...editedSupplements];
    newArr.splice(index, 1);
    setEditedSupplements(newArr);
  };

  const handleConfirmSupplementPicker = (selectedIds: string[]) => {
    const meatOnly = calculateRecipeNutrition(parsedIngredients, [], activeStandard, activeLifeStage);
    if (replacingSupplementIndex !== null) {
      if (selectedIds.length > 0) {
        const newId = selectedIds[0];
        const isDup = editedSupplements.some((s, idx) => idx !== replacingSupplementIndex && s.supplementId === newId);
        if (!isDup) {
          const supp = getSupplementById(newId);
          const recomputed = supp
            ? computeRecommendedAmountForSupplement(supp, meatOnly, activeStandard, activeLifeStage)
            : 0;
          const newArr = [...editedSupplements];
          newArr[replacingSupplementIndex] = {
            supplementId: newId,
            amount: recomputed,
          };
          setEditedSupplements(newArr);
        }
      }
    } else {
      const existingSet = new Set(editedSupplements.map((s) => s.supplementId));
      const newSupplements = selectedIds
        .filter((sId) => !existingSet.has(sId))
        .map((sId) => {
          const supp = getSupplementById(sId);
          const recomputed = supp
            ? computeRecommendedAmountForSupplement(supp, meatOnly, activeStandard, activeLifeStage)
            : 0;
          return { supplementId: sId, amount: recomputed };
        });
      setEditedSupplements([...editedSupplements, ...newSupplements]);
    }
    setShowSupplementPicker(false);
  };

  const handleAutoCalculateSupplements = () => {
    const currentSupps = isEditingRecipe ? [...editedSupplements] : recipe.supplements.map((s) => ({ ...s }));
    const newSupplements = recommendSupplements(
      parsedIngredients,
      activeStandard,
      activeLifeStage,
      currentSupps
    );
    setEditedSupplements(newSupplements);
    if (!isEditingRecipe) {
      setEditedIngredients(recipe.ingredients.map((i) => ({ ...i })));
    }
    setIsEditingRecipe(true);
  };

  const handleSwitchStandard = (std: StandardType) => {
    setActiveStandard(std);
    if (!isEditingRecipe) {
      recipe.standard = std;
      saveRecipes();
    }
  };

  const calc = calculateRecipeNutrition(parsedIngredients, parsedSupplements, activeStandard, activeLifeStage);

  const macroData = [
    { name: '蛋白质', value: calc.totals.protein_g, me: calc.macroME.proteinPct },
    { name: '脂肪', value: calc.totals.fat_g, me: calc.macroME.fatPct },
    { name: '碳水', value: calc.totals.carb_g, me: calc.macroME.carbPct },
  ];

  const catData = Object.entries(calc.roleWeights)
    .filter(([, w]) => w > 0)
    .map(([role, value]) => ({
      name: ROLE_META[role as keyof typeof ROLE_META]?.label || role,
      value,
    }));

  const redEvaluations = calc.evaluations.filter((ev) => ev.status === 'red');
  const yellowEvaluations = calc.evaluations.filter((ev) => ev.status === 'yellow');
  const unqualifiedEvaluations = [...redEvaluations, ...yellowEvaluations];
  const unqualifiedKeys = new Set(unqualifiedEvaluations.map((ev) => ev.key));
  const displayEvaluations = [
    ...unqualifiedEvaluations,
    ...calc.evaluations.filter((ev) => ev.core && !unqualifiedKeys.has(ev.key)),
  ];
  const unqualifiedSummaryParts = [
    redEvaluations.length > 0 ? `${redEvaluations.length} 项红灯` : '',
    yellowEvaluations.length > 0 ? `${yellowEvaluations.length} 项黄灯` : '',
  ].filter(Boolean);

  // 全部 28 项按标准库原始顺序分组
  const groupedFullEvaluations = calc.evaluations.reduce((acc, ev) => {
    if (!acc[ev.group]) acc[ev.group] = [];
    acc[ev.group].push(ev);
    return acc;
  }, {} as Record<string, NutrientEvaluation[]>);

  const handleToggleActive = () => {
    if (execReturnTimerRef.current) {
      window.clearTimeout(execReturnTimerRef.current);
      execReturnTimerRef.current = null;
    }

    const now = new Date().toISOString();
    const starting = !recipe.isActive;
    if (starting) {
      MOCK_RECIPES.forEach((r) => {
        if (r.isActive) {
          r.isActive = false;
          r.endDate = now;
        }
      });
      recipe.isActive = true;
      recipe.startDate = now;
      recipe.endDate = undefined;
    } else {
      recipe.isActive = false;
      recipe.endDate = now;
    }
    saveRecipes();
    setForceRender((prev) => prev + 1);

    if (starting) {
      setExecReturnNotice('已开始执行，3 秒后自动返回食谱管理页...');
      execReturnTimerRef.current = window.setTimeout(() => {
        execReturnTimerRef.current = null;
        navigate('/recipes');
      }, 3000);
    } else {
      setExecReturnNotice('');
    }
  };

  return (
    <div className="p-4 space-y-4 bg-stone-50 min-h-full pb-24">
      <header className="mb-6 flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBackToRecipes}
            className="text-stone-500 hover:text-stone-700"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-2xl font-bold text-stone-900">食谱详情</h1>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showSettings && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-stone-100 py-2 z-50">
                <button
                  onClick={handleEdit}
                  className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> 编辑基本信息
                </button>
                <button
                  onClick={() => {
                    setCopyName(`${recipe.name} (副本)`);
                    setCopyError('');
                    setShowCopyModal(true);
                    setShowSettings(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" /> 复制食谱
                </button>
                <div className="h-px bg-stone-100 my-1"></div>
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> 删除食谱
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-stone-900 mb-4">复制食谱</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-700 mb-2">新食谱名称</label>
              <input
                type="text"
                value={copyName}
                onChange={(e) => setCopyName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7B4A]/20"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCopy();
                  if (e.key === 'Escape') setShowCopyModal(false);
                }}
              />
              {copyError && <p className="text-xs text-red-500 mt-1.5">{copyError}</p>}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCopyModal(false)}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCopy}
                className="px-4 py-2 text-sm font-medium text-white bg-[#FF7B4A] hover:bg-orange-600 rounded-xl transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-stone-900 mb-2">删除食谱</h3>
            <p className="text-stone-600 mb-6">确定要删除食谱"{recipe.name}"吗？此操作无法撤销。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {execReturnNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[75] bg-stone-900 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap">
          <Activity className="w-3.5 h-3.5 text-[#FF7B4A]" />
          <span>{execReturnNotice}</span>
        </div>
      )}

      {unsavedConfirmMode !== 'none' && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setUnsavedConfirmMode('none')}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-stone-900 mb-2">未保存食谱</h3>
            <p className="text-sm text-stone-600 mb-6">
              {unsavedConfirmMode === 'navigate'
                ? '未保存食谱，确认返回？当前修改将会丢失。'
                : '未保存食谱，确认放弃本次修改吗？'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setUnsavedConfirmMode('none')}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                继续编辑
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = unsavedConfirmMode;
                  setUnsavedConfirmMode('none');
                  setUnsavedRecipeGuard(false);
                  setIsEditingRecipe(false);
                  if (action === 'navigate') {
                    navigate('/recipes');
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
              >
                确认返回
              </button>
            </div>
          </div>
        </div>
      )}

      {showFullNutritionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowFullNutritionModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md max-h-[84vh] shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-stone-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  全部营养素分析 ({activeStandard === 'NRC' ? 'NRC 2006' : 'AAFCO 2016/2026'} · {activeLifeStage === 'kitten' ? '幼猫' : '成猫'})
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  按每 1,000 kcal ME 统一折算 · 食谱总热量 {Math.round(calc.totalKcal)} kcal
                </p>
              </div>
              <button onClick={() => setShowFullNutritionModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-5">
              {calc.hasMissingData && (
                <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200/70 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>含未检测项，不代表为 0（标有 * 的营养素在部分食材中未报告，汇总已跳过）。</span>
                </div>
              )}

              {Object.entries(groupedFullEvaluations).map(([group, items]) => (
                <div key={group}>
                  <h4 className="font-bold text-stone-800 mb-2 text-sm bg-stone-50 px-2.5 py-1.5 rounded-lg">
                    {group}
                  </h4>
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-stone-500 border-b border-stone-100">
                      <tr>
                        <th className="py-2 font-medium">营养素</th>
                        <th className="py-2 font-medium">每1000kcal</th>
                        <th className="py-2 font-medium">标准范围</th>
                        <th className="py-2 font-medium text-center">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {items.map((ev) => (
                        <tr key={ev.key}>
                          <td className="py-2.5 text-stone-800 font-medium pr-1">
                            {ev.label}
                            {ev.hasMissingSource && (
                              <span className="text-stone-400 ml-0.5" title="部分食材未报告此项">
                                *
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-stone-700 whitespace-nowrap pr-1">
                            <div className="font-medium">
                              {ev.per1000kcal.toFixed(ev.decimals)} {ev.unit}
                            </div>
                            {ev.key !== 'ca_p_ratio' && (
                              <div className="text-[10px] text-stone-400">
                                整份 {ev.totalAmount.toFixed(ev.decimals)} {ev.unit}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 text-stone-500 text-[11px] pr-1">
                            {formatBoundsText(ev)}
                          </td>
                          <td className="py-2.5 text-center">
                            <TrafficLightBadge ev={ev} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(recipe.startDate || recipe.endDate) && (
        <div className="text-sm text-stone-500 mb-4 bg-stone-50 p-3 rounded-xl space-y-1 border border-stone-100">
          {recipe.startDate && <p>开始执行: {formatSafeDate(recipe.startDate)}</p>}
          {recipe.endDate && <p>结束执行: {formatSafeDate(recipe.endDate)}</p>}
        </div>
      )}

      {/* 顶部概览卡片 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-lg font-bold text-stone-800">{recipe.name}</h2>
          {recipe.isActive && (
            <span className="flex items-center gap-1 text-xs bg-[#FFFAF5] text-[#FF7B4A] border border-orange-100 px-2 py-1 rounded-full shrink-0">
              <Activity className="w-3 h-3" />
              执行中
            </span>
          )}
        </div>
        <p className="text-xs text-stone-500 mb-4">
          总重量: {Math.round(calc.totalWeightG)}g · 总热量: {Math.round(calc.totalKcal)} kcal · 周期: {recipe.days}天 · 钙磷比: {calc.caPRatio.toFixed(2)}:1
        </p>

        <div className="grid grid-cols-2 gap-4 mb-2">
          <div className="h-40">
            <h3 className="text-xs font-semibold text-center text-stone-600 mb-2">宏量营养素</h3>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={macroData}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={2}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {macroData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<MacroTooltip />} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="h-40">
            <h3 className="text-xs font-semibold text-center text-stone-600 mb-2">食材角色配比</h3>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={catData}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={2}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {catData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<IngredientTooltip totalWeight={calc.totalWeightG} />} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 高风险超上限警告 & 近似映射提醒 */}
      {calc.highRiskAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-700 leading-relaxed">
            <p className="font-bold mb-1">安全上限预警（超过 SUL / Max）</p>
            <p>
              以下重点营养素超出安全上限：
              {calc.highRiskAlerts
                .map((ev) => `${ev.label} (${ev.per1000kcal.toFixed(ev.decimals)} ${ev.unit} > ${ev.max})`)
                .join('、')}
              ，请调整肝脏、海鲜或补剂用量。
            </p>
          </div>
        </div>
      )}

      {calc.proxyIngredients.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 leading-relaxed">
            <span className="font-bold">近似估算数据，建议优先选用实测肉类：</span>
            当前包含 {calc.proxyIngredients.map((p) => p.name).join('、')}（L3/L4 近似映射）。
          </div>
        </div>
      )}

      {/* 营养达标情况 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
        <div className="flex justify-between items-center mb-3 gap-2">
          <h3 className="font-semibold text-stone-800 text-sm">营养达标分析 (每 1,000 kcal ME)</h3>
          <button
            onClick={() => setShowFullNutritionModal(true)}
            className="text-[#FF7B4A] text-xs font-medium hover:text-orange-600 flex items-center gap-0.5 shrink-0"
          >
            全部 28 项 <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 营养标准切换 + 自动判定生命阶段 */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex bg-stone-100 p-0.5 rounded-lg text-[11px]">
            {(['NRC', 'AAFCO'] as const).map((std) => (
              <button
                key={std}
                onClick={() => handleSwitchStandard(std)}
                className={cn(
                  'px-2.5 py-1 rounded-md font-medium transition-colors',
                  activeStandard === std ? 'bg-white text-[#FF7B4A] shadow-xs' : 'text-stone-500'
                )}
              >
                {std === 'NRC' ? 'NRC 2006' : 'AAFCO'}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
            自动判定：{activeLifeStage === 'kitten' ? '幼猫生长期' : '成猫维持期'}
          </span>
        </div>

        {/* 不合格项总览提示 */}
        {unqualifiedEvaluations.length > 0 ? (
          <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-200/80 text-xs font-semibold text-red-600">
            ⚠ 共 {unqualifiedEvaluations.length} 项未达标（{unqualifiedSummaryParts.join(' · ')}），已置顶展示
          </div>
        ) : (
          <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-700">
            ✓ 全部营养指标均已达标
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] text-stone-500 bg-stone-50">
              <tr>
                <th className="px-2.5 py-2 rounded-l-lg font-medium">营养素</th>
                <th className="px-2 py-2 font-medium">每1000kcal / 整份</th>
                <th className="px-2 py-2 font-medium">标准范围</th>
                <th className="px-2 py-2 rounded-r-lg font-medium text-center">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {displayEvaluations.map((ev) => (
                <tr
                  key={ev.key}
                  className={cn(
                    ev.status === 'red' && 'bg-red-50/50',
                    ev.status === 'yellow' && 'bg-amber-50/50'
                  )}
                >
                  <td className="px-2.5 py-2.5 text-stone-800 font-medium whitespace-nowrap">
                    {ev.label}
                    {ev.hasMissingSource && (
                      <span className="text-stone-400 ml-0.5" title="部分食材未报告此项">
                        *
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-stone-700 whitespace-nowrap">
                    <div className="font-semibold">
                      {ev.per1000kcal.toFixed(ev.decimals)} {ev.unit}
                      {ev.key !== 'ca_p_ratio' && <span className="text-[10px] font-normal text-stone-400">/千卡</span>}
                    </div>
                    {ev.key !== 'ca_p_ratio' && (
                      <div className="text-[10px] text-stone-400">
                        整份 {ev.totalAmount.toFixed(ev.decimals)} {ev.unit}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-stone-500 text-[11px]">
                    {formatBoundsText(ev)}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <TrafficLightBadge ev={ev} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 space-y-1 text-[11px] text-stone-400">
            <p className="text-center">
              * 主数值为每 1,000 kcal 代谢能含量（与标准比对），小字为整份 {Math.round(calc.totalWeightG)}g 食谱总含量
            </p>
            {calc.hasMissingData && (
              <p className="text-center text-stone-400/90 flex items-center justify-center gap-1">
                <Info className="w-3 h-3 shrink-0" />
                <span>含未检测项，不代表为 0（标 * 项在部分肉类食材中未报告）</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 食材选择器弹窗 */}
      <IngredientPickerModal
        isOpen={showIngredientPicker}
        onClose={() => setShowIngredientPicker(false)}
        isReplacing={replacingIndex !== null}
        existingMeatIds={editedIngredients
          .filter((_, idx) => idx !== replacingIndex)
          .map((i) => i.meatId)}
        initialSelectedIds={pickerInitialMeatIds}
        initialRoleFilter={pickerInitialRole}
        onConfirm={handleConfirmPicker}
      />

      <SmartIngredientParseModal
        isOpen={showSmartParser}
        onClose={() => setShowSmartParser(false)}
        onApply={handleApplySmartParseDetail}
      />

      {/* 食材清单 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
        <div className="flex justify-between items-center mb-4 gap-2">
          <h3 className="font-semibold text-stone-800">食材清单</h3>
          {isEditingRecipe && (
            <button
              type="button"
              onClick={() => setShowSmartParser(true)}
              className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full hover:bg-violet-100 flex items-center gap-1 shrink-0 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> 智能识别
            </button>
          )}
        </div>

        {isEditingRecipe ? (
          <div className="space-y-3">
            {editedIngredients.map((item, idx) => {
              const meat = MEAT_DATABASE.find((m) => m.id === item.meatId);
              if (!meat) return null;
              const roleInfo = ROLE_META[meat.role] || ROLE_META.red_meat;
              const confidence = getConfidenceBadgeInfo(meat);

              return (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-stone-50 last:border-0 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 text-sm truncate">{meat.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs text-stone-500">{roleInfo.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded ${confidence.className}`}>
                        {confidence.shortLabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      value={item.weight}
                      onChange={(e) => {
                        const newArr = [...editedIngredients];
                        newArr[idx] = { ...newArr[idx], weight: e.target.value };
                        setEditedIngredients(newArr);
                      }}
                      className="w-16 px-2 py-1 text-right border border-stone-200 rounded focus:outline-none focus:border-[#FF7B4A] text-sm"
                      placeholder="重量"
                    />
                    <span className="text-xs text-stone-500">g</span>
                    <button
                      onClick={() => openReplacePicker(idx, meat.role)}
                      className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                      title="替换食材"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeIngredient(idx)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      title="移除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={openAddPicker}
              className="w-full py-2 border-2 border-dashed border-stone-200 rounded-xl text-stone-500 hover:border-[#FF7B4A] hover:text-[#FF7B4A] transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> 添加食材
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recipe.ingredients.map((item, idx) => {
              const meat = MEAT_DATABASE.find((m) => m.id === item.meatId);
              if (!meat) return null;
              const roleInfo = ROLE_META[meat.role] || ROLE_META.red_meat;
              const confidence = getConfidenceBadgeInfo(meat);

              return (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-stone-50 last:border-0 gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-stone-800 text-sm truncate">{meat.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs text-stone-500">
                        {roleInfo.icon} {roleInfo.label}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded ${confidence.className}`}>
                        {confidence.shortLabel}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-stone-900">{item.weight}g</p>
                    <p className="text-xs text-stone-400">
                      {calc.totalWeightG > 0 ? ((item.weight / calc.totalWeightG) * 100).toFixed(1) : '0.0'}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 营养剂选择器弹窗 */}
      <SupplementPickerModal
        isOpen={showSupplementPicker}
        onClose={() => setShowSupplementPicker(false)}
        isReplacing={replacingSupplementIndex !== null}
        existingSupplementIds={editedSupplements
          .filter((_, idx) => idx !== replacingSupplementIndex)
          .map((s) => s.supplementId)}
        initialSelectedIds={pickerInitialSuppIds}
        onConfirm={handleConfirmSupplementPicker}
      />

      {/* 营养剂清单 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-stone-800">营养剂清单</h3>
          <button
            onClick={handleAutoCalculateSupplements}
            className="text-xs text-[#FF7B4A] bg-[#FFFAF5] font-medium border border-orange-100 px-2.5 py-1 hover:bg-orange-100 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Activity className="w-3 h-3" /> 智能重算补剂
          </button>
        </div>

        {isEditingRecipe ? (
          <div className="space-y-3">
            {editedSupplements.map((item, idx) => {
              const supp = SUPPLEMENTS.find((s) => s.id === item.supplementId);
              if (!supp) return null;

              return (
                <div key={idx} className="py-2 border-b border-stone-50 last:border-0 space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-800 text-sm truncate">{supp.name}</p>
                      <p className="text-xs text-stone-500">
                        {supp.category} · {supp.unit_label}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => {
                          const newArr = [...editedSupplements];
                          newArr[idx] = { ...newArr[idx], amount: e.target.value };
                          setEditedSupplements(newArr);
                        }}
                        className="w-16 px-2 py-1 text-right border border-stone-200 rounded focus:outline-none focus:border-[#FF7B4A] text-sm"
                        placeholder="用量"
                      />
                      <span className="text-xs text-stone-500 w-6">{supp.unit}</span>
                      <button
                        onClick={() => openReplaceSupplementPicker(idx)}
                        className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                        title="更换补剂"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeSupplement(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        title="移除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              onClick={openAddSupplementPicker}
              className="w-full py-2 border-2 border-dashed border-stone-200 rounded-xl text-stone-500 hover:border-[#FF7B4A] hover:text-[#FF7B4A] transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> 添加营养剂
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recipe.supplements.length > 0 ? (
              recipe.supplements.map((item, idx) => {
                const supp = SUPPLEMENTS.find((s) => s.id === item.supplementId);
                if (!supp) return null;
                return (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-stone-50 last:border-0 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-stone-800 text-sm truncate">{supp.name}</p>
                      <p className="text-[11px] text-stone-400">{supp.category} · {supp.unit_label}</p>
                    </div>
                    <p className="font-semibold text-stone-900 whitespace-nowrap">
                      {item.amount} {supp.unit}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-stone-400 text-center py-2">暂未添加补剂，可点击右上角“智能重算补剂”</p>
            )}
          </div>
        )}

        {(calc.hasUnquantifiedFishOilVE || calc.hasSyntheticVEReminder || calc.hasBComplexCholineNote) && (
          <div className="mt-4 pt-3 border-t border-stone-100 space-y-1.5 text-[11px] text-stone-500">
            {calc.hasUnquantifiedFishOilVE && (
              <p className="flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>鱼油含混合生育酚抗氧化但未定量，未计入 VE 汇总。</span>
              </p>
            )}
            {calc.hasSyntheticVEReminder && (
              <p className="flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>双鲸维生素 E 请核对天然/合成形式：若为合成 dl-α-生育酚乙酸酯，按 α-生育酚当量需 ×0.45 折算。</span>
              </p>
            )}
            {calc.hasBComplexCholineNote && (
              <p className="flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                <span>复合维 B 已优先补齐 VB1 缺口，并同步累加按 41.1% 折算的元素胆碱。</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 space-y-3">
        {isEditingRecipe ? (
          <div className="flex gap-3">
            <button
              onClick={handleCancelEditRecipe}
              className="w-1/3 bg-white text-stone-600 border border-stone-200 px-4 py-3 rounded-xl font-medium shadow-sm hover:bg-stone-50 transition-colors flex items-center justify-center"
            >
              取消
            </button>
            <button
              onClick={handleSaveRecipe}
              className="w-2/3 text-white px-4 py-3 rounded-xl font-medium shadow-lg transition-colors flex items-center justify-center gap-2 bg-[#FF7B4A] hover:bg-orange-600"
            >
              <Save className="w-5 h-5" />
              保存修改
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handleEditRecipe}
              className="w-full bg-white text-[#FF7B4A] border border-[#FF7B4A] px-4 py-3 rounded-xl font-medium shadow-sm hover:bg-[#FFFAF5] transition-colors flex items-center justify-center gap-2"
            >
              <Edit2 className="w-5 h-5" />
              编辑配方与补剂
            </button>
            <button
              onClick={handleToggleActive}
              className={`w-full text-white px-4 py-3 rounded-xl font-medium shadow-lg transition-colors flex items-center justify-center gap-2 ${
                recipe.isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-stone-900 hover:bg-stone-800'
              }`}
            >
              <Activity className="w-5 h-5" />
              {recipe.isActive ? '停止执行' : '开始执行食谱'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Recipes() {
  return (
    <Routes>
      <Route path="/" element={<RecipeList />} />
      <Route path="/create" element={<CreateOrEditRecipe />} />
      <Route path="/edit/:id" element={<CreateOrEditRecipe />} />
      <Route path="/:id" element={<RecipeDetail />} />
    </Routes>
  );
}
