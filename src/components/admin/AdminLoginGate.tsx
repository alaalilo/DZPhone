import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, ShieldCheck } from 'lucide-react';
import {
  adminLoginPreviewSession,
  adminLoginWithPassword,
  fetchAdminBootstrap,
  getAdminAuthConfig,
} from '@/lib/api';
import { signInAdminWithGoogle } from '@/lib/auth';
import { useStore } from '@/lib/store';

function AdminLoginGate() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordConfigured = useStore((s) => s.passwordConfigured);
  const previewAuthEnabled = useStore((s) => s.previewAuthEnabled);

  useEffect(() => {
    void getAdminAuthConfig();
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await adminLoginWithPassword(password.trim());
    } catch (err: any) {
      setError(err?.message || 'كلمة المرور غير صحيحة');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInAdminWithGoogle();
      await fetchAdminBootstrap();
    } catch (err: any) {
      setError(err?.message || 'تعذر تسجيل الدخول عبر Google');
    } finally {
      setBusy(false);
    }
  };

  const handlePreviewSession = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminLoginPreviewSession();
    } catch (err: any) {
      setError(err?.message || 'تعذر فتح جلسة المعاينة');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="mx-auto max-w-md p-6 pt-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#111827]"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#2563EB] dark:bg-blue-950/60">
            <KeyRound size={20} />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              بوابة إدارة متجر DZPhone
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              مصادقة مشفرة عبر حساب Google أو كلمة مرور الإدارة البيئية
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              كلمة مرور الإدارة (ADMIN_PASSWORD)
            </label>
            <input
              type="password"
              aria-label="كلمة مرور لوحة التحكم"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#2563EB] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          {error && <p className="text-xs text-rose-500">⚠︎ {error}</p>}
          <button
            type="submit"
            disabled={busy || !password.trim()}
            className="w-full rounded-xl bg-[#0F172A] py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#2563EB] disabled:opacity-50 dark:bg-[#2563EB]"
          >
            {busy ? 'جاري التحقق...' : 'دخول بكلمة المرور'}
          </button>
        </form>

        <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            دخول عبر حساب Google الموثق
          </button>

          {previewAuthEnabled && !passwordConfigured && (
            <button
              type="button"
              onClick={handlePreviewSession}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 py-2.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <ShieldCheck size={15} />
              دخول جلسة المعاينة المحلية (Preview Operator)
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default AdminLoginGate;
