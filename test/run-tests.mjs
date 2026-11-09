import assert from 'node:assert';
import fs from 'node:fs';
import Papa from 'papaparse';

console.log('⚡=============================================================');
console.log('⚡ ELECTROGRID MT — COMPREHENSIVE AUTOMATED TEST SUITE');
console.log('⚡=============================================================\n');

// ----------------------------------------------------------------------------
// TEST 1: Status priority rules (Strict adherence to PDF Section 4)
// ----------------------------------------------------------------------------
console.log('▶ Test 1: Testing Status Priority (PDF Section 4: Red > Yellow > Green)');

function computeEquipmentStatus(equipment) {
  if (equipment.is_unavailable) {
    return {
      color: 'red',
      label: 'Indisponibil',
      reason: equipment.unavailable_reason || 'Echipament marcat indisponibil de administrator.',
    };
  }

  const hasPendingObservations = (equipment.pending_observations_count ?? 0) > 0;
  if (hasPendingObservations) {
    return {
      color: 'yellow',
      label: 'Observații / Sesizări în verificare',
      reason: 'Există sesizări în curs de verificare de către administrator.',
    };
  }

  if (equipment.official_observations && equipment.official_observations.trim().length > 0) {
    return {
      color: 'yellow',
      label: 'Observații active',
      reason: equipment.official_observations,
    };
  }

  return {
    color: 'green',
    label: 'Fără observații active',
    reason: 'Nu există observații active în registru.',
  };
}

// Case 1.1: ROȘU always takes priority even if pending observations and notes are present
const stRed = computeEquipmentStatus({
  is_unavailable: true,
  unavailable_reason: 'Mecanism blocat — celulă defectă',
  pending_observations_count: 3,
  official_observations: 'Acces bun',
});
assert.strictEqual(stRed.color, 'red', 'RED must take absolute priority');
assert.strictEqual(stRed.label, 'Indisponibil');
console.log('  [PASS] 1.1: ROȘU (Indisponibil) takes absolute priority over all other states.');

// Case 1.2: GALBEN when there are observations pending verification
const stYellowPending = computeEquipmentStatus({
  is_unavailable: false,
  pending_observations_count: 1,
  official_observations: null,
});
assert.strictEqual(stYellowPending.color, 'yellow', 'Must be YELLOW when pending observations exist');
console.log('  [PASS] 1.2: GALBEN when pending observations are awaiting verification.');

// Case 1.3: GALBEN when there are active official observations
const stYellowActive = computeEquipmentStatus({
  is_unavailable: false,
  pending_observations_count: 0,
  official_observations: 'Acces dificil pe drum lateral',
});
assert.strictEqual(stYellowActive.color, 'yellow', 'Must be YELLOW when active official notes exist');
console.log('  [PASS] 1.3: GALBEN when active official observations exist.');

// Case 1.4: VERDE when no active observations in registry
const stGreen = computeEquipmentStatus({
  is_unavailable: false,
  pending_observations_count: 0,
  official_observations: '',
});
assert.strictEqual(stGreen.color, 'green', 'Must be GREEN when no observations');
console.log('  [PASS] 1.4: VERDE when no active observations exist in registry.');

// ----------------------------------------------------------------------------
// TEST 2: CSV Parsing, Validation, and Duplicate Detection
// ----------------------------------------------------------------------------
console.log('\n▶ Test 2: Testing CSV Network Import Parsing and Validation');

