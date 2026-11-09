import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getProfile, isManager, signOut } from '../lib/auth';
import { useCart } from '../contexts/CartContext';
import {
  Home,
  Menu,
  ShoppingCart,
  Receipt,
  UserCircle,
  Shield,
  LogOut,
} from 'lucide-react';
	export function Layout() {
  const [profile, setProfile] = useState<import('../lib/types').Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdminBadge, setShowAdminBadge] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const p = await getProfile();
        setProfile(p);
        setShowAdminBadge(isManager(p));
      } else {
        setProfile(null);
        setShowAdminBadge(false);
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const p = await getProfile();
          setProfile(p);
          setShowAdminBadge(isManager(p));
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setShowAdminBadge(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const bottomTabs = [
    { id: 'home', label: 'الرئيسية', icon: <Home size={22} />, to: '/' },
    { id: 'menu', label: 'المنيو', icon: <Menu size={22} />, to: '/menu' },
    { id: 'cart', label: 'السلة', icon: <ShoppingCart size={22} />, to: '/cart' },
    { id: 'orders', label: 'طلباتي', icon: <Receipt size={22} />, to: '/orders' },
    { id: 'profile', label: 'حسابي', icon: <UserCircle size={22} />, to: '/profile' },
  ];

  const activeTab = bottomTabs.find((t) => location.pathname.startsWith(t.to))?.id || 'home';
  const showAdminPanel = showAdminBadge && profile?.active;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-cairo">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm lg:static lg:block lg:border-b lg:min-h-[56px]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:block">
            SOLID
            <span className="text-yellow-600 font-extrabold"> - سوليد</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {showAdminPanel && (
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 bg-yellow-500 text-white px-3 py-1.5 rounded-full text-sm font-medium hover:bg-yellow-600 transition-fast"
            >
              <Shield size={16} />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </Link>
          )}
          <button
            onClick={() => signOut().then(() => navigate('/login'))}
            className="p-2 hover:bg-gray-100 rounded-full transition-fast text-gray-500"
            title="تسجيل الخروج"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 pt-16 lg:pt-0 pb-20 lg:pb-0">
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="animate-pulse h-8 w-8 bg-black rounded-full" />
          </div>
        ) : (
          <Outlet context={{ profile, showAdminPanel }} />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex lg:hidden justify-around py-1 px-2 shadow-lg">
        {bottomTabs.map((tab) => {
          const isActive =
            location.pathname === tab.to ||
            (tab.id === 'cart' && location.pathname.startsWith('/cart')) ||
            (tab.id === 'orders' && location.pathname.startsWith('/orders')) ||
            (tab.id === 'profile' && location.pathname.startsWith('/profile'));
          return (
            <Link
              key={tab.id}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-fast ${isActive ? 'text-black bg-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span className="relative">
                {tab.icon}
                {tab.id === 'cart' && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {showAdminPanel && (
        <aside className="hidden lg:flex fixed left-0 top-16 bottom-0 w-56 bg-white border-r border-gray-200 flex-col overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div>
                <div className="font-bold text-sm">SOLID - سوليد</div>
                <div className="text-xs text-gray-500">لوحة التحكم</div>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            <NavLink to="/dashboard" label="لوحة التحكم" icon={<Shield size={18} />} end />
            <NavLink to="/dashboard/orders" label="إدارة الطلبات" icon={<Receipt size={18} />} />
            {profile?.role === 'Admin' && (
              <>
                <NavLink to="/dashboard/menu" label="إدارة المنيو" icon={<Menu size={18} />} />
                <NavLink to="/dashboard/users" label="المستخدمون" icon={<UserCircle size={18} />} />
              </>
            )}
          </nav>
          <div className="p-4 border-t border-gray-100 text-xs text-gray-400 text-center">
            v1.0 - SOLID
          </div>
        </aside>
      )}
    </div>
  );
}

function NavLink({ to, label, icon, end }: { to: string; label: string; icon: React.ReactNode; end?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname.startsWith(to);

  return (
    <button
      onClick={() => navigate(to)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-fast ${active ? 'bg-yellow-50 text-yellow-800' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
    >
      {icon}
      {label}
    </button>
  );
}
