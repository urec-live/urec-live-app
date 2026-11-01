import api from "./authAPI";
export interface Gym {
  id: number;
  name: string;
}
export const gymAPI = {
  list: async (): Promise<Gym[]> => (await api.get("/gyms")).data,
  current: async (): Promise<Gym | null> =>
    (await api.get("/users/me/gym")).data || null,
  connect: async (gymId: number): Promise<Gym> =>
    (await api.put("/users/me/gym", { gymId })).data,
  disconnect: async (): Promise<void> => {
    await api.delete("/users/me/gym");
  },
};
