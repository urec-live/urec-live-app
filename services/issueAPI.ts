import api from './authAPI';

export type IssueSeverity = 'OUT_OF_ORDER' | 'DAMAGED';
export type IssueStatus = 'REPORTED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED';

export interface IssueReport {
  id: number;
  equipmentId: number;
  equipmentName: string;
  equipmentCode: string | null;
  severity: IssueSeverity;
  description: string;
  status: IssueStatus;
  reporterUsername: string;
  reportedAt: string;        // ISO instant string
  updatedAt: string;         // ISO instant string
  resolvedAt: string | null; // ISO instant string
  withdrawnAt: string | null; // ISO instant string; set when the member took it back (status is then RESOLVED)
}

export interface CreateIssueReportRequest {
  equipmentId: number;
  severity: IssueSeverity;
  description: string;
}

/** Open-issue summary for one machine. Never includes reporter details. */
export interface MachineIssueStatus {
  equipmentId: number;
  openReportCount: number;
  worstSeverity: IssueSeverity | null;
  status: IssueStatus | null; // furthest-along open status
}

export const issueAPI = {
  reportIssue: async (report: CreateIssueReportRequest): Promise<IssueReport> => {
    const response = await api.post('/equipment-issues', report);
    return response.data;
  },

  getMyReports: async (): Promise<IssueReport[]> => {
    const response = await api.get('/equipment-issues/me');
    return response.data;
  },

  /** Takes back the member's own open report, filed by mistake. Resolves to the closed report. */
  withdrawReport: async (reportId: number): Promise<IssueReport> => {
    const response = await api.post(`/equipment-issues/${reportId}/withdraw`);
    return response.data;
  },

  getMachineIssueStatus: async (equipmentId: number): Promise<MachineIssueStatus> => {
    const response = await api.get(`/equipment-issues/equipment/${equipmentId}`);
    return response.data;
  },
};
