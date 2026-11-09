import JSZip from 'jszip';
import { ParsedFeature, ImportPreviewSummary } from './types';

/**
 * Extracts raw XML string from a KML file or KMZ archive safely.
 */
export async function extractKmlText(buffer: ArrayBuffer, fileName: string): Promise<string> {
  const isKmz = fileName.toLowerCase().endsWith('.kmz');

  if (isKmz) {
    const zip = await JSZip.loadAsync(buffer);
    // Find the primary .kml file inside the KMZ archive
    let kmlFileName = Object.keys(zip.files).find((name) =>
      name.toLowerCase().endsWith('.kml') && !name.startsWith('__MACOSX/')
    );

    if (!kmlFileName) {
      throw new Error('Arhiva KMZ nu conține niciun fișier .kml valid.');
    }

    const file = zip.file(kmlFileName);
    if (!file) {
      throw new Error(`Nu s-a putut deschide fișierul ${kmlFileName} din arhiva KMZ.`);
    }

    return await file.async('text');
  }

  // Raw KML is directly decoded UTF-8 text
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(buffer);
}

/**
 * Parses KML string and extracts geographic features (Placemarks) into structured ParsedFeature list.
 */
export function parseKmlFeatures(kmlText: string): ParsedFeature[] {
  const features: ParsedFeature[] = [];

  // Use regex / lightweight string parser to work reliably in both Node.js and browser environments
  // Match each <Placemark ...>...</Placemark>
  const placemarkRegex = /<Placemark[\s\S]*?<\/Placemark>/gi;
  const matches = kmlText.match(placemarkRegex) || [];

  for (let i = 0; i < matches.length; i++) {
    const pm = matches[i];

    // Extract Name
    const nameMatch = pm.match(/<name>([\s\S]*?)<\/name>/i);
    const rawName = nameMatch ? cleanXmlText(nameMatch[1]) : `Placemark #${i + 1}`;

    // Extract Description
    const descMatch = pm.match(/<description>([\s\S]*?)<\/description>/i);
    const description = descMatch ? cleanXmlText(descMatch[1]) : '';

    // Extract Coordinates: Point or Polygon or LineString
    const coordsMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
    let lat: number | null = null;
    let lon: number | null = null;
    const isPolygon = /<Polygon/i.test(pm);

    if (coordsMatch) {
      const coordTokens = coordsMatch[1].trim().split(/\s+/);
      if (coordTokens.length > 0) {
        // In KML, coordinates are formatted as: longitude,latitude,altitude
        const parts = coordTokens[0].split(',');
        if (parts.length >= 2) {
          const parsedLon = parseFloat(parts[0]);
          const parsedLat = parseFloat(parts[1]);
          if (!isNaN(parsedLon) && !isNaN(parsedLat)) {
            lon = parsedLon;
            lat = parsedLat;
          }
        }

        // If multiple coordinates (e.g. Polygon / LineString), average them to find center
        if (coordTokens.length > 1) {
          let sumLat = 0;
          let sumLon = 0;
          let count = 0;
          for (const token of coordTokens) {
            const p = token.split(',');
            if (p.length >= 2) {
              const pLon = parseFloat(p[0]);
              const pLat = parseFloat(p[1]);
              if (!isNaN(pLon) && !isNaN(pLat)) {
                sumLon += pLon;
                sumLat += pLat;
                count++;
              }
            }
          }
          if (count > 0) {
            lon = Number((sumLon / count).toFixed(7));
            lat = Number((sumLat / count).toFixed(7));
          }
        }
      }
    }

    // Extract ExtendedData / SimpleData attributes
    const rawAttributes: Record<string, string> = {};
    const simpleDataRegex = /<SimpleData\s+name=["']([^"']+)["']>([\s\S]*?)<\/SimpleData>/gi;
    let attrMatch;
    while ((attrMatch = simpleDataRegex.exec(pm)) !== null) {
      rawAttributes[attrMatch[1].toUpperCase()] = cleanXmlText(attrMatch[2]);
    }

    // Try to infer attributes from name or description
    // E.g. "PT 123", "Separator 20kV", etc.
    let eqType = inferEquipmentType(rawName);
    let eqCode = rawAttributes['ID'] || rawAttributes['COD'] || rawAttributes['EQUIPMENT_CODE'] || '';

    // If equipment code is not provided in attributes, derive or format one
    if (!eqCode) {
      const sanitized = rawName.replace(/[^A-Za-z0-9_-]/g, '-').toUpperCase();
      eqCode = sanitized.startsWith('EQ-') ? sanitized : `KMZ-${sanitized}-${i + 1}`;
    }

    const validationErrors: string[] = [];
    if (!lat || !lon) {
      validationErrors.push('Coordonate GPS lipsă sau nevalide.');
    } else {
      if (lat < 43 || lat > 49 || lon < 20 || lon > 31) {
        validationErrors.push('Avertisment: Coordonate în afara ariei României.');
      }
    }

    if (isPolygon) {
      validationErrors.push('Atenție: Punctul GPS este centrul unui poligon, nu un acces confirmat.');
    }

    const locality = rawAttributes['LOCALITATE'] || rawAttributes['LOCALITY'] || undefined;
    const stationName = rawAttributes['STATIE'] || rawAttributes['STATION'] || undefined;
    const lineName = rawAttributes['LINIE'] || rawAttributes['LINE'] || undefined;

    features.push({
      tempId: `feat-${i + 1}`,
      name: rawName,
      equipmentCode: eqCode,
      equipmentType: eqType,
      description,
      latitude: lat,
      longitude: lon,
      locality,
      stationName,
      lineName,
      officialObservations: description || undefined,
      rawAttributes,
      isValid: validationErrors.filter((e) => !e.startsWith('Avertisment') && !e.startsWith('Atenție')).length === 0,
      validationErrors,
    });
  }

  return features;
}

function cleanXmlText(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function inferEquipmentType(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes('PT') || upper.includes('POST')) return 'PT';
  if (upper.includes('PCT')) return 'PCT';
  if (upper.includes('SEP') || upper.includes('SEPARATOR')) return 'Separator';
  if (upper.includes('SST')) return 'SST';
  if (upper.includes('SDT')) return 'SDT';
  return 'PT';
}
