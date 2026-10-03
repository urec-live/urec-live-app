import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import type { IssueSeverity, IssueStatus } from "@/services/issueAPI";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

// Mirrors CreateIssueReportRequest validation on the backend
export const MIN_DESCRIPTION_LENGTH = 10;
export const MAX_DESCRIPTION_LENGTH = 1000;

export const SEVERITY_ORDER: IssueSeverity[] = ["OUT_OF_ORDER", "DAMAGED"];

export const SEVERITY_DISPLAY: Record<
  IssueSeverity,
  {
    label: string;
    short: string;
    hint: string;
    bannerHeadline: string;
    icon: IconName;
    color: string;
    tint: string;
  }
> = {
  OUT_OF_ORDER: {
    label: "Not working",
    short: "Not working",
    hint: "Won't move, the weights don't engage, or it can't be used at all",
    bannerHeadline: "Reported not working",
    icon: "close-octagon-outline",
    color: "#D32F2F",
    tint: "#FDECEA",
  },
  DAMAGED: {
    label: "Damaged / hard to use",
    short: "Damaged",
    hint: "Still usable, but something is broken or uncomfortable: torn padding, a damaged seat, loose parts",
    bannerHeadline: "Reported damaged",
    icon: "wrench-outline",
    color: "#E65100",
    tint: "#FFF3E0",
  },
};

/** Report lifecycle in order, as shown on the reporter's progress strip. */
export const STATUS_STEPS: IssueStatus[] = ["REPORTED", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"];

/** How each status reads to the member who filed the report. */
export const STATUS_DISPLAY: Record<IssueStatus, { label: string; short: string; color: string }> = {
  REPORTED: { label: "Submitted", short: "Submitted", color: "#607D8B" },
  ACKNOWLEDGED: { label: "Seen by staff", short: "Seen", color: "#1976D2" },
  IN_PROGRESS: { label: "Repair on the way", short: "Repairing", color: "#E65100" },
  RESOLVED: { label: "Fixed", short: "Fixed", color: "#4CAF50" },
};

/** Status line on the machine page banner, which every member can see. */
export const BANNER_STATUS_TEXT: Record<IssueStatus, string> = {
  REPORTED: "Awaiting staff review",
  ACKNOWLEDGED: "Staff are aware",
  IN_PROGRESS: "Repair in progress",
  RESOLVED: "Fixed",
};
