import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getFeaturedItems, getMenuCategories } from '../lib/menu';
import type { MenuItem } from '../lib/types';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';
import { ArrowRight, Star, Clock, Phone, MapPin, ShoppingCart } from 'lucide-react';

export function HomePage() {
  const [featured, setFeatured] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authProfile, setAuthProfile] = useState<import('../lib/types').Profile | null>(null);

  const { addItem } = useCart();
  const notify = useNotification();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setAuthProfile(profile);
      }
    };
    fetchProfile();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [featuredRes, catsRes] = await Promise.all([
        getFeaturedItems(),
        getMenuCategories(),
      ]);

      setFeatured(featuredRes);
      setCategories(catsRes);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء التحميل';
      setError(msg);
      notify.addNotification({ type: 'error', title: 'خطأ', body: msg });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddToCart = (item: MenuItem) => {
    addItem(item);
    notify.addNotification({
      type: 'success',
      title: 'أُضيف للسلة',
      body: item.name,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative bg-black text-white overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1555396276-362a0a042de4?w=1200&h=600&fit=crop&q=80)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center">
                <span className="text-black font-extrabold text-xl">S</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
                SOLID
                <span className="text-yellow-400"><strong> - سوليد</strong></span>
              </h1>
            </div>
            <p className="text-xl sm:text-2xl text-gray-200 font-medium max-w-xl mb-6">
              أطعمة من تحضير المطبخ إلى طلبك - طازجة، لذيذة، بسرعة
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm text-white">
                <Clock size={14} />
                خدمة سريعة
              </span>
              <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm text-white">
                <Phone size={14} />
                طلبات أونلاين
              </span>
              <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm text-white">
                <MapPin size={14} />
                توصيل للمنزل
              </span>
            </div>
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 bg-yellow-500 text-black font-bold px-6 py-3 rounded-full hover:bg-yellow-400 transition-fast shadow-lg btn-press"
            >
              <ShoppingCart size={20} />
              اطلب الآن
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Star size={22} className="text-yellow-500 fill-yellow-500" />
              الأطباق المميزة
            </h2>
            <p className="text-gray-500 mt-1">
              اختر من أفضل أطباقنا المختارة
            </p>
          </div>
          <Link
            to="/menu"
            className="hidden sm:flex items-center gap-1 text-yellow-600 font-semibold hover:text-yellow-700 transition-fast"
          >
            عرض المنيو كامل
            <ArrowRight size={18} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
                <div className="h-40 shimmer" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 shimmer rounded" />
                  <div className="h-3 w-1/2 shimmer rounded" />
                  <div className="h-3 w-full shimmer rounded mt-2" />
                  <div className="h-8 w-24 shimmer rounded mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 text-center">
            <p>{error}</p>
            <button onClick={loadData} className="mt-3 text-sm font-medium underline">
              إعادة المحاولة
            </button>
          </div>
        ) : featured.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-dashed border-gray-300">
            <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <ShoppingCart size={28} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-700">لا توجد أطباق مميزة حاليًا</h3>
            <p className="text-gray-500 mt-1">
              ستظهر الأطباق المميزة هنا عندما يحددها الإدمن.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((item) => (
              <article
                key={item.id}
                className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 card-hover"
              >
                <div className="relative h-40 overflow-hidden bg-gray-100">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-300 text-sm">📷</span>
                    </div>
                  )}
                  {item.available === false && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        غير متاح
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                      {item.category}
                    </span>
                    <span className="text-sm font-semibold">
                      {typeof item.price === 'number'
                        ? `EGP ${item.price.toFixed(0)}`
                        : `EGP ${item.price}`}
                    </span>
                  </div>
                  <h3 className="font-bold text-base leading-tight">{item.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={item.available === false}
                    className={`w-full mt-3 py-2.5 rounded-full font-semibold text-sm transition-fast btn-press ${item.available === false ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-yellow-500 text-black hover:bg-yellow-400'}`}
                  >
                    {item.available === false ? 'غير متاح' : 'أضف للسلة'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-fast"
          >
            عرض المنيو كامل
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold">أقسام المنيو</h2>
            <Link
              to="/menu"
              className="text-yellow-600 font-semibold hover:text-yellow-700 transition-fast text-sm flex items-center gap-1"
            >
              عرض الكل
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat}
                to={`/menu?category=${encodeURIComponent(cat)}`}
                className="bg-white border border-gray-200 hover:border-yellow-500 hover:text-yellow-700 px-4 py-2 rounded-full text-sm font-medium transition-fast"
              >
                {cat}
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="bg-black text-gray-300 mt-12 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
              <span className="text-black font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-white">SOLID - سوليد</span>
          </div>
          <p className="text-sm text-center sm:text-right">
            © {new Date().getFullYear()} SOLID - سوليد. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
}
