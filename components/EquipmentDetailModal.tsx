'use client';

import React, { useState } from 'react';
import { Equipment, Observation } from '@/lib/types';
import { computeEquipmentStatus } from '@/lib/status-rules';
import { updateAvailabilityAction } from '@/app/actions';
import {
  X,
  Navigation,
  MessageSquarePlus,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface EquipmentDetailModalProps {
  equipment: Equipment | null;
  observations?: Observation[];
  isAdmin?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (equipment: Equipment) => void;
  onAddObservation: (equipment: Equipment) => void;
  onStatusChanged?: () => void;
}

export const EquipmentDetailModal: React.FC<EquipmentDetailModalProps> = ({
  equipment,
  observations = [],
  isAdmin = false,
  isOpen,
  onClose,
  onNavigate,
  onAddObservation,
  onStatusChanged,
}) => {
  const [unavailReason, setUnavailReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showAdminStatusBox, setShowAdminStatusBox] = useState(false);

  if (!isOpen || !equipment) return null;

  const status = computeEquipmentStatus(equipment);

  async function handleToggleAvailability(setUnavailable: boolean) {
    if (setUnavailable && !unavailReason.trim()) {
      alert('Vă rugăm să introduceți motivul indisponibilității.');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      if (!equipment) throw new Error('Echipament inexistent');
      await updateAvailabilityAction(
        equipment.id,
        setUnavailable,
        setUnavailable ? unavailReason : null
      );
      setShowAdminStatusBox(false);
      setUnavailReason('');
      if (onStatusChanged) onStatusChanged();
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Eroare la actualizarea stării.');
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  const activeObservations = observations.filter((o) => o.equipment_id === equipment.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-grid-header text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs bg-white/20 text-white font-bold px-2 py-0.5 rounded">
                ID: {equipment.equipment_code}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {equipment.equipment_type}
              </span>
            </div>
            <h2 className="font-extrabold text-lg sm:text-xl text-white mt-1 leading-tight">
              {equipment.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Status Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${status.bgClass} ${status.borderClass}`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-block w-3.5 h-3.5 rounded-full ${
                  status.color === 'red'
                    ? 'bg-red-600'
                    : status.color === 'yellow'
                    ? 'bg-amber-500'
                    : 'bg-emerald-600'
                }`}
              />
              <div>
                <span className="font-black text-xs uppercase tracking-wide">
                  {status.label}
                </span>
                <p className="text-xs text-slate-700 mt-0.5">{status.reason}</p>
              </div>
            </div>
          </div>

          {/* Network Hierarchy Table */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
              Apartenență Rețea MT
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-500 font-medium">Zonă operativă:</span>
              <span className="col-span-2 font-semibold text-slate-900">
                {equipment.line?.station?.zone?.name || 'Săcele + Prejmer'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-500 font-medium">Stație electrică:</span>
              <span className="col-span-2 font-semibold text-slate-900">
                {equipment.line?.station?.name || 'Stație'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-500 font-medium">Linie de 20 kV:</span>
              <span className="col-span-2 font-semibold text-slate-900">
                {equipment.line?.name || 'Linie MT'}
              </span>
            </div>
            {equipment.locality && (
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-medium">Localitate:</span>
                <span className="col-span-2 text-slate-800">{equipment.locality}</span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/80">
              <span className="text-slate-500 font-medium">Coordonate GPS:</span>
              <span className="col-span-2 font-mono font-bold text-sky-800">
                {equipment.latitude.toFixed(6)}, {equipment.longitude.toFixed(6)}
              </span>
            </div>
          </div>

          {/* Official Observations */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs space-y-1.5 shadow-sm">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
              <span>Observații oficiale validate</span>
            </h4>
            {equipment.official_observations ? (
              <p className="text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                {equipment.official_observations}
              </p>
            ) : (
              <p className="text-slate-400 italic">Nu există observații oficiale înregistrate.</p>
            )}
          </div>

          {/* Field observations history */}
          {activeObservations.length > 0 && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 text-xs space-y-2">
              <h4 className="font-bold text-amber-950 uppercase tracking-wider text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>Sesizări recente de teren ({activeObservations.length})</span>
              </h4>
              <div className="space-y-2">
                {activeObservations.map((obs) => (
                  <div
                    key={obs.id}
                    className="bg-white p-2.5 rounded-lg border border-amber-200/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-slate-700 capitalize">
                        {obs.category.replace('_', ' ')}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          obs.status === 'pending'
                            ? 'bg-amber-100 text-amber-900'
                            : obs.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-900'
                            : obs.status === 'needs_verification'
                            ? 'bg-sky-100 text-sky-900'
                            : 'bg-red-100 text-red-900'
                        }`}
                      >
                        {obs.status === 'pending'
                          ? 'În verificare'
                          : obs.status === 'approved'
                          ? 'Validat'
                          : obs.status === 'needs_verification'
                          ? 'Necesită verificări'
                          : 'Respins'}
                      </span>
                    </div>
                    <p className="text-slate-800">{obs.text}</p>
                    {obs.admin_notes && (
                      <p className="text-[11px] text-slate-500 italic border-t border-slate-100 pt-1">
                        Notă admin: {obs.admin_notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Administrator Quick Controls */}
          {isAdmin && (
            <div className="bg-slate-100/80 border border-slate-300 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Panou Administrator — Gestionare Stare</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdminStatusBox(!showAdminStatusBox)}
                  className="text-xs text-sky-800 font-bold hover:underline"
                >
                  {showAdminStatusBox ? 'Ascunde' : 'Modifică disponibilitatea'}
                </button>
              </div>

              {showAdminStatusBox && (
                <div className="pt-2 border-t border-slate-200 space-y-2.5 animate-in fade-in">
                  {equipment.is_unavailable ? (
                    <div>
                      <p className="text-xs text-slate-600 mb-2">
                        Echipamentul este marcat ca <strong>INDISPONIBIL (ROȘU)</strong>: «
                        {equipment.unavailable_reason}».
                      </p>
                      <button
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleToggleAvailability(false)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-xl transition-colors disabled:opacity-50"
                      >
                        {isUpdatingStatus ? 'Se procesează...' : 'Declară echipament disponibil (Anulează starea Roșie)'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Motivul indisponibilității (obligatoriu):
                      </label>
                      <input
                        type="text"
                        value={unavailReason}
                        onChange={(e) => setUnavailReason(e.target.value)}
                        placeholder="Ex: Mecanism defect, celulă în revizie, manetă lipsă..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 mb-2"
                      />
                      <button
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleToggleAvailability(true)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 rounded-xl transition-colors disabled:opacity-50"
                      >
                        {isUpdatingStatus ? 'Se procesează...' : 'Declară indisponibil (Marchează ROȘU)'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigate(equipment);
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow transition-colors"
          >
            <Navigation className="w-4 h-4" />
            Navighează cu Google Maps
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onAddObservation(equipment);
            }}
            className="inline-flex items-center justify-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl border border-amber-300 transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4 text-amber-800" />
            Trimite observație
          </button>
        </div>
      </div>
    </div>
  );
};

