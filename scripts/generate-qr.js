#!/usr/bin/env node
/**
 * Simple QR generator for machine codes.
 * Usage: node scripts/generate-qr.js "Bench Press 1" "Incline Bench 2"
 *
 * Each QR encodes the canonical URL payload:
 *   urec://machine?machineId=<id>&exercise=<name>&muscle=<group>
 *
 * For now, exercise defaults to machineId and muscle defaults to "General".
 * Adjust as needed or extend to read from your data source.
 */

/* eslint-env node */
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const machines = process.argv.slice(2);
if (machines.length === 0) {
  console.error('Provide machine IDs, e.g. node scripts/generate-qr.js "Bench Press 1" "Cable Row 2"');
  process.exit(1);
}

const outDir = path.join(process.cwd(), "qr-codes");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const generate = async (machineId) => {
  const payload = new URL("urec://machine");
  payload.searchParams.set("machineId", machineId);
  payload.searchParams.set("exercise", machineId); // adjust if you have a mapping
  payload.searchParams.set("muscle", "General");

  const fileName = `${machineId.replace(/[^a-z0-9]+/gi, "_")}.png`;
  const outPath = path.join(outDir, fileName);

  await QRCode.toFile(outPath, payload.toString(), {
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  console.log(`Generated ${outPath} -> ${payload.toString()}`);
};

(async () => {
  for (const id of machines) {
    await generate(id);
  }
})();
