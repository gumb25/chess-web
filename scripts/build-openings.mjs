// Converts Lichess ECO TSV files into two JSON lookup tables:
//   positions: EPD (FEN without move counters) → { eco, name }
//   moves:     EPD → [{ uci, san, continuationName }]  (top 5, by # named lines)
// Run once with: node scripts/build-openings.mjs

import { Chess } from 'chess.js';
import { readFileSync, writeFileSync } from 'fs';

const FILES = ['a', 'b', 'c', 'd', 'e'];
const TSV_DIR = '/tmp/openings';

// epd → { eco, name }
const positions = {};
// epd → Map< uci, { san, lines, continuationName } >
const moveMaps = new Map();
// Array of position-EPD paths (one per successfully parsed line), used to
// carry opening names forward onto intermediate/unnamed positions.
const linePaths = [];

function epd(fen) {
  return fen.split(' ').slice(0, 4).join(' ');
}

function recordMove(fromEpd, uci, san, targetName) {
  if (!moveMaps.has(fromEpd)) moveMaps.set(fromEpd, new Map());
  const m = moveMaps.get(fromEpd);
  if (!m.has(uci)) m.set(uci, { san, lines: 0, continuationName: null });
  m.get(uci).lines++;
  if (targetName && !m.get(uci).continuationName) {
    m.get(uci).continuationName = targetName;
  }
}

let parsed = 0, skipped = 0;

for (const file of FILES) {
  const tsv = readFileSync(`${TSV_DIR}/${file}.tsv`, 'utf8');
  const lines = tsv.split('\n').slice(1); // skip header row

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const [eco, name, pgn] = parts;
    if (!eco || !name || !pgn) continue;

    // Strip move numbers, parse SAN tokens
    const sans = pgn.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean);

    const chess = new Chess();
    let ok = true;
    const pathEpds = [];

    for (const san of sans) {
      const fromEpd = epd(chess.fen());
      let result;
      try {
        result = chess.move(san);
      } catch {
        ok = false; break;
      }
      if (!result) { ok = false; break; }

      const uci = result.from + result.to + (result.promotion ?? '');
      recordMove(fromEpd, uci, result.san, null);
      pathEpds.push(epd(chess.fen()));
    }

    if (ok) {
      // Only label the TERMINAL position of each line — the position this
      // opening explicitly defines. This prevents longer lines that pass
      // through a position from overriding the shorter line that owns it.
      // e.g. A06 Tennison Gambit (1.e4 d5 2.Nf3) must not label the
      // 1.e4 position; that belongs to B00 King's Pawn Game.
      const finalEpd = epd(chess.fen());
      if (!positions[finalEpd]) {
        positions[finalEpd] = { eco, name };
      }
      // Record the full path of positions for the carry-forward pass below.
      linePaths.push(pathEpds);
      parsed++;
    } else {
      skipped++;
    }
  }
}

// Carry-forward pass: give every position along a line the name of the
// deepest named position at or before it, so intermediate positions that
// aren't a terminal of any line still get a sensible label (e.g. after
// 1.e4 d5 2.exd5 Qxd5 3.Nc3 Qa5 4.d4 → inherits "Scandinavian Defense").
// inheritedName is a superset of `positions`: it contains every terminal
// (exact) opening name plus intermediate positions filled with their nearest
// named ancestor. This becomes the shipped position→name table so the
// top-of-page label is never "Out of theory" while still inside an opening.
const inheritedName = {};
for (const path of linePaths) {
  let running = null;
  for (const epdHere of path) {
    if (positions[epdHere]) running = positions[epdHere];
    if (running && !inheritedName[epdHere]) inheritedName[epdHere] = running;
  }
}

// Second pass: fill continuationName from the inherited-name table
const moves = {};
for (const [fromEpd, map] of moveMaps) {
  const arr = [];
  for (const [uci, data] of map) {
    // Derive the target EPD by playing the move from fromEpd
    const chess = new Chess(`${fromEpd} 0 1`);
    let result;
    try {
      result = chess.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] });
    } catch { continue; }
    if (!result) continue;

    const toEpd = epd(chess.fen());
    const contName = inheritedName[toEpd]?.name ?? null;
    arr.push({ uci, san: data.san, lines: data.lines, continuationName: contName });
  }
  if (arr.length === 0) continue;
  moves[fromEpd] = arr
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 5)
    .map(({ uci, san, continuationName }) => ({ uci, san, continuationName }));
}

// Ship the inherited (superset) name table so intermediate positions still
// display an opening name at the top of the page.
const out = { positions: inheritedName, moves };
const json = JSON.stringify(out);
writeFileSync('public/openings.json', json);

console.log(`Done. Parsed: ${parsed}, skipped: ${skipped}`);
console.log(`Terminal positions: ${Object.keys(positions).length}`);
console.log(`Named positions (incl. inherited): ${Object.keys(inheritedName).length}`);
console.log(`Positions with moves: ${Object.keys(moves).length}`);
console.log(`File size: ${(json.length / 1024).toFixed(0)} KB`);
