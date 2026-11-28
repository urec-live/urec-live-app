import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import IndoorMap from "@/components/equipment/IndoorMap";

// The real package is native ESM that Jest can't load; plain Views keep the props we check.
jest.mock("@rnmapbox/maps", () => {
  const { createElement } = require("react");
  const { View } = require("react-native");
  const el = (name: string) => (p: { id?: string }) =>
    createElement(View, { ...p, testID: p.id ? `${name}:${p.id}` : name });
  return {
    __esModule: true,
    default: { setAccessToken: jest.fn(), setTelemetryEnabled: jest.fn() },
    MapView: el("map"),
    Camera: el("camera"),
    StyleImport: el("import"),
    ShapeSource: el("source"),
    FillLayer: el("layer"),
    FillExtrusionLayer: el("layer"),
    LineLayer: el("layer"),
    SymbolLayer: el("layer"),
    CircleLayer: el("layer"),
  };
});

const camera = () => screen.getByTestId("camera").props;
const map = () => screen.getByTestId("map").props;

it("starts in 3D facing north, and the toggles switch to 2D and allow rotation", () => {
  render(
    <IndoorMap
      machines={[{ id: 1, code: "M1", name: "Bench", status: "Available", exercise: "" }]}
      floorId="l1"
      insets={{ top: 100, bottom: 80 }}
      onSelectEquipment={jest.fn()}
    />,
  );
  expect(camera()).toMatchObject({ pitch: 50, heading: 0 });
  expect(map()).toMatchObject({ pitchEnabled: true, rotateEnabled: false });
  expect(screen.getByTestId("layer:indoor-walls")).toBeTruthy();
  expect(screen.getByTestId("layer:equipment-boxes")).toBeTruthy();
  expect(screen.getByTestId("layer:equipment-boxes-dim")).toBeTruthy();
  expect(screen.queryByTestId("layer:equipment-dots")).toBeNull();

  fireEvent.press(screen.getByRole("switch", { name: "3D view", checked: true }));
  expect(camera().pitch).toBe(0);
  expect(map().pitchEnabled).toBe(false);
  expect(screen.queryByTestId("layer:indoor-walls")).toBeNull();
  expect(screen.queryByTestId("layer:equipment-boxes")).toBeNull();
  expect(screen.getByTestId("layer:equipment-dots")).toBeTruthy();

  fireEvent.press(screen.getByRole("switch", { name: "Rotate map", checked: false }));
  expect(camera().heading).toBeUndefined(); // keeps the member's rotation on later fits
  expect(map().rotateEnabled).toBe(true);
  screen.getByRole("switch", { name: "Rotate map", checked: true });

  fireEvent.press(screen.getByRole("switch", { name: "Rotate map" }));
  expect(camera().heading).toBe(0); // back to north
  expect(map().rotateEnabled).toBe(false);
});
