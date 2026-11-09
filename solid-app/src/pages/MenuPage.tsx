import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMenuItems, getMenuCategories } from '../lib/menu';
import type { MenuItem } from '../lib/types';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';
import { Search, Star } from 'lucide-react';

export function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('الكل');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [total, setTotal] = useState(0);

  const { addItem } = useCart();
  const notify = useNotification();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('category')) {
      setCategory(searchParams.get('category') || 'الكل');
    }
  }, [searchParams]);

  const loadMenu = useCallback(async () => {
    try {
      setLoading(true);
      const { items: menuItems, total: count } = await getMenuItems({
        category: category === 'الكل' ? undefined : category,
        search: search || undefined,
        featuredOnly: showFeaturedOnly,
        availableOnly: !showUnavailable,
        limit: 200,
      });
      setItems(menuItems);
      setTotal(count);
    } catch (err) {
      notify.addNotification({
        type: 'error',
        title: 'خطأ',
        body: err instanceof Error ? err.message : 'فشل تحميل المنيو',
      });
    } finally {
      setLoading(false);
    }
  }, [category, search, showFeaturedOnly, showUnavailable, notify]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  useEffect(() => {
    const loadCats = async () => {
      try {
        const cats = await getMenuCategories();
        setCategories(['الكل', ...cats]);
      } catch {
        // ignore
      }
    };
    loadCats();
  }, []);

  const handleAddToCart = (item: MenuItem) => {
    addItem(item);
    notify.addNotification({
      type: 'success',
      title: 'أُضيف للسلة',
      body: item.name,
    });
  };

  const formatPrice = (price: number | string) => {
    const n = Number(price) || 0;
    return `EGP ${n.toFixed(0)}`;
  };

  const groupedItems: { [category: string]: MenuItem[] } = {};
  for (const item of items) {
    if (!groupedItems[item.category]) {
      groupedItems[item.category] = [];
    }
    groupedItems[item.category].push(item);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 mt-3">جاري تحميل المنيو...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-5 flex items-center gap-2">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-yellow-500"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          قائمة SOLID - سوليد
        </h1>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-5 space-y-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن صنف..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-right text-sm focus:bg-white transition-fast"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFeaturedOnly((v) => !v)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-fast ${showFeaturedOnly ? 'bg-yellow-500 text-black' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Star size={12} fill={showFeaturedOnly ? 'currentColor' : 'none'} />
              مميزات
            </button>
            <button
              onClick={() => setShowUnavailable((v) => !v)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-fast ${showUnavailable ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              عرض غير المتاح
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategory(cat);
                  setSearch('');
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-fast ${category === cat ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-dashed border-gray-200">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Search size={28} className="text-gray-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-700 mb-2">
              {search || category !== 'الكل' ? 'لا توجد أطباق مطابقة' : 'لا توجد أطباق'}
            </h2>
            <p className="text-gray-500">
              {search || category !== 'الكل' ? 'جرب تغيير البحث أو التصنيف' : 'سيظهر المنيو هنا قريباً'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([cat, catItems]) => (
                <section key={cat}>
                  <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                    {cat}
                    <span className="text-xs text-gray-400 font-normal">
                      ({catItems.length})
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {catItems.map((item) => (
                      <article
                        key={item.id}
                        className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm card-hover"
                      >
                        <div className="relative h-36 bg-gray-50 overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                              <span className="text-gray-300 text-3xl">🍽️</span>
                            </div>
                          )}
                          {item.featured && (
                            <div className="absolute top-2 left-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Star size={10} fill="currentColor" />
                              مميز
                            </div>
                          )}
                          {!item.available && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                                غير متاح
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="p-3.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                              {item.category}
                            </span>
                            <span className="text-sm font-bold">{formatPrice(item.price)}</span>
                          </div>
                          <h3 className="font-bold text-sm leading-snug">{item.name}</h3>
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <button
                            onClick={() => handleAddToCart(item)}
                            disabled={!item.available}
                            className={`mt-2 w-full py-2 rounded-full text-sm font-semibold transition-fast btn-press ${!item.available ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-yellow-500 text-black hover:bg-yellow-400'}`}
                          >
                            {item.available ? 'أضف للسلة' : 'غير متاح'}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}

        <div className="mt-8 text-center text-xs text-gray-400 pb-4">
          جميع الأسعار بالجنيه المصري • SOLID - سوليد
        </div>
      </div>
    </div>
  );
}
