import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getAuthHeader } from './authAPI';

export interface MachineDto {
  id: number;
  code: string;
  name: string;
  status: string;
  exercise: string;
  heldByMe?: boolean;
}

export interface Machine {
  id: number;
  name: string;
  status: string;
  exercise: string;
}

export interface ActiveEquipmentSession {
  id: number;
  status: string;
  startedAt: string;
  endedAt?: string | null;
  endReason?: string | null;
  equipment: {
    id: number;
    code: string;
    name: string;
  };
}

export interface EquipmentSessionResponse {
  id: number;
  status: string;
  startedAt: string;
  endedAt?: string | null;
  endReason?: string | null;
}

export interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
  gifUrl: string;
}

export const machineAPI = {
  // Build auth headers for protected endpoints
  authHeaders: async (): Promise<Record<string, string>> => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    const fallback = getAuthHeader() ?? api.defaults.headers.common.Authorization;
    if (typeof fallback === 'string' && fallback.trim().length > 0) {
      return { Authorization: fallback };
    }
    return {};
  },
  // Get all machines
  listAll: async (): Promise<MachineDto[]> => {
    const response = await api.get('/machines');
    return response.data;
  },

  getAllMachines: async (): Promise<Machine[]> => {
    const response = await api.get('/machines');
    return response.data;
  },

  // Get machines by exercise
  byExercise: async (exercise: string): Promise<MachineDto[]> => {
    const response = await api.get(`/machines/exercise/${exercise}`);
    return response.data;
  },

  getByExercise: async (exercise: string): Promise<MachineDto[]> => {
    const response = await api.get(`/machines/exercise/${exercise}`);
    return response.data;
  },

  getMachinesByExercise: async (exercise: string): Promise<Machine[]> => {
    const response = await api.get(`/machines/exercise/${exercise}`);
    return response.data;
  },

  // Get a specific machine by ID
  getMachineById: async (id: number): Promise<Machine> => {
    const response = await api.get(`/machines/${id}`);
    return response.data;
  },

  // Get current user's engagement (machine they're using)
  getMyEngagement: async (): Promise<MachineDto | null> => {
    try {
      const response = await api.get('/machines/my-engagement');
      return response.data;
    } catch (error) {
      // If endpoint doesn't exist, return null
      return null;
    }
  },

  // Get current user's active equipment session (if any)
  getMyActiveSession: async (): Promise<ActiveEquipmentSession | null> => {
    const headers = await machineAPI.authHeaders();
    const response = await api.get('/equipment-sessions/my-active', {
      headers,
      validateStatus: (status) => (status >= 200 && status < 300) || status === 204,
    });
    if (response.status === 204) {
      return null;
    }
    return response.data;
  },

  // Check in to a machine
  checkIn: async (code: string): Promise<EquipmentSessionResponse> => {
    const headers = await machineAPI.authHeaders();
    const response = await api.post(`/equipment-sessions/start/code/${code}`, undefined, { headers });
    return response.data;
  },

  // Check out from a machine
  checkOut: async (code: string): Promise<EquipmentSessionResponse> => {
    const headers = await machineAPI.authHeaders();
    const response = await api.post(`/equipment-sessions/end/code/${code}`, undefined, { headers });
    return response.data;
  },

  // Heartbeat an active session by equipment id
  heartbeat: async (equipmentId: number): Promise<EquipmentSessionResponse> => {
    const headers = await machineAPI.authHeaders();
    const response = await api.post(`/equipment-sessions/heartbeat/${equipmentId}`, undefined, { headers });
    return response.data;
  },

  // Update machine status
  updateMachineStatus: async (id: number, status: string): Promise<Machine> => {
    const response = await api.put(`/machines/${id}/status`, { status });
    return response.data;
  },

  // Update status (alternative method name)
  updateStatus: async (id: number, status: string): Promise<MachineDto> => {
    const response = await api.put(`/machines/${id}/status`, { status });
    return response.data;
  },

  // Get all muscle groups
  getMuscleGroups: async (): Promise<string[]> => {
    const response = await api.get('/machines/muscle-groups');
    return response.data;
  },

  // Get exercises by muscle group
  getExercisesByMuscleGroup: async (muscleGroup: string): Promise<Exercise[]> => {
    const response = await api.get(`/machines/exercises/muscle/${muscleGroup}`);
    return response.data;
  },

  // Get exercises for a specific equipment by ID
  getExercisesByEquipmentId: async (id: number): Promise<Exercise[]> => {
    const response = await api.get(`/machines/${id}/exercises`);
    return response.data;
  },

  // Get exercises for a specific equipment by code
  getExercisesByEquipmentCode: async (code: string): Promise<Exercise[]> => {
    const response = await api.get(`/machines/code/${code}/exercises`);
    return response.data;
  },
};


