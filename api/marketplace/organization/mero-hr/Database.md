# Mero HR - Database

## Implemented Entities

### 1. Employees (`hr_employees`)
Stores the primary record for every worker.
- `employee_id`: Unique company-issued identifier.
- `pan_number`: Statutory field for Nepal tax compliance.
- `citizenship_number`: Required for legal onboarding.
- `base_salary`: Used as the foundation for payroll calculations.

### 2. Attendance (`hr_attendance`)
- `check_in / check_out`: ISO timestamps.
- `status`: Enum (PRESENT, ABSENT, LATE, ON_LEAVE, HOLIDAY).
- `location`: Postgres `POINT` type for GPS tracking.

### 3. Leave Requests (`hr_leave_requests`)
- `leave_type`: Supporting Sick, Casual, Annual, and Nepal-specific Maternity/Paternity.
- `total_days`: Decimal to support half-day leaves.
- `status`: Workflow tracking (PENDING, APPROVED, REJECTED, CANCELLED).

### 4. Payroll (`hr_payroll`)
- `ssf_contribution`: Split into Employee (11%) and Employer (20%) columns.
- `cit_contribution`: Individual voluntary retirement savings.
- `income_tax`: Calculated based on Nepal's progressive slabs.
- `net_salary`: The final payable amount after all statutory and internal deductions.

## Isolation
All tables include an `organization_id` column and are strictly isolated at the query layer via the `AppAccessGuard`.
