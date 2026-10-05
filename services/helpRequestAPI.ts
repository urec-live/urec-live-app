import api from './authAPI';

export type HelpRequestStatus =
  | 'REQUEST_RECEIVED'
  | 'ON_THE_WAY'
  | 'TOO_BUSY'
  | 'RESOLVED'
  | 'CANCELLED'
  | 'EXPIRED';

export type HelpRequestClosedBy = 'STAFF' | 'MEMBER' | 'SYSTEM';

/**
 * "Watch how it's done" media for one exercise. Until real demos exist the URLs point at placeholder
 * media, flagged so the app can say a real demo is coming soon. A URL is null only when the server
 * has that placeholder switched off.
 */
export interface HelpDemoLink {
  exerciseName: string;
  gifUrl: string | null;
  gifPlaceholder: boolean;
  videoUrl: string | null;
  videoPlaceholder: boolean;
}

export interface HelpRequest {
  id: number;
  status: HelpRequestStatus;
  equipmentId: number;
  equipmentCode: string | null;
  equipmentName: string;
  exerciseName: string | null;
  createdAt: string; // ISO timestamps
  updatedAt: string;
  firstResponseAt: string | null;
  closedAt: string | null;
  closedBy: HelpRequestClosedBy | null;
  demos: HelpDemoLink[];
}

/** Identify the machine by id (machine page) or QR code (workout tracker). */
export interface CallStaffRequest {
  equipmentId?: number;
  equipmentCode?: string;
  exerciseName?: string;
}

export const OPEN_HELP_STATUSES: readonly HelpRequestStatus[] = ['REQUEST_RECEIVED', 'ON_THE_WAY', 'TOO_BUSY'];

export const isOpenHelpRequest = (request: Pick<HelpRequest, 'status'>) =>
  OPEN_HELP_STATUSES.includes(request.status);

export const helpRequestAPI = {
  callStaff: async (request: CallStaffRequest): Promise<HelpRequest> => {
    const response = await api.post('/help-requests', request);
    return response.data;
  },

  /** The member's open request, or null (the server answers 204 when there is none). */
  getActive: async (): Promise<HelpRequest | null> => {
    const response = await api.get('/help-requests/me/active');
    return response.status === 204 || !response.data ? null : response.data;
  },

  get: async (id: number): Promise<HelpRequest> => {
    const response = await api.get(`/help-requests/${id}`);
    return response.data;
  },

  confirmReceived: async (id: number): Promise<HelpRequest> => {
    const response = await api.post(`/help-requests/${id}/received`);
    return response.data;
  },

  cancel: async (id: number): Promise<HelpRequest> => {
    const response = await api.post(`/help-requests/${id}/cancel`);
    return response.data;
  },
};
