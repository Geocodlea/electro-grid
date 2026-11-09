import React from 'react';
import Link from 'next/link';
import { AuthSessionUser } from '@/lib/auth';
import { logoutAction } from '@/app/actions';
import { Zap, Shield, LogOut, Sliders } from 'lucide-react';

interface HeaderProps {
  user: AuthSessionUser | null;
  pendingCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ user, pendingCount = 0 }) => {
  return (
    <header className="bg-grid-header text-white shadow-md border-b border-white/10 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 py-3 sm:py-3.5 flex items-center justify-between gap-3">
        {/* Brand identity */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900 flex items-center justify-center font-black shadow-sm group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 fill-slate-900" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-extrabold tracking-tight flex items-center gap-1.5">
              <span>ElectroGrid</span>
              <span className="text-xs uppercase bg-white/20 text-white font-bold px-1.5 py-0.5 rounded tracking-wider">
                MT
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-medium hidden sm:block">
              Medie Tensiune (20 kV) • Localizare & Navigație
            </div>
          </div>
        </Link>

        {/* User context & actions */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Role & zone tag */}
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white flex items-center justify-end gap-1.5">
                {user.role === 'admin' ? (
                  <span className="inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full text-[11px]">
                    <Shield className="w-3 h-3" /> Administrator
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full text-[11px]">
                    Electrician
                  </span>
                )}
                <span>{user.full_name}</span>
              </div>
              <div className="text-[11px] text-slate-300">
                {user.role === 'admin'
                  ? 'Toate cele 5 zone MT'
                  : user.assigned_zone?.name || 'Zonă operativă arondată'}
              </div>
            </div>

            {/* Admin panel link */}
            {user.role === 'admin' && (
              <Link
                href="/admin"
                className="relative inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-lg transition-colors"
                title="Panou Administrare Rețea"
              >
                <Sliders className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">Administrare</span>
                {pendingCount > 0 && (
                  <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.2 rounded-full shadow">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )}

            {/* Logout button */}
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1 bg-white/10 hover:bg-red-500/80 text-white/90 hover:text-white border border-white/15 text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors"
                title="Deconectare cont"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Ieșire</span>
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm px-3.5 py-1.5 rounded-lg transition-colors shadow"
          >
            Autentificare
          </Link>
        )}
      </div>
    </header>
  );
};
