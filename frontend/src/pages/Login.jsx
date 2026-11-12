import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogIn, UserPlus, Lock, Mail, User, AlertCircle } from 'lucide-react';
import { authApi } from '../services/api';
import { useApp } from '../contexts/AppContext';

export default function Login() {
  const { loginUser, t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const redirectPath = queryParams.get('redirect') || '/';

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await authApi.register({ username, email, password });
        if (res.data?.success || res.success) {
          // auto login after register
          const loginRes = await authApi.login({ username, password });
          const loginData = loginRes.data?.data || loginRes.data;
          const token = loginData?.access_token || loginData?.token;
          const userData = loginData?.user;
          if (token && userData) {
            loginUser(userData, token);
            navigate(redirectPath);
          }
        }
      } else {
        const res = await authApi.login({ username, password });
        // Axios interceptor returns response.data
        const responseData = res.data?.data || res.data;
        const token = responseData?.access_token || responseData?.token;
        const userData = responseData?.user;

        if (token && userData) {
          loginUser(userData, token);
          navigate(redirectPath);
        } else if (res.success && res.data) {
          loginUser(res.data.user, res.data.access_token);
          navigate(redirectPath);
        } else {
          setError('Invalid login response format');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-3">
            {isRegister ? <UserPlus className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {isRegister ? t('register') : t('login')}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {isRegister ? 'Join our dev community' : 'Sign in to access your library & admin features'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Demo Credentials Autofill */}
          {!isRegister && (
            <div className="flex gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 text-[11px] text-zinc-500">
              <span className="font-semibold text-zinc-600 dark:text-zinc-400 self-center">Điền nhanh:</span>
              <button
                type="button"
                onClick={() => { setUsername('demouser'); setPassword('User@123456'); setError(''); }}
                className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
              >
                Độc giả (demouser)
              </button>
              <button
                type="button"
                onClick={() => { setUsername('admin'); setPassword('Admin@123456'); setError(''); }}
                className="px-2.5 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
              >
                Admin
              </button>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. johndoe"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50 mt-2"
          >
            {loading ? t('loading') : (isRegister ? t('register') : t('login'))}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800/80 text-center text-xs text-zinc-500">
          {isRegister ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Sign in
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); }}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Sign up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
