import { helpRequestAPI, isOpenHelpRequest } from "@/services/helpRequestAPI";

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock("@/services/authAPI", () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

describe("helpRequestAPI", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it("calls staff to a machine by id, with the exercise", async () => {
    const created = { id: 7, status: "REQUEST_RECEIVED" };
    mockPost.mockResolvedValue({ status: 201, data: created });

    const result = await helpRequestAPI.callStaff({ equipmentId: 12, exerciseName: "Leg Press" });

    expect(mockPost).toHaveBeenCalledWith("/help-requests", { equipmentId: 12, exerciseName: "Leg Press" });
    expect(result).toBe(created);
  });

  it("calls staff to a machine by QR code", async () => {
    mockPost.mockResolvedValue({ status: 201, data: { id: 8 } });

    await helpRequestAPI.callStaff({ equipmentCode: "LP01" });

    expect(mockPost).toHaveBeenCalledWith("/help-requests", { equipmentCode: "LP01" });
  });

  it("returns the open request", async () => {
    const open = { id: 7, status: "ON_THE_WAY" };
    mockGet.mockResolvedValue({ status: 200, data: open });

    await expect(helpRequestAPI.getActive()).resolves.toBe(open);
    expect(mockGet).toHaveBeenCalledWith("/help-requests/me/active");
  });

  it("returns null when the server says there is no open request (204)", async () => {
    mockGet.mockResolvedValue({ status: 204, data: "" });

    await expect(helpRequestAPI.getActive()).resolves.toBeNull();
  });

  it("loads one request by id", async () => {
    mockGet.mockResolvedValue({ status: 200, data: { id: 7 } });

    await helpRequestAPI.get(7);

    expect(mockGet).toHaveBeenCalledWith("/help-requests/7");
  });

  it("confirms received help and cancels with the right endpoints", async () => {
    mockPost.mockResolvedValue({ status: 200, data: { id: 7, status: "RESOLVED" } });

    await helpRequestAPI.confirmReceived(7);
    await helpRequestAPI.cancel(7);

    expect(mockPost).toHaveBeenNthCalledWith(1, "/help-requests/7/received");
    expect(mockPost).toHaveBeenNthCalledWith(2, "/help-requests/7/cancel");
  });

  it("passes errors to the caller", async () => {
    const error = new Error("boom");
    mockPost.mockRejectedValue(error);

    await expect(helpRequestAPI.callStaff({ equipmentId: 1 })).rejects.toBe(error);
  });

  it.each([
    ["REQUEST_RECEIVED", true],
    ["ON_THE_WAY", true],
    ["TOO_BUSY", true],
    ["RESOLVED", false],
    ["CANCELLED", false],
    ["EXPIRED", false],
  ] as const)("treats %s as open: %s", (status, open) => {
    expect(isOpenHelpRequest({ status })).toBe(open);
  });
});
