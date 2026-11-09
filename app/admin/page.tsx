import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getZones,
  getStations,
  getLines,
  getPendingObservations,
  getAuditHistory,
} from '@/lib/db';
import { Header } from '@/components/Header';
import { AdminDashboardClient } from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-grid-lightBg text-slate-900 flex flex-col">
        <Header user={user} />
        <main className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="bg-red-50 border border-red-200 text-red-900 p-6 rounded-2xl space-y-2">
            <h2 className="text-lg font-black">Acces Restricționat</h2>
            <p className="text-xs leading-relaxed">
              Această secțiune este rezervată exclusiv administratorului de rețea. Contul dumneavoastră ({user.full_name}) este alocat activităților de teren.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Load all 5 zones, stations, lines, pending observations, and audit log
  const zones = await getZones(user);
  const pendingObs = await getPendingObservations(user);
  const auditLogs = await getAuditHistory(user, 100);

  // Load all stations and lines for manual management and import association
  const allStations = [];
  const allLines = [];

  for (const z of zones) {
    const stList = await getStations(z.id, user);
    for (const st of stList) {
      allStations.push({ ...st, zone: z });
      const lnList = await getLines(st.id, user);
      for (const ln of lnList) {
        allLines.push({ ...ln, station: { ...st, zone: z } });
      }
    }
  }

  // Load all equipment for manual management table
  const globalStore = (global as any).__EG_DB;
  const allEquipment = globalStore?.equipment || [];

  return (
    <div className="min-h-screen bg-grid-lightBg text-slate-900 flex flex-col">
      <Header user={user} pendingCount={pendingObs.length} />

      <main className="max-w-5xl mx-auto w-full px-3.5 py-4 sm:py-6 flex-1">
        <AdminDashboardClient
          user={user}
          zones={zones}
          stations={allStations}
          lines={allLines}
          initialEquipment={allEquipment}
          pendingObservations={pendingObs}
          auditLogs={auditLogs}
        />
      </main>

      <footer className="text-center text-[11px] text-slate-500 py-4 border-t border-slate-200">
        ElectroGrid MT • Modul Securizat Administrare Rețea • Toate modificările sunt jurnalizate
      </footer>
    </div>
  );
}
