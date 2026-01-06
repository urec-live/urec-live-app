import api from './authAPI';

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

export const machineAPI = {
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

  // Check in to a machine
  checkIn: async (code: string): Promise<MachineDto> => {
    const response = await api.put(`/machines/code/${code}/status`, { status: 'In Use' });
    return response.data;
  },

  // Check out from a machine
  checkOut: async (code: string): Promise<MachineDto> => {
    const response = await api.put(`/machines/code/${code}/status`, { status: 'Available' });
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
};


