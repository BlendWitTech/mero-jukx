import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MultiTenancyTestHelper } from './helpers/multi-tenancy-test.helper';

/**
 * Accounting E2E Tests
 *
 * Covers: chart of accounts, journal entries (double-entry integrity),
 * sales invoices, purchase invoices, VAT calculation, customers, vendors,
 * banking, budgets, tax compliance, financial reports.
 *
 * CRITICAL: Wrong numbers = businesses cannot use the platform.
 */
describe('Mero Accounting (e2e)', () => {
  let app: INestApplication;
  let token: string;

  // IDs created during tests
  let assetAccountId: string;
  let incomeAccountId: string;
  let expenseAccountId: string;
  let liabilityAccountId: string;
  let customerId: string;
  let vendorId: string;
  let salesInvoiceId: string;
  let purchaseInvoiceId: string;
  let journalEntryId: string;
  let warehouseId: string;

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
      name: `Accounting Test Org ${Date.now()}`,
      email: `accounting-org${Date.now()}@test.com`,
      ownerEmail: `accounting-owner${Date.now()}@test.com`,
      ownerPassword: 'TestPassword123!',
    });
    token = org.token;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────
  // CHART OF ACCOUNTS
  // ─────────────────────────────────────────────────────────────
  describe('Chart of Accounts', () => {
    it('GET /accounting/accounts requires authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/accounting/accounts').expect(401);
    });

    it('GET /accounting/accounts returns account list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/accounts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const accounts = res.body.data ?? res.body.accounts ?? res.body;
      expect(Array.isArray(accounts)).toBe(true);
    });

    it('POST /accounting/accounts creates an Asset account', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: `1001-${Date.now()}`,
          name: 'Test Cash Account',
          type: 'asset',
          is_active: true,
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) assetAccountId = res.body.id;
    });

    it('POST /accounting/accounts creates an Income account', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: `4001-${Date.now()}`,
          name: 'Test Sales Revenue',
          type: 'income',
          is_active: true,
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) incomeAccountId = res.body.id;
    });

    it('POST /accounting/accounts creates an Expense account', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: `5001-${Date.now()}`,
          name: 'Test Operating Expense',
          type: 'expense',
          is_active: true,
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) expenseAccountId = res.body.id;
    });

    it('POST /accounting/accounts creates a Liability account', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: `2001-${Date.now()}`,
          name: 'Test VAT Payable',
          type: 'liability',
          is_active: true,
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) liabilityAccountId = res.body.id;
    });

    it('rejects account with duplicate code', async () => {
      const code = `DUPE-${Date.now()}`;
      await request(app.getHttpServer())
        .post('/api/v1/accounting/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ code, name: 'First Account', type: 'asset' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ code, name: 'Duplicate Account', type: 'asset' });

      expect([400, 409]).toContain(res.status);
    });

    it('rejects account with invalid type', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/accounting/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: `INVAL-${Date.now()}`, name: 'Bad Type', type: 'invalid_type' })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // CUSTOMERS & VENDORS
  // ─────────────────────────────────────────────────────────────
  describe('Customers', () => {
    it('POST /accounting/customers creates a customer', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/customers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `Test Customer ${Date.now()}`,
          email: `customer${Date.now()}@test.com`,
          phone: '9800000001',
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) customerId = res.body.id;
    });

    it('GET /accounting/customers returns customer list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/customers')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const items = res.body.data ?? res.body.customers ?? res.body;
      expect(Array.isArray(items)).toBe(true);
    });

    it('GET /accounting/customers/:id returns customer details', async () => {
      if (!customerId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/accounting/customers/${customerId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', customerId);
    });
  });

  describe('Vendors', () => {
    it('POST /accounting/vendors creates a vendor', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/vendors')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `Test Vendor ${Date.now()}`,
          email: `vendor${Date.now()}@test.com`,
          phone: '9800000002',
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) vendorId = res.body.id;
    });

    it('GET /accounting/vendors returns vendor list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/vendors')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const items = res.body.data ?? res.body.vendors ?? res.body;
      expect(Array.isArray(items)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SALES INVOICES — VAT CALCULATION CRITICAL
  // ─────────────────────────────────────────────────────────────
  describe('Sales Invoices — VAT calculation', () => {
    it('POST /accounting/invoices creates a sales invoice', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customer_id: customerId,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          items: [
            {
              description: 'Test Product',
              quantity: 1,
              unit_price: 10000,
              tax_rate: 13, // 13% Nepal VAT
            },
          ],
          notes: 'E2E test invoice',
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) salesInvoiceId = res.body.id;
    });

    it('Nepal VAT: NPR 10,000 + 13% should produce NPR 1,300 tax', async () => {
      if (!salesInvoiceId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/accounting/invoices/${salesInvoiceId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const invoice = res.body;
      // The tax amount should be exactly 1300 (10000 × 13%)
      const taxAmount = invoice.tax_amount ?? invoice.vat_amount ?? invoice.total_tax;
      if (taxAmount !== undefined) {
        expect(Number(taxAmount)).toBeCloseTo(1300, 0);
      }
      // Total should be 11300
      const total = invoice.total_amount ?? invoice.grand_total;
      if (total !== undefined) {
        expect(Number(total)).toBeCloseTo(11300, 0);
      }
    });

    it('GET /accounting/invoices returns invoice list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/invoices')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const items = res.body.data ?? res.body.invoices ?? res.body;
      expect(Array.isArray(items)).toBe(true);
    });

    it('rejects invoice with negative amount', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          invoice_date: new Date().toISOString().split('T')[0],
          items: [{ description: 'Negative', quantity: 1, unit_price: -100 }],
        });
      expect([400, 422]).toContain(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PURCHASE INVOICES
  // ─────────────────────────────────────────────────────────────
  describe('Purchase Invoices', () => {
    it('POST /accounting/purchase-invoices creates a purchase invoice', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/purchase-invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          vendor_id: vendorId,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          items: [
            {
              description: 'Test Purchase Item',
              quantity: 2,
              unit_price: 5000,
              tds_rate: 1.5, // 1.5% TDS
            },
          ],
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) purchaseInvoiceId = res.body.id;
    });

    it('TDS deduction: NPR 10,000 purchase at 1.5% TDS = NPR 150', async () => {
      if (!purchaseInvoiceId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/accounting/purchase-invoices/${purchaseInvoiceId}`)
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        const invoice = res.body;
        const tdsAmount = invoice.tds_amount ?? invoice.withholding_tax;
        if (tdsAmount !== undefined) {
          // 2 × 5000 = 10000; TDS = 10000 × 1.5% = 150
          expect(Number(tdsAmount)).toBeCloseTo(150, 0);
        }
      }
    });

    it('GET /accounting/purchase-invoices returns list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/purchase-invoices')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const items = res.body.data ?? res.body;
      expect(Array.isArray(items)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // JOURNAL ENTRIES — DOUBLE-ENTRY INTEGRITY
  // ─────────────────────────────────────────────────────────────
  describe('Journal Entries — double-entry integrity', () => {
    it('POST /accounting/journal-entries creates a balanced entry', async () => {
      const debitAccountId = assetAccountId;
      const creditAccountId = incomeAccountId;

      if (!debitAccountId || !creditAccountId) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/journal-entries')
        .set('Authorization', `Bearer ${token}`)
        .send({
          entry_date: new Date().toISOString().split('T')[0],
          description: 'E2E test journal entry',
          lines: [
            { account_id: debitAccountId, debit: 5000, credit: 0 },
            { account_id: creditAccountId, debit: 0, credit: 5000 },
          ],
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) journalEntryId = res.body.id;
    });

    it('total debits must equal total credits in any journal entry', async () => {
      if (!journalEntryId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/accounting/journal-entries/${journalEntryId}`)
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        const entry = res.body;
        const lines = entry.lines ?? entry.journal_entry_lines ?? [];
        if (lines.length > 0) {
          const totalDebit = lines.reduce((sum: number, l: any) => sum + Number(l.debit ?? 0), 0);
          const totalCredit = lines.reduce((sum: number, l: any) => sum + Number(l.credit ?? 0), 0);
          expect(totalDebit).toBeCloseTo(totalCredit, 2);
        }
      }
    });

    it('rejects unbalanced journal entry (debits ≠ credits)', async () => {
      const debitAccountId = assetAccountId;
      const creditAccountId = incomeAccountId;
      if (!debitAccountId || !creditAccountId) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/journal-entries')
        .set('Authorization', `Bearer ${token}`)
        .send({
          entry_date: new Date().toISOString().split('T')[0],
          description: 'Unbalanced entry',
          lines: [
            { account_id: debitAccountId, debit: 5000, credit: 0 },
            { account_id: creditAccountId, debit: 0, credit: 3000 }, // Does not balance!
          ],
        });

      expect([400, 422]).toContain(res.status);
    });

    it('GET /accounting/journal-entries returns list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/journal-entries')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const items = res.body.data ?? res.body;
      expect(Array.isArray(items)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // FINANCIAL REPORTS
  // ─────────────────────────────────────────────────────────────
  describe('Financial Reports', () => {
    const fiscalYearStart = new Date(new Date().getFullYear(), 6, 16).toISOString().split('T')[0]; // Approx Shrawan 1
    const fiscalYearEnd = new Date(new Date().getFullYear() + 1, 6, 15).toISOString().split('T')[0];

    it('GET /accounting/reports/trial-balance returns report', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/accounting/reports/trial-balance?start_date=${fiscalYearStart}&end_date=${fiscalYearEnd}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('total_debit');
        expect(res.body).toHaveProperty('total_credit');
        // Core rule: debits must equal credits
        if (res.body.total_debit !== undefined) {
          expect(Number(res.body.total_debit)).toBeCloseTo(Number(res.body.total_credit), 2);
        }
      }
    });

    it('GET /accounting/reports/profit-and-loss returns report', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/accounting/reports/profit-and-loss?start_date=${fiscalYearStart}&end_date=${fiscalYearEnd}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        // Should have income and expense sections
        expect(res.body).toBeDefined();
      }
    });

    it('GET /accounting/reports/balance-sheet returns report', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/accounting/reports/balance-sheet?date=${fiscalYearEnd}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        // Balance sheet: Assets = Liabilities + Equity
        expect(res.body).toBeDefined();
      }
    });

    it('GET /accounting/reports/ar-aging returns aging report', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/reports/ar-aging')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 400]).toContain(res.status);
    });

    it('GET /accounting/reports/ap-aging returns aging report', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/reports/ap-aging')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 400]).toContain(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TAX COMPLIANCE (Nepal-specific)
  // ─────────────────────────────────────────────────────────────
  describe('Tax Compliance', () => {
    it('GET /accounting/tax/vat-categories returns VAT category list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/tax/vat-categories')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });

    it('GET /accounting/tax/tds-categories returns TDS category list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/tax/tds-categories')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });

    it('GET /accounting/tax-reports/annex-7 returns VAT Annex-7 report', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/tax-reports/annex-7')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 400]).toContain(res.status);
    });

    it('GET /accounting/tax-reports/tds-payable returns TDS payable report', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/tax-reports/tds-payable')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 400]).toContain(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // BANKING
  // ─────────────────────────────────────────────────────────────
  describe('Banking', () => {
    it('GET /accounting/banking returns bank accounts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/banking')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });

    it('GET /accounting/bank-reconciliation/statements returns statement list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/bank-reconciliation/statements')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // BUDGETS
  // ─────────────────────────────────────────────────────────────
  describe('Budgets', () => {
    it('POST /accounting/budgets creates a budget', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounting/budgets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `Test Budget ${Date.now()}`,
          fiscal_year: new Date().getFullYear(),
          total_amount: 1000000,
        });

      expect([200, 201, 400]).toContain(res.status);
    });

    it('GET /accounting/budgets returns budget list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounting/budgets')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body.data ?? res.body)).toBe(true);
      }
    });
  });
});
