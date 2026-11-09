import { supabase } from './supabase';
import type { Order, OrderItem, CreateOrderParams, CreateOrderResult, Notification } from './types';

export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const { data, error } = await supabase
    .rpc('f_create_order', {
      _customer_name: params.customer_name,
      _phone: params.phone,
      _address: params.address,
      _notes: params.notes,
      _payment_method: params.payment_method,
      _items: params.items,
    });

  if (error) throw error;
  return data;
}

export async function getOrderById(id: number): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .single();

  if (error) throw error;
  return data;
}

export async function getOrdersForUser(userId: string, page = 1, limit = 20) {
  const { data, error, count } = await supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) throw error;
  return { orders: data || [], total: count || 0 };
}

export async function getOrderItems(orderId: number): Promise<OrderItem[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('id');

  if (error) throw error;
  return data || [];
}

export async function getAllOrders(params: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): Promise<{ orders: Order[]; total: number }> {
  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' });

  if (params.search) {
    const s = params.search.trim();
    query = query.or(`order_number.eq.${s},customer_name.ilike.%${s}%,phone.ilike.%${s}%`);
  }

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  const { data, error, count } = await query
    .order(params.sortBy || 'created_at', { ascending: params.sortDir === 'asc' })
    .range((params.page || 1) - 1, (params.page || 1));

  if (error) throw error;
  return { orders: data || [], total: count || 0 };
}

export async function updateOrderStatus(orderId: number, newStatus: string): Promise<void> {
  const { error } = await supabase.rpc('f_update_order_status', {
    _order_id: orderId,
    _new_status: newStatus,
  });

  if (error) throw error;
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq( 'id', notificationId);

  if (error) throw error;
}

export async function getOrderWithItems(orderId: number): Promise<{
  order: Order;
  items: OrderItem[];
} | null> {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) return null;

  const items = await getOrderItems(orderId);
  return { order, items };
}

export function formatOrderNumber(orderNumber: string): string {
  return orderNumber;
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'نقدًا',
    installments: 'الأقساط',
    vodafone: 'فونة',
    orange: 'أورنج بوينت',
  };
  return labels[method] || method;
}
