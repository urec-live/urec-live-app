import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import Equipment from "@/app/(tabs)/equipment";
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/contexts/GymContext", () => ({
  useGym: () => ({ gym: null, loading: false }),
}));
jest.mock("@/components/FloorMap", () => () => null);
jest.mock("@/services/websocketService", () => ({ default: {} }));
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
it("gates disconnected users with gym selection", () => {
  render(<Equipment />);
  expect(screen.getByText("Connect to your gym")).toBeTruthy();
  fireEvent.press(screen.getByText("Choose gym"));
  expect(mockPush).toHaveBeenCalledWith("/profile");
});
