/**
 * 喵膳 (MeowMeal) 微信小程序底层营养计算引擎
 * 与 Web 版 src/lib/nutritionEngine.ts 保持 100% 一致：
 * - 唯一数据源：data/ingredients.js (176项)、data/standards.js、data/supplements.js (10款)
 * - 统一单位直接相加，禁止任何 1000 倍换算
 */

const rawIngredients = require('../data/ingredients');
const rawStandards = require('../data/standards');
const rawSupplements = require('../data/supplements');

const INGREDIENTS_DB = rawIngredients;
const STANDARDS_DB = rawStandards;

function mapSupplementType(category) {
  switch (category) {
    case '钙粉': return 'calcium';
    case '鱼油': return 'fish_oil';
    case '碘/钾': return 'iodine';
    case '复合维B': return 'vb';
    case '维生素E': return 've';
    case '牛磺酸': return 'taurine';
    default: return 'calcium';
  }
}

function mapUnitShort(unitBasis) {
  if (unitBasis === 'g') return 'g';
  if (unitBasis === 'capsule') return '粒';
  if (unitBasis === 'tablet') return '片';
  return unitBasis;
}

function extractBrand(name) {
  if (name.indexOf('NOW') === 0) return 'NOW Foods';
  if (name.indexOf('Viva') === 0) return 'Viva Naturals';
  if (name.indexOf('NaturesPlus') === 0) return 'NaturesPlus';
  if (name.indexOf('Thompson') === 0) return 'Thompson';
  if (name.indexOf('双鲸') !== -1) return '双鲸';
  return '通用';
}

const SUPPLEMENTS_DB = rawSupplements.map((item) =>
  Object.assign({}, item, {
    type: mapSupplementType(item.category),
    unit: mapUnitShort(item.unit_basis),
    brand: extractBrand(item.name),
  })
);

const ROLE_META = {
  white_meat: { label: '白肉', icon: '🍗' },
  red_meat: { label: '红肉', icon: '🥩' },
  heart: { label: '心脏', icon: '❤️' },
  fish: { label: '鱼类', icon: '🐟' },
  mussel: { label: '青口贝', icon: '🦪' },
  liver: { label: '肝脏', icon: '🩸' },
  other_organ: { label: '其他内脏', icon: '🍖' },
  egg: { label: '蛋类', icon: '🥚' },
  fat: { label: '油脂', icon: '🧈' },
};

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

const CATEGORY_ORDER = [
  '鸡',
  '鸭',
  '鹅',
  '火鸡',
  '特种禽肉',
  '猪肉',
  '牛肉',
  '羊',
  '鹿',
  '兔',
  '马',
  '鱼类与海鲜',
  '蛋类',
  '调脂油脂',
];

const ALL_UNIFIED_NUTRIENT_KEYS = [
  'protein_g',
  'fat_g',
  'water_g',
  'carb_g',
  'calcium_mg',
  'phosphorus_mg',
  'potassium_mg',
  'sodium_mg',
  'magnesium_mg',
  'iron_mg',
  'zinc_mg',
  'copper_mg',
  'manganese_mg',
  'iodine_ug',
  'selenium_ug',
  'taurine_mg',
  'choline_mg',
  'epa_mg',
  'dha_mg',
  'epa_dha_mg',
  'va_iu',
  'vd_iu',
  've_mg',
  'vb1_mg',
  'vb2_mg',
  'vb3_mg',
  'vb5_mg',
  'vb6_mg',
  'vb7_ug',
  'vb9_ug',
  'vb12_ug',
];

