import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getZones, getStations, getLines, getEquipmentByLine, getPendingObservations } from '@/lib/db';
import { Header } from '@/components/Header';
import { SafetyDisclaimer } from '@/components/SafetyDisclaimer';
import { MainWorkflowClient } from './MainWorkflowClient';
import Link from 'next/link';
import { Zap, ShieldCheck, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string; station?: string; line?: string; search?: string; type?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (!user) {
    return (
      <div className="min-h-screen bg-grid-lightBg flex flex-col justify-between">
        <header className="bg-grid-header text-white px-4 py-4 shadow">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-900 flex items-center justify-center font-black">
                <Zap className="w-5 h-5 fill-slate-900" />
              </div>
              <span className="font-extrabold text-lg">ElectroGrid MT</span>
            </div>
            <Link
              href="/login"
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-lg shadow"
            >
              Autentificare
            </Link>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 py-12 text-center">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
            <div className="w-16 h-16 bg-sky-50 text-sky-700 rounded-2xl mx-auto flex items-center justify-center">
              <Zap className="w-9 h-9 fill-sky-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                ElectroGrid MT
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Aplicație dedicată consultării și localizării echipamentelor de medie tensiune (20 kV): PT, PCT, separatoare.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-xl p-4 text-xs text-left leading-relaxed">
              <strong>Notă de acces:</strong> Aplicația este rezervată personalului autorizat (administrator și formații de electricieni). Autentificați-vă cu contul atribuit pentru a accesa zona rețelei dumneavoastră.
            </div>

            <div>
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 bg-sky-700 hover:bg-sky-800 text-white font-bold py-3.5 px-6 rounded-xl shadow transition-colors text-sm"
              >
                Intră în contul tău
              </Link>
            </div>
          </div>
        </main>

        <footer className="text-center text-xs text-slate-500 py-6 border-t border-slate-200">
          ElectroGrid MT • Instrument de consultare și localizare • Nu înlocuiește documentația operativă
        </footer>
      </div>
    );
  }

  // User is logged in
  const zones = await getZones(user);

  // Determine current active zone
  let activeZoneId = params.zone;
  if (!activeZoneId) {
    if (user.role === 'electrician' && user.assigned_zone_id) {
      activeZoneId = user.assigned_zone_id;
    } else {
      activeZoneId = zones[0]?.id;
    }
  }

  const activeZone = zones.find((z) => z.id === activeZoneId) || zones[0];
  const stations = activeZoneId ? await getStations(activeZoneId, user) : [];

  const selectedStationId = params.station || '';
  const lines = selectedStationId ? await getLines(selectedStationId, user) : [];

  const selectedLineId = params.line || '';

  // Get equipment ONLY if station AND line are both selected
  const equipmentList =
    selectedStationId && selectedLineId
      ? await getEquipmentByLine(selectedStationId, selectedLineId, user, {
          search: params.search,
          type: params.type,
        })
      : [];

  const pendingObs = user.role === 'admin' ? await getPendingObservations(user) : [];

  return (
    <div className="min-h-screen bg-grid-lightBg text-slate-900 flex flex-col">
      <Header user={user} pendingCount={pendingObs.length} />

      <main className="max-w-4xl mx-auto w-full px-3.5 py-4 sm:py-6 flex-1 space-y-4">
        {/* Safety Disclaimer Banner */}
        <SafetyDisclaimer />

        {/* Workflow Client Component */}
        <MainWorkflowClient
          user={user}
          zones={zones}
          activeZone={activeZone}
          stations={stations}
          lines={lines}
          equipmentList={equipmentList}
          selectedZoneId={activeZone?.id || ''}
          selectedStationId={selectedStationId}
          selectedLineId={selectedLineId}
          currentSearch={params.search || ''}
          currentType={params.type || 'Toate'}
        />
      </main>

      <footer className="text-center text-[11px] text-slate-500 py-4 border-t border-slate-200">
        ElectroGrid MT • Versiune operativă • Verde = fără observații active (nu apt de manevră) • Galben = sesizări • Roșu = indisponibil
      </footer>
    </div>
  );
}
