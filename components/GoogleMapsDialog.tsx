'use client';

import React from 'react';
import { Equipment } from '@/lib/types';
import { Navigation, MapPin, ExternalLink, X, AlertTriangle } from 'lucide-react';

interface GoogleMapsDialogProps {
  equipment: Equipment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleMapsDialog: React.FC<GoogleMapsDialogProps> = ({
  equipment,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !equipment) return null;

  const lat = equipment.latitude;
  const lon = equipment.longitude;
  const hasValidCoordinates = lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon);

  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${lat},${lon}`
  )}&travelmode=driving`;

  const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(`${lat},${lon}`)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-grid-header text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <Navigation className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Confirmare Navigație GPS</h3>
              <p className="text-xs text-slate-300">Google Maps Navigation External Service</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Warning banner */}
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold mb-0.5 text-amber-950">
                Confirmă identitatea echipamentului înainte de deplasare!
              </strong>
              Coordonatele GPS reflectă punctul înregistrat în inventar și pot indica un stâlp, o incintă sau centrul unui perimetru. Nu garantează drumul carosabil sau accesul autorizat.
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-200/70">
              <span className="text-slate-500 font-medium">Echipament:</span>
              <span className="col-span-2 font-bold text-slate-900">{equipment.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-200/70">
              <span className="text-slate-500 font-medium">ID Unic:</span>
              <span className="col-span-2 font-mono font-bold text-slate-800">
                {equipment.equipment_code}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-200/70">
              <span className="text-slate-500 font-medium">Stație / Linie:</span>
              <span className="col-span-2 text-slate-800 font-medium">
                {equipment.line?.station?.name || 'Stație'} • {equipment.line?.name || 'Linie 20 kV'}
              </span>
            </div>
            {equipment.locality && (
              <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-200/70">
                <span className="text-slate-500 font-medium">Localitate:</span>
                <span className="col-span-2 text-slate-800">{equipment.locality}</span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 py-1">
              <span className="text-slate-500 font-medium">Coordonate GPS:</span>
              <span className="col-span-2 font-mono font-semibold text-sky-800">
                {hasValidCoordinates ? `${lat.toFixed(6)}, ${lon.toFixed(6)}` : 'Indisponibile'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          {hasValidCoordinates ? (
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <a
                href={dirUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-sky-700 hover:bg-sky-800 text-white font-bold py-2.5 px-4 rounded-xl shadow transition-colors text-sm"
              >
                <Navigation className="w-4 h-4" />
                Deschide navigația Google Maps ↗
              </a>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl border border-slate-300 transition-colors text-xs"
              >
                <MapPin className="w-4 h-4 text-slate-600" />
                Vezi pe hartă ↗
              </a>
            </div>
          ) : (
            <div className="bg-red-50 text-red-800 border border-red-200 rounded-xl p-3 text-xs text-center">
              Coordonatele GPS lipsesc sau sunt incorecte. Nu se poate deschide navigația.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

