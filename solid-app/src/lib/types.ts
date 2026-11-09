export type UserRole = 'Customer' | 'Supervisor' | 'Admin';
export type OrderStatus =
  | 'new'
  | 'received'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'طلب جديد',
  received: 'تم استلام الطلب',
  preparing: 'جاري التجهيز',
  out_for_delivery: 'خرج للتوصيل',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

export const ORDER_STATUS_ORDERED: OrderStatus[] = [
  'new',
  'received',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export interface MenuItem {
  id: number;
  item_code: string;
  name: string;
  category: string;
  description: string;
  price: number | string;
  available: boolean;
  featured: boolean;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  user_id: string;
  customer_name: string;
  phone: string;
  address: string;
  notes: string;
  payment_method: string;
  total: number | string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number | null;
  item_code: string;
  item_name: string;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
}

export interface Notification {
  id: number;
  recipient_user_id: string;
  title: string;
  message: string;
  order_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: string;
  updated_at: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface CreateOrderParams {
  customer_name: string;
  phone: string;
  address: string;
  notes: string;
  payment_method: string;
  items: { menu_item_id: number; quantity: number }[];
}

export interface CreateOrderResult {
  order_id: number;
  order_number: string;
  total: number;
}

export interface DashboardStats {
  today_orders: number;
  new_orders: number;
  received_orders: number;
  preparing_orders: number;
  out_for_delivery_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  today_sales: number;
}
