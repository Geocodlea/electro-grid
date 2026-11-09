'use client';

import React from 'react';
import { Equipment } from '@/lib/types';
import { computeEquipmentStatus } from '@/lib/status-rules';
import { Navigation, FileText, AlertCircle, MessageSquarePlus } from 'lucide-react';

interface EquipmentCardProps {
  equipment: Equipment;
  onNavigate: (equipment: Equipment) => void;
  onViewDetails: (equipment: Equipment) => void;
  onAddObservation: (equipment: Equipment) => void;
}

export const EquipmentCard: React.FC<EquipmentCardProps> = ({
  equipment,
  onNavigate,
  onViewDetails,
  onAddObservation,
}) => {
  const status = computeEquipmentStatus(equipment);

  const borderClass =
    status.color === 'red'
      ? 'border-l-4 border-l-red-600 border-red-200 bg-red-50/40'
      : status.color === 'yellow'
      ? 'border-l-4 border-l-amber-500 border-amber-200 bg-amber-50/40'
      : 'border-l-4 border-l-emerald-600 border-slate-200 bg-white hover:bg-slate-50/50';

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${borderClass}`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 leading-tight">
            {equipment.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
              ID: {equipment.equipment_code}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {equipment.equipment_type}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wide border shadow-sm ${status.badgeClass}`}
        >
          {status.color === 'red' && <AlertCircle className="w-3.5 h-3.5" />}
          {status.label}
        </span>
      </div>

      {/* Network location */}
      <div className="mt-2 text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
        <span className="font-semibold text-slate-800">
          Stația {equipment.line?.station?.name || 'Stație'}
        </span>
        <span className="text-slate-400">•</span>
        <span>Linia {equipment.line?.name || 'Linie 20 kV'}</span>
        {equipment.locality && (
          <>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">{equipment.locality}</span>
          </>
        )}
      </div>

      {/* Active observations preview or unavailable reason */}
      {status.color === 'red' && equipment.unavailable_reason && (
        <div className="mt-2.5 p-2.5 bg-red-100/70 border border-red-200 rounded-xl text-xs text-red-950 font-medium">
          ⛔ <strong>Motiv indisponibilitate:</strong> {equipment.unavailable_reason}
        </div>
      )}

      {status.color === 'yellow' && (
        <div className="mt-2.5 p-2 bg-amber-100/70 border border-amber-200 rounded-xl text-xs text-amber-950">
          ⚠️ <strong>Observație activă:</strong> {equipment.official_observations || 'Sesizare în curs de verificare.'}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onNavigate(equipment)}
          className="inline-flex items-center justify-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-sm transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          Navighează
        </button>

        <button
          type="button"
          onClick={() => onViewDetails(equipment)}
          className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs py-2 px-3 rounded-xl border border-slate-300 shadow-sm transition-colors"
        >
          <FileText className="w-3.5 h-3.5 text-slate-600" />
          Fișă completă
        </button>

        <button
          type="button"
          onClick={() => onAddObservation(equipment)}
          className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs py-2 px-3 rounded-xl transition-colors"
        >
          <MessageSquarePlus className="w-3.5 h-3.5 text-amber-700" />
          Observație
        </button>
      </div>
    </article>
  );
};

