import {
  STANDARDS_DB,
  NUTRIENT_META_LIST,
  getStandardBounds,
  StandardType,
  LifeStage,
  StandardNutrientKey,
} from '../lib/nutritionEngine';

export { STANDARDS_DB };

export interface StandardRowMeta {
  key: StandardNutrientKey;
  label: string;
  unit: string;
  category: string;
  min: number | null;
  max: number | null;
  maxLabel?: 'SUL' | 'Max' | '推荐上限';
  note?: string;
  highRiskUpper: boolean;
}

export function getFullNutritionStandards(
  standard: StandardType = 'NRC',
  lifeStage: LifeStage = 'adult'
): StandardRowMeta[] {
  return NUTRIENT_META_LIST.map((meta) => {
    const bounds = getStandardBounds(meta.key, standard, lifeStage);
    return {
      key: meta.key,
      label: meta.label,
      unit: meta.unit,
      category: meta.group,
      min: bounds.min,
      max: bounds.max,
      maxLabel: bounds.maxLabel,
      note: bounds.note,
      highRiskUpper: Boolean(meta.highRiskUpper),
    };
  });
}

// 保持向后兼容的快捷映射（直接来源于 standards.json）
export const FULL_NUTRITION_STANDARDS = {
  NRC: getFullNutritionStandards('NRC', 'adult'),
  AAFCO: getFullNutritionStandards('AAFCO', 'adult'),
};
