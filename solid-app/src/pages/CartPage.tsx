import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft } from 'lucide-react';

export function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, total, itemCount } = useCart();
  const notify = useNotification();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (items.length === 0) return;
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 pb-20">
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
            <div className="w-20 h-20 mx-auto mb-4 bg-yellow-50 rounded-full flex items-center justify-center">
              <ShoppingCart size={32} className="text-yellow-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">سلة التسوق فارغة</h2>
            <p className="text-gray-500 mb-6">
              لا توجد عناصر في سلتك بعد. ابدأ بتصفح المنيو وإضافة الأطباق المفضلة لديك.
            </p>
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 bg-black text-white font-semibold px-6 py-3 rounded-full hover:bg-gray-800 transition-fast btn-press"
            >
              <ArrowLeft size={18} />
              تصفح المنيو
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart size={24} className="text-yellow-500" />
            سلة التسوق
            {itemCount > 0 && (
              <span className="bg-yellow-500 text-black text-sm font-bold px-2.5 py-0.5 rounded-full">
                {itemCount}
              </span>
            )}
          </h1>
          {itemCount > 0 && (
            <button
              onClick={() => {
                clearCart();
                notify.addNotification({ type: 'info', title: 'تم المسح', body: 'سلة التسوق تم مسحها' });
              }}
              className="text-sm text-red-600 hover:text-red-700 transition-fast"
            >
              مسح الكل
            </button>
          )}
        </div>

        <div className="space-y-3 mb-5">
          {items.map((item) => {
            const itemTotal = item.quantity * (Number(item.menuItem.price) || 0);
            return (
              <div
                key={item.menuItem.id}
                className="bg-white rounded-xl p-4 flex items-start gap-3 shadow-sm border border-gray-100"
              >
                <Link to="/menu" className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                    {item.menuItem.image_url ? (
                      <img
                        src={item.menuItem.image_url}
                        alt={item.menuItem.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                        <span className="text-gray-300">📷</span>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    to="/menu"
                    className="font-semibold text-sm leading-tight hover:text-yellow-600 transition-fast truncate block"
                  >
                    {item.menuItem.name}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">{item.menuItem.category}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-base">
                      {typeof item.menuItem.price === 'number'
                        ? `EGP ${(item.menuItem.price * item.quantity).toFixed(0)}`
                        : `EGP ${item.menuItem.price}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.menuItem.id, item.quantity - 1)
                        }
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-fast"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQuantity(item.menuItem.id, item.quantity + 1)
                        }
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-fast"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => removeItem(item.menuItem.id)}
                        className="ml-1 w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-fast p-0"
                        aria-label="حذف العنصر"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 sticky bottom-24">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500">الإجمالي ({itemCount} عنصر)</span>
            <span className="text-lg font-bold">
              {typeof total === 'number' ? `EGP ${total.toFixed(0)}` : `EGP ${total}`}
            </span>
          </div>
          <div className="h-px bg-gray-100 my-3" />
          <button
            onClick={handleCheckout}
            disabled={items.length === 0}
            className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-fast btn-press disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            تأكيد الطلب
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            سيتم التحقق من الأسعار وتوافر الأطباق قبل إنشاء الطلب
          </p>
        </div>
      </div>
    </div>
  );
}
