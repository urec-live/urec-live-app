import { render, screen } from "@testing-library/react-native";
import React from "react";

import { markerColor } from "@/components/EquipmentMarker";
import MapLegend from "@/components/MapLegend";
import { isOutOfOrder, OUT_OF_ORDER_COLOR } from "@/constants/machineStatus";

describe("isOutOfOrder", () => {
  it.each(["Out of Order", "out of order", "  OUT OF ORDER "])("recognises %p", (status) => {
    expect(isOutOfOrder(status)).toBe(true);
  });

  it.each(["Available", "In Use", "Reserved", "", null, undefined])("is false for %p", (status) => {
    expect(isOutOfOrder(status)).toBe(false);
  });
});

describe("floor map", () => {
  it("colours out-of-order machines grey, distinct from unknown statuses", () => {
    expect(markerColor("Out of Order")).toBe(OUT_OF_ORDER_COLOR);
    expect(markerColor("Available")).toBe("#4CAF50");
    expect(markerColor("In Use")).toBe("#FF5722");
    expect(markerColor("Something else")).toBe("#9E9E9E");
  });

  it("lists Out of Order in the legend", () => {
    render(<MapLegend />);

    expect(screen.getByText("Out of Order")).toBeTruthy();
  });
});
