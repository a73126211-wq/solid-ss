import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';
import { getProfile } from '../lib/auth';
import { createOrder, getPaymentMethodLabel } from '../lib/orders';
import { getMenuItemById } from '../lib/menu';
import type { MenuItem } from '../lib/types';
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { PAYMENT_METHODS } from '../lib/constants';

type CheckoutStep = 'items' | 'details' | 'confirm' | 'success';

export function CheckoutPage() {
  const { items, total, clearCart, itemCount } = useCart();
  const notify = useNotification();
  const navigate = useNavigate();

  const [step, setStep] = useState<CheckoutStep>('items');
  const [profile, setProfile] = useState<import('../lib/types').Profile | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const [validatedItems, setValidatedItems] = useState<
    Array<{ menuItem: MenuItem; quantity: number; unitPrice: number }>
  >([]);
  const [validatingPrices, setValidatingPrices] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const validatedTotal = useMemo(
    () =>
      validatedItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    [validatedItems]
  );

  useEffect(() => {
    const load = async () => {
      if (itemCount === 0) {
        navigate('/cart');
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notify.addNotification({ type: 'warning', title: 'تنبيه', body: 'يرجى تسجيل الدخول أولاً' });
        navigate('/login?next=/checkout');
        return;
      }
      const p = await getProfile();
      setProfile(p);

      if (p) {
        setCustomerName(p.full_name || '');
      }
    };
    load();
  }, [itemCount, navigate, notify]);

  const validatePrices = async () => {
    if (items.length === 0) return;
    setValidatingPrices(true);
    setPriceError(null);

    try {
      const validated = [];

      for (const item of items) {
        const dbItem = await getMenuItemById(item.menuItem.id);
        if (!dbItem) {
          setPriceError(`الصنف "${item.menuItem.name}" غير موجود حاليًا`);
          return;
        }
        if (!dbItem.available) {
          setPriceError(`الصنف "${dbItem.name}" غير متاح حاليًا`);
          return;
        }
        validated.push({
          menuItem: dbItem,
          quantity: item.quantity,
          unitPrice: Number(dbItem.price) || 0,
        });
      }

      setValidatedItems(validated);
    } catch (err) {
      setPriceError('حدث خطأ أثناء التحقق من الأسعار. حاول مرة أخرى.');
      notify.addNotification({
        type: 'error',
        title: 'خطأ',
        body: 'تعذر التحقق من الأسعار',
      });
    } finally {
      setValidatingPrices(false);
    }
  };

  const handleContinueToDetails = async () => {
    if (validatingPrices) return;
    await validatePrices();
    if (priceError) {
      notify.addNotification({ type: 'error', title: 'خطأ', body: priceError });
      return;
    }
    setStep('details');
  };

  const handlePlaceOrder = async () => {
    if (!customerName.trim()) {
      notify.addNotification({ type: 'warning', title: 'تنبيه', body: 'أدخل اسم العميل' });
      return;
    }
    if (!phone.trim()) {
      notify.addNotification({ type: 'warning', title: 'تنبيه', body: 'أدخل رقم الهاتف' });
      return;
    }
    if (!address.trim()) {
      notify.addNotification({ type: 'warning', title: 'تنبيه', body: 'أدخل عنوان التوصيل' });
      return;
    }
    if (validatedItems.length === 0) {
      notify.addNotification({ type: 'warning', title: 'تنبيه', body: 'لا توجد عناصر في الطلب' });
      return;
    }

    setCreatingOrder(true);
    setError(null);

    try {
      const cartItems = validatedItems.map((i) => ({
        menu_item_id: i.menuItem.id,
        quantity: i.quantity,
      }));

      const result = await createOrder({
        customer_name: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim(),
        payment_method: paymentMethod,
        items: cartItems,
      });

      clearCart();
      setLastOrderNumber(result.order_number);
      setStep('success');

      notify.addNotification({
        type: 'success',
        title: 'تم بنجاح!',
        body: `تم إنشاء طلبك رقم ${result.order_number}`,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'حدث خطأ أثناء إنشاء الطلب. حاول مرة أخرى.';
      setError(msg);
      notify.addNotification({ type: 'error', title: 'خطأ', body: msg });
    } finally {
      setCreatingOrder(false);
    }
  };

  if (itemCount === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 pb-20">
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <p className="text-gray-500">سلة التسوق فارغة</p>
          <Link to="/menu" className="text-yellow-600 font-semibold hover:underline">
            رجوع للمنيو
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-5">
          {step !== 'items' && (
            <button
              onClick={() => {
                if (step === 'details') {
                  setStep('items');
                } else if (step === 'confirm') {
                  setStep('details');
                }
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-fast"
              aria-label="رجوع"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold">تأكيد الطلب</h1>
            <p className="text-xs text-gray-400">
              {step === 'items' && 'تحقق من الأطباق والأسعار'}
              {step === 'details' && 'أدخل بيانات التوصيل'}
              {step === 'confirm' && 'راجع ووافق على الطلب'}
              {step === 'success' && 'تم إنشاء الطلب بنجاح'}
            </p>
          </div>
        </div>

        {step === 'items' && (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              {validatingPrices
                ? 'جاري التحقق من الأسعار وتوافر الأطباق...'
                : (
                    <>
                      مع {items.length} عنصر — {' '}
                      {typeof total === 'number' ? `إجمالي السلة: EGP ${total.toFixed(0)}` : ''}
                    </>
                  )}
            </p>

            {validatingPrices && (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {priceError && (
              <div className="bg-red-50 text-red-700 rounded-xl p-3 mb-3 flex items-start gap-2">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{priceError}</p>
                  <button
                    onClick={() => {
                      setPriceError(null);
                      validatePrices();
                    }}
                    className="text-sm text-yellow-600 hover:underline mt-1"
                  >
                    محاولة مرة أخرى
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 mb-4">
              {validatedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-100"
                >
                  <div>
                    <p className="font-medium text-sm">{item.menuItem.name}</p>
                    <p className="text-xs text-gray-400">
                      ×{item.quantity} — السعر الحالي: EGP {item.unitPrice.toFixed(0)}
                    </p>
                  </div>
                  <span className="font-semibold">
                    EGP {(item.quantity * item.unitPrice).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleContinueToDetails}
              disabled={validatingPrices || !!priceError}
              className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-fast btn-press disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              متابعة
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200 flex items-start gap-2">
              <AlertCircle
                size={18}
                className="text-yellow-600 flex-shrink-0 mt-0.5"
              />
              <p className="text-sm text-yellow-800">
                يرجى التأكد من دقة بيانات التوصيل قبل تأكيد الطلب.
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-sm mb-3">ملخص الطلب</h3>
              <div className="space-y-1.5 text-sm">
                {validatedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-gray-600">
                      {item.menuItem.name} ×{item.quantity}
                    </span>
                    <span className="font-medium">
                      EGP {(item.quantity * item.unitPrice).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="h-px bg-gray-100 my-2" />
              <div className="flex justify-between font-bold">
                <span>الإجمالي النهائي</span>
                <span>EGP {validatedTotal.toFixed(0)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم العميل *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="الاسم الكامل"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-right text-sm focus:bg-white transition-fast"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  رقم الهاتف *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-right text-sm focus:bg-white transition-fast"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  عنوان التوصيل *
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="العنوان الكامل مع التفاصيل"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-right text-sm focus:bg-white transition-fast resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ملاحظات إضافية
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي ملاحظات خاصة..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-right text-sm focus:bg-white transition-fast resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  طريقة الدفع
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setPaymentMethod(m.value)}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-fast ${paymentMethod === m.value ? 'border-black bg-black text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={creatingOrder}
                className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-fast btn-press disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {creatingOrder ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    تأكيد الطلب
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">طلبك تم استلامه!</h2>
              <p className="text-gray-500 mb-4">
                تم إنشاء طلبك وسيتم تخطي مرحلته قريباً
              </p>

              <div className="bg-gray-50 rounded-xl p-4 my-4">
                <p className="text-sm text-gray-500 mb-1">رقم الطلب</p>
                <p className="text-2xl font-extrabold text-black tracking-wider">
                  {lastOrderNumber || '---'}
                </p>
              </div>

              <p className="text-sm text-gray-400 mb-4">
                يمكنك متابعة حالة 주문ك في صفحة{' '}
                <Link
                  to="/orders"
                  className="text-yellow-600 font-semibold hover:underline"
                >
                  طلباتي
                </Link>
              </p>

              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  to="/orders"
                  className="bg-black text-white font-semibold px-6 py-3 rounded-xl hover:bg-gray-800 transition-fast btn-press"
                >
                  عرض طلباتي
                </Link>
                <Link
                  to="/menu"
                  className="border border-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-fast"
                >
                  طلب المزيد
                </Link>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
