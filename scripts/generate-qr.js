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
  // CHEST EQUIPMENT
  { code: "BP001", name: "Flat Bench Press 1", exercise: "Bench Press", muscle: "Chest" },
  { code: "BP002", name: "Flat Bench Press 2", exercise: "Bench Press", muscle: "Chest" },
  { code: "BP003", name: "Flat Bench Press 3", exercise: "Bench Press", muscle: "Chest" },
  { code: "IP001", name: "Incline Bench 1", exercise: "Incline Press", muscle: "Chest" },
  { code: "IP002", name: "Incline Bench 2", exercise: "Incline Press", muscle: "Chest" },
  { code: "DP001", name: "Decline Bench", exercise: "Decline Press", muscle: "Chest" },
  { code: "CF001", name: "Chest Fly Machine 1", exercise: "Chest Fly", muscle: "Chest" },
  { code: "CF002", name: "Chest Fly Machine 2", exercise: "Chest Fly", muscle: "Chest" },
  { code: "CC001", name: "Cable Crossover Station 1", exercise: "Cable Crossover", muscle: "Chest" },
  { code: "CC002", name: "Cable Crossover Station 2", exercise: "Cable Crossover", muscle: "Chest" },
  { code: "DB001", name: "Dip Station 1", exercise: "Chest Dips", muscle: "Chest" },
  { code: "DB002", name: "Dip Station 2", exercise: "Chest Dips", muscle: "Chest" },
  
  // BACK EQUIPMENT
  { code: "PU001", name: "Pull Up Bar 1", exercise: "Pull Up", muscle: "Back" },
  { code: "PU002", name: "Pull Up Bar 2", exercise: "Pull Up", muscle: "Back" },
  { code: "LP001", name: "Lat Pulldown 1", exercise: "Lat Pulldown", muscle: "Back" },
  { code: "LP002", name: "Lat Pulldown 2", exercise: "Lat Pulldown", muscle: "Back" },
  { code: "LP003", name: "Lat Pulldown 3", exercise: "Lat Pulldown", muscle: "Back" },
  { code: "SR001", name: "Seated Row 1", exercise: "Seated Cable Row", muscle: "Back" },
  { code: "SR002", name: "Seated Row 2", exercise: "Seated Cable Row", muscle: "Back" },
  { code: "TR001", name: "T-Bar Row", exercise: "T-Bar Row", muscle: "Back" },
  { code: "DL001", name: "Deadlift Platform 1", exercise: "Deadlift", muscle: "Back" },
  { code: "DL002", name: "Deadlift Platform 2", exercise: "Deadlift", muscle: "Back" },
  { code: "HE001", name: "Hyperextension Bench 1", exercise: "Hyperextension", muscle: "Back" },
  { code: "HE002", name: "Hyperextension Bench 2", exercise: "Hyperextension", muscle: "Back" },
  
  // SHOULDER EQUIPMENT
  { code: "SP001", name: "Shoulder Press 1", exercise: "Shoulder Press", muscle: "Shoulders" },
  { code: "SP002", name: "Shoulder Press 2", exercise: "Shoulder Press", muscle: "Shoulders" },
  { code: "SP003", name: "Shoulder Press 3", exercise: "Shoulder Press", muscle: "Shoulders" },
  { code: "LR001", name: "Lateral Raise Machine", exercise: "Lateral Raise", muscle: "Shoulders" },
  { code: "RD001", name: "Rear Delt Fly Machine 1", exercise: "Rear Delt Fly", muscle: "Shoulders" },
  { code: "RD002", name: "Rear Delt Fly Machine 2", exercise: "Rear Delt Fly", muscle: "Shoulders" },
  { code: "DR001", name: "Dumbbell Rack 1", exercise: "Lateral Raise", muscle: "Shoulders" },
  { code: "DR002", name: "Dumbbell Rack 2", exercise: "Lateral Raise", muscle: "Shoulders" },
  
  // ARM EQUIPMENT
  { code: "BC001", name: "Bicep Curl Machine 1", exercise: "Bicep Curl", muscle: "Biceps" },
  { code: "BC002", name: "Bicep Curl Machine 2", exercise: "Bicep Curl", muscle: "Biceps" },
  { code: "PC001", name: "Preacher Curl Bench 1", exercise: "Preacher Curl", muscle: "Biceps" },
  { code: "PC002", name: "Preacher Curl Bench 2", exercise: "Preacher Curl", muscle: "Biceps" },
  { code: "CS001", name: "Cable Station 1", exercise: "Cable Curl", muscle: "Arms" },
  { code: "CS002", name: "Cable Station 2", exercise: "Cable Curl", muscle: "Arms" },
  { code: "CS003", name: "Cable Station 3", exercise: "Cable Curl", muscle: "Arms" },
  { code: "TD001", name: "Tricep Dip/Press Machine", exercise: "Overhead Tricep Extension", muscle: "Triceps" },
  
  // LEG EQUIPMENT
  { code: "SQ001", name: "Squat Rack 1", exercise: "Squat", muscle: "Quads" },
  { code: "SQ002", name: "Squat Rack 2", exercise: "Squat", muscle: "Quads" },
  { code: "SQ003", name: "Squat Rack 3", exercise: "Squat", muscle: "Quads" },
  { code: "LPM001", name: "Leg Press Machine 1", exercise: "Leg Press", muscle: "Quads" },
  { code: "LPM002", name: "Leg Press Machine 2", exercise: "Leg Press", muscle: "Quads" },
  { code: "LPM003", name: "Leg Press Machine 3", exercise: "Leg Press", muscle: "Quads" },
  { code: "LE001", name: "Leg Extension Machine 1", exercise: "Leg Extension", muscle: "Quads" },
  { code: "LE002", name: "Leg Extension Machine 2", exercise: "Leg Extension", muscle: "Quads" },
  { code: "LE003", name: "Leg Extension Machine 3", exercise: "Leg Extension", muscle: "Quads" },
  { code: "LC001", name: "Leg Curl Machine 1", exercise: "Leg Curl", muscle: "Hamstrings" },
  { code: "LC002", name: "Leg Curl Machine 2", exercise: "Leg Curl", muscle: "Hamstrings" },
  { code: "SLC001", name: "Seated Leg Curl 1", exercise: "Seated Leg Curl", muscle: "Hamstrings" },
  { code: "SLC002", name: "Seated Leg Curl 2", exercise: "Seated Leg Curl", muscle: "Hamstrings" },
  { code: "HS001", name: "Hack Squat Machine 1", exercise: "Hack Squat", muscle: "Quads" },
  { code: "HS002", name: "Hack Squat Machine 2", exercise: "Hack Squat", muscle: "Quads" },
  { code: "HT001", name: "Hip Thrust Bench 1", exercise: "Hip Thrust", muscle: "Glutes" },
  { code: "HT002", name: "Hip Thrust Bench 2", exercise: "Hip Thrust", muscle: "Glutes" },
  { code: "GK001", name: "Glute Kickback Machine", exercise: "Glute Kickback Machine", muscle: "Glutes" },
  { code: "CR001", name: "Standing Calf Raise 1", exercise: "Calf Raise", muscle: "Calves" },
  { code: "CR002", name: "Standing Calf Raise 2", exercise: "Calf Raise", muscle: "Calves" },
  { code: "SCR001", name: "Seated Calf Raise 1", exercise: "Seated Calf Raise", muscle: "Calves" },
  { code: "SCR002", name: "Seated Calf Raise 2", exercise: "Seated Calf Raise", muscle: "Calves" },
  
  // CORE/ABS EQUIPMENT
  { code: "AM001", name: "Ab Mat 1", exercise: "Crunch", muscle: "Abs" },
  { code: "AM002", name: "Ab Mat 2", exercise: "Crunch", muscle: "Abs" },
  { code: "AM003", name: "Ab Mat 3", exercise: "Crunch", muscle: "Abs" },
  { code: "ACR001", name: "Ab Crunch Machine", exercise: "Cable Crunch", muscle: "Abs" },
  { code: "AW001", name: "Ab Wheel 1", exercise: "Ab Wheel", muscle: "Abs" },
  { code: "AW002", name: "Ab Wheel 2", exercise: "Ab Wheel", muscle: "Abs" },
  { code: "CCH001", name: "Captain's Chair 1", exercise: "Leg Raise", muscle: "Abs" },
  { code: "CCH002", name: "Captain's Chair 2", exercise: "Leg Raise", muscle: "Abs" },
  
  // CARDIO EQUIPMENT
  { code: "TM001", name: "Treadmill 1", exercise: "Running", muscle: "Cardio" },
  { code: "TM002", name: "Treadmill 2", exercise: "Running", muscle: "Cardio" },
  { code: "TM003", name: "Treadmill 3", exercise: "Running", muscle: "Cardio" },
  { code: "TM004", name: "Treadmill 4", exercise: "Running", muscle: "Cardio" },
  { code: "TM005", name: "Treadmill 5", exercise: "Running", muscle: "Cardio" },
  { code: "TM006", name: "Treadmill 6", exercise: "Running", muscle: "Cardio" },
  { code: "CB001", name: "Stationary Bike 1", exercise: "Cycling", muscle: "Cardio" },
  { code: "CB002", name: "Stationary Bike 2", exercise: "Cycling", muscle: "Cardio" },
  { code: "CB003", name: "Stationary Bike 3", exercise: "Cycling", muscle: "Cardio" },
  { code: "CB004", name: "Stationary Bike 4", exercise: "Cycling", muscle: "Cardio" },
  { code: "RM001", name: "Rowing Machine 1", exercise: "Rowing", muscle: "Cardio" },
  { code: "RM002", name: "Rowing Machine 2", exercise: "Rowing", muscle: "Cardio" },
  { code: "RM003", name: "Rowing Machine 3", exercise: "Rowing", muscle: "Cardio" },
  { code: "STR001", name: "Stair Climber 1", exercise: "Stair Climber", muscle: "Cardio" },
  { code: "STR002", name: "Stair Climber 2", exercise: "Stair Climber", muscle: "Cardio" },
  { code: "EL001", name: "Elliptical 1", exercise: "Elliptical", muscle: "Cardio" },
  { code: "EL002", name: "Elliptical 2", exercise: "Elliptical", muscle: "Cardio" },
  { code: "EL003", name: "Elliptical 3", exercise: "Elliptical", muscle: "Cardio" },
  { code: "EL004", name: "Elliptical 4", exercise: "Elliptical", muscle: "Cardio" },
  
  // FUNCTIONAL/MISC EQUIPMENT
  { code: "BB001", name: "Barbell Rack 1", exercise: "Bent Over Row", muscle: "Back" },
  { code: "BB002", name: "Barbell Rack 2", exercise: "Bent Over Row", muscle: "Back" },
  { code: "KBR001", name: "Kettlebell Rack", exercise: "Russian Twist", muscle: "Abs" },
  { code: "FS001", name: "Floor Space 1", exercise: "Push-ups", muscle: "Chest" },
  { code: "FS002", name: "Floor Space 2", exercise: "Push-ups", muscle: "Chest" },
  { code: "FS003", name: "Floor Space 3", exercise: "Push-ups", muscle: "Chest" },
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

