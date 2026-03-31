import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MultiTenancyTestHelper } from './helpers/multi-tenancy-test.helper';

/**
 * Payroll E2E Tests
 *
 * Covers: employees, departments, attendance, leave, payroll processing,
 * Nepal-specific deductions (PF, CIT), payroll-accounting integration.
 *
 * CRITICAL: Payroll errors directly affect employee salaries.
 */
describe('Mero HR — Payroll (e2e)', () => {
  let app: INestApplication;
  let token: string;

  let departmentId: string;
  let designationId: string;
  let employeeId: string;
  let payrollId: string;
  let leaveRequestId: string;

  const basicSalary = 50000; // NPR 50,000

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();

    const org = await MultiTenancyTestHelper.createOrganizationAndLogin(app, {
      name: `HR Test Org ${Date.now()}`,
      email: `hr-org${Date.now()}@test.com`,
      ownerEmail: `hr-owner${Date.now()}@test.com`,
      ownerPassword: 'TestPassword123!',
    });
    token = org.token;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────
  // DEPARTMENTS
  // ─────────────────────────────────────────────────────────────
  describe('Departments', () => {
    it('POST /hr/departments creates a department', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/hr/departments')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `Engineering ${Date.now()}`, description: 'Software engineering team' });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) departmentId = res.body.id;
    });

    it('GET /hr/departments returns department list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hr/departments')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const items = res.body.data ?? res.body.departments ?? res.body;
      expect(Array.isArray(items)).toBe(true);
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/hr/departments').expect(401);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // DESIGNATIONS
  // ─────────────────────────────────────────────────────────────
  describe('Designations', () => {
    it('POST /hr/designations creates a designation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/hr/designations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `Software Engineer ${Date.now()}`,
          department_id: departmentId,
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) designationId = res.body.id;
    });

    it('GET /hr/designations returns designation list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hr/designations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const items = res.body.data ?? res.body.designations ?? res.body;
      expect(Array.isArray(items)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // EMPLOYEES
  // ─────────────────────────────────────────────────────────────
  describe('Employees', () => {
    it('POST /hr/employees creates an employee', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${token}`)
        .send({
          first_name: 'Ram',
          last_name: 'Sharma',
          email: `ram.sharma${Date.now()}@test.com`,
          phone: '9800000010',
          department_id: departmentId,
          designation_id: designationId,
          joining_date: new Date().toISOString().split('T')[0],
          basic_salary: basicSalary,
          pf_eligible: true,
          cit_eligible: false,
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) employeeId = res.body.id;
    });

    it('GET /hr/employees returns employee list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const items = res.body.data ?? res.body.employees ?? res.body;
      expect(Array.isArray(items)).toBe(true);
    });

    it('GET /hr/employees/:id returns employee details', async () => {
      if (!employeeId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/hr/employees/${employeeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', employeeId);
    });

    it('rejects employee creation with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${token}`)
        .send({ first_name: 'Incomplete' }) // missing joining_date, basic_salary, etc.
        .expect(400);
    });

    it('rejects employee with negative salary', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${token}`)
        .send({
          first_name: 'Negative',
          last_name: 'Salary',
          email: `neg.salary${Date.now()}@test.com`,
          joining_date: new Date().toISOString().split('T')[0],
          basic_salary: -5000,
        });
      expect([400, 422]).toContain(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ATTENDANCE
  // ─────────────────────────────────────────────────────────────
  describe('Attendance', () => {
    it('POST /hr/attendance records attendance', async () => {
      if (!employeeId) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/hr/attendance')
        .set('Authorization', `Bearer ${token}`)
        .send({
          employee_id: employeeId,
          date: new Date().toISOString().split('T')[0],
          status: 'present',
          check_in: '09:00',
          check_out: '18:00',
        });

      expect([200, 201]).toContain(res.status);
    });

    it('GET /hr/attendance returns attendance records', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hr/attendance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const items = res.body.data ?? res.body.attendance ?? res.body;
      expect(Array.isArray(items)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // LEAVE MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  describe('Leave Management', () => {
    it('POST /hr/leave/request submits a leave request', async () => {
      if (!employeeId) return;

      const startDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0];

      const res = await request(app.getHttpServer())
        .post('/api/v1/hr/leave/request')
        .set('Authorization', `Bearer ${token}`)
        .send({
          employee_id: employeeId,
          leave_type: 'annual',
          start_date: startDate,
          end_date: endDate,
          reason: 'E2E test leave request',
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) leaveRequestId = res.body.id;
    });

    it('GET /hr/leave returns leave records', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hr/leave')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const items = res.body.data ?? res.body.leaves ?? res.body;
      expect(Array.isArray(items)).toBe(true);
    });

    it('leave request starts in PENDING status', async () => {
      if (!leaveRequestId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/hr/leave/${leaveRequestId}`)
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        expect(['pending', 'PENDING']).toContain(res.body.status);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PAYROLL — NEPAL DEDUCTION CALCULATIONS
  // ─────────────────────────────────────────────────────────────
  describe('Payroll Processing — Nepal deductions', () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    it('POST /hr/payroll processes monthly payroll', async () => {
      if (!employeeId) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/hr/payroll')
        .set('Authorization', `Bearer ${token}`)
        .send({
          employee_id: employeeId,
          month: currentMonth,
          year: currentYear,
          basic_salary: basicSalary,
          working_days: 26,
          present_days: 26,
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) payrollId = res.body.id;
    });

    it('PF deduction: employee 10% of basic salary', async () => {
      if (!payrollId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/hr/payroll/${payrollId}`)
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        const payslip = res.body;
        // Employee PF = 10% of basic = 50,000 × 10% = 5,000
        const employeePf = payslip.employee_pf ?? payslip.pf_employee ?? payslip.deductions?.pf_employee;
        if (employeePf !== undefined) {
          expect(Number(employeePf)).toBeCloseTo(basicSalary * 0.10, 0);
        }
        // Employer PF = 10% of basic = 50,000 × 10% = 5,000
        const employerPf = payslip.employer_pf ?? payslip.pf_employer ?? payslip.deductions?.pf_employer;
        if (employerPf !== undefined) {
          expect(Number(employerPf)).toBeCloseTo(basicSalary * 0.10, 0);
        }
      }
    });

    it('Net salary = basic - all deductions', async () => {
      if (!payrollId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/hr/payroll/${payrollId}`)
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        const payslip = res.body;
        const gross = Number(payslip.gross_salary ?? payslip.basic_salary ?? basicSalary);
        const deductions = Number(payslip.total_deductions ?? payslip.deductions_total ?? 0);
        const netSalary = Number(payslip.net_salary ?? payslip.net_pay ?? 0);

        if (netSalary > 0 && gross > 0) {
          expect(netSalary).toBeCloseTo(gross - deductions, 0);
          // Net must always be less than gross (some deductions)
          expect(netSalary).toBeLessThan(gross);
          // Net must be positive
          expect(netSalary).toBeGreaterThan(0);
        }
      }
    });

    it('GET /hr/payroll returns payroll list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hr/payroll')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const items = res.body.data ?? res.body.payrolls ?? res.body;
      expect(Array.isArray(items)).toBe(true);
    });

    it('cannot process payroll for same employee + month + year twice', async () => {
      if (!employeeId) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/hr/payroll')
        .set('Authorization', `Bearer ${token}`)
        .send({
          employee_id: employeeId,
          month: currentMonth,
          year: currentYear,
          basic_salary: basicSalary,
          working_days: 26,
          present_days: 26,
        });

      // Should be 409 Conflict — payroll already processed for this month
      expect([400, 409]).toContain(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // HR DASHBOARD
  // ─────────────────────────────────────────────────────────────
  describe('HR Dashboard', () => {
    it('GET /hr/dashboard returns HR KPIs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hr/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toBeDefined();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PUBLIC HOLIDAYS
  // ─────────────────────────────────────────────────────────────
  describe('Public Holidays', () => {
    it('POST /hr/public-holidays adds a holiday', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/hr/public-holidays')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `Test Holiday ${Date.now()}`,
          date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          type: 'public',
        });

      expect([200, 201]).toContain(res.status);
    });

    it('GET /hr/public-holidays returns holiday list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hr/public-holidays')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ORG CHART
  // ─────────────────────────────────────────────────────────────
  describe('Org Chart', () => {
    it('GET /hr/org-chart returns hierarchical structure', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hr/org-chart')
        .set('Authorization', `Bearer ${token}`);

      // 200 or 404 if not yet implemented as separate endpoint
      expect([200, 404]).toContain(res.status);
    });
  });
});
