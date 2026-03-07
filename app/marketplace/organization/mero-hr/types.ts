export enum HrEmployeeStatus {
    ACTIVE = 'ACTIVE',
    ON_LEAVE = 'ON_LEAVE',
    TERMINATED = 'TERMINATED',
    RESIGNED = 'RESIGNED',
}

export interface HrEmployee {
    id: string;
    organizationId: string;
    userId?: string;
    employee_id?: string;
    first_name: string;
    last_name?: string;
    email?: string;
    phone?: string;
    date_of_birth?: Date | string;
    gender?: string;
    address?: string;
    photo_url?: string;
    departmentId?: string;
    departmentRel?: HrDepartment;
    designationId?: string;
    designationRel?: HrDesignation;
    supervisorId?: string;
    supervisor?: HrEmployee;
    probation_end_date?: Date | string;
    contract_end_date?: Date | string;
    emergency_contact?: {
        name: string;
        relation: string;
        phone: string;
    };
    designation?: string;
    department?: string;
    joining_date?: Date | string;
    status: HrEmployeeStatus;
    pan_number?: string;
    citizenship_number?: string;
    base_salary: number;
    bank_details?: {
        bank_name: string;
        account_name: string;
        account_number: string;
        branch: string;
    };
    documents?: HrDocument[];
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface HrDepartment {
    id: string;
    organizationId: string;
    name: string;
    code?: string;
    parentId?: string;
    parent?: HrDepartment;
    children?: HrDepartment[];
    managerId?: string;
    manager?: HrEmployee;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface HrDesignation {
    id: string;
    organizationId: string;
    name: string;
    grade?: string;
    description?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export enum HrDocumentType {
    CITIZENSHIP = 'CITIZENSHIP',
    PASSPORT = 'PASSPORT',
    CONTRACT = 'CONTRACT',
    CERTIFICATE = 'CERTIFICATE',
    TRAINING = 'TRAINING',
    OTHER = 'OTHER',
}

export interface HrDocument {
    id: string;
    organizationId: string;
    employeeId: string;
    employee?: HrEmployee;
    type: HrDocumentType;
    name: string;
    file_url: string;
    expiry_date?: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export enum HrAttendanceStatus {
    PRESENT = 'PRESENT',
    ABSENT = 'ABSENT',
    LATE = 'LATE',
    ON_LEAVE = 'ON_LEAVE',
    HOLIDAY = 'HOLIDAY',
}

export interface HrAttendance {
    id: string;
    organizationId: string;
    employeeId: string;
    employee?: HrEmployee;
    date: Date | string;
    check_in?: Date | string;
    check_out?: Date | string;
    status: HrAttendanceStatus;
    location?: string;
    remarks?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export enum HrLeaveType {
    SICK = 'SICK',
    CASUAL = 'CASUAL',
    ANNUAL = 'ANNUAL',
    MATERNITY = 'MATERNITY',
    PATERNITY = 'PATERNITY',
    UNPAID = 'UNPAID',
    OTHER = 'OTHER',
}

export enum HrLeaveStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED',
}

export interface HrLeaveRequest {
    id: string;
    organizationId: string;
    employeeId: string;
    employee?: HrEmployee;
    leave_type: HrLeaveType;
    start_date: Date | string;
    end_date: Date | string;
    total_days: number;
    reason: string;
    status: HrLeaveStatus;
    approvedById?: string;
    admin_remarks?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export enum HrPayrollStatus {
    DRAFT = 'DRAFT',
    PROCESSED = 'PROCESSED',
    PAID = 'PAID',
}

export interface HrPayroll {
    id: string;
    organizationId: string;
    employeeId: string;
    employee?: HrEmployee;
    month: string;
    period_start: Date | string;
    period_end: Date | string;
    basic_salary: number;
    allowances: number;
    overtime: number;
    bonus: number;
    ssf_contribution_employee: number;
    ssf_contribution_employer: number;
    cit_contribution: number;
    income_tax: number;
    loan_deduction: number;
    advance_deduction: number;
    other_deductions: number;
    net_salary: number;
    status: HrPayrollStatus;
    payment_date?: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

// ─── Phase 2 Types ─────────────────────────────────────────────────────────────

export interface HrShift {
    id: string;
    organizationId: string;
    name: string;
    start_time: string;
    end_time: string;
    work_hours: number;
    work_days: string; // comma-separated: "1,2,3,4,5"
    is_active: boolean;
    description?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface HrPublicHoliday {
    id: string;
    organizationId: string;
    name: string;
    date: Date | string;
    year: number;
    nepali_year?: string;
    is_paid: boolean;
    description?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface HrLeaveBalance {
    id: string;
    organizationId: string;
    employeeId: string;
    leave_type: string;
    fiscal_year: string;
    entitled_days: number;
    used_days: number;
    carried_forward: number;
    createdAt: Date | string;
    updatedAt: Date | string;
}

// ─── Phase 3 Types ─────────────────────────────────────────────────────────────

export interface HrJobOpening {
    id: string;
    organizationId: string;
    title: string;
    departmentId?: string;
    department?: string;
    location?: string;
    employment_type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
    description?: string;
    requirements?: string;
    salary_range?: { min: number; max: number; currency: string };
    vacancies: number;
    status: 'DRAFT' | 'OPEN' | 'ON_HOLD' | 'CLOSED';
    published_at?: Date | string;
    deadline?: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface HrCandidate {
    id: string;
    organizationId: string;
    jobId?: string;
    job?: HrJobOpening;
    first_name: string;
    last_name?: string;
    email: string;
    phone?: string;
    resume_url?: string;
    cover_letter?: string;
    source: 'REFERRAL' | 'JOB_PORTAL' | 'WEBSITE' | 'WALK_IN' | 'OTHER';
    stage: 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'TECHNICAL' | 'OFFER' | 'HIRED' | 'REJECTED';
    rating?: number;
    notes?: string;
    expected_salary?: number;
    interview_date?: Date | string;
    hired_at?: Date | string;
    rejected_at?: Date | string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface HrPerformanceGoal {
    id: string;
    organizationId: string;
    employeeId: string;
    employee?: HrEmployee;
    title: string;
    description?: string;
    category: 'INDIVIDUAL' | 'TEAM' | 'DEPARTMENT' | 'COMPANY';
    target_value?: number;
    current_value: number;
    unit?: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    due_date?: Date | string;
    fiscal_year: string;
    weight: number;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface HrPerformanceReview {
    id: string;
    organizationId: string;
    employeeId: string;
    employee?: HrEmployee;
    reviewerId?: string;
    review_period: string;
    fiscal_year: string;
    review_date: Date | string;
    self_rating?: number;
    manager_rating?: number;
    final_rating?: number;
    overall_rating_label?: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_IMPROVEMENT' | 'UNSATISFACTORY';
    strengths?: string;
    areas_for_improvement?: string;
    goals_achieved?: Array<{ title: string; status: string; rating?: number }>;
    training_recommendations?: string;
    comments?: string;
    status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'APPROVED';
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface HrTrainingProgram {
    id: string;
    organizationId: string;
    title: string;
    category: string;
    description?: string;
    trainer: string;
    start_date: Date | string;
    end_date: Date | string;
    duration: string;
    capacity: number;
    enrolled: number;
    location?: string;
    mode: 'IN_PERSON' | 'ONLINE' | 'HYBRID';
    status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
    budget?: number;
    completion_rate?: number;
    notes?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface HrExitRecord {
    id: string;
    organizationId: string;
    employeeId: string;
    employee?: HrEmployee;
    reason: 'RESIGNATION' | 'TERMINATION' | 'RETIREMENT' | 'MUTUAL_SEPARATION' | 'CONTRACT_END' | 'DEATH' | 'OTHER';
    separation_type: 'VOLUNTARY' | 'INVOLUNTARY';
    last_working_day: Date | string;
    notice_period_days?: number;
    notice_served_days?: number;
    exit_interview_date?: Date | string;
    feedback?: string;
    handover_notes?: string;
    clearance_status: 'PENDING' | 'PARTIAL' | 'COMPLETED';
    final_settlement_amount?: number;
    final_settlement_date?: Date | string;
    status: 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED';
    createdAt: Date | string;
    updatedAt: Date | string;
}