const NUTRIENT_META_LIST = [
  { key: 'protein_g', label: '蛋白质', unit: 'g', group: '宏量营养素', core: true, decimals: 1 },
  { key: 'fat_g', label: '脂肪', unit: 'g', group: '宏量营养素', core: true, decimals: 1 },
  { key: 'calcium_mg', label: '钙 (Ca)', unit: 'mg', group: '矿物质', core: true, decimals: 1 },
  { key: 'phosphorus_mg', label: '磷 (P)', unit: 'mg', group: '矿物质', core: true, highRiskUpper: true, decimals: 1 },
  { key: 'ca_p_ratio', label: '钙磷比', unit: ': 1', group: '矿物质', core: true, decimals: 2 },
  { key: 'potassium_mg', label: '钾 (K)', unit: 'mg', group: '矿物质', decimals: 1 },
  { key: 'sodium_mg', label: '钠 (Na)', unit: 'mg', group: '矿物质', decimals: 1 },
  { key: 'magnesium_mg', label: '镁 (Mg)', unit: 'mg', group: '矿物质', decimals: 1 },
  { key: 'iron_mg', label: '铁 (Fe)', unit: 'mg', group: '矿物质', core: true, decimals: 1 },
  { key: 'zinc_mg', label: '锌 (Zn)', unit: 'mg', group: '矿物质', core: true, highRiskUpper: true, decimals: 1 },
  { key: 'copper_mg', label: '铜 (Cu)', unit: 'mg', group: '矿物质', decimals: 2 },
  { key: 'manganese_mg', label: '锰 (Mn)', unit: 'mg', group: '矿物质', decimals: 2 },
  { key: 'iodine_ug', label: '碘 (I)', unit: 'μg', group: '矿物质', core: true, highRiskUpper: true, decimals: 1 },
  { key: 'selenium_ug', label: '硒 (Se)', unit: 'μg', group: '矿物质', decimals: 1 },
  { key: 'taurine_mg', label: '牛磺酸', unit: 'mg', group: '氨基酸与脂肪酸', core: true, decimals: 1 },
  { key: 'choline_mg', label: '胆碱', unit: 'mg', group: '氨基酸与脂肪酸', decimals: 1 },
  { key: 'epa_dha_mg', label: 'EPA + DHA', unit: 'mg', group: '氨基酸与脂肪酸', core: true, decimals: 1 },
  { key: 'va_iu', label: '维生素 A', unit: 'IU', group: '维生素', core: true, highRiskUpper: true, decimals: 0 },
  { key: 'vd_iu', label: '维生素 D', unit: 'IU', group: '维生素', core: true, highRiskUpper: true, decimals: 1 },
  { key: 've_mg', label: '维生素 E', unit: 'mg', group: '维生素', core: true, decimals: 1 },
  { key: 'vb1_mg', label: '维生素 B1', unit: 'mg', group: '维生素', core: true, decimals: 2 },
  { key: 'vb2_mg', label: '维生素 B2', unit: 'mg', group: '维生素', decimals: 2 },
  { key: 'vb3_mg', label: '维生素 B3 (烟酸)', unit: 'mg', group: '维生素', decimals: 1 },
  { key: 'vb5_mg', label: '维生素 B5 (泛酸)', unit: 'mg', group: '维生素', decimals: 2 },
  { key: 'vb6_mg', label: '维生素 B6', unit: 'mg', group: '维生素', decimals: 2 },
  { key: 'vb7_ug', label: '维生素 B7 (生物素)', unit: 'μg', group: '维生素', decimals: 1 },
  { key: 'vb9_ug', label: '维生素 B9 (叶酸)', unit: 'μg', group: '维生素', decimals: 1 },
  { key: 'vb12_ug', label: '维生素 B12', unit: 'μg', group: '维生素', decimals: 2 },
];

