import { ImageSourcePropType } from "react-native";

export type Status = "Available" | "In Use" | "Reserved";

export interface Machine {
  id: string;
  status: Status;
}

export interface ExerciseInfo {
  name: string;
  image: ImageSourcePropType;
  youtubeUrl: string;
  machines: Machine[];
}

// Centralized data for all exercises
export const exercisesData: Record<string, ExerciseInfo[]> = {
  Chest: [
    {
      name: "Bench Press",
      image: { uri: "https://via.placeholder.com/80x80?text=Bench+Press" },
      youtubeUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg",
      machines: [
        { id: "Bench Press 1", status: "Available" },
        { id: "Bench Press 2", status: "In Use" },
        { id: "Bench Press 3", status: "Available" },
      ],
    },
    {
      name: "Incline Dumbbell Press",
      image: { uri: "https://via.placeholder.com/80x80?text=Incline+Dumbbell+Press" },
      youtubeUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8",
      machines: [
        { id: "Incline Bench 1", status: "Available" },
        { id: "Incline Bench 2", status: "Reserved" },
      ],
    },
    {
      name: "Cable Fly",
      image: { uri: "https://via.placeholder.com/80x80?text=Cable+Fly" },
      youtubeUrl: "https://www.youtube.com/watch?v=x1r0O7E2-pw",
      machines: [
        { id: "Cable Station 1", status: "In Use" },
        { id: "Cable Station 2", status: "In Use" },
      ],
    },
    {
      name: "Push-ups",
      image: { uri: "https://via.placeholder.com/80x80?text=Push-ups" },
      youtubeUrl: "https://www.youtube.com/watch?v=IODxDxX7oi4",
      machines: [{ id: "Floor Space", status: "Available" }],
    },
  ],
  Shoulders: [
    {
      name: "Overhead Press",
      image: { uri: "https://via.placeholder.com/80x80?text=Overhead+Press" },
      youtubeUrl: "https://www.youtube.com/watch?v=2yjwXTZQDDI",
      machines: [
        { id: "Shoulder Press 1", status: "Available" },
        { id: "Shoulder Press 2", status: "In Use" },
      ],
    },
    {
        name: "Lateral Raises",
        image: { uri: "https://via.placeholder.com/80x80?text=Lateral+Raises" },
        youtubeUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
        machines: [
          { id: "Dumbbell Rack 1", status: "Available" },
        ],
      },
  ],
  // Add other muscle groups here...
};

// Function to get all machines for a given exercise name
export const getMachinesForExercise = (exerciseName: string): Machine[] => {
    for (const group in exercisesData) {
      const exercise = exercisesData[group].find(ex => ex.name === exerciseName);
      if (exercise) {
        return exercise.machines;
      }
    }
    // Auto-generate mock machines if none exist for simplicity
    return [
        { id: `${exerciseName} Machine 1`, status: "Available" },
        { id: `${exerciseName} Machine 2`, status: "In Use" },
        { id: `${exerciseName} Machine 3`, status: "Reserved" },
      ];
  };
