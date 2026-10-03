import { render, screen } from "@testing-library/react-native";
import React from "react";

import MachineIssueBanner from "@/components/MachineIssueBanner";
import type { MachineIssueStatus } from "@/services/issueAPI";

jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));

const issue = (overrides: Partial<MachineIssueStatus>): MachineIssueStatus => ({
  equipmentId: 12,
  openReportCount: 1,
  worstSeverity: "OUT_OF_ORDER",
  status: "REPORTED",
  ...overrides,
});

describe("MachineIssueBanner", () => {
  it("renders nothing when the machine has no open reports", () => {
    render(<MachineIssueBanner issue={issue({ openReportCount: 0, worstSeverity: null, status: null })} />);
    expect(screen.toJSON()).toBeNull();
  });

  it("warns that the machine was reported not working, with the repair status", () => {
    render(<MachineIssueBanner issue={issue({ worstSeverity: "OUT_OF_ORDER", status: "IN_PROGRESS" })} />);

    expect(screen.getByText("Reported not working")).toBeTruthy();
    expect(screen.getByText("Repair in progress")).toBeTruthy();
  });

  it.each([
    ["REPORTED", "Awaiting staff review"],
    ["ACKNOWLEDGED", "Staff are aware"],
    ["IN_PROGRESS", "Repair in progress"],
  ] as const)("describes %s as \"%s\"", (status, text) => {
    render(<MachineIssueBanner issue={issue({ worstSeverity: "DAMAGED", status })} />);

    expect(screen.getByText("Reported damaged")).toBeTruthy();
    expect(screen.getByText(text)).toBeTruthy();
  });

  it("counts multiple open reports", () => {
    render(<MachineIssueBanner issue={issue({ openReportCount: 3, worstSeverity: "DAMAGED", status: "REPORTED" })} />);

    expect(screen.getByText("3 reports · Awaiting staff review")).toBeTruthy();
  });

  it("is announced to screen readers as an alert", () => {
    render(<MachineIssueBanner issue={issue({})} />);

    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
