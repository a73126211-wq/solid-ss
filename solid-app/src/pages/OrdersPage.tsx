import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getOrdersForUser, getOrderWithItems } from '../lib/orders';
import type { Order, OrderItem, OrderStatus } from '../lib/types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_ORDERED } from '../lib/types';
import { useNotification } from '../contexts/NotificationContext';
import { useCart } from '../contexts/CartContext';
import { Package, Clock } from 'lucide-react';

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { itemCount } = useCart();
  const notify = useNotification();

  const PAGE_SIZE = 10;

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notify.addNotification({ type: 'warning', title: 'تنبيه', body: 'يرجى تسجيل الدخول' });
        return;
      }

      const { orders: userOrders, total } = await getOrdersForUser(user.id, page, PAGE_SIZE);
      setOrders(userOrders);
      setTotalPages(Math.ceil(total / PAGE_SIZE) || 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ';
      setError(msg);
      notify.addNotification({ type: 'error', title: 'خطأ', body: msg });
    } finally {
      setLoading(false);
    }
  }, [page, notify]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    orders.forEach((order) => {
      const channel = supabase
        .channel(`order:${order.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${order.id}`,
          },
          (payload) => {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === order.id
                  ? { ...o, status: payload.new.status as Order['status'] }
                  : o
              )
            );
          }
        )
        .subscribe();
      return () => supabase.removeChannel(channel).catch(() => {});
    });
  }, [orders]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-yellow-500',
      received: 'bg-blue-500',
      preparing: 'bg-purple-500',
      out_for_delivery: 'bg-orange-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-400',
    };
    return colors[status] || 'bg-gray-400';
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('ar-EG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 pb-20">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500">جاري تحميل الطلبات...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 pb-20">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
            <p className="text-gray-600 mb-3">{error}</p>
            <button
              onClick={loadOrders}
              className="text-yellow-600 font-semibold hover:underline text-sm"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-5 flex items-center gap-2">
          <Package size={24} className="text-yellow-500" />
          طلباتي
          {itemCount > 0 && (
            <span className="bg-yellow-500 text-black text-sm font-bold px-2.5 py-0.5 rounded-full ml-2">
              {itemCount} في السلة
            </span>
          )}
        </h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Package size={28} className="text-gray-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-700 mb-2">لا توجد طلبات بعد</h2>
            <p className="text-gray-500 mb-6">
              إليك أول طلبك! تصفح المنيو واطلب أطباقك المفضلة.
            </p>
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 bg-black text-white font-semibold px-6 py-3 rounded-full hover:bg-gray-800 transition-fast btn-press"
            >
              عرض المنيو
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="bg-white rounded-xl p-4 block border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-lg tracking-wider">
                        {order.order_number}
                      </span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${getStatusColor(order.status)}`}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' : order.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' : order.status === 'new' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-600'}`}
                  >
                    {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] || order.status}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {order.customer_name} - {order.phone}
                  </span>
                  <span className="font-bold">
                    EGP {typeof order.total === 'number' ? order.total.toFixed(0) : order.total}
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-50">
                  <p className="text-xs text-gray-400">
                    عرض التفاصيل - افحص الطلب
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-fast"
            >
              السابق
            </button>
            <span className="text-sm text-gray-500">
              صفحة {page} من {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-fast"
            >
              التالي
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
