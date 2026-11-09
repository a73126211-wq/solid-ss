import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resetPassword } from '../lib/auth';
import { useNotification } from '../contexts/NotificationContext';
import { Mail, ArrowLeft } from 'lucide-react';

export function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const notify = useNotification();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      notify.addNotification({ type: 'warning', title: 'تنبيه', body: 'أدخل بريدك الإلكتروني' });
      return;
    }

    setLoading(true);
    const result = await resetPassword(email.trim().toLowerCase());
    setLoading(false);

    if (result.success) {
      notify.addNotification({
        type: 'success',
        title: 'تم الإرسال',
        body: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني',
      });
      setEmail('');
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
            <div className="text-xs text-gray-500">استعادة كلمة المرور</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-600 mb-6">
            أدخل بريدك الإلكتروني وسيتم إرسال رابط لإعادة تعيين كلمة المرور
          </p>

          <form onSubmit={handleReset} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-fast btn-press disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'إرسال رابط إعادة التعيين'
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              تذكر كلمة المرور الخاصة بك؟{' '}
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
