import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { signUp } from '../lib/auth';
import { useNotification } from '../contexts/NotificationContext';
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const notify = useNotification();

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate('/');
      }
    };
    check();
  }, [navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      notify.addNotification({ type: 'warning', title: 'تنبيه', body: 'أدخل اسمك الكامل' });
      return;
    }
    if (!email.trim()) {
      notify.addNotification({ type: 'warning', title: 'تنبيه', body: 'أدخل بريدك الإلكتروني' });
      return;
    }
    if (password.length < 6) {
      notify.addNotification({ type: 'warning', title: 'تنبيه', body: 'كلمة المرور لا تقل عن 6 أحرف' });
      return;
    }
    if (password !== confirmPassword) {
      notify.addNotification({ type: 'warning', title: 'تنبيه', body: 'كلمات المرور غير متطابقة' });
      return;
    }

    setLoading(true);
    const result = await signUp(email.trim().toLowerCase(), password, fullName.trim());
    setLoading(false);

    if (result.success) {
      notify.addNotification({
        type: 'success',
        title: 'تم الاشتراك',
        body: 'تم إنشاء حسابك. يمكنك تسجيل الدخول الآن.',
      });
      navigate('/login?next=' + (searchParams.get('next') || '/'));
    } else {
      if (result.error?.includes('Email') || result.error?.includes('already')) {
        notify.addNotification({ type: 'error', title: 'خطأ', body: 'هذا البريد مسجل بالفعل' });
      } else {
        notify.addNotification({ type: 'error', title: 'خطأ', body: result.error || 'فشل إنشاء الحساب' });
      }
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
            <div className="text-xs text-gray-500">إنشاء حساب جديد</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم الكامل</label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أدخل اسمك الكامل"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-right text-sm focus:bg-white transition-fast"
                  required
                />
              </div>
            </div>

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
                  placeholder="6 أحرف على الأقل"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50 text-right text-sm focus:bg-white transition-fast"
                  required
                  minLength={6}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">تأكيد كلمة المرور</label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-right text-sm focus:bg-white transition-fast"
                  required
                />
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
                'إنشاء حساب'
              )}
            </button>

            <p className="text-xs text-gray-400 text-center">
              بإنشاء حسابك، أنت توافق على شروط الاستخدام. لن نشارك بريدك مع أحد.
            </p>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              لديك حساب بالفعل؟{' '}
              <Link
                to="/login"
                className="text-yellow-600 font-semibold hover:text-yellow-700 transition-fast"
              >
                تسجيل الدخول
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