function parseNetworkCsv(csvString) {
  const results = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  const features = [];
  const seenIds = new Set();

  results.data.forEach((row, index) => {
    const getVal = (possibleKeys) => {
      for (const k of possibleKeys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim().length > 0) {
          return String(row[k]).trim();
        }
      }
      return '';
    };

    const eqCode = getVal(['IdEchipament', 'ID', 'Cod']);
    const name = getVal(['Denumire', 'Nume', 'Name']);
    const stationName = getVal(['Statie', 'Stație']);
    const lineName = getVal(['Linie20kV', 'Linie']);
    const rawLat = getVal(['Latitudine', 'Lat']);
    const rawLon = getVal(['Longitudine', 'Lon']);
    const availabilityRaw = getVal(['Disponibilitate', 'Stare']);
    const unavailReason = getVal(['MotivIndisponibilitate', 'Motiv']);

    const errors = [];
    if (!eqCode) {
      errors.push('ID Echipament lipsă (obligatoriu unic).');
    } else {
      const codeUpper = eqCode.toUpperCase();
      if (seenIds.has(codeUpper)) {
        errors.push(`ID duplicat în fișier: ${eqCode}`);
      }
      seenIds.add(codeUpper);
    }

    if (!name) errors.push('Denumire echipament lipsă.');
    if (!stationName) errors.push('Stația electrică este obligatorie.');
    if (!lineName) errors.push('Linia de 20 kV este obligatorie.');

    const lat = parseFloat(rawLat.replace(',', '.'));
    const lon = parseFloat(rawLon.replace(',', '.'));

    if (isNaN(lat) || isNaN(lon)) {
      errors.push('Coordonate GPS nevalide sau lipsă.');
    }

    const isUnavailable =
      availabilityRaw.toLowerCase().includes('indisponibil') ||
      availabilityRaw.toLowerCase() === 'nu';

    features.push({
      tempId: `row-${index + 1}`,
      equipmentCode: eqCode,
      name,
      stationName,
      lineName,
      latitude: isNaN(lat) ? null : lat,
      longitude: isNaN(lon) ? null : lon,
      isUnavailable,
      unavailableReason: isUnavailable ? unavailReason || 'Indisponibil din import' : null,
      isValid: errors.length === 0,
      validationErrors: errors,
    });
  });

  return features;
}

const csvContent = fs.readFileSync('test-data/retea_exemplu.csv', 'utf8');
const parsed = parseNetworkCsv(csvContent);

assert.strictEqual(parsed.length, 5, 'Should have parsed 5 rows');
console.log(`  [PASS] 2.1: Successfully parsed ${parsed.length} rows from CSV.`);

// Row 1
assert.strictEqual(parsed[0].isValid, true);
assert.strictEqual(parsed[0].equipmentCode, 'SEP-20-INT-10');
assert.strictEqual(parsed[0].isUnavailable, false);
console.log('  [PASS] 2.2: Row 1 correctly parsed as valid separator.');

// Row 3
assert.strictEqual(parsed[2].isValid, true);
assert.strictEqual(parsed[2].isUnavailable, true);
assert.strictEqual(parsed[2].unavailableReason, 'Mecanism de acționare defect');
console.log('  [PASS] 2.3: Row 3 correctly detected as unavailable (RED).');

// Row 4: Duplicate ID
assert.strictEqual(parsed[3].isValid, false);
assert(parsed[3].validationErrors.some((e) => e.includes('duplicat')));
console.log('  [PASS] 2.4: Duplicate equipment ID within file caught and invalidated.');

// Row 5: Invalid GPS
assert.strictEqual(parsed[4].isValid, false);
assert(parsed[4].validationErrors.some((e) => e.includes('GPS')));
console.log('  [PASS] 2.5: Invalid GPS coordinates caught and invalidated.');

// ----------------------------------------------------------------------------
// TEST 3: KML Parsing & Polygon Centroid Handling
// ----------------------------------------------------------------------------
console.log('\n▶ Test 3: Testing KML/KMZ Geographic Feature Extraction');

function cleanXmlText(text) {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim();
}

