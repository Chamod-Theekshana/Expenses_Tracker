import React, { useContext } from 'react';
import { ThemeContext } from '../store/theme';
import {
  Home,
  ArrowLeftRight,
  ArrowLeft,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
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
  Sun,
  Moon,
  Globe,
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
  UserPlus,
  Eye,
  EyeOff,
  LogIn,
  LogOut,
  Key,
  Mail,
  PlusCircle,
  Lock,
  Settings,
} from 'lucide-react-native';

const iconMap = {
  home: Home,
  activity: ArrowLeftRight,
  'arrow-left': ArrowLeft,
  'arrow-up-circle': ArrowUpCircle,
  'arrow-down-circle': ArrowDownCircle,
  analytics: BarChart3,
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
  sun: Sun,
  moon: Moon,
  globe: Globe,
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
  'user-plus': UserPlus,
  eye: Eye,
  'eye-off': EyeOff,
  'log-in': LogIn,
  'log-out': LogOut,
  key: Key,
  mail: Mail,
  'plus-circle': PlusCircle,
  lock: Lock,
  settings: Settings,
} as const;

export type IconName = keyof typeof iconMap;

type IconSize = 10 | 12 | 14 | 16 | 18 | 20 | 22 | 24 | 26 | 28 | 32 | 36 | 40 | 48;

type Props = {
  name: IconName;
  size?: IconSize;
  color?: string;
  strokeWidth?: number;
};

export default function Icon({ name, size = 24, color, strokeWidth = 2 }: Props) {
  const { colors } = useContext(ThemeContext);
  const LucideIcon = iconMap[name];

  if (!LucideIcon) {
    console.warn(`Icon: unknown icon name "${name}"`);
    return null;
  }

  return (
    <LucideIcon
      size={size}
      color={color || colors.text}
      strokeWidth={strokeWidth}
    />
  );
}
