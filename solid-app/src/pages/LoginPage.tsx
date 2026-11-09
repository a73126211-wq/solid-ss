import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { signIn, resetPassword } from '../lib/auth';
import { useNotification } from '../contexts/NotificationContext';
import { supabase } from '../lib/supabase';
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const notify = useNotification();

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const next = searchParams.get('next');
        navigate(next && next !== '/' ? next : '/');
      }
    };
    check();
  }, [navigate, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      notify.addNotification({ type: 'warning', title: 'تنبيه', body: 'يرجى تعبئة جميع الحقول' });
      return;
    }

    setLoading(true);
    const result = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);

    if (result.success) {
      notify.addNotification({ type: 'success', title: 'مرحبًا بكم', body: 'تم تسجيل الدخول بنجاح' });
      const next = searchParams.get('next');
      navigate(next && next !== '/' ? next : '/');
    } else {
      notify.addNotification({ type: 'error', title: 'خطأ', body: result.error || 'فشل تسجيل الدخول' });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      notify.addNotification({ type: 'warning', title: 'تنبيه', body: 'أدخل بريدك الإلكتروني' });
      return;
    }

    setLoadingReset(true);
    const result = await resetPassword(email.trim().toLowerCase());
    setLoadingReset(false);

    if (result.success) {
      notify.addNotification({
        type: 'success',
        title: 'تم الإرسال',
        body: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
      });
      setPassword('');
    } else {
      notify.addNotification({ type: 'error', title: 'خطأ', body: result.error || 'فشل الإرسال' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
            <span className="text-yellow-500 font-extrabold text-lg">S</span>
          </div>
          <div>
            <div className="font-extrabold text-xl">SOLID <span className="text-yellow-500">- سوليد</span></div>
            <div className="text-xs text-gray-500">تسجيل الدخول</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-right text-sm focus:bg-white transition-fast"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="*******"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50 text-right text-sm focus:bg-white transition-fast"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff size={18} className="left-3" />
                  ) : (
                    <Eye size={18} className="left-3" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-fast btn-press disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loadingReset}
              className="text-sm text-gray-500 hover:text-black transition-fast disabled:opacity-50"
            >
              {loadingReset ? 'جاري الإرسال...' : 'نسيت كلمة المرور؟'}
            </button>
          </div>

          {loadingReset && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-xl border border-yellow-200 text-sm text-yellow-800">
              جاري إرسال رابط إعادة التعيين إلى {email}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              ليس لديك حساب؟{' '}
              <Link
                to="/signup"
                className="text-yellow-600 font-semibold hover:text-yellow-700 transition-fast"
              >
                أنشئ حسابًا
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-gray-500 hover:text-black transition-fast text-sm"
          >
            <ArrowLeft size={16} />
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
