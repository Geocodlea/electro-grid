import assert from 'node:assert';
import fs from 'node:fs';
import { computeEquipmentStatus } from '../lib/status-rules.ts';
import { parseNetworkCsv } from '../lib/csv-parser.ts';
import { parseKmlFeatures } from '../lib/kml-parser.ts';

console.log('🧪 Starting ElectroGrid MT Automated Verification Test Suite...\n');

// ----------------------------------------------------------------------------
// TEST 1: Status priority rules (PDF Section 4)
// ----------------------------------------------------------------------------
console.log('Test 1: Status priority rules (PDF Section 4)');

// 1.1 Unavailable always takes priority (RED)
const redEq = computeEquipmentStatus({
  is_unavailable: true,
  unavailable_reason: 'Mecanism blocat',
  pending_observations_count: 5,
  official_observations: 'Acces bun',
});
assert.strictEqual(redEq.color, 'red', 'RED status must take priority over pending observations');
assert.strictEqual(redEq.label, 'Indisponibil');
console.log('  ✓ Priority #1: ROȘU (Indisponibil) takes absolute priority.');

// 1.2 Pending observations -> YELLOW
const yellowEqPending = computeEquipmentStatus({
  is_unavailable: false,
  pending_observations_count: 1,
  official_observations: '',
});
assert.strictEqual(yellowEqPending.color, 'yellow', 'Pending observation must produce YELLOW status');
console.log('  ✓ Priority #2: GALBEN when pending observations exist.');

// 1.3 Active official observations -> YELLOW
const yellowEqNotes = computeEquipmentStatus({
  is_unavailable: false,
  pending_observations_count: 0,
  official_observations: 'Acces dificil prin pădure',
});
assert.strictEqual(yellowEqNotes.color, 'yellow', 'Active official note must produce YELLOW status');
console.log('  ✓ Priority #2: GALBEN when active official observations exist.');

// 1.4 No observations -> GREEN
const greenEq = computeEquipmentStatus({
  is_unavailable: false,
  pending_observations_count: 0,
  official_observations: null,
});
assert.strictEqual(greenEq.color, 'green', 'No observations must produce GREEN status');
assert.strictEqual(greenEq.label, 'Fără observații active');
console.log('  ✓ Priority #3: VERDE when no active observations in registry.');

// ----------------------------------------------------------------------------
// TEST 2: CSV Parser & Validation
// ----------------------------------------------------------------------------
console.log('\nTest 2: CSV Import Parser & Validation');
const csvRaw = fs.readFileSync('test-data/retea_exemplu.csv', 'utf8');
const parsedCsv = parseNetworkCsv(csvRaw);

assert.strictEqual(parsedCsv.length, 5, 'Must parse exactly 5 rows');
console.log(`  ✓ Parsed ${parsedCsv.length} rows from CSV.`);

// Row 1: Valid Separator
assert.strictEqual(parsedCsv[0].isValid, true);
assert.strictEqual(parsedCsv[0].equipmentCode, 'SEP-20-INT-10');
assert.strictEqual(parsedCsv[0].isUnavailable, false);
console.log('  ✓ Row 1 parsed as valid available separator.');

// Row 3: Unavailable PCT
assert.strictEqual(parsedCsv[2].isUnavailable, true);
assert.strictEqual(parsedCsv[2].unavailableReason, 'Mecanism de acționare defect');
console.log('  ✓ Row 3 parsed with RED/unavailable state correctly.');

// Row 4: Duplicate ID detected
assert.strictEqual(parsedCsv[3].isValid, false, 'Duplicate ID within file must be flagged invalid');
assert(parsedCsv[3].validationErrors.some((e) => e.includes('duplicat')), 'Must report duplicate error');
console.log('  ✓ Duplicate ID within file detected and flagged invalid.');

// Row 5: Invalid coordinates
assert.strictEqual(parsedCsv[4].isValid, false, 'Invalid coordinates must be flagged invalid');
assert(parsedCsv[4].validationErrors.some((e) => e.includes('GPS')), 'Must report GPS coordinate error');
console.log('  ✓ Invalid GPS coordinates detected and flagged invalid.');

// ----------------------------------------------------------------------------
// TEST 3: KML Parser & Geometry Handling
// ----------------------------------------------------------------------------
console.log('\nTest 3: KML Import Parser & Geometry Handling');
const kmlRaw = fs.readFileSync('test-data/exemplu_retea.kml', 'utf8');
const parsedKml = parseKmlFeatures(kmlRaw);

assert.strictEqual(parsedKml.length, 3, 'Must parse 3 placemarks');
console.log(`  ✓ Parsed ${parsedKml.length} placemarks from KML.`);

// Placemark 1: Point with ExtendedData
assert.strictEqual(parsedKml[0].name, 'PT 140 Lunca');
assert.strictEqual(parsedKml[0].equipmentCode, 'PT-20-INT-140');
assert.strictEqual(parsedKml[0].stationName, 'Prejmer');
assert.strictEqual(parsedKml[0].lineName, 'Întorsura');
assert.strictEqual(parsedKml[0].latitude, 45.7456);
assert.strictEqual(parsedKml[0].longitude, 25.8123);
assert.strictEqual(parsedKml[0].isValid, true);
console.log('  ✓ Point placemark coordinates and ExtendedData parsed accurately.');

// Placemark 3: Polygon with centroid and caution flag
assert(parsedKml[2].validationErrors.some((e) => e.includes('poligon')), 'Polygon centroid must include caution notice');
console.log('  ✓ Polygon Placemark centroid calculated with warning flag preserved.');

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The core logic conforms strictly to specifications.');
