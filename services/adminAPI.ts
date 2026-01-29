import api from './authAPI';
import { machineAPI } from './machineAPI';

export interface Machine {
    id: number;
    code: string;
    name: string;
    status: string;
    imageUrl?: string;
    primaryExercise: string;
}

export interface CreateMachineRequest {
    code: string;
    name: string;
    imageUrl?: string;
}

export interface UpdateMachineRequest {
    code?: string;
    name?: string;
    imageUrl?: string;
}

export const adminAPI = {
    getAllMachines: async (): Promise<Machine[]> => {
        const headers = await machineAPI.authHeaders();
        const response = await api.get<Machine[]>('/machines', { headers });
        return response.data;
    },

    getMachineById: async (id: number): Promise<Machine> => {
        const headers = await machineAPI.authHeaders();
        const response = await api.get<Machine>(`/machines/${id}`, { headers });
        return response.data;
    },

    createMachine: async (data: CreateMachineRequest): Promise<Machine> => {
        const headers = await machineAPI.authHeaders();
        const response = await api.post<Machine>('/machines', data, { headers });
        return response.data;
    },

    updateMachine: async (id: number, data: UpdateMachineRequest): Promise<Machine> => {
        const headers = await machineAPI.authHeaders();
        const response = await api.put<Machine>(`/machines/${id}`, data, { headers });
        return response.data;
    },

    deleteMachine: async (id: number): Promise<void> => {
        const headers = await machineAPI.authHeaders();
        await api.delete(`/machines/${id}`, { headers });
    },

    updateMachineStatus: async (id: number, status: string): Promise<void> => {
        const headers = await machineAPI.authHeaders();
        await api.patch(`/equipment/${id}/status`, { status }, { headers });
    },

    exportSessions: async (): Promise<string> => {
        const headers = await machineAPI.authHeaders();
        const response = await api.get('/admin/export/sessions', {
            headers,
            responseType: 'text' // We expect CSV text
        });
        return response.data;
    },
};
