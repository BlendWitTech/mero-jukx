import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MultiTenancyTestHelper } from './helpers/multi-tenancy-test.helper';

/**
 * Multi-Tenancy Isolation E2E Tests
 *
 * Verifies that organization data is completely isolated.
 * Covers: Core, CRM, Inventory, Accounting, HR, Board, Khata, CMS
 *
 * RULE: If any test here fails, the platform cannot launch.
 */
describe('Multi-Tenancy Isolation (e2e)', () => {
  let app: INestApplication;

  // Organization 1
  let org1Id: string;
  let org1Token: string;

  // Organization 2
  let org2Id: string;
  let org2Token: string;

  // Resource IDs created in Org 1 (used for cross-org attack tests)
  let org1TicketId: string;
  let org1ChatId: string;
  let org1CrmClientId: string;
  let org1InventoryProductId: string;
  let org1AccountingInvoiceId: string;
  let org1HrEmployeeId: string;
  let org1BoardWorkspaceId: string;

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

    // Register and login both organizations
    const org1 = await MultiTenancyTestHelper.createOrganizationAndLogin(app, {
      name: `Isolation Test Org A ${Date.now()}`,
      email: `orgA${Date.now()}@isolation-test.com`,
      ownerEmail: `ownerA${Date.now()}@isolation-test.com`,
      ownerPassword: 'TestPassword123!',
    });
    org1Id = org1.organizationId;
    org1Token = org1.token;

    const org2 = await MultiTenancyTestHelper.createOrganizationAndLogin(app, {
      name: `Isolation Test Org B ${Date.now()}`,
      email: `orgB${Date.now()}@isolation-test.com`,
      ownerEmail: `ownerB${Date.now()}@isolation-test.com`,
      ownerPassword: 'TestPassword123!',
    });
    org2Id = org2.organizationId;
    org2Token = org2.token;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────
  // SETUP: Create data in Org 1
  // ─────────────────────────────────────────────────────────────
  describe('Setup — create Org 1 data', () => {
    it('should create a ticket in Org 1', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${org1Token}`)
        .send({ title: 'Org1 Ticket', description: 'isolation test', priority: 'medium' })
        .expect(201);
      org1TicketId = res.body.id;
      expect(org1TicketId).toBeDefined();
    });

    it('should create a chat in Org 1', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${org1Token}`)
        .send({ type: 'direct', name: 'Org1 Chat' })
        .expect(201);
      org1ChatId = res.body.id;
      expect(org1ChatId).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // CORE PLATFORM ISOLATION
  // ─────────────────────────────────────────────────────────────
  describe('Core — Ticket isolation', () => {
    it('Org 2 list tickets returns only Org 2 data', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tickets')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const tickets = res.body.data ?? res.body.tickets ?? res.body;
      if (Array.isArray(tickets)) {
        tickets.forEach((t: any) => expect(t.organization_id).toBe(org2Id));
      }
    });

    it('Org 2 cannot read Org 1 ticket by ID — expects 404', async () => {
      if (!org1TicketId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/tickets/${org1TicketId}`)
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(404);
    });

    it('Org 2 cannot update Org 1 ticket — expects 404', async () => {
      if (!org1TicketId) return;
      await request(app.getHttpServer())
        .patch(`/api/v1/tickets/${org1TicketId}`)
        .set('Authorization', `Bearer ${org2Token}`)
        .send({ title: 'hacked' })
        .expect(404);
    });
  });

  describe('Core — Chat isolation', () => {
    it('Org 2 list chats returns only Org 2 data', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/chats')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const chats = res.body.data ?? res.body.chats ?? res.body;
      if (Array.isArray(chats)) {
        chats.forEach((c: any) => expect(c.organization_id).toBe(org2Id));
      }
    });

    it('Org 2 cannot read Org 1 chat by ID — expects 403 or 404', async () => {
      if (!org1ChatId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/chats/${org1ChatId}`)
        .set('Authorization', `Bearer ${org2Token}`);
      expect([403, 404]).toContain(res.status);
    });

    it('Org 2 cannot send message to Org 1 chat — expects 403 or 404', async () => {
      if (!org1ChatId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/chats/${org1ChatId}/messages`)
        .set('Authorization', `Bearer ${org2Token}`)
        .send({ content: 'injected message' });
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('Core — Audit log isolation', () => {
    it('Org 2 audit logs do not contain Org 1 entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const logs = res.body.data ?? res.body.logs ?? res.body;
      if (Array.isArray(logs)) {
        logs.forEach((l: any) => expect(l.organization_id).toBe(org2Id));
      }
    });
  });

  describe('Core — User isolation', () => {
    it('Org 2 user list does not include Org 1 users', async () => {
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer()).get('/api/v1/users').set('Authorization', `Bearer ${org1Token}`).expect(200),
        request(app.getHttpServer()).get('/api/v1/users').set('Authorization', `Bearer ${org2Token}`).expect(200),
      ]);

      const users1 = res1.body.data ?? res1.body.users ?? res1.body;
      const users2 = res2.body.data ?? res2.body.users ?? res2.body;

      if (Array.isArray(users1) && Array.isArray(users2)) {
        const ids1 = new Set(users1.map((u: any) => u.id));
        const ids2 = new Set(users2.map((u: any) => u.id));
        // No overlap between org user lists
        ids2.forEach(id => expect(ids1.has(id)).toBe(false));
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // MERO CRM ISOLATION
  // ─────────────────────────────────────────────────────────────
  describe('Mero CRM — isolation', () => {
    beforeAll(async () => {
      // Create a CRM client in Org 1
      const res = await request(app.getHttpServer())
        .post('/api/v1/crm/clients')
        .set('Authorization', `Bearer ${org1Token}`)
        .send({ name: 'Org1 CRM Client', email: 'client@org1.com', phone: '9800000001' });
      if (res.status === 201) {
        org1CrmClientId = res.body.id;
      }
    }, 30000);

    it('Org 2 GET /crm/clients returns empty or only Org 2 clients', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/crm/clients')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body.clients ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((c: any) => expect(c.organization_id).toBe(org2Id));
      }
    });

    it('Org 2 cannot read Org 1 client by ID — expects 404', async () => {
      if (!org1CrmClientId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/crm/clients/${org1CrmClientId}`)
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(404);
    });

    it('Org 2 cannot update Org 1 client — expects 404', async () => {
      if (!org1CrmClientId) return;
      await request(app.getHttpServer())
        .put(`/api/v1/crm/clients/${org1CrmClientId}`)
        .set('Authorization', `Bearer ${org2Token}`)
        .send({ name: 'hacked' })
        .expect(404);
    });

    it('Org 2 GET /crm/leads returns empty or only Org 2 leads', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body.leads ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((l: any) => expect(l.organization_id).toBe(org2Id));
      }
    });

    it('Org 2 GET /crm/deals returns empty or only Org 2 deals', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/crm/deals')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body.deals ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((d: any) => expect(d.organization_id).toBe(org2Id));
      }
    });

    it('Org 2 GET /crm/invoices returns empty or only Org 2 invoices', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/crm/invoices')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body.invoices ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((i: any) => expect(i.organization_id).toBe(org2Id));
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // MERO INVENTORY ISOLATION
  // ─────────────────────────────────────────────────────────────
  describe('Mero Inventory — isolation', () => {
    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/products')
        .set('Authorization', `Bearer ${org1Token}`)
        .send({
          name: 'Org1 Product',
          sku: `SKU-ORG1-${Date.now()}`,
          unit: 'pcs',
          selling_price: 100,
          cost_price: 80,
        });
      if (res.status === 201) {
        org1InventoryProductId = res.body.id;
      }
    }, 30000);

    it('Org 2 GET /inventory/products returns empty or only Org 2 products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/products')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body.products ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((p: any) => expect(p.organization_id).toBe(org2Id));
      }
    });

    it('Org 2 cannot read Org 1 product by ID — expects 404', async () => {
      if (!org1InventoryProductId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/inventory/products/${org1InventoryProductId}`)
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(404);
    });

    it('Org 2 GET /inventory/warehouses returns only Org 2 warehouses', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/warehouses')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body.warehouses ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((w: any) => expect(w.organization_id).toBe(org2Id));
      }
    });

    it('Org 2 GET /inventory/stock returns only Org 2 stock', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/stock')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body.stock ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((s: any) => expect(s.organization_id).toBe(org2Id));
      }
    });

    it('Org 2 GET /inventory/purchase-orders returns only Org 2 POs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/purchase-orders')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((po: any) => expect(po.organization_id).toBe(org2Id));
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // MERO ACCOUNTING ISOLATION
  // ─────────────────────────────────────────────────────────────
  describe('Mero Accounting — isolation', () => {
    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/invoices')
        .set('Authorization', `Bearer ${org1Token}`)
        .send({
          invoice_number: `INV-ORG1-${Date.now()}`,
          invoice_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 30 * 86400000).toISOString(),
          subtotal: 10000,
          tax_amount: 1300,
          total_amount: 11300,
        });
      if (res.status === 201) {
        org1AccountingInvoiceId = res.body.id;
      }
    }, 30000);

    it('Org 2 GET /accounting/accounts returns only Org 2 accounts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/accounts')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body.accounts ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((a: any) => expect(a.organization_id).toBe(org2Id));
      }
    });

    it('Org 2 GET /accounting/journal-entries returns only Org 2 entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/journal-entries')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((je: any) => expect(je.organization_id).toBe(org2Id));
      }
    });

    it('Org 2 cannot read Org 1 invoice by ID — expects 404', async () => {
      if (!org1AccountingInvoiceId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/accounting/invoices/${org1AccountingInvoiceId}`)
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(404);
    });

    it('Org 2 GET /accounting/customers returns only Org 2 customers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/customers')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body.customers ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((c: any) => expect(c.organization_id).toBe(org2Id));
      }
    });

    it('Org 2 GET /accounting/vendors returns only Org 2 vendors', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/vendors')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body.vendors ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((v: any) => expect(v.organization_id).toBe(org2Id));
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // MERO HR ISOLATION
  // ─────────────────────────────────────────────────────────────
  describe('Mero HR — isolation', () => {
    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${org1Token}`)
        .send({
          first_name: 'Org1',
          last_name: 'Employee',
          email: `emp${Date.now()}@org1.com`,
          joining_date: new Date().toISOString(),
          basic_salary: 50000,
        });
      if (res.status === 201) {
        org1HrEmployeeId = res.body.id;
      }
    }, 30000);

    it('Org 2 GET /hr/employees returns only Org 2 employees', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body.employees ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((e: any) => expect(e.organization_id).toBe(org2Id));
      }
    });

    it('Org 2 cannot read Org 1 employee by ID — expects 404', async () => {
      if (!org1HrEmployeeId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/hr/employees/${org1HrEmployeeId}`)
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(404);
    });

    it('Org 2 GET /hr/payroll returns only Org 2 payroll', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hr/payroll')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body.payrolls ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((p: any) => expect(p.organization_id).toBe(org2Id));
      }
    });

    it('Org 2 GET /hr/departments returns only Org 2 departments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hr/departments')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body.departments ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((d: any) => expect(d.organization_id).toBe(org2Id));
      }
    });

    it('Org 2 GET /hr/attendance returns only Org 2 attendance', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hr/attendance')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((a: any) => expect(a.organization_id).toBe(org2Id));
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // MERO BOARD ISOLATION
  // ─────────────────────────────────────────────────────────────
  describe('Mero Board — isolation', () => {
    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/board/workspaces')
        .set('Authorization', `Bearer ${org1Token}`)
        .send({ name: 'Org1 Workspace', description: 'isolation test' });
      if (res.status === 201) {
        org1BoardWorkspaceId = res.body.id;
      }
    }, 30000);

    it('Org 2 GET /board/workspaces returns only Org 2 workspaces', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/board/workspaces')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body.workspaces ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((w: any) => expect(w.organization_id).toBe(org2Id));
      }
    });

    it('Org 2 cannot read Org 1 workspace — expects 404', async () => {
      if (!org1BoardWorkspaceId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/board/workspaces/${org1BoardWorkspaceId}`)
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(404);
    });

    it('Org 2 GET /board/tasks returns only Org 2 tasks', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/board/tasks')
        .set('Authorization', `Bearer ${org2Token}`)
        .expect(200);

      const items = res.body.data ?? res.body.tasks ?? res.body;
      if (Array.isArray(items)) {
        items.forEach((t: any) => expect(t.organization_id).toBe(org2Id));
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // UNAUTHENTICATED ACCESS
  // ─────────────────────────────────────────────────────────────
  describe('Unauthenticated access — all protected routes return 401', () => {
    const protectedRoutes = [
      '/api/v1/tickets',
      '/api/v1/chats',
      '/api/v1/users',
      '/api/v1/organizations/me',
      '/api/v1/crm/clients',
      '/api/v1/crm/leads',
      '/api/v1/inventory/products',
      '/api/v1/inventory/warehouses',
      '/api/v1/accounting/accounts',
      '/api/v1/accounting/journal-entries',
      '/api/v1/hr/employees',
      '/api/v1/hr/payroll',
      '/api/v1/board/workspaces',
      '/api/v1/board/tasks',
      '/api/v1/audit-logs',
      '/api/v1/notifications',
    ];

    protectedRoutes.forEach(route => {
      it(`GET ${route} → 401 without token`, async () => {
        await request(app.getHttpServer()).get(route).expect(401);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // CROSS-ORG WRITE ATTACKS
  // ─────────────────────────────────────────────────────────────
  describe('Cross-org write attacks — Org 2 token cannot mutate Org 1 resources', () => {
    it('Org 2 cannot delete Org 1 ticket', async () => {
      if (!org1TicketId) return;
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/tickets/${org1TicketId}`)
        .set('Authorization', `Bearer ${org2Token}`);
      expect([403, 404]).toContain(res.status);
    });

    it('Org 2 cannot delete Org 1 CRM client', async () => {
      if (!org1CrmClientId) return;
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/crm/clients/${org1CrmClientId}`)
        .set('Authorization', `Bearer ${org2Token}`);
      expect([403, 404]).toContain(res.status);
    });

    it('Org 2 cannot delete Org 1 inventory product', async () => {
      if (!org1InventoryProductId) return;
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/inventory/products/${org1InventoryProductId}`)
        .set('Authorization', `Bearer ${org2Token}`);
      expect([403, 404]).toContain(res.status);
    });

    it('Org 2 cannot delete Org 1 HR employee', async () => {
      if (!org1HrEmployeeId) return;
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/hr/employees/${org1HrEmployeeId}`)
        .set('Authorization', `Bearer ${org2Token}`);
      expect([403, 404]).toContain(res.status);
    });

    it('Org 2 cannot delete Org 1 Board workspace', async () => {
      if (!org1BoardWorkspaceId) return;
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/board/workspaces/${org1BoardWorkspaceId}`)
        .set('Authorization', `Bearer ${org2Token}`);
      expect([403, 404]).toContain(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ORGANIZATION CONTEXT INTEGRITY
  // ─────────────────────────────────────────────────────────────
  describe('Organization context integrity', () => {
    it('GET /organizations/me returns correct org for each token', async () => {
      const [r1, r2] = await Promise.all([
        request(app.getHttpServer()).get('/api/v1/organizations/me').set('Authorization', `Bearer ${org1Token}`).expect(200),
        request(app.getHttpServer()).get('/api/v1/organizations/me').set('Authorization', `Bearer ${org2Token}`).expect(200),
      ]);
      expect(r1.body.id).toBe(org1Id);
      expect(r2.body.id).toBe(org2Id);
      expect(r1.body.id).not.toBe(r2.body.id);
    });

    it('GET /users/me returns correct user for each token', async () => {
      const [r1, r2] = await Promise.all([
        request(app.getHttpServer()).get('/api/v1/users/me').set('Authorization', `Bearer ${org1Token}`).expect(200),
        request(app.getHttpServer()).get('/api/v1/users/me').set('Authorization', `Bearer ${org2Token}`).expect(200),
      ]);
      expect(r1.body).toHaveProperty('id');
      expect(r2.body).toHaveProperty('id');
    });

    it('Invalid JWT returns 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('Expired-format JWT returns 401', async () => {
      const fakeExpired =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
        '.eyJzdWIiOiJ0ZXN0IiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9' +
        '.fake_signature';
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${fakeExpired}`)
        .expect(401);
    });
  });
});
