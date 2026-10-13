import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import type { HelpRequest, HelpRequestStatus } from "@/services/helpRequestAPI";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

/** How often the app checks an open request for staff responses. */
export const HELP_POLL_MS = 5000;

export const HELP_STATUS_DISPLAY: Record<
  HelpRequestStatus,
  { label: string; message: string; color: string; icon: IconName }
> = {
  REQUEST_RECEIVED: {
    label: "Request received",
    message: "Staff have been notified. Stay near the machine and someone will come over.",
    color: "#1976D2",
    icon: "bell-ring-outline",
  },
  ON_THE_WAY: {
    label: "On the way",
    message: "A staff member is on the way to you.",
    color: "#2E7D32",
    icon: "walk",
  },
  TOO_BUSY: {
    label: "Too busy",
    message: "Staff are busy right now. Someone will come when they can. Meanwhile, the video below might help.",
    color: "#E65100",
    icon: "timer-sand",
  },
  RESOLVED: {
    label: "Helped",
    message: "Glad you got the help you needed!",
    color: "#2E7D32",
    icon: "check-circle-outline",
  },
  CANCELLED: {
    label: "Cancelled",
    message: "You cancelled this request.",
    color: "#607D8B",
    icon: "close-circle-outline",
  },
  EXPIRED: {
    label: "Expired",
    message: "This request expired after 30 minutes without an update. Call staff again if you still need help.",
    color: "#607D8B",
    icon: "clock-alert-outline",
  },
};

/** What to tell the member once a request is closed. */
export function closedMessage(request: Pick<HelpRequest, "status" | "closedBy">): string {
  if (request.status === "RESOLVED" && request.closedBy === "STAFF") {
    return "Staff marked this as done. Glad we could help!";
  }
  return HELP_STATUS_DISPLAY[request.status].message;
}
