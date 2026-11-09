'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthSessionUser } from '@/lib/auth';
import {
  Zone,
  Station,
  Line20kV,
  Equipment,
  Observation,
  AuditLog,
  ParsedFeature,
} from '@/lib/types';
import {
  reviewObservationAction,
  updateAvailabilityAction,
  createEquipmentAction,
  updateEquipmentAction,
  deleteEquipmentAction,
} from '@/app/actions';
import { commitImportAction, ImportResult } from '@/app/actions/import';
import { parseNetworkCsv } from '@/lib/csv-parser';
import { extractKmlText, parseKmlFeatures } from '@/lib/kml-parser';
import { computeEquipmentStatus } from '@/lib/status-rules';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  FileCode,
  Download,
  Plus,
  Trash2,
  Edit,
  History,
  ShieldAlert,
  Search,
  Check,
  X,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

interface AdminDashboardClientProps {
  user: AuthSessionUser;
  zones: Zone[];
  stations: (Station & { zone?: Zone })[];
  lines: (Line20kV & { station?: Station & { zone?: Zone } })[];
  initialEquipment: Equipment[];
  pendingObservations: Observation[];
  auditLogs: AuditLog[];
}

type TabType = 'observatii' | 'retea' | 'import' | 'istoric';

export const AdminDashboardClient: React.FC<AdminDashboardClientProps> = ({
  user,
  zones,
  stations,
  lines,
  initialEquipment,
  pendingObservations,
  auditLogs,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>(
    pendingObservations.length > 0 ? 'observatii' : 'retea'
  );

  // ============================================================================
  // TAB 1: OBSERVATIONS REVIEW STATE
  // ============================================================================
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [promoteOfficial, setPromoteOfficial] = useState<Record<string, boolean>>({});
  const [isProcessingObs, setIsProcessingObs] = useState<string | null>(null);

  async function handleReviewObservation(
    obsId: string,
    action: 'approve' | 'reject' | 'needs_verification'
  ) {
    setIsProcessingObs(obsId);
    try {
      const notes = reviewNotes[obsId] || null;
      const updateOfficial = Boolean(promoteOfficial[obsId]);
      await reviewObservationAction(obsId, action, notes, updateOfficial);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || 'Eroare la procesarea sesizării.');
    } finally {
      setIsProcessingObs(null);
    }
  }

  // ============================================================================
  // TAB 2: MANUAL NETWORK MANAGEMENT STATE
  // ============================================================================
  const [eqSearch, setEqSearch] = useState('');
  const [isEditing, setIsEditing] = useState<Equipment | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    equipment_code: '',
    name: '',
    equipment_type: 'PT',
    line_id: lines[0]?.id || '',
    locality: '',
    latitude: '',
    longitude: '',
    official_observations: '',
  });

  const filteredEquipment = initialEquipment.filter((e) => {
    if (!eqSearch.trim()) return true;
    const q = eqSearch.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.equipment_code.toLowerCase().includes(q) ||
      (e.locality && e.locality.toLowerCase().includes(q))
    );
  });

  function startCreateEquipment() {
    setFormData({
      equipment_code: '',
      name: '',
      equipment_type: 'PT',
      line_id: lines[0]?.id || '',
      locality: '',
      latitude: '45.7200000',
      longitude: '25.7700000',
      official_observations: '',
    });
    setIsAddingNew(true);
    setIsEditing(null);
  }

  function startEditEquipment(eq: Equipment) {
    setFormData({
      equipment_code: eq.equipment_code,
      name: eq.name,
      equipment_type: eq.equipment_type,
      line_id: eq.line_id,
      locality: eq.locality || '',
      latitude: String(eq.latitude),
      longitude: String(eq.longitude),
      official_observations: eq.official_observations || '',
    });
    setIsEditing(eq);
    setIsAddingNew(false);
  }

  async function handleSaveEquipment(e: React.FormEvent) {
    e.preventDefault();
    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);

    if (isNaN(lat) || isNaN(lon)) {
      alert('Introduceți coordonate GPS numerice valide.');
      return;
    }

    try {
      if (isEditing) {
        await updateEquipmentAction(isEditing.id, {
          name: formData.name,
          equipment_type: formData.equipment_type,
          line_id: formData.line_id,
          locality: formData.locality,
          latitude: lat,
          longitude: lon,
          official_observations: formData.official_observations,
        });
      } else {
        await createEquipmentAction({
          equipment_code: formData.equipment_code,
          name: formData.name,
          equipment_type: formData.equipment_type,
          line_id: formData.line_id,
          locality: formData.locality,
          latitude: lat,
          longitude: lon,
          official_observations: formData.official_observations,
        });
      }
      setIsEditing(null);
      setIsAddingNew(false);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || 'Eroare la salvare.');
    }
  }

  async function handleDeleteEquipment(id: string, name: string) {
    if (!confirm(`Confirmați ștergerea definitivă a echipamentului: «${name}»?`)) return;
    try {
      await deleteEquipmentAction(id);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || 'Eroare la ștergere.');
    }
  }

  // ============================================================================
  // TAB 3: NETWORK IMPORT (KMZ / KML / CSV) STATE
  // ============================================================================
  const [importFeatures, setImportFeatures] = useState<ParsedFeature[]>([]);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importTargetLineId, setImportTargetLineId] = useState<string>(lines[0]?.id || '');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setIsParsing(true);
    setImportResult(null);

    try {
      const name = file.name.toLowerCase();
      let features: ParsedFeature[] = [];

      if (name.endsWith('.csv')) {
        const text = await file.text();
        features = parseNetworkCsv(text);
      } else if (name.endsWith('.kmz') || name.endsWith('.kml')) {
        const buffer = await file.arrayBuffer();
        const xmlText = await extractKmlText(buffer, file.name);
        features = parseKmlFeatures(xmlText);
      } else {
        alert('Format nesuportat. Vă rugăm încărcați un fișier .CSV, .KMZ sau .KML.');
        setIsParsing(false);
        return;
      }

      // Check duplicates against existing database
      const existingCodes = new Set(initialEquipment.map((eq) => eq.equipment_code.toUpperCase()));
      features = features.map((f) => ({
        ...f,
        isDuplicateInDB: f.equipmentCode ? existingCodes.has(f.equipmentCode.toUpperCase()) : false,
      }));

      setImportFeatures(features);
    } catch (err: any) {
      alert(`Eroare la parsarea fișierului: ${err?.message || 'Fișier deteriorat'}`);
    } finally {
      setIsParsing(false);
    }
  }

  async function handleConfirmImport() {
    if (!importFeatures.length) return;
    setIsImporting(true);
    try {
      const res = await commitImportAction(importFeatures, undefined, importTargetLineId);
      setImportResult(res);
      if (res.success) {
        setImportFeatures([]);
        router.refresh();
      }
    } catch (err: any) {
      alert(`Eroare la salvarea importului: ${err?.message || 'Eroare necunoscută'}`);
    } finally {
      setIsImporting(false);
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('observatii')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
            activeTab === 'observatii'
              ? 'bg-sky-700 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Verificare Observații</span>
          {pendingObservations.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'observatii'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {pendingObservations.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('retea')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
            activeTab === 'retea'
              ? 'bg-sky-700 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Gestionare Rețea (Manual)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
            activeTab === 'import'
              ? 'bg-sky-700 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Import Date (KMZ / CSV)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('istoric')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
            activeTab === 'istoric'
              ? 'bg-sky-700 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Istoric Modificări</span>
        </button>
      </div>

      {/* ============================================================================ */}
      {/* TAB 1: OBSERVATIONS REVIEW                                                   */}
      {/* ============================================================================ */}
      {activeTab === 'observatii' && (
        <section className="space-y-3 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Sesizări de Teren în Așteptare ({pendingObservations.length})
              </h2>
              <p className="text-xs text-slate-500">
                Analizați sesizările transmise de formațiile de electricieni. Doar datele aprobate devin oficiale.
              </p>
            </div>
            <button
              onClick={() => router.refresh()}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              title="Reîmprospătează"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {pendingObservations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">Nu există sesizări în așteptare</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Toate sesizările primite de la electricieni au fost procesate sau nu au fost înregistrate observații noi.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingObservations.map((obs) => {
                const eq = obs.equipment;
                const isBusy = isProcessingObs === obs.id;

                return (
                  <div
                    key={obs.id}
                    className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm space-y-3 border-l-4 border-l-amber-500"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded mr-2">
                          {eq?.equipment_code || 'ID Echipament'}
                        </span>
                        <strong className="text-slate-900 text-sm">{eq?.name || 'Echipament'}</strong>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {eq?.line?.station?.name} • Linia {eq?.line?.name}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="text-xs space-y-2">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-bold text-slate-700 uppercase bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
                          Categorie: {obs.category.replace('_', ' ')}
                        </span>
                        <span>•</span>
                        <span>{new Date(obs.created_at).toLocaleString('ro-RO')}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-line leading-relaxed font-medium">
                        «{obs.text}»
                      </div>
                    </div>

                    {/* Admin Review Controls */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Note administrator (opțional, ex: Verificat în teren cu echipa)..."
                          value={reviewNotes[obs.id] || ''}
                          onChange={(e) =>
                            setReviewNotes({ ...reviewNotes, [obs.id]: e.target.value })
                          }
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800"
                        />
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={Boolean(promoteOfficial[obs.id])}
                            onChange={(e) =>
                              setPromoteOfficial({ ...promoteOfficial, [obs.id]: e.target.checked })
                            }
                            className="rounded text-sky-700"
                          />
                          <span>Adaugă ca notă oficială pe fișă</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2 justify-end pt-1">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleReviewObservation(obs.id, 'reject')}
                          className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          Respinge
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleReviewObservation(obs.id, 'needs_verification')}
                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          Solicită verificări
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleReviewObservation(obs.id, 'approve')}
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Aprobă sesizarea
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ============================================================================ */}
      {/* TAB 2: MANUAL NETWORK MANAGEMENT                                            */}
      {/* ============================================================================ */}
      {activeTab === 'retea' && (
        <section className="space-y-4 animate-in fade-in">
          {/* Top Actions Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Gestionare Echipamente MT ({initialEquipment.length})
              </h2>
              <p className="text-xs text-slate-500">
                Adăugare manuală, modificare coordonate, actualizare descrieri și stare de disponibilitate.
              </p>
            </div>
            <button
              type="button"
              onClick={startCreateEquipment}
              className="inline-flex items-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adaugă Echipament Nou
            </button>
          </div>

          {/* Create / Edit Form Modal or Banner */}
          {(isAddingNew || isEditing) && (
            <div className="bg-white rounded-2xl border-2 border-sky-600 p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-black text-sm text-slate-900">
                  {isEditing ? `Modificare: ${isEditing.name}` : 'Adăugare Echipament Nou în Rețea'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setIsEditing(null);
                  }}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEquipment} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ID Unic Echipament (obligatoriu unic):
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(isEditing)}
                    value={formData.equipment_code}
                    onChange={(e) => setFormData({ ...formData, equipment_code: e.target.value })}
                    placeholder="ex: SEP-20-INT-10"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Denumire Echipament:
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ex: Separator MT 20kV Întorsura 10"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tip Echipament:</label>
                  <select
                    value={formData.equipment_type}
                    onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="PT">PT (Post de Transformare)</option>
                    <option value="PCT">PCT (Punct Conexiuni și Transformare)</option>
                    <option value="Separator">Separator MT</option>
                    <option value="SST">SST</option>
                    <option value="SDT">SDT</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Linie de 20 kV:</label>
                  <select
                    value={formData.line_id}
                    onChange={(e) => setFormData({ ...formData, line_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    {lines.map((ln) => (
                      <option key={ln.id} value={ln.id}>
                        {ln.station?.name} → Linia {ln.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Localitate:</label>
                  <input
                    type="text"
                    value={formData.locality}
                    onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                    placeholder="ex: Prejmer"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Latitudine GPS:</label>
                    <input
                      type="text"
                      required
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="45.728920"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Longitudine GPS:</label>
                    <input
                      type="text"
                      required
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="25.789140"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Observații oficiale validate:
                  </label>
                  <textarea
                    rows={2}
                    value={formData.official_observations}
                    onChange={(e) =>
                      setFormData({ ...formData, official_observations: e.target.value })
                    }
                    placeholder="Observații privind calea de acces, stâlp, racord..."
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setIsEditing(null);
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl font-bold shadow"
                  >
                    {isEditing ? 'Actualizează Echipamentul' : 'Salvează Echipamentul'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-3 border-b border-slate-200">
              <input
                type="text"
                placeholder="Filtrează după nume, ID unic sau localitate..."
                value={eqSearch}
                onChange={(e) => setEqSearch(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">ID Unic</th>
                    <th className="p-3">Denumire</th>
                    <th className="p-3">Stație / Linie</th>
                    <th className="p-3">Coordonate</th>
                    <th className="p-3">Stare</th>
                    <th className="p-3 text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredEquipment.map((eq) => {
                    const st = computeEquipmentStatus(eq);
                    return (
                      <tr key={eq.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {eq.equipment_code}
                        </td>
                        <td className="p-3 font-bold text-slate-900">{eq.name}</td>
                        <td className="p-3 text-slate-600">
                          {lines.find((l) => l.id === eq.line_id)?.name || 'Linie'}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">
                          {eq.latitude.toFixed(4)}, {eq.longitude.toFixed(4)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${st.badgeClass}`}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => startEditEquipment(eq)}
                            className="p-1.5 text-sky-700 hover:bg-sky-50 rounded-lg"
                            title="Editează"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEquipment(eq.id, eq.name)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Șterge"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================================ */}
      {/* TAB 3: NETWORK IMPORT (KMZ / KML / CSV)                                      */}
      {/* ============================================================================ */}
      {activeTab === 'import' && (
        <section className="space-y-4 animate-in fade-in">
          {/* Header & Download Template */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Import Rețea: KMZ, KML sau CSV
              </h2>
              <p className="text-xs text-slate-500">
                Încărcați fișiere geografice sau inventare tabelare. Datele sunt validate și afișate în previzualizare înainte de salvare.
              </p>
            </div>
            <a
              href="/api/template/csv"
              download
              className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              Descarcă Șablon CSV (Excel)
            </a>
          </div>

          {/* Import Result Notification */}
          {importResult && (
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 ${
                importResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-red-50 border-red-300 text-red-950'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {importResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span>{importResult.message}</span>
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-2 text-[11px] text-red-800 bg-white/70 p-2 rounded-lg max-h-32 overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload Area */}
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center space-y-3 hover:border-sky-500 transition-colors">
            <div className="w-12 h-12 bg-sky-50 text-sky-700 rounded-2xl mx-auto flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-900">
                Selectați fișierul KMZ, KML sau CSV pentru import
              </h3>
              <p className="text-xs text-slate-500">
                Formate acceptate: <strong>.csv</strong> (inventare Excel), <strong>.kmz</strong> (Google Earth arhivă), <strong>.kml</strong> (puncte geografice)
              </p>
            </div>
            <div>
              <label className="inline-flex items-center gap-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow transition-colors">
                <span>Alege fișier din calculator</span>
                <input
                  type="file"
                  accept=".csv,.kmz,.kml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            {isParsing && (
              <p className="text-xs text-sky-700 font-bold animate-pulse">
                Se analizează și validează conținutul fișierului...
              </p>
            )}
          </div>

          {/* Preview Section */}
          {importFeatures.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <span>Previzualizare Import: {importFileName}</span>
                    <span className="bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded text-xs">
                      {importFeatures.length} rânduri
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verificați rândurile înainte de confirmarea definitivă în baza de date.
                  </p>
                </div>

                {/* Target line selector if KMZ features lack line reference */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600 font-bold whitespace-nowrap">
                    Asociază liniei implicite:
                  </label>
                  <select
                    value={importTargetLineId}
                    onChange={(e) => setImportTargetLineId(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg p-1.5 bg-white font-semibold"
                  >
                    {lines.map((ln) => (
                      <option key={ln.id} value={ln.id}>
                        {ln.station?.name} → {ln.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
                <span className="bg-emerald-100 text-emerald-900 px-3 py-1 rounded-lg">
                  Valide: {importFeatures.filter((f) => f.isValid && !f.isDuplicateInDB).length}
                </span>
                <span className="bg-sky-100 text-sky-900 px-3 py-1 rounded-lg">
                  Actualizări echipamente existente:{' '}
                  {importFeatures.filter((f) => f.isValid && f.isDuplicateInDB).length}
                </span>
                <span className="bg-red-100 text-red-900 px-3 py-1 rounded-lg">
                  Nevalide / Erori: {importFeatures.filter((f) => !f.isValid).length}
                </span>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="p-2.5">ID Echipament</th>
                      <th className="p-2.5">Denumire</th>
                      <th className="p-2.5">Tip</th>
                      <th className="p-2.5">Coordonate</th>
                      <th className="p-2.5">Validare</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-[11px]">
                    {importFeatures.slice(0, 50).map((f) => (
                      <tr
                        key={f.tempId}
                        className={f.isValid ? 'hover:bg-slate-50' : 'bg-red-50/50'}
                      >
                        <td className="p-2.5 font-mono font-bold text-slate-900">
                          {f.equipmentCode || '—'}
                          {f.isDuplicateInDB && (
                            <span className="ml-1.5 text-[9px] bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-bold">
                              Actualizează
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-900">{f.name}</td>
                        <td className="p-2.5 text-slate-600">{f.equipmentType || 'PT'}</td>
                        <td className="p-2.5 font-mono text-slate-600">
                          {f.latitude && f.longitude
                            ? `${f.latitude.toFixed(4)}, ${f.longitude.toFixed(4)}`
                            : 'Lipsă'}
                        </td>
                        <td className="p-2.5">
                          {f.isValid ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                            </span>
                          ) : (
                            <span className="text-red-700 font-bold flex items-center gap-1" title={f.validationErrors.join(', ')}>
                              <XCircle className="w-3.5 h-3.5" /> {f.validationErrors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Commit button */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setImportFeatures([])}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                >
                  Anulează importul
                </button>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={handleConfirmImport}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isImporting ? 'Se salvează în baza de date...' : 'Confirmă și Salvează în Baza de Date'}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ============================================================================ */}
      {/* TAB 4: MODIFICATION HISTORY (AUDIT LOG)                                      */}
      {/* ============================================================================ */}
      {activeTab === 'istoric' && (
        <section className="space-y-3 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Istoric Modificări și Audit Tehnic
              </h2>
              <p className="text-xs text-slate-500">
                Jurnalul complet al acțiunilor: modificări echipamente, validări de sesizări, schimbări de indisponibilitate și importuri.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Data / Ora</th>
                    <th className="p-3">Tip Acțiune</th>
                    <th className="p-3">Entitate</th>
                    <th className="p-3">Detalii Modificare</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400 italic">
                        Nu există încă modificări înregistrate în jurnal.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString('ro-RO')}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {log.action_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-semibold">{log.entity_type}</td>
                        <td className="p-3 text-slate-700 max-w-md truncate">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

