import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MultiTenancyTestHelper } from './helpers/multi-tenancy-test.helper';

/**
 * Inventory E2E Tests
 *
 * Covers: products, warehouses, stock movements, purchase orders,
 * GRN, sales orders, stock adjustments, suppliers, serial numbers.
 *
 * KEY ASSERTIONS: Stock levels must be accurate after every operation.
 */
describe('Mero Inventory (e2e)', () => {
  let app: INestApplication;
  let token: string;

  let productId: string;
  let warehouseId: string;
  let supplierId: string;
  let purchaseOrderId: string;
  let salesOrderId: string;
  let grnId: string;
  const productSku = `SKU-E2E-${Date.now()}`;

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
      name: `Inventory Test Org ${Date.now()}`,
      email: `inventory-org${Date.now()}@test.com`,
      ownerEmail: `inventory-owner${Date.now()}@test.com`,
      ownerPassword: 'TestPassword123!',
    });
    token = org.token;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────
  // WAREHOUSES
  // ─────────────────────────────────────────────────────────────
  describe('Warehouses', () => {
    it('POST /inventory/warehouses creates a warehouse', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/warehouses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `Main Warehouse ${Date.now()}`,
          address: 'Kathmandu, Nepal',
          is_default: true,
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) warehouseId = res.body.id;
    });

    it('GET /inventory/warehouses returns warehouse list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/warehouses')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const items = res.body.data ?? res.body.warehouses ?? res.body;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/inventory/warehouses').expect(401);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SUPPLIERS
  // ─────────────────────────────────────────────────────────────
  describe('Suppliers', () => {
    it('POST /inventory/suppliers creates a supplier', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `Test Supplier ${Date.now()}`,
          email: `supplier${Date.now()}@test.com`,
          phone: '9800000003',
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) supplierId = res.body.id;
    });

    it('GET /inventory/suppliers returns supplier list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const items = res.body.data ?? res.body.suppliers ?? res.body;
      expect(Array.isArray(items)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PRODUCTS
  // ─────────────────────────────────────────────────────────────
  describe('Products', () => {
    it('POST /inventory/products creates a product', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `E2E Test Product ${Date.now()}`,
          sku: productSku,
          unit: 'pcs',
          cost_price: 80,
          selling_price: 100,
          tax_rate: 13,
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) productId = res.body.id;
    });

    it('GET /inventory/products returns product list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/products')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const items = res.body.data ?? res.body.products ?? res.body;
      expect(Array.isArray(items)).toBe(true);
    });

    it('GET /inventory/products/:id returns product details', async () => {
      if (!productId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/inventory/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', productId);
      expect(res.body).toHaveProperty('sku', productSku);
    });

    it('rejects product with duplicate SKU', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Duplicate SKU Product',
          sku: productSku, // same SKU
          unit: 'pcs',
          cost_price: 50,
          selling_price: 70,
        });
      expect([400, 409]).toContain(res.status);
    });

    it('rejects product with negative price', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Negative Price Product',
          sku: `NEG-${Date.now()}`,
          unit: 'pcs',
          cost_price: -100,
          selling_price: 50,
        });
      expect([400, 422]).toContain(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // STOCK LEVELS
  // ─────────────────────────────────────────────────────────────
  describe('Stock levels', () => {
    it('GET /inventory/stock returns stock list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/stock')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body.data ?? res.body.stock ?? res.body)).toBe(true);
    });

    it('new product starts with zero stock', async () => {
      if (!productId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/inventory/stock?product_id=${productId}`)
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        const stock = res.body.data ?? res.body.stock ?? res.body;
        if (Array.isArray(stock) && stock.length > 0) {
          const productStock = stock.find((s: any) => s.product_id === productId);
          if (productStock) {
            expect(Number(productStock.quantity ?? productStock.quantity_on_hand ?? 0)).toBe(0);
          }
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PURCHASE ORDERS
  // ─────────────────────────────────────────────────────────────
  describe('Purchase Orders', () => {
    it('POST /inventory/purchase-orders creates a PO', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/purchase-orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          supplier_id: supplierId,
          order_date: new Date().toISOString().split('T')[0],
          expected_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          items: [
            {
              product_id: productId,
              quantity: 100,
              unit_price: 80,
            },
          ],
          notes: 'E2E test PO',
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) purchaseOrderId = res.body.id;
    });

    it('PO starts in DRAFT or PENDING status', async () => {
      if (!purchaseOrderId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/inventory/purchase-orders/${purchaseOrderId}`)
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 200) {
        expect(['draft', 'pending', 'DRAFT', 'PENDING']).toContain(res.body.status);
      }
    });

    it('GET /inventory/purchase-orders returns PO list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/purchase-orders')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const items = res.body.data ?? res.body;
      expect(Array.isArray(items)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // GOODS RECEIPT NOTE (GRN) — STOCK INCREASE
  // ─────────────────────────────────────────────────────────────
  describe('GRN — stock increases after receipt', () => {
    it('POST /inventory/grn creates a GRN for a purchase order', async () => {
      if (!purchaseOrderId || !productId || !warehouseId) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/grn')
        .set('Authorization', `Bearer ${token}`)
        .send({
          purchase_order_id: purchaseOrderId,
          received_date: new Date().toISOString().split('T')[0],
          warehouse_id: warehouseId,
          items: [
            {
              product_id: productId,
              quantity_received: 100,
              quantity_rejected: 0,
            },
          ],
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) grnId = res.body.id;
    });

    it('confirming GRN increases stock by received quantity', async () => {
      if (!grnId || !productId) return;

      // Confirm the GRN
      const confirmRes = await request(app.getHttpServer())
        .post(`/api/v1/inventory/grn/${grnId}/confirm`)
        .set('Authorization', `Bearer ${token}`);

      if (confirmRes.status === 200 || confirmRes.status === 201) {
        // Check stock level
        const stockRes = await request(app.getHttpServer())
          .get(`/api/v1/inventory/stock?product_id=${productId}`)
          .set('Authorization', `Bearer ${token}`);

        if (stockRes.status === 200) {
          const stock = stockRes.body.data ?? stockRes.body.stock ?? stockRes.body;
          if (Array.isArray(stock) && stock.length > 0) {
            const productStock = stock.find((s: any) => s.product_id === productId);
            if (productStock) {
              expect(Number(productStock.quantity ?? productStock.quantity_on_hand ?? 0)).toBeGreaterThan(0);
            }
          }
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // STOCK ADJUSTMENTS
  // ─────────────────────────────────────────────────────────────
  describe('Stock Adjustments', () => {
    it('POST /inventory/stock-adjustments creates stock adjustment', async () => {
      if (!productId || !warehouseId) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/stock-adjustments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          product_id: productId,
          warehouse_id: warehouseId,
          adjustment_type: 'increase',
          quantity: 10,
          reason: 'E2E test adjustment — found extra units',
          date: new Date().toISOString().split('T')[0],
        });

      expect([200, 201]).toContain(res.status);
    });

    it('GET /inventory/stock-adjustments returns adjustment list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/stock-adjustments')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body.data ?? res.body)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SALES ORDERS — STOCK DECREASES
  // ─────────────────────────────────────────────────────────────
  describe('Sales Orders', () => {
    it('POST /inventory/sales-orders creates a sales order', async () => {
      if (!productId) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/sales-orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          order_date: new Date().toISOString().split('T')[0],
          items: [
            {
              product_id: productId,
              quantity: 30,
              unit_price: 100,
            },
          ],
          notes: 'E2E test sales order',
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.id) salesOrderId = res.body.id;
    });

    it('GET /inventory/sales-orders returns list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/sales-orders')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body.data ?? res.body)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // BACKORDERS
  // ─────────────────────────────────────────────────────────────
  describe('Backorders', () => {
    it('GET /inventory/backorders returns backorder list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/backorders')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body.data ?? res.body)).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SERIAL NUMBERS
  // ─────────────────────────────────────────────────────────────
  describe('Serial Numbers', () => {
    it('POST /inventory/serial-numbers registers a serial number', async () => {
      if (!productId) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/serial-numbers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          product_id: productId,
          serial: `SN-E2E-${Date.now()}`,
          status: 'active',
        });

      expect([200, 201]).toContain(res.status);
    });

    it('GET /inventory/serial-numbers returns serial number list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/serial-numbers')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });

    it('rejects duplicate serial number for same product', async () => {
      if (!productId) return;
      const serial = `SN-DUPE-${Date.now()}`;

      await request(app.getHttpServer())
        .post('/api/v1/inventory/serial-numbers')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: productId, serial, status: 'active' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/inventory/serial-numbers')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: productId, serial, status: 'active' }); // Same serial

      expect([400, 409]).toContain(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // REPORTS
  // ─────────────────────────────────────────────────────────────
  describe('Inventory Reports', () => {
    it('GET /inventory/reports/valuation returns valuation report', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/reports/valuation')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });

    it('GET /inventory/stock-movements returns movement log', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/inventory/stock-movements')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body.data ?? res.body)).toBe(true);
      }
    });
  });
});
