#!/usr/bin/env node
/**
 * Generate Montreal geometry mapping file for Alerte Déneigement.
 *
 * Downloads the "Géobase double - côtés de rue" GeoJSON from Montreal Open Data,
 * extracts COTE_RUE_ID → polyline geometry, and outputs a compact JSON file
 * that can be served as GEOBASE_GEOMETRY_URL.
 *
 * Source: https://donnees.montreal.ca/ville-de-montreal/geobase-double
 *
 * Usage:
 *   node scripts/generate-montreal-geometry.mjs
 *   node scripts/generate-montreal-geometry.mjs --output ./data/mtl-geometry.json
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

const GEOBASE_JSON_URL =
  'https://donnees.montreal.ca/dataset/88493b16-220f-4709-b57b-1ea57c5ba405/resource/16f7fa0a-9ce6-4b29-a7fc-00842c593927/download/gbdouble.json';

const args = process.argv.slice(2);
const outputIdx = args.indexOf('--output');
const outputPath = outputIdx !== -1 && args[outputIdx + 1]
  ? resolve(args[outputIdx + 1])
  : resolve('data', 'mtl-geometry.json');

async function main() {
  console.log('Downloading Montreal Géobase double GeoJSON (~75 MB)...');
  console.log(`Source: ${GEOBASE_JSON_URL}`);

  const res = await fetch(GEOBASE_JSON_URL, {
    headers: { 'User-Agent': 'AlerteDeneigement/1.0' },
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  console.log('Parsing GeoJSON...');
  const geojson = await res.json();

  // Handle both FeatureCollection and raw array
  const features = geojson.features ?? geojson;

  if (!Array.isArray(features)) {
    throw new Error(`Unexpected format: expected features array, got ${typeof features}`);
  }

  console.log(`Processing ${features.length} features...`);

  const geometryMap = {};
  let withGeometry = 0;
  let withoutGeometry = 0;
  let skipped = 0;

  for (const feature of features) {
    const props = feature.properties ?? feature;
    const coteRueId = String(
      props.COTE_RUE_ID ?? props.cote_rue_id ?? ''
    );

    if (!coteRueId) {
      skipped++;
      continue;
    }

    const geom = feature.geometry;
    if (!geom || !geom.coordinates) {
      withoutGeometry++;
      continue;
    }

    let coords;
    if (geom.type === 'LineString') {
      coords = geom.coordinates;
    } else if (geom.type === 'MultiLineString') {
      // Flatten all line segments into one polyline
      coords = geom.coordinates.flat();
    } else if (geom.type === 'Point') {
      // Single point — not useful for polyline, skip
      withoutGeometry++;
      continue;
    } else {
      withoutGeometry++;
      continue;
    }

    if (!coords || coords.length < 2) {
      withoutGeometry++;
      continue;
    }

    // Store as [[lng, lat], ...] — GeoJSON native order
    // Round to 6 decimal places to save space (~11cm precision)
    geometryMap[coteRueId] = coords.map(([lng, lat]) => [
      Math.round(lng * 1e6) / 1e6,
      Math.round(lat * 1e6) / 1e6,
    ]);
    withGeometry++;
  }

  console.log(`Results:`);
  console.log(`  With geometry: ${withGeometry}`);
  console.log(`  Without geometry: ${withoutGeometry}`);
  console.log(`  Skipped (no ID): ${skipped}`);
  console.log(`  Total entries: ${Object.keys(geometryMap).length}`);

  // Write output
  const json = JSON.stringify(geometryMap);
  const sizeMB = (json.length / 1024 / 1024).toFixed(1);

  writeFileSync(outputPath, json);
  console.log(`\nWritten to: ${outputPath} (${sizeMB} MB)`);
  console.log(`\nTo use this file:`);
  console.log(`  1. Host it somewhere accessible (e.g., Azure Blob, GitHub raw, static file server)`);
  console.log(`  2. Set GEOBASE_GEOMETRY_URL=<url_to_file> in your API environment`);
  console.log(`  3. The API will fetch and import geometry on next startup/geobase sync`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
