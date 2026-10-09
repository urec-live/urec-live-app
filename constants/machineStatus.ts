import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

// Equipment status that staff set when a machine can't be used. Members can't check in to it.
export const OUT_OF_ORDER_STATUS = "Out of Order";
export const OUT_OF_ORDER_COLOR = "#757575";
export const OUT_OF_ORDER_ICON: IconName = "wrench";

export function isOutOfOrder(status: string | null | undefined): boolean {
  return status?.trim().toLowerCase() === OUT_OF_ORDER_STATUS.toLowerCase();
}
