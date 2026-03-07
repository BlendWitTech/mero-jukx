# Mero HR - Architecture

## Overview
Mero HR is implemented as a modular marketplace application within the `organization` tier. it focuses on the lifecycle of employees within a multi-tenant environment, specialized for the Nepali regulatory and financial context.

## Core Modules
- **Employees Module**: Managed digital profiles, document storage integration, and role mapping.
- **Attendance Module**: Handles check-in/out protocols with GPS/location-aware logic.
- **Leave Module**: A state-machine based workflow for leave applications (Pending -> Approved/Rejected).
- **Payroll Module**: A specialized calculation engine for Nepal-specific statutory deductions.

## Integration Layer
- **Mero Accounting**: (In Progress) Automatically posts payroll expenses as journal entries.
- **Common Module**: Leverages global notification and file storage services for employee documents and alerts.

## Scalability
The HR module uses standard NestJS patterns (Service/Controller) and is designed to handle thousands of concurrent check-ins via optimized indexing on the `hr_attendance` table.
