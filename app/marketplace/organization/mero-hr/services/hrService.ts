import api from '@/services/api';
import {
    HrEmployee,
    HrAttendance,
    HrLeaveRequest,
    HrPayroll,
    HrDepartment,
    HrDesignation,
    HrDocument,
    HrShift,
    HrPublicHoliday,
    HrLeaveBalance,
    HrJobOpening,
    HrCandidate,
    HrPerformanceGoal,
    HrPerformanceReview,
    HrTrainingProgram,
    HrExitRecord,
} from '../types';

export const hrService = {
    // ─── Employees ───────────────────────────────────────────────────────────
    getEmployees: async () => (await api.get<HrEmployee[]>('/hr/employees')).data,
    getEmployee: async (id: string) => (await api.get<HrEmployee>(`/hr/employees/${id}`)).data,
    createEmployee: async (data: Partial<HrEmployee>) => (await api.post<HrEmployee>('/hr/employees', data)).data,
    updateEmployee: async (id: string, data: Partial<HrEmployee>) => (await api.patch<HrEmployee>(`/hr/employees/${id}`, data)).data,
    deleteEmployee: async (id: string) => { await api.delete(`/hr/employees/${id}`); },

    // ─── Attendance ───────────────────────────────────────────────────────────
    getAttendanceLogs: async (params?: { employeeId?: string; startDate?: string; endDate?: string }) =>
        (await api.get<HrAttendance[]>('/hr/attendance', { params })).data,
    checkIn: async (data: { location?: string; remarks?: string }) =>
        (await api.post<HrAttendance>('/hr/attendance/check-in', data)).data,
    checkOut: async (data: { remarks?: string }) =>
        (await api.post<HrAttendance>('/hr/attendance/check-out', data)).data,

    // ─── Leave ────────────────────────────────────────────────────────────────
    getLeaveRequests: async (employeeId?: string) =>
        (await api.get<HrLeaveRequest[]>('/hr/leave', { params: { employeeId } })).data,
    applyLeave: async (data: Partial<HrLeaveRequest> & { employeeId: string }) =>
        (await api.post<HrLeaveRequest>('/hr/leave/request', data)).data,
    approveLeave: async (id: string, remarks?: string) =>
        (await api.patch<HrLeaveRequest>(`/hr/leave/${id}/approve`, { remarks })).data,
    rejectLeave: async (id: string, remarks: string) =>
        (await api.patch<HrLeaveRequest>(`/hr/leave/${id}/reject`, { remarks })).data,
    getLeaveBalances: async (employeeId: string) =>
        (await api.get<HrLeaveBalance[]>(`/hr/leave/${employeeId}/balances`)).data,

    // ─── Payroll ──────────────────────────────────────────────────────────────
    getPayrollHistory: async (month?: string) =>
        (await api.get<HrPayroll[]>('/hr/payroll', { params: { month } })).data,
    generatePayroll: async (month: string) =>
        (await api.post<HrPayroll[]>(`/hr/payroll/generate/${month}`)).data,
    postToAccounting: async (payrollId: string) =>
        (await api.post(`/hr/payroll/${payrollId}/post-to-accounting`)).data,

    // ─── Departments ──────────────────────────────────────────────────────────
    getDepartments: async () => (await api.get<HrDepartment[]>('/hr/departments')).data,
    createDepartment: async (data: Partial<HrDepartment>) => (await api.post<HrDepartment>('/hr/departments', data)).data,
    updateDepartment: async (id: string, data: Partial<HrDepartment>) => (await api.patch<HrDepartment>(`/hr/departments/${id}`, data)).data,
    deleteDepartment: async (id: string) => { await api.delete(`/hr/departments/${id}`); },

    // ─── Designations ─────────────────────────────────────────────────────────
    getDesignations: async () => (await api.get<HrDesignation[]>('/hr/designations')).data,
    createDesignation: async (data: Partial<HrDesignation>) => (await api.post<HrDesignation>('/hr/designations', data)).data,
    updateDesignation: async (id: string, data: Partial<HrDesignation>) => (await api.patch<HrDesignation>(`/hr/designations/${id}`, data)).data,
    deleteDesignation: async (id: string) => { await api.delete(`/hr/designations/${id}`); },

    // ─── Documents ────────────────────────────────────────────────────────────
    getDocuments: async (employeeId?: string) => (await api.get<HrDocument[]>('/hr/documents', { params: { employeeId } })).data,
    createDocument: async (data: Partial<HrDocument>) => (await api.post<HrDocument>('/hr/documents', data)).data,
    deleteDocument: async (id: string) => { await api.delete(`/hr/documents/${id}`); },

    // ─── Shifts (Phase 2) ─────────────────────────────────────────────────────
    getShifts: async () => (await api.get<HrShift[]>('/hr/shifts')).data,
    createShift: async (data: Partial<HrShift>) => (await api.post<HrShift>('/hr/shifts', data)).data,
    updateShift: async (id: string, data: Partial<HrShift>) => (await api.patch<HrShift>(`/hr/shifts/${id}`, data)).data,
    deleteShift: async (id: string) => { await api.delete(`/hr/shifts/${id}`); },

    // ─── Public Holidays (Phase 2) ────────────────────────────────────────────
    getHolidays: async (year?: number) => (await api.get<HrPublicHoliday[]>('/hr/holidays', { params: { year } })).data,
    createHoliday: async (data: Partial<HrPublicHoliday>) => (await api.post<HrPublicHoliday>('/hr/holidays', data)).data,
    seedNepalHolidays: async () => (await api.post<HrPublicHoliday[]>('/hr/holidays/seed-2081')).data,
    deleteHoliday: async (id: string) => { await api.delete(`/hr/holidays/${id}`); },

    // ─── Dashboard ────────────────────────────────────────────────────────────
    getDashboardStats: async () => (await api.get<{
        totalEmployees: number;
        presentToday: number;
        onLeave: number;
        pendingPayroll: number;
        pendingLeaveRequests: number;
        recentAttendance: HrAttendance[];
    }>('/hr/dashboard/stats')).data,

    // ─── Recruitment (Phase 3) ────────────────────────────────────────────────
    getJobs: async () => (await api.get<HrJobOpening[]>('/hr/recruitment/jobs')).data,
    createJob: async (data: Partial<HrJobOpening>) =>
        (await api.post<HrJobOpening>('/hr/recruitment/jobs', data)).data,
    updateJob: async (id: string, data: Partial<HrJobOpening>) =>
        (await api.patch<HrJobOpening>(`/hr/recruitment/jobs/${id}`, data)).data,
    deleteJob: async (id: string) => { await api.delete(`/hr/recruitment/jobs/${id}`); },
    getCandidates: async (jobId?: string) =>
        (await api.get<HrCandidate[]>('/hr/recruitment/candidates', { params: jobId ? { jobId } : undefined })).data,
    createCandidate: async (data: Partial<HrCandidate>) =>
        (await api.post<HrCandidate>('/hr/recruitment/candidates', data)).data,
    updateCandidate: async (id: string, data: Partial<HrCandidate>) =>
        (await api.patch<HrCandidate>(`/hr/recruitment/candidates/${id}`, data)).data,
    deleteCandidate: async (id: string) => { await api.delete(`/hr/recruitment/candidates/${id}`); },

    // ─── Performance (Phase 3) ────────────────────────────────────────────────
    getGoals: async (params?: { employeeId?: string; fiscalYear?: string }) =>
        (await api.get<HrPerformanceGoal[]>('/hr/performance/goals', { params })).data,
    createGoal: async (data: Partial<HrPerformanceGoal>) =>
        (await api.post<HrPerformanceGoal>('/hr/performance/goals', data)).data,
    updateGoal: async (id: string, data: Partial<HrPerformanceGoal>) =>
        (await api.patch<HrPerformanceGoal>(`/hr/performance/goals/${id}`, data)).data,
    deleteGoal: async (id: string) => { await api.delete(`/hr/performance/goals/${id}`); },
    getReviews: async (params?: { employeeId?: string; fiscalYear?: string }) =>
        (await api.get<HrPerformanceReview[]>('/hr/performance/reviews', { params })).data,
    createReview: async (data: Partial<HrPerformanceReview>) =>
        (await api.post<HrPerformanceReview>('/hr/performance/reviews', data)).data,
    updateReview: async (id: string, data: Partial<HrPerformanceReview>) =>
        (await api.patch<HrPerformanceReview>(`/hr/performance/reviews/${id}`, data)).data,

    // ─── Training (Phase 3) ───────────────────────────────────────────────────
    getTrainingPrograms: async (status?: string) =>
        (await api.get<HrTrainingProgram[]>('/hr/training', { params: status ? { status } : undefined })).data,
    createTrainingProgram: async (data: Partial<HrTrainingProgram>) =>
        (await api.post<HrTrainingProgram>('/hr/training', data)).data,
    updateTrainingProgram: async (id: string, data: Partial<HrTrainingProgram>) =>
        (await api.patch<HrTrainingProgram>(`/hr/training/${id}`, data)).data,
    enrollTraining: async (id: string) =>
        (await api.post<HrTrainingProgram>(`/hr/training/${id}/enroll`)).data,
    deleteTrainingProgram: async (id: string) => { await api.delete(`/hr/training/${id}`); },

    // ─── Exit Management (Phase 3) ────────────────────────────────────────────
    getExitRecords: async (status?: string) =>
        (await api.get<HrExitRecord[]>('/hr/exit', { params: status ? { status } : undefined })).data,
    createExitRecord: async (data: Partial<HrExitRecord>) =>
        (await api.post<HrExitRecord>('/hr/exit', data)).data,
    updateExitRecord: async (id: string, data: Partial<HrExitRecord>) =>
        (await api.patch<HrExitRecord>(`/hr/exit/${id}`, data)).data,
    deleteExitRecord: async (id: string) => { await api.delete(`/hr/exit/${id}`); },

    // ─── Payroll — Bank File & Gratuity ───────────────────────────────────────
    getBankFile: async (month: string): Promise<{ rows: any[]; csv: string }> =>
        (await api.get<{ rows: any[]; csv: string }>('/hr/payroll/bank-file', { params: { month } })).data,
    getGratuityReport: async (): Promise<any[]> =>
        (await api.get<any[]>('/hr/payroll/gratuity')).data,

    // ─── Self Service ─────────────────────────────────────────────────────────
    getSelfProfile: async () => (await api.get<HrEmployee>('/hr/employees/me')).data,
    getSelfPayslips: async () => (await api.get<HrPayroll[]>('/hr/payroll/my')).data,
    getSelfLeaveBalance: async () => (await api.get<HrLeaveBalance[]>('/hr/leave/my/balances')).data,
    getSelfAttendance: async (params?: { startDate?: string; endDate?: string }) =>
        (await api.get<HrAttendance[]>('/hr/attendance/my', { params })).data,
};
