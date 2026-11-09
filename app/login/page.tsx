'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/actions';
import { Zap, Lock, User, AlertCircle, Shield, Info } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await loginAction(formData);
      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'Eroare la autentificare.');
      setLoading(false);
    }
  }

  function fillCredentials(username: string, pass: string) {
    const userInput = document.getElementById('username') as HTMLInputElement;
    const passInput = document.getElementById('password') as HTMLInputElement;
    if (userInput && passInput) {
      userInput.value = username;
      passInput.value = pass;
    }
  }

  return (
    <div className="min-h-screen bg-grid-lightBg flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full space-y-5">
        {/* Logo and Brand */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl mx-auto flex items-center justify-center text-slate-950 shadow-lg">
            <Zap className="w-8 h-8 fill-slate-950" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            ElectroGrid MT
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Sistem de identificare și localizare rețele de medie tensiune (20 kV)
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800">Autentificare Personal</h2>
            <p className="text-xs text-slate-500">
              Introduceți utilizatorul și parola alocate formației dumneavoastră.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Utilizator
              </label>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="ex: admin sau electrician_sacele"
                  className="w-full h-11 pl-10 pr-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 font-medium"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Parolă
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 font-medium"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-sky-700 hover:bg-sky-800 text-white font-extrabold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Se verifică contul...' : 'Conectare în cont'}
            </button>
          </form>

          {/* Documented 4 authorized accounts quick picker for tests / field use */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Conturi autorizate sistem:</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => fillCredentials('admin', 'admin123')}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <div className="font-bold text-slate-800">Administrator</div>
                <div className="text-[10px] text-slate-500">Toate cele 5 zone</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('electrician_sacele', 'sacele123')}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <div className="font-bold text-slate-800">Electrician 1</div>
                <div className="text-[10px] text-slate-500">Săcele + Prejmer</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('electrician_rasnov', 'rasnov123')}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <div className="font-bold text-slate-800">Electrician 2</div>
                <div className="text-[10px] text-slate-500">Râșnov + Predeal</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('electrician_codlea', 'codlea123')}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <div className="font-bold text-slate-800">Electrician 3</div>
                <div className="text-[10px] text-slate-500">Codlea + Feldioara</div>
              </button>
            </div>
          </div>
        </div>

        {/* Safety Note */}
        <div className="flex items-start gap-2 text-slate-500 text-[11px] leading-relaxed px-2">
          <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <span>
            Înregistrarea publică este dezactivată. Modificarea drepturilor de acces sau a parolelor se realizează exclusiv de către administratorul de sistem.
          </span>
        </div>
      </div>
    </div>
  );
}
