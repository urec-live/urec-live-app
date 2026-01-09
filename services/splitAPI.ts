import api from "./authAPI";

export const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export type SplitMode = "manual" | "auto";
export type WeeklySplit = Record<DayKey, string[]>;

export interface WeeklySplitResponse {
  mode: SplitMode | string;
  manualSplit: WeeklySplit;
  updatedAt?: string;
}

export const splitAPI = {
  getSplit: async (): Promise<WeeklySplitResponse> => {
    const response = await api.get("/split");
    return response.data;
  },

  saveSplit: async (payload: {
    mode: SplitMode;
    manualSplit: WeeklySplit;
  }): Promise<WeeklySplitResponse> => {
    const response = await api.put("/split", payload);
    return response.data;
  },
};
