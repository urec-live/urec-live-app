#!/usr/bin/env node
/**
 * Simple QR generator for machine codes.
 * Usage: node scripts/generate-qr.js
 *
 * Generates QR codes for all machines with their unique codes
 */

/* eslint-env node */
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

// Machine codes matching the backend DataInitializer
const machines = [
  // CHEST EXERCISES
  { code: "BP001", name: "Bench Press Machine 1", exercise: "Bench Press", muscle: "Chest" },
  { code: "BP002", name: "Bench Press Machine 2", exercise: "Bench Press", muscle: "Chest" },
  { code: "IDP001", name: "Incline Bench 1", exercise: "Incline Dumbbell Press", muscle: "Chest" },
  { code: "IDP002", name: "Incline Bench 2", exercise: "Incline Dumbbell Press", muscle: "Chest" },
  { code: "CF001", name: "Cable Station 1", exercise: "Cable Fly", muscle: "Chest" },
  { code: "CF002", name: "Cable Station 2", exercise: "Cable Fly", muscle: "Chest" },
  { code: "PU001", name: "Floor Space 1", exercise: "Push-ups", muscle: "Chest" },
  
  // BACK EXERCISES
  { code: "BR001", name: "Barbell Row Machine 1", exercise: "Barbell Row", muscle: "Back" },
  { code: "BR002", name: "Seated Cable Row 2", exercise: "Barbell Row", muscle: "Back" },
  
  // SHOULDER EXERCISES
  { code: "OP001", name: "Shoulder Press 1", exercise: "Overhead Press", muscle: "Shoulders" },
  { code: "OP002", name: "Shoulder Press 2", exercise: "Overhead Press", muscle: "Shoulders" },
  { code: "LR001", name: "Dumbbell Rack 1", exercise: "Lateral Raises", muscle: "Shoulders" },
  
  // LEG EXERCISES
  { code: "LP001", name: "Leg Press 1", exercise: "Leg Press", muscle: "Legs" },
  { code: "LP002", name: "Leg Press 2", exercise: "Leg Press", muscle: "Legs" },
  
  // CARDIO
  { code: "TM001", name: "Treadmill 1", exercise: "Cardio", muscle: "Cardio" },
  { code: "EL001", name: "Elliptical 2", exercise: "Cardio", muscle: "Cardio" },
];

const outDir = path.join(process.cwd(), "qr-codes");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const generate = async (machine) => {
  const payload = new URL("urec://machine");
  payload.searchParams.set("machineId", machine.code);
  payload.searchParams.set("exercise", machine.exercise);
  payload.searchParams.set("muscle", machine.muscle);

  const fileName = `${machine.code}.png`;
  const outPath = path.join(outDir, fileName);

  await QRCode.toFile(outPath, payload.toString(), {
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  console.log(`✓ ${machine.code} - ${machine.name}`);
  console.log(`  ${payload.toString()}`);
  console.log(`  Saved to: ${outPath}\n`);
};

(async () => {
  console.log("🔄 Generating QR codes for all machines...\n");
  for (const machine of machines) {
    await generate(machine);
  }
  console.log(`✅ Generated ${machines.length} QR codes in ${outDir}`);
})();

