import type { ReactNode } from "react";
import type { MapPoint } from "@/services/machineAPI";
export interface ViewportProps {
  width: number;
  height: number;
  focus?: (MapPoint & { key: string }) | null;
  children: ReactNode;
}
export interface PinProps {
  x: number;
  y: number;
  label: string;
  color: string;
  selected: boolean;
  matched?: boolean;
  dimmed: boolean;
  onPress: () => void;
}