const INGREDIENT_DETAIL_FIELDS = [
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

const SUPP_NUTRIENT_LABELS = [
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

const COOKED_HOMEMADE_TAURINE_FLOOR_MG = 500;
const COOKED_HOMEMADE_CAP_MIN = 1.1;
const COOKED_HOMEMADE_CAP_MAX = 1.4;
const TARGET_CAP_RATIO = 1.2;

function getIngredientById(id) {
  return INGREDIENTS_DB.find((item) => item.id === id);
}

function getSupplementById(id) {
  return SUPPLEMENTS_DB.find((item) => item.id === id);
}

function formatIngredientNutrientValue(ingredient, key, unit, decimals) {
  const dec = decimals === undefined ? 2 : decimals;
  if (ingredient.trace_fields && ingredient.trace_fields.indexOf(key) !== -1) {
    return { text: '微量 (Tr)', isMissing: false, isTrace: true };
  }
  const raw = ingredient.nutrients[key];
  if (raw === null || raw === undefined) {
    return { text: '未报告', isMissing: true, isTrace: false };
  }
  const formatted = Number.isInteger(raw)
    ? String(raw)
    : String(Number(raw.toFixed(dec)));
  return { text: `${formatted} ${unit}`.trim(), isMissing: false, isTrace: false };
}

function getConfidenceBadgeInfo(ingredient) {
  const tier = ingredient.confidence_tier || '';
  if (ingredient.is_proxy || tier.indexOf('L3') === 0 || tier.indexOf('L4') === 0) {
    const code = tier.slice(0, 2) || 'L3';
    return {
      shortLabel: `${code} 近似估算`,
      fullLabel: tier,
      badgeClass: 'badge-proxy',
      isProxy: true,
    };
  }
  if (tier.indexOf('L1') === 0) {
    return {
      shortLabel: 'L1 官方实测',
      fullLabel: tier,
      badgeClass: 'badge-l1',
      isProxy: false,
    };
  }
  return {
    shortLabel: 'L2 官方主源',
    fullLabel: tier || 'L2-官方主源+多源补齐',
    badgeClass: 'badge-l2',
    isProxy: false,
  };
}

function getStandardBounds(key, standard, lifeStage) {
  const nrcMin =
    lifeStage === 'kitten'
      ? STANDARDS_DB.NRC_2006.kitten_growth_ra
      : STANDARDS_DB.NRC_2006.adult_maintenance_ra;
  const nrcSul = STANDARDS_DB.NRC_2006.safe_upper_limit_sul;

  const aafcoMin =
    lifeStage === 'kitten'
      ? STANDARDS_DB.AAFCO_2016_2026.kitten_growth_min
      : STANDARDS_DB.AAFCO_2016_2026.adult_maintenance_min;
  const aafcoMax = STANDARDS_DB.AAFCO_2016_2026.max_limit;

  const baseMinTable = standard === 'NRC' ? nrcMin : aafcoMin;
  let min = baseMinTable[key] !== undefined ? baseMinTable[key] : null;
  let max = null;
  let maxLabel = '';
  let note = '';

  if (key === 'ca_p_ratio') {
    min = standard === 'AAFCO' ? (aafcoMin.ca_p_ratio || 1.0) : (nrcMin.ca_p_ratio || 1.1);
    max = COOKED_HOMEMADE_CAP_MAX;
    maxLabel = '推荐上限';
    note = 'AAFCO 最低 1.0，熟自制推荐 1.1–1.4';
    return { min, max, maxLabel, note };
  }

  if (key === 'taurine_mg') {
    if (standard === 'NRC') {
      min = nrcMin.taurine_wet_recommended_mg || nrcMin.taurine_mg || 170;
      note = 'NRC 湿粮推荐 170；熟自制高水分兜底 500';
    } else {
      min = aafcoMin.taurine_mg || 500;
    }
  }

  if (key === 'va_iu') {
    if (standard === 'NRC') {
      max = lifeStage === 'kitten' ? nrcSul.va_iu_kitten : nrcSul.va_iu_adult;
      maxLabel = 'SUL';
    } else {
      max = aafcoMax.va_iu;
      maxLabel = 'Max';
    }
  } else if (key === 'vd_iu') {
    max = standard === 'NRC' ? nrcSul.vd_iu : aafcoMax.vd_iu;
    maxLabel = standard === 'NRC' ? 'SUL' : 'Max';
  } else if (key === 'zinc_mg') {
    max = nrcSul.zinc_mg;
    maxLabel = 'SUL';
  } else if (key === 'fat_g') {
    if (standard === 'NRC') {
      max = nrcSul.fat_g;
      maxLabel = 'SUL';
    }
  } else if (key === 'phosphorus_mg') {
    max = aafcoMax.phosphorus_mg;
    maxLabel = 'Max';
  } else if (key === 'iodine_ug') {
    max = aafcoMax.iodine_ug;
    maxLabel = 'Max';
  }

  return { min, max, maxLabel, note };
}

function formatBoundsText(ev) {
  if (ev.key === 'ca_p_ratio') return '1.1 ~ 1.4 : 1';
  const parts = [];
  if (ev.min !== null && ev.min !== undefined) parts.push(`≥ ${ev.min}`);
  if (ev.max !== null && ev.max !== undefined) {
    parts.push(`≤ ${ev.max}${ev.maxLabel ? ` (${ev.maxLabel})` : ''}`);
  }
  if (parts.length === 0) return '参考值';
  return `${parts.join(' ~ ')} ${ev.unit}`.trim();
}

function createEmptyNutrientMap() {
  const obj = {};
  ALL_UNIFIED_NUTRIENT_KEYS.forEach((k) => {
    obj[k] = 0;
  });
  return obj;
}

function calculateRecipeNutrition(ingredients, supplements, standard, lifeStage) {
  const std = standard || 'NRC';
  const stage = lifeStage || 'adult';

  const meatTotals = createEmptyNutrientMap();
  const supplementTotals = createEmptyNutrientMap();
  const totals = createEmptyNutrientMap();
  const missingCounts = {};
  const proxyMap = {};

  const roleWeights = {
    red_meat: 0,
    white_meat: 0,
    fish: 0,
    mussel: 0,
    liver: 0,
    heart: 0,
    other_organ: 0,
    egg: 0,
    fat: 0,
  };

  let totalWeightG = 0;
  let totalKcal = 0;

  (ingredients || []).forEach((item) => {
    const weight = Number(item.weight) || 0;
    if (weight <= 0) return;
    const ing = getIngredientById(item.meatId);
    if (!ing) return;

    totalWeightG += weight;
    roleWeights[ing.role] = (roleWeights[ing.role] || 0) + weight;

    if (ing.is_proxy) {
      proxyMap[ing.id] = ing;
    }

    const factor = weight / 100;
    totalKcal += factor * (ing.nutrients.kcal || 0);

    ALL_UNIFIED_NUTRIENT_KEYS.forEach((key) => {
      if (ing.trace_fields && ing.trace_fields.indexOf(key) !== -1) return;
      const val = ing.nutrients[key];
      if (val === null || val === undefined) {
        missingCounts[key] = (missingCounts[key] || 0) + 1;
        return;
      }
      meatTotals[key] += factor * val;
    });
  });

  let hasUnquantifiedFishOilVE = false;
  let hasSyntheticVEReminder = false;
  let hasBComplexCholineNote = false;

  (supplements || []).forEach((item) => {
    const amount = Number(item.amount) || 0;
    if (amount <= 0) return;
    const supp = getSupplementById(item.supplementId);
    if (!supp) return;

    if (supp.unquantified_fields && supp.unquantified_fields.indexOf('ve_mg') !== -1) {
      hasUnquantifiedFishOilVE = true;
    }
    if (supp.id === 'sup_08' || supp.type === 've') {
      hasSyntheticVEReminder = true;
    }
    if (supp.type === 'vb') {
      hasBComplexCholineNote = true;
    }

    ALL_UNIFIED_NUTRIENT_KEYS.forEach((key) => {
      const val = supp.nutrients[key];
      if (val === null || val === undefined) return;
      supplementTotals[key] += amount * val;
    });
  });

  ALL_UNIFIED_NUTRIENT_KEYS.forEach((key) => {
    totals[key] = meatTotals[key] + supplementTotals[key];
  });

  const caPRatio = totals.phosphorus_mg > 0 ? totals.calcium_mg / totals.phosphorus_mg : 0;

  const per1000kcal = {};
  NUTRIENT_META_LIST.forEach((meta) => {
    if (meta.key === 'ca_p_ratio') {
      per1000kcal.ca_p_ratio = caPRatio;
    } else {
      const totalVal = totals[meta.key] || 0;
      per1000kcal[meta.key] = totalKcal > 0 ? (totalVal / totalKcal) * 1000 : 0;
    }
  });

  const proteinKcal = totals.protein_g * 3.5;
  const fatKcal = totals.fat_g * 8.5;
  const carbKcal = totals.carb_g * 3.5;
  const macroKcalSum = proteinKcal + fatKcal + carbKcal;

  const macroME = {
    proteinPct: macroKcalSum > 0 ? (proteinKcal / macroKcalSum) * 100 : 0,
    fatPct: macroKcalSum > 0 ? (fatKcal / macroKcalSum) * 100 : 0,
    carbPct: macroKcalSum > 0 ? (carbKcal / macroKcalSum) * 100 : 0,
  };

  const evaluations = NUTRIENT_META_LIST.map((meta) => {
    const bounds = getStandardBounds(meta.key, std, stage);
    const val = per1000kcal[meta.key];
    const totalAmount = meta.key === 'ca_p_ratio' ? caPRatio : totals[meta.key] || 0;
    const missingCount =
      meta.key === 'ca_p_ratio'
        ? (missingCounts.calcium_mg || 0) + (missingCounts.phosphorus_mg || 0)
        : missingCounts[meta.key] || 0;

    let status = 'green';
    let reason = 'ok';

    if (meta.key === 'ca_p_ratio') {
      if (totalWeightG === 0 || totals.phosphorus_mg === 0) {
        status = 'neutral';
        reason = 'no_std';
      } else if (val < 1.0) {
        status = 'red';
        reason = 'low_critical';
      } else if (val > 2.0) {
        status = 'red';
        reason = 'high_danger';
      } else if (val < COOKED_HOMEMADE_CAP_MIN) {
        status = 'yellow';
        reason = 'low_warn';
      } else if (val > COOKED_HOMEMADE_CAP_MAX) {
        status = 'yellow';
        reason = 'high_warn';
      }
    } else if (bounds.min === null && bounds.max === null) {
      status = 'neutral';
      reason = 'no_std';
    } else if (bounds.max !== null && val > bounds.max) {
      status = 'red';
      reason = 'high_danger';
    } else if (bounds.min !== null && val < bounds.min) {
      if (val < bounds.min * 0.7) {
        status = 'red';
        reason = 'low_critical';
      } else {
        status = 'yellow';
        reason = 'low_warn';
      }
    }

    const decimals = meta.decimals === undefined ? 1 : meta.decimals;
    const ev = {
      key: meta.key,
      label: meta.label,
      unit: meta.unit,
      group: meta.group,
      core: Boolean(meta.core),
      highRiskUpper: Boolean(meta.highRiskUpper),
      decimals,
      totalAmount,
      per1000kcal: val,
      per1000kcalText: `${val.toFixed(decimals)} ${meta.unit}`.trim(),
      min: bounds.min,
      max: bounds.max,
      maxLabel: bounds.maxLabel,
      note: bounds.note,
      status,
      reason,
      statusSymbol:
        status === 'neutral'
          ? '—'
          : status === 'green'
          ? '✓'
          : reason === 'high_danger'
          ? '↑超标'
          : reason === 'high_warn'
          ? '↑'
          : '↓',
      hasMissingSource: missingCount > 0,
      missingCount,
    };
    ev.boundsText = formatBoundsText(ev);
    return ev;
  });

  const highRiskAlerts = evaluations.filter(
    (ev) => ev.reason === 'high_danger' && (ev.highRiskUpper || ev.key === 'fat_g' || ev.key === 'ca_p_ratio')
  );

  const missingNutrientKeys = Object.keys(missingCounts).filter((k) => missingCounts[k] > 0);
  const proxyIngredients = Object.keys(proxyMap).map((id) => proxyMap[id]);

  return {
    totalWeightG,
    totalKcal,
    meatTotals,
    supplementTotals,
    totals,
    per1000kcal,
    caPRatio,
    macroME,
    roleWeights,
    evaluations,
    highRiskAlerts,
    hasMissingData: missingNutrientKeys.length > 0,
    missingNutrientKeys,
    proxyIngredients,
    hasUnquantifiedFishOilVE,
    hasSyntheticVEReminder,
    hasBComplexCholineNote,
  };
}

function roundDosage(val) {
  if (!Number.isFinite(val) || val <= 0) return 0;
  return Math.ceil(val * 100) / 100;
}

function computeRecommendedAmountForSupplement(supplement, meatResult, standard, lifeStage) {
  const totalKcal = meatResult.totalKcal;
  const meatTotals = meatResult.meatTotals;
  if (totalKcal <= 0) return 0;

  const stdTable =
    standard === 'NRC'
      ? lifeStage === 'kitten'
        ? STANDARDS_DB.NRC_2006.kitten_growth_ra
        : STANDARDS_DB.NRC_2006.adult_maintenance_ra
      : lifeStage === 'kitten'
      ? STANDARDS_DB.AAFCO_2016_2026.kitten_growth_min
      : STANDARDS_DB.AAFCO_2016_2026.adult_maintenance_min;

  const kcalFactor = totalKcal / 1000;

  switch (supplement.type) {
    case 'calcium': {
      const stdCa = stdTable.calcium_mg || 720;
      const targetCa = Math.max(meatTotals.phosphorus_mg * TARGET_CAP_RATIO, kcalFactor * stdCa);
      const caPerG = supplement.nutrients.calcium_mg || 0;
      if (caPerG <= 0) return 0;
      return roundDosage(Math.max(0, targetCa - meatTotals.calcium_mg) / caPerG);
    }
    case 'iodine': {
      const stdIodine = stdTable.iodine_ug || 350;
      const iodinePerTab = supplement.nutrients.iodine_ug || 225;
      if (iodinePerTab <= 0) return 0;
      return roundDosage(Math.max(0, kcalFactor * stdIodine - meatTotals.iodine_ug) / iodinePerTab);
    }
    case 'fish_oil': {
      const stdEpaDha =
        stdTable.epa_dha_mg !== null && stdTable.epa_dha_mg !== undefined
          ? stdTable.epa_dha_mg
          : STANDARDS_DB.NRC_2006.adult_maintenance_ra.epa_dha_mg || 25;
      const epaDhaPerCap = supplement.nutrients.epa_dha_mg || 0;
      if (epaDhaPerCap <= 0) return 0;
      return roundDosage(Math.max(0, kcalFactor * stdEpaDha - meatTotals.epa_dha_mg) / epaDhaPerCap);
    }
    case 've': {
      const stdVe = stdTable.ve_mg || 10;
      const vePerCap = supplement.nutrients.ve_mg || 0;
      if (vePerCap <= 0) return 0;
      return roundDosage(Math.max(0, kcalFactor * stdVe - meatTotals.ve_mg) / vePerCap);
    }
    case 'vb': {
      const stdVb1 = stdTable.vb1_mg || 1.4;
      const vb1PerTab = supplement.nutrients.vb1_mg || 0;
      if (vb1PerTab <= 0) return 0;
      return roundDosage(Math.max(0, kcalFactor * stdVb1 - meatTotals.vb1_mg) / vb1PerTab);
    }
    case 'taurine': {
      const targetTaurine = kcalFactor * COOKED_HOMEMADE_TAURINE_FLOOR_MG;
      const taurinePerCap = supplement.nutrients.taurine_mg || 0;
      if (taurinePerCap <= 0) return 0;
      return roundDosage(Math.max(0, targetTaurine - meatTotals.taurine_mg) / taurinePerCap);
    }
    default:
      return 0;
  }
}

const DEFAULT_SUPPLEMENT_BRANDS = {
  calcium: 'sup_01',
  iodine: 'sup_05',
  fish_oil: 'sup_03',
  ve: 'sup_08',
  vb: 'sup_06',
  taurine: 'sup_09',
};

function recommendSupplements(ingredients, standard, lifeStage, existingSupplements) {
  const std = standard || 'NRC';
  const stage = lifeStage || 'adult';
  const meatOnly = calculateRecipeNutrition(ingredients, [], std, stage);
  if (meatOnly.totalKcal <= 0) return [];

  const brandByType = Object.assign({}, DEFAULT_SUPPLEMENT_BRANDS);
  (existingSupplements || []).forEach((existing) => {
    const supp = getSupplementById(existing.supplementId);
    if (supp) brandByType[supp.type] = supp.id;
  });

  const order = ['calcium', 'iodine', 'fish_oil', 've', 'vb', 'taurine'];
  const result = [];

  order.forEach((type) => {
    const supp = getSupplementById(brandByType[type]);
    if (!supp) return;
    const amount = computeRecommendedAmountForSupplement(supp, meatOnly, std, stage);
    if (amount > 0) {
      result.push({ supplementId: supp.id, amount });
    }
  });

  return result;
}

const AUTO_RECIPE_ROLE_RATIOS = [
  { role: 'white_meat', ratio: 0.35, preferredIds: ['ing_086', 'ing_101', 'ing_167', 'ing_092'] },
  { role: 'red_meat', ratio: 0.25, preferredIds: ['ing_001', 'ing_055', 'ing_002', 'ing_054'] },
  { role: 'heart', ratio: 0.15, preferredIds: ['ing_089', 'ing_171', 'ing_004', 'ing_059'] },
  { role: 'fish', ratio: 0.10, preferredIds: ['ing_126', 'ing_127', 'ing_132', 'ing_135'] },
  { role: 'mussel', ratio: 0.05, preferredIds: ['ing_131', 'ing_128'] },
  { role: 'liver', ratio: 0.05, preferredIds: ['ing_090', 'ing_104', 'ing_172', 'ing_005'] },
  { role: 'other_organ', ratio: 0.05, preferredIds: ['ing_006', 'ing_014', 'ing_015', 'ing_091'] },
];

function matchesAllergy(ing, allergies) {
  if (!allergies || allergies.length === 0) return false;
  const cleanName = ing.name.replace(/牛磺酸/g, '');
  return allergies.some((raw) => {
    const keyword = String(raw || '').trim();
    if (!keyword) return false;
    const base = keyword.replace(/肉$/u, '');
    return (
      cleanName.indexOf(keyword) !== -1 ||
      ing.category.indexOf(keyword) !== -1 ||
      (base.length > 0 && (cleanName.indexOf(base) !== -1 || ing.category.indexOf(base) !== -1))
    );
  });
}

function generateAutoRecipeIngredients(totalWeightG, options) {
  const opts = options || {};
  const mode = opts.mode || 'custom';
  const allergies = opts.allergies || [];
  const inventory = (opts.inventory || [])
    .filter((i) => i.weight > 0)
    .slice()
    .sort((a, b) => (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31'));

  const chosen = [];
  let allocated = 0;

  for (let idx = 0; idx < AUTO_RECIPE_ROLE_RATIOS.length; idx++) {
    const slot = AUTO_RECIPE_ROLE_RATIOS[idx];
    const targetWeight =
      idx === AUTO_RECIPE_ROLE_RATIOS.length - 1
        ? Math.max(10, Math.round(totalWeightG - allocated))
        : Math.max(10, Math.round((totalWeightG * slot.ratio) / 5) * 5);

    let selected = null;

    if (mode === 'by_inventory' && inventory.length > 0) {
      for (let i = 0; i < inventory.length; i++) {
        const ing = getIngredientById(inventory[i].meatId);
        if (ing && ing.role === slot.role && !matchesAllergy(ing, allergies)) {
          selected = ing;
          break;
        }
      }
    }

    if (!selected) {
      for (let j = 0; j < slot.preferredIds.length; j++) {
        const ing = getIngredientById(slot.preferredIds[j]);
        if (ing && !ing.is_proxy && !matchesAllergy(ing, allergies)) {
          selected = ing;
          break;
        }
      }
    }

    if (!selected) {
      selected = INGREDIENTS_DB.find(
        (ing) => ing.role === slot.role && !ing.is_proxy && !matchesAllergy(ing, allergies)
      );
    }

    if (!selected) {
      selected = INGREDIENTS_DB.find((ing) => ing.role === slot.role);
    }

    if (selected) {
      chosen.push({ meatId: selected.id, weight: targetWeight });
      allocated += targetWeight;
    }
  }

  return chosen;
}

function inferLifeStageFromCats(cats) {
  if ((cats || []).some((c) => typeof c.age === 'number' && c.age > 0 && c.age < 1)) {
    return 'kitten';
  }
  return 'adult';
}

function daysBetweenToday(dateStr) {
  if (!dateStr) return 999;
  const target = new Date(dateStr.replace(/-/g, '/'));
  if (isNaN(target.getTime())) return 999;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.floor((targetStart - todayStart) / (24 * 60 * 60 * 1000));
}

module.exports = {
  INGREDIENTS_DB,
  STANDARDS_DB,
  SUPPLEMENTS_DB,
  ROLE_META,
  ROLE_FILTER_TABS,
  CATEGORY_ORDER,
  NUTRIENT_META_LIST,
  INGREDIENT_DETAIL_FIELDS,
  SUPP_NUTRIENT_LABELS,
  COOKED_HOMEMADE_TAURINE_FLOOR_MG,
  getIngredientById,
  getSupplementById,
  formatIngredientNutrientValue,
  getConfidenceBadgeInfo,
  getStandardBounds,
  formatBoundsText,
  calculateRecipeNutrition,
  computeRecommendedAmountForSupplement,
  recommendSupplements,
  generateAutoRecipeIngredients,
  inferLifeStageFromCats,
  daysBetweenToday,
};
