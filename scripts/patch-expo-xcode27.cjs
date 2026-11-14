// Backport Device Hub support to the app's pinned SDK 54 CLI.
// https://github.com/expo/expo/issues/46882
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

if (process.platform !== "darwin") {
  console.log("Skipping macOS-only Expo Device Hub compatibility patch.");
  process.exit(0);
}

const expoRequire = createRequire(require.resolve("expo/package.json"));
const cliRoot = path.dirname(expoRequire.resolve("@expo/cli/package.json"));
const version = JSON.parse(fs.readFileSync(path.join(cliRoot, "package.json"), "utf8")).version;
if (version !== "54.0.20") {
  throw new Error(`Review the Device Hub patch for @expo/cli ${version}; expected 54.0.20. Remove this patch when upgrading to a CLI with native Device Hub support.`);
}

const changes = [
  ["start/doctor/apple/SimulatorAppPrerequisite.js", [
    [
      `return (await (0, _osascript().execAsync)('id of app "Simulator"')).trim();`,
      `for (const name of ['Simulator', 'DeviceHub']) {
            try { return (await (0, _osascript().execAsync)('id of app "' + name + '"')).trim(); } catch {}
        }`,
    ],
    [
      `result !== 'com.apple.CoreSimulator.SimulatorTrampoline')`,
      `result !== 'com.apple.CoreSimulator.SimulatorTrampoline' && result !== 'com.apple.dt.Devices')`,
    ],
  ]],
  ["start/platforms/ios/ensureSimulatorAppRunning.js", [
    [
      `count processes whose name is "Simulator"`,
      `count processes whose name is "Simulator" or name is "DeviceHub"`,
    ],
    [
      `await (0, _spawnasync().default)('open', args);`,
      `try {
        await (0, _spawnasync().default)('open', args);
    } catch {
        await (0, _spawnasync().default)('open', [device.udid
            ? 'devices://device/open?id=' + encodeURIComponent(device.udid)
            : 'devices://']);
    }`,
    ],
  ]],
  ["start/platforms/ios/AppleDeviceManager.js", [
    [
      'await _osascript().execAsync(`tell application "Simulator" to activate`);',
      `try {
            await _osascript().execAsync('tell application "Simulator" to activate');
        } catch {
            try {
                await _osascript().execAsync('tell application "DeviceHub" to activate');
            } catch {
                // Window focus is optional after the app has launched via simctl.
                debug('Could not focus Simulator or Device Hub.');
            }
        }`,
    ],
  ]],
];

// Validate all sites before writing any file; reapplying is idempotent.
const pending = changes.map(([relative, replacements]) => {
  const file = path.join(cliRoot, "build/src", relative);
  let source = fs.readFileSync(file, "utf8");
  for (const [before, after] of replacements) {
    if (source.includes(after)) continue;
    if (source.split(before).length !== 2) {
      throw new Error(`Expo patch no longer matches ${relative}; review before changing this CLI.`);
    }
    source = source.replace(before, () => after);
  }
  return [file, source];
});
for (const [file, source] of pending) fs.writeFileSync(file, source);
console.log(`Applied Device Hub compatibility patch to @expo/cli ${version}.`);
