import type { ReactNode } from "react";
import type { MapPoint } from "@/services/machineAPI";
import type { ViewInsets } from "@/utils/equipmentMap";
export interface ViewportProps {
  width: number;
  height: number;
  focus?: (MapPoint & { key: string }) | null;
  /** Panels drawn over the map: fitting, focusing and the zoom buttons keep clear of them. */
  insets?: ViewInsets;
  /** Square corners, for a map that fills the screen. */
  fullScreen?: boolean;
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
