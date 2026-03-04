import { type IconName } from '../components/Icon';

export type CategoryMeta = {
  icon: IconName;
  color: string;
  bgAlpha: string; // color + alpha for icon container background
  type: 'expense' | 'income' | 'both';
};

/**
 * Canonical mapping of category name → icon + accent color.
 * Inspired by Montra design: rounded-square icon containers with
 * category-specific accent colours.
 */
export const CATEGORY_MAP: Record<string, CategoryMeta> = {
  Food: {
    icon: 'utensils',
    color: '#FF6B6B',
    bgAlpha: 'rgba(255,107,107,0.14)',
    type: 'expense',
  },
  Transport: {
    icon: 'car',
    color: '#6C5CE7',
    bgAlpha: 'rgba(108,92,231,0.14)',
    type: 'expense',
  },
  Bills: {
    icon: 'zap',
    color: '#00D9FF',
    bgAlpha: 'rgba(0,217,255,0.14)',
    type: 'expense',
  },
  Shopping: {
    icon: 'shopping-bag',
    color: '#FFAA00',
    bgAlpha: 'rgba(255,170,0,0.14)',
    type: 'expense',
  },
  Health: {
    icon: 'heart',
    color: '#2ED573',
    bgAlpha: 'rgba(46,213,115,0.14)',
    type: 'expense',
  },
  Entertainment: {
    icon: 'film',
    color: '#FF9FF3',
    bgAlpha: 'rgba(255,159,243,0.14)',
    type: 'expense',
  },
  Education: {
    icon: 'graduation-cap',
    color: '#54A0FF',
    bgAlpha: 'rgba(84,160,255,0.14)',
    type: 'expense',
  },
  Groceries: {
    icon: 'shopping-cart',
    color: '#FF9F43',
    bgAlpha: 'rgba(255,159,67,0.14)',
    type: 'expense',
  },
  Rent: {
    icon: 'building',
    color: '#EE5A24',
    bgAlpha: 'rgba(238,90,36,0.14)',
    type: 'expense',
  },
  Income: {
    icon: 'trending-up',
    color: '#2ED573',
    bgAlpha: 'rgba(46,213,115,0.14)',
    type: 'income',
  },
  Salary: {
    icon: 'briefcase',
    color: '#2ED573',
    bgAlpha: 'rgba(46,213,115,0.14)',
    type: 'income',
  },
  Other: {
    icon: 'more-horizontal',
    color: '#A29BFE',
    bgAlpha: 'rgba(162,155,254,0.14)',
    type: 'both',
  },
};

/** Default fallback for unknown categories */
const DEFAULT_META: CategoryMeta = {
  icon: 'tag',
  color: '#6C5CE7',
  bgAlpha: 'rgba(108,92,231,0.14)',
  type: 'both',
};

/** Get icon + color for any category, with graceful fallback */
export function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORY_MAP[category] || DEFAULT_META;
}

/** All category names in display order */
export const CATEGORY_NAMES = Object.keys(CATEGORY_MAP);
