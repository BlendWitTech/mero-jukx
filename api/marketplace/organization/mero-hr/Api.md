# Mero HR - API

## Base Path
`/api/hr`

## Endpoints

### Employees
- `GET /hr/employees`: List all employees in organization.
- `POST /hr/employees`: Create new employee record.
- `PATCH /hr/employees/:id`: Update profiles.

### Attendance
- `POST /hr/attendance/check-in`: mark presence with optional `location`.
- `POST /hr/attendance/check-out`: Complete the work session.
- `GET /hr/attendance`: dashboard data or detailed logs.

### Leave
- `POST /hr/leave/request`: Apply for leave.
- `PATCH /hr/leave/:id/approve`: manager action.
- `PATCH /hr/leave/:id/reject`: manager action with remarks.

### Payroll
- `POST /hr/payroll/generate`: Batch calculate month salary for all active staff.
- `GET /hr/payroll?month=YYYY-MM`: View generated payroll.
- `GET /hr/payroll/:id/payslip`: Retrieve detailed payslip data.

## Authentication
Requires `x-organization-id` header and valid JWT.
Specific permissions: `HR_ADMIN`, `HR_USER` (self-service).
