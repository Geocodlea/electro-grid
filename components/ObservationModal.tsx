'use client';

import React, { useState } from 'react';
import { Equipment, Observation } from '@/lib/types';
import { submitObservationAction } from '@/app/actions';
import { MessageSquarePlus, X, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ObservationModalProps {
  equipment: Equipment | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export const ObservationModal: React.FC<ObservationModalProps> = ({
  equipment,
  isOpen,
  onClose,
  onSubmitted,
}) => {
  const [category, setCategory] = useState<Observation['category']>('acces');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !equipment) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError('Vă rugăm să detaliați observația de teren.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!equipment) throw new Error('Echipament inexistent');
      const res = await submitObservationAction(equipment.id, text, category);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setText('');
          onClose();
          if (onSubmitted) onSubmitted();
        }, 1400);
      }
    } catch (err: any) {
      setError(err?.message || 'Eroare la trimiterea sesizării.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-grid-header text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <MessageSquarePlus className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Trimite Observație de Teren</h3>
              <p className="text-xs text-slate-300">Sesizare către administrator pentru validare</p>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Target equipment summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
            <div className="font-bold text-slate-900">{equipment.name}</div>
            <div className="text-slate-600">
              ID: <span className="font-mono font-semibold">{equipment.equipment_code}</span> • {equipment.line?.station?.name || 'Stație'} → {equipment.line?.name || 'Linie MT'}
            </div>
          </div>

          {success ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl text-center flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 animate-bounce" />
              <p className="font-bold text-sm">Observația a fost transmisă cu succes!</p>
              <p className="text-xs text-emerald-700">
                Sesizarea a fost înregistrată în lista administratorului pentru verificare.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Category selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tip problemă / Categorie sesizare:
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Observation['category'])}
                  className="w-full h-11 px-3 border border-slate-300 rounded-xl bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                >
                  <option value="acces">Acces dificil (teren accidentat, vegetație, poartă blocată)</option>
                  <option value="defect">Defecțiune sau anomalie tehnică observată</option>
                  <option value="maneta_lipsa">Lipsă manetă acționare separator</option>
                  <option value="gps_gresit">Poziție GPS greșită / necesită corectare coordonate</option>
                  <option value="altele">Alte constatări de teren</option>
                </select>
              </div>

              {/* Observation textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Descrierea detaliată a observației:
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Exemplu: Accesul este blocat de un gard recent montat pe drumul lateral; separatorul necesită cheie specială pentru manetă..."
                  rows={4}
                  required
                  className="w-full p-3 border border-slate-300 rounded-xl bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="text-[11px] text-slate-500 bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 leading-relaxed">
                ℹ️ <strong>Flux conform procedurii:</strong> Observația intră în starea <em>«În curs de verificare»</em> (fișa devine galbenă). Doar după aprobarea administratorului datele devin oficiale în fișă.
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {loading ? 'Se transmite...' : 'Trimite observația'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

