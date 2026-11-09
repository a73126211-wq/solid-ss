export const APP_NAME = 'SOLID - سوليد';
export const APP_TAGLINE = 'أطعم جودة في كل طلب';

export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'cash', label: 'نقدًا' },
  { value: 'installments', label: 'الأقساط' },
  { value: 'vodafone', label: 'فونة' },
  { value: 'orange', label: 'أورنج بوينت' },
];

export const STATUS_COLORS: Record<string, string> = {
  new: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  received: 'bg-blue-100 text-blue-800 border-blue-300',
  preparing: 'bg-purple-100 text-purple-800 border-purple-300',
  out_for_delivery: 'bg-orange-100 text-orange-800 border-orange-300',
  delivered: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

export const STATUS_COLORS_DARK: Record<string, string> = {
  new: 'bg-yellow-500',
  received: 'bg-blue-500',
  preparing: 'bg-purple-500',
  out_for_delivery: 'bg-orange-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
};

export const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop&q=80';
