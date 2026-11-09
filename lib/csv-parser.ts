import Papa from 'papaparse';
import { ParsedFeature } from './types';

export const CSV_TEMPLATE_HEADERS = [
  'Zona',
  'Statie',
  'Linie20kV',
  'IdEchipament',
  'Denumire',
  'TipEchipament',
  'Localitate',
  'Latitudine',
  'Longitudine',
  'ObservatiiOficiale',
  'Disponibilitate', // Disponibil / Indisponibil
  'MotivIndisponibilitate',
];

export const SAMPLE_CSV_ROWS = [
  [
    'Săcele + Prejmer',
    'Prejmer',
    'Întorsura',
    'SEP-20-INT-09',
    'Separator MT 20kV Întorsura 9',
    'Separator',
    'Prejmer',
    '45.7351000',
    '25.7984000',
    'Acces din drum asfaltat DJ 103B',
    'Disponibil',
    '',
  ],
  [
    'Săcele + Prejmer',
    'Prejmer',
    'Întorsura',
    'PT-20-INT-11',
    'PT 130 Întorsura',
    'PT',
    'Prejmer',
    '45.7392000',
    '25.8035000',
    'Post pe stâlp metalic',
    'Disponibil',
    '',
  ],
  [
    'Săcele + Prejmer',
    'Prejmer',
    'Întorsura',
    'PCT-20-INT-03',
    'PCT 18 Lunca',
    'PCT',
    'Lunca Câlnicului',
    '45.7410000',
    '25.8090000',
    'Lipsă cheie acces poartă incintă',
    'Indisponibil',
    'Celulă defectă în revizie',
  ],
];

/**
 * Generates downloadable CSV content with UTF-8 BOM for flawless Excel compatibility.
 */
export function generateCsvTemplate(): string {
  const content = Papa.unparse({
    fields: CSV_TEMPLATE_HEADERS,
    data: SAMPLE_CSV_ROWS,
  });

  // Prepend UTF-8 BOM (\uFEFF)
  return '\uFEFF' + content;
}

/**
 * Parses raw CSV string and returns validated features with error diagnostics.
 */
export function parseNetworkCsv(csvString: string): ParsedFeature[] {
  const results = Papa.parse<Record<string, string>>(csvString, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  const features: ParsedFeature[] = [];
  const seenIds = new Set<string>();

  results.data.forEach((row, index) => {
    // Normalization of headers
    const zoneName = getVal(row, ['Zona', 'Zone', 'Zonă']);
    const stationName = getVal(row, ['Statie', 'Stație', 'Station']);
    const lineName = getVal(row, ['Linie20kV', 'Linie', 'Linie MT', 'Line']);
    const eqCode = getVal(row, ['IdEchipament', 'ID', 'Cod', 'CodEchipament', 'Id']);
    const name = getVal(row, ['Denumire', 'Nume', 'Name', 'Echipament']);
    const eqType = getVal(row, ['TipEchipament', 'Tip', 'Type']) || 'PT';
    const locality = getVal(row, ['Localitate', 'Locality', 'Comuna', 'Oras']);
    const rawLat = getVal(row, ['Latitudine', 'Lat', 'Latitude']);
    const rawLon = getVal(row, ['Longitudine', 'Lon', 'Long', 'Longitude']);
    const officialNotes = getVal(row, ['ObservatiiOficiale', 'Observatii', 'Observații', 'Note']);
    const availabilityRaw = getVal(row, ['Disponibilitate', 'Stare', 'Status']);
    const unavailReason = getVal(row, ['MotivIndisponibilitate', 'Motiv', 'Reason']);

    const errors: string[] = [];

    if (!eqCode) {
      errors.push('ID Echipament lipsă (obligatoriu unic).');
    } else {
      const codeUpper = eqCode.toUpperCase();
      if (seenIds.has(codeUpper)) {
        errors.push(`ID duplicat în fișier: ${eqCode}`);
      }
      seenIds.add(codeUpper);
    }

    if (!name) {
      errors.push('Denumire echipament lipsă.');
    }

    if (!stationName) {
      errors.push('Stația electrică este obligatorie.');
    }

    if (!lineName) {
      errors.push('Linia de 20 kV este obligatorie.');
    }

    const lat = parseFloat(rawLat.replace(',', '.'));
    const lon = parseFloat(rawLon.replace(',', '.'));

    if (isNaN(lat) || isNaN(lon)) {
      errors.push('Coordonate GPS nevalide sau lipsă.');
    } else {
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        errors.push('Coordonate în afara limitelor terestre (-90..90, -180..180).');
      } else if (lat < 43 || lat > 49 || lon < 20 || lon > 31) {
        errors.push('Avertisment: Coordonatele nu se află în perimetrul României.');
      }
    }

    const isUnavailable =
      availabilityRaw.toLowerCase().includes('indisponibil') ||
      availabilityRaw.toLowerCase() === 'nu' ||
      availabilityRaw.toLowerCase() === 'false' ||
      availabilityRaw.toLowerCase() === 'rosu';

    features.push({
      tempId: `csv-row-${index + 1}`,
      name: name || `Echipament Rând ${index + 1}`,
      equipmentCode: eqCode,
      equipmentType: eqType,
      zoneName,
      stationName,
      lineName,
      locality,
      latitude: isNaN(lat) ? null : lat,
      longitude: isNaN(lon) ? null : lon,
      officialObservations: officialNotes || undefined,
      isUnavailable,
      unavailableReason: isUnavailable ? unavailReason || 'Marcat indisponibil din import.' : undefined,
      isValid: errors.filter((e) => !e.startsWith('Avertisment')).length === 0,
      validationErrors: errors,
    });
  });

  return features;
}

function getVal(row: Record<string, string>, possibleKeys: string[]): string {
  for (const k of possibleKeys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim().length > 0) {
      return String(row[k]).trim();
    }
  }
  // Try case-insensitive matching
  const rowKeys = Object.keys(row);
  for (const p of possibleKeys) {
    const found = rowKeys.find((rk) => rk.toLowerCase() === p.toLowerCase());
    if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim().length > 0) {
      return String(row[found]).trim();
    }
  }
  return '';
}
