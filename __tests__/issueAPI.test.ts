import { issueAPI } from "@/services/issueAPI";

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock("@/services/authAPI", () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

describe("issueAPI", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it("files a report", async () => {
    const created = { id: 5, status: "REPORTED" };
    mockPost.mockResolvedValue({ data: created });

    const result = await issueAPI.reportIssue({
      equipmentId: 12,
      severity: "OUT_OF_ORDER",
      description: "Cable snapped, stack will not lift",
    });

    expect(mockPost).toHaveBeenCalledWith("/equipment-issues", {
      equipmentId: 12,
      severity: "OUT_OF_ORDER",
      description: "Cable snapped, stack will not lift",
    });
    expect(result).toBe(created);
  });

  it("loads the member's own reports", async () => {
    mockGet.mockResolvedValue({ data: [{ id: 1 }] });

    await expect(issueAPI.getMyReports()).resolves.toEqual([{ id: 1 }]);
    expect(mockGet).toHaveBeenCalledWith("/equipment-issues/me");
  });

  it("loads a machine's open-issue summary", async () => {
    const summary = { equipmentId: 12, openReportCount: 0, worstSeverity: null, status: null };
    mockGet.mockResolvedValue({ data: summary });

    await expect(issueAPI.getMachineIssueStatus(12)).resolves.toEqual(summary);
    expect(mockGet).toHaveBeenCalledWith("/equipment-issues/equipment/12");
  });

  it("passes request failures through to the caller", async () => {
    const failure = new Error("409");
    mockPost.mockRejectedValue(failure);

    await expect(
      issueAPI.reportIssue({ equipmentId: 12, severity: "DAMAGED", description: "Seat padding is torn" })
    ).rejects.toBe(failure);
  });
});