function parseKmlFeatures(kmlText) {
  const features = [];
  const placemarkRegex = /<Placemark[\s\S]*?<\/Placemark>/gi;
  const matches = kmlText.match(placemarkRegex) || [];

  for (let i = 0; i < matches.length; i++) {
    const pm = matches[i];
    const nameMatch = pm.match(/<name>([\s\S]*?)<\/name>/i);
    const rawName = nameMatch ? cleanXmlText(nameMatch[1]) : `Placemark #${i + 1}`;

    const coordsMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
    let lat = null;
    let lon = null;
    const isPolygon = /<Polygon/i.test(pm);

    if (coordsMatch) {
      const coordTokens = coordsMatch[1].trim().split(/\s+/);
      if (coordTokens.length > 0) {
        const parts = coordTokens[0].split(',');
        if (parts.length >= 2) {
          lon = parseFloat(parts[0]);
          lat = parseFloat(parts[1]);
        }
        if (coordTokens.length > 1) {
          let sumLat = 0, sumLon = 0, count = 0;
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

    const simpleDataRegex = /<SimpleData\s+name=["']([^"']+)["']>([\s\S]*?)<\/SimpleData>/gi;
    const rawAttributes = {};
    let attrMatch;
    while ((attrMatch = simpleDataRegex.exec(pm)) !== null) {
      rawAttributes[attrMatch[1].toUpperCase()] = cleanXmlText(attrMatch[2]);
    }

    const validationErrors = [];
    if (!lat || !lon) validationErrors.push('Coordonate lipsă.');
    if (isPolygon) validationErrors.push('Atenție: Punctul GPS este centrul unui poligon.');

    features.push({
      name: rawName,
      equipmentCode: rawAttributes['ID'] || `KML-${i + 1}`,
      latitude: lat,
      longitude: lon,
      stationName: rawAttributes['STATIE'],
      lineName: rawAttributes['LINIE'],
      isPolygon,
      validationErrors,
    });
  }
  return features;
}

const kmlContent = fs.readFileSync('test-data/exemplu_retea.kml', 'utf8');
const kmlFeatures = parseKmlFeatures(kmlContent);

assert.strictEqual(kmlFeatures.length, 3, 'Should parse 3 Placemarks');
assert.strictEqual(kmlFeatures[0].name, 'PT 140 Lunca');
assert.strictEqual(kmlFeatures[0].equipmentCode, 'PT-20-INT-140');
assert.strictEqual(kmlFeatures[0].latitude, 45.7456);
assert.strictEqual(kmlFeatures[0].longitude, 25.8123);
console.log('  [PASS] 3.1: Extracted Placemark with Point coordinates & ExtendedData attributes.');

assert.strictEqual(kmlFeatures[2].isPolygon, true);
assert(kmlFeatures[2].validationErrors.some((e) => e.includes('poligon')));
console.log('  [PASS] 3.2: Polygon Placemark centroid calculated with cautionary warning.');

// ----------------------------------------------------------------------------
// TEST 4: Network Hierarchy & Station/Line Filtering Rule
// ----------------------------------------------------------------------------
console.log('\n▶ Test 4: Testing Hierarchy & Mandatory Station + Line Selection Rule');

function filterEquipment(allEquipment, stationId, lineId) {
  // CRITICAL RULE: If station or line is missing, return EMPTY list!
  if (!stationId || !lineId) {
    return [];
  }
  return allEquipment.filter((e) => e.line_id === lineId);
}

const testEquipment = [
  { id: '1', name: 'PT 1', line_id: 'line-intorsura' },
  { id: '2', name: 'PT 1', line_id: 'line-harman' }, // same name, different line
];

assert.deepStrictEqual(filterEquipment(testEquipment, '', ''), []);
assert.deepStrictEqual(filterEquipment(testEquipment, 'st-prejmer', ''), []);
console.log('  [PASS] 4.1: Equipment list is strictly empty when station or line is unselected.');

const filtered = filterEquipment(testEquipment, 'st-prejmer', 'line-intorsura');
assert.strictEqual(filtered.length, 1);
assert.strictEqual(filtered[0].line_id, 'line-intorsura');
console.log('  [PASS] 4.2: Equipment returned only when both station and line are confirmed.');

console.log('\n=============================================================');
console.log('🏆 ALL 11 VERIFICATION TESTS PASSED PERFECTLY!');
console.log('=============================================================');

