'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthSessionUser } from '@/lib/auth';
import { Zone, Station, Line20kV, Equipment } from '@/lib/types';
import { EquipmentCard } from '@/components/EquipmentCard';
import { GoogleMapsDialog } from '@/components/GoogleMapsDialog';
import { ObservationModal } from '@/components/ObservationModal';
import { EquipmentDetailModal } from '@/components/EquipmentDetailModal';
import {
  Search,
  Layers,
  MapPin,
  Cpu,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface MainWorkflowClientProps {
  user: AuthSessionUser;
  zones: Zone[];
  activeZone: Zone;
  stations: Station[];
  lines: Line20kV[];
  equipmentList: Equipment[];
  selectedZoneId: string;
  selectedStationId: string;
  selectedLineId: string;
  currentSearch: string;
  currentType: string;
}

const EQUIPMENT_FILTER_TYPES = ['Toate', 'PT', 'PCT', 'Separator'];

export const MainWorkflowClient: React.FC<MainWorkflowClientProps> = ({
  user,
  zones,
  activeZone,
  stations,
  lines,
  equipmentList,
  selectedZoneId,
  selectedStationId,
  selectedLineId,
  currentSearch,
  currentType,
}) => {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [selectedEquipmentForNav, setSelectedEquipmentForNav] = useState<Equipment | null>(null);
  const [selectedEquipmentForObs, setSelectedEquipmentForObs] = useState<Equipment | null>(null);
  const [selectedEquipmentForDetail, setSelectedEquipmentForDetail] = useState<Equipment | null>(null);

  // URL updating helper
  function updateFilters(updates: {
    zone?: string;
    station?: string;
    line?: string;
    search?: string;
    type?: string;
  }) {
    const params = new URLSearchParams();

    const z = updates.zone !== undefined ? updates.zone : selectedZoneId;
    const s = updates.station !== undefined ? updates.station : selectedStationId;
    const l = updates.line !== undefined ? updates.line : selectedLineId;
    const q = updates.search !== undefined ? updates.search : searchInput;
    const t = updates.type !== undefined ? updates.type : currentType;

    if (z) params.set('zone', z);
    if (s) params.set('station', s);
    if (l) params.set('line', l);
    if (q) params.set('search', q);
    if (t && t !== 'Toate') params.set('type', t);

    router.push(`/?${params.toString()}`);
  }

  function handleZoneChange(newZoneId: string) {
    // Reset station and line when zone changes
    updateFilters({ zone: newZoneId, station: '', line: '', search: '', type: 'Toate' });
  }

  function handleStationChange(newStationId: string) {
    // Reset line when station changes
    updateFilters({ station: newStationId, line: '', search: '', type: 'Toate' });
  }

  function handleLineChange(newLineId: string) {
    updateFilters({ line: newLineId });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateFilters({ search: searchInput });
  }

  function handleTypeFilter(type: string) {
    updateFilters({ type });
  }

  const isSelectionComplete = Boolean(selectedStationId && selectedLineId);

  return (
    <div className="space-y-4">
      {/* 1. Zone & Formation Banner */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-700" />
              <span>Zona de rețea MT</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              {activeZone?.name || 'Zonă necunoscută'}
            </h2>
          </div>

          {/* Admin zone switcher */}
          {user.role === 'admin' ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Schimbă zona:</span>
              <select
                value={selectedZoneId}
                onChange={(e) => handleZoneChange(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-sky-500"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zonă atribuită formației tale</span>
            </div>
          )}
        </div>
      </section>

      {/* 2. Station and Line Selection Steps */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        {/* Step 1: Station Selection */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 text-xs font-black flex items-center justify-center">
              1
            </span>
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Alege Stația Electrică:
            </label>
          </div>

          {stations.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded-xl">
              Nu există stații configurate pentru această zonă.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stations.map((st) => {
                const isActive = st.id === selectedStationId;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleStationChange(st.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-sky-50 border-sky-600 text-sky-950 font-black shadow-sm ring-2 ring-sky-600/20'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold'
                    }`}
                  >
                    <div className="text-xs sm:text-sm">{st.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Stație 110/20kV</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: 20 kV Line Selection */}
        {selectedStationId && (
          <div className="pt-3 border-t border-slate-100 animate-in fade-in">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 text-xs font-black flex items-center justify-center">
                2
              </span>
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Alege Linia de 20 kV:
              </label>
            </div>

            {lines.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded-xl">
                Nu există linii de 20 kV configurate pentru stația selectată.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {lines.map((ln) => {
                  const isActive = ln.id === selectedLineId;
                  return (
                    <button
                      key={ln.id}
                      type="button"
                      onClick={() => handleLineChange(ln.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                        isActive
                          ? 'bg-sky-700 border-sky-700 text-white shadow-sm'
                          : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      Linia {ln.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Equipment Section: Shown ONLY after station and line are selected */}
      {!isSelectionComplete ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 bg-sky-100 text-sky-800 rounded-full mx-auto flex items-center justify-center">
            <Filter className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
              Selectează stația și linia de 20 kV
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong>Regulă de siguranță conform manualului:</strong> Lista echipamentelor rămâne ascunsă până la completarea ambelor filtre, deoarece denumiri identice de PT sau separator pot exista pe linii ori în zone diferite.
            </p>
          </div>
        </div>
      ) : (
        <section className="space-y-3 animate-in fade-in">
          {/* Active selection context pill */}
          <div className="bg-sky-50 border border-sky-200 text-sky-900 rounded-xl px-3.5 py-2 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>Filtru activ:</span>
              <span className="bg-white border border-sky-300 px-2 py-0.5 rounded-md text-sky-950 font-black">
                Stația {stations.find((s) => s.id === selectedStationId)?.name}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-sky-600" />
              <span className="bg-white border border-sky-300 px-2 py-0.5 rounded-md text-sky-950 font-black">
                Linia {lines.find((l) => l.id === selectedLineId)?.name}
              </span>
            </div>
            <span className="text-[11px] text-sky-800">
              {equipmentList.length} echipamente
            </span>
          </div>

          {/* Search bar & Type Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm space-y-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Caută PT, PCT, separator după denumire, ID unic sau localitate..."
                className="w-full h-11 pl-10 pr-20 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors"
              >
                Caută
              </button>
            </form>

            {/* Type Filter Pills & Status Legend */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {EQUIPMENT_FILTER_TYPES.map((type) => {
                  const isActive = currentType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeFilter(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>

              {/* Status color legend */}
              <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Verde: Fără sesizări
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  Galben: Sesizări
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  Roșu: Indisponibil
                </span>
              </div>
            </div>
          </div>

          {/* Equipment Cards List */}
          {equipmentList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500 space-y-1">
              <p className="font-bold text-slate-700">Nu s-a găsit niciun echipament.</p>
              <p>Verifică termenii căutați sau schimbă filtrul de categorie.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {equipmentList.map((eq) => (
                <EquipmentCard
                  key={eq.id}
                  equipment={eq}
                  onNavigate={(item) => setSelectedEquipmentForNav(item)}
                  onViewDetails={(item) => setSelectedEquipmentForDetail(item)}
                  onAddObservation={(item) => setSelectedEquipmentForObs(item)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Navigation Modal */}
      <GoogleMapsDialog
        equipment={selectedEquipmentForNav}
        isOpen={Boolean(selectedEquipmentForNav)}
        onClose={() => setSelectedEquipmentForNav(null)}
      />

      {/* Observation Modal */}
      <ObservationModal
        equipment={selectedEquipmentForObs}
        isOpen={Boolean(selectedEquipmentForObs)}
        onClose={() => setSelectedEquipmentForObs(null)}
        onSubmitted={() => router.refresh()}
      />

      {/* Complete Equipment Details Modal */}
      <EquipmentDetailModal
        equipment={selectedEquipmentForDetail}
        isAdmin={user.role === 'admin'}
        isOpen={Boolean(selectedEquipmentForDetail)}
        onClose={() => setSelectedEquipmentForDetail(null)}
        onNavigate={(item) => setSelectedEquipmentForNav(item)}
        onAddObservation={(item) => setSelectedEquipmentForObs(item)}
        onStatusChanged={() => router.refresh()}
      />
    </div>
  );
};

