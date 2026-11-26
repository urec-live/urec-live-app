import api from "./authAPI";

export interface WorkoutFriend {
  username: string;
  status: "INCOMING" | "OUTGOING" | "FRIEND";
  days: number | null;
  target: number | null;
  canNudgeAt: string | null;
}

interface Overview {
  sharing: boolean;
  friends: WorkoutFriend[];
}

const root = "/workout-friends";
const member = (username: string) => `${root}/${encodeURIComponent(username)}`;
const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export const workoutFriendsAPI = {
  overview: async () => (await api.get<Overview>(root)).data,
  request: (username: string) => api.put(`${member(username)}/request`),
  accept: (username: string) => api.put(`${member(username)}/accept`),
  remove: (username: string) => api.delete(member(username)),
  nudge: (username: string, message: string) => api.post(`${member(username)}/nudge`, { message }),
  share: (sharing: boolean, target: number) =>
    api.put(`${root}/settings`, { sharing, target, timeZone: timeZone() }),
  syncTarget: (target: number) => api.patch(`${root}/settings/target`, { target, timeZone: timeZone() }),
  registerDevice: (token: string) => api.put(`${root}/devices`, { token }),
  removeDevice: (token: string) => api.delete(`${root}/devices`, { data: { token } }),
};
