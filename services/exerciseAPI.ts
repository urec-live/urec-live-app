import api from "./authAPI";
export type LoggingMode =
  | "WEIGHT_REPS"
  | "REPS"
  | "DURATION"
  | "DISTANCE_DURATION";
export interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
  equipmentType: string;
  trainingType: string;
  loggingMode: LoggingMode;
  instructions: string | null;
  gifUrl: string | null;
  custom: boolean;
}
export type ExerciseInput = Pick<
  Exercise,
  | "name"
  | "muscleGroup"
  | "equipmentType"
  | "trainingType"
  | "loggingMode"
  | "instructions"
>;
export interface ExercisePage {
  content: Exercise[];
  totalPages: number;
  totalElements: number;
}
export const exerciseAPI = {
  list: async (
    params: Record<string, string | number | boolean>,
  ): Promise<ExercisePage> => (await api.get("/exercises", { params })).data,
  get: async (id: number): Promise<Exercise> =>
    (await api.get(`/exercises/${id}`)).data,
  create: async (data: ExerciseInput): Promise<Exercise> =>
    (await api.post("/exercises", data)).data,
  update: async (id: number, data: ExerciseInput): Promise<Exercise> =>
    (await api.put(`/exercises/${id}`, data)).data,
  archive: async (id: number): Promise<void> => {
    await api.delete(`/exercises/${id}`);
  },
};
