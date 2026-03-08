import React, { useContext } from 'react';
import { ThemeContext } from '../store/theme';
import {
  Home,
  ArrowLeftRight,
  PieChart,
  User,
  Plus,
  Search,
  X,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Wallet,
  RefreshCw,
  ArrowDownUp,
  ChevronRight,
  Tag,
  Clock,
  Repeat,
  ShoppingBag,
  Car,
  Zap,
  ShoppingCart,
  Heart,
  Film,
  GraduationCap,
  DollarSign,
  MoreHorizontal,
  UtensilsCrossed,
  Building,
  Briefcase,
  Filter,
  Trash2,
  Edit3,
  Check,
  Info,
  Menu,
  Target,
  Camera,
  Image,
  Paperclip,
  PartyPopper,
  FileText,
  CheckCircle,
  Bell,
  ArrowUp,
  ArrowDown,
  type LucideProps,
} from 'lucide-react-native';

const iconMap = {
  home: Home,
  activity: ArrowLeftRight,
  chart: PieChart,
  profile: User,
  plus: Plus,
  search: Search,
  x: X,
  calendar: Calendar,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'alert-triangle': AlertTriangle,
  wallet: Wallet,
  'refresh-cw': RefreshCw,
  'arrow-down-up': ArrowDownUp,
  'chevron-right': ChevronRight,
  tag: Tag,
  clock: Clock,
  repeat: Repeat,
  'shopping-bag': ShoppingBag,
  car: Car,
  zap: Zap,
  'shopping-cart': ShoppingCart,
  heart: Heart,
  film: Film,
  'graduation-cap': GraduationCap,
  'dollar-sign': DollarSign,
  'more-horizontal': MoreHorizontal,
  utensils: UtensilsCrossed,
  building: Building,
  briefcase: Briefcase,
  filter: Filter,
  trash: Trash2,
  edit: Edit3,
  check: Check,
  info: Info,
  menu: Menu,
  target: Target,
  camera: Camera,
  image: Image,
  'party-popper': PartyPopper,
  'file-text': FileText,
  paperclip: Paperclip,
  'check-circle': CheckCircle,
  bell: Bell,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
} as const;

export type IconName = keyof typeof iconMap;

type IconSize = 10 | 12 | 14 | 16 | 18 | 20 | 24 | 26 | 28 | 32 | 36 | 40 | 48;

type Props = {
  name: IconName;
  size?: IconSize;
  color?: string;
  strokeWidth?: number;
};

export default function Icon({ name, size = 24, color, strokeWidth = 2 }: Props) {
  const { colors } = useContext(ThemeContext);
  const LucideIcon = iconMap[name];

  return (
    <LucideIcon
      size={size}
      color={color || colors.text}
      strokeWidth={strokeWidth}
    />
  );
}
