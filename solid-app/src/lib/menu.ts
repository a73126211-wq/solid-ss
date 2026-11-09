import { supabase } from './supabase';
import type { MenuItem, DashboardStats } from './types';

export async function getMenuItems({
  category,
  search,
  featuredOnly = false,
  availableOnly = true,
  page = 1,
  limit = 50,
}: {
  category?: string;
  search?: string;
  featuredOnly?: boolean;
  availableOnly?: boolean;
  page?: number;
  limit?: number;
} = {}): Promise<{ items: MenuItem[]; total: number }> {
  let query = supabase
    .from('menu_items')
    .select('*', { count: 'exact' });

  if (featuredOnly) {
    query = query.eq('featured', true);
  }

  if (availableOnly) {
    query = query.eq('available', true);
  }

  if (category && category !== 'الكل') {
    query = query.eq('category', category);
  }

  if (search && search.trim()) {
    query = query.ilike('name', `%${search.trim()}%`);
  }

  const { data, error, count } = await query
    .order('category')
    .order('name')
    .range((page - 1) * limit, page * limit - 1);

  if (error) throw error;
  return { items: data || [], total: count || 0 };
}

export async function getMenuCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('category')
    .order('category');

  if (error) throw error;
  const cats = [...new Set(data.map((d) => d.category))];
  return cats;
}

export async function getFeaturedItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('featured', true)
    .eq('available', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getMenuItemById(id: number): Promise<MenuItem | null> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getItemByCode(itemCode: string): Promise<MenuItem | null> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('item_code', itemCode)
    .single();

  if (error) throw error;
  return data;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const statuses: Array<{ status: string; label: string }> = [
    { status: 'new', label: 'new_orders' },
    { status: 'received', label: 'received_orders' },
    { status: 'preparing', label: 'preparing_orders' },
    { status: 'out_for_delivery', label: 'out_orders' },
    { status: 'delivered', label: 'delivered_orders' },
    { status: 'cancelled', label: 'cancelled_orders' },
  ];

  const results: Record<string, number> = {};
  for (const s of statuses) {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('status', s.status)
      .gte('created_at', `${dateStr}T00:00:00+00:00`)
      .lte('created_at', `${dateStr}T23:59:59+00:00`);

    results[s.label] = count || 0;
  }

  const { data: salesRows, error: salesError } = await supabase
    .from('orders')
    .select('total')
    .neq('status', 'cancelled')
    .gte('created_at', `${dateStr}T00:00:00+00:00`)
    .lte('created_at', `${dateStr}T23:59:59+00:00`);

  let todaySales = 0;
  if (!salesError && salesRows) {
    todaySales = salesRows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  }

  return {
    today_orders: results.new_orders + results.received_orders + results.preparing_orders + results.out_orders + results.delivered_orders + results.cancelled_orders,
    new_orders: results.new_orders,
    received_orders: results.received_orders,
    preparing_orders: results.preparing_orders,
    out_for_delivery_orders: results.out_orders,
    delivered_orders: results.delivered_orders,
    cancelled_orders: results.cancelled_orders,
    today_sales: todaySales,
  };
}

export async function createMenuItem(
  item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>
): Promise<MenuItem> {
  const { data, error } = await supabase
    .from('menu_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMenuItem(
  id: number,
  updates: Partial<Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>>
): Promise<MenuItem> {
  const { data, error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMenuItem(id: number): Promise<void> {
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) throw error;
}
