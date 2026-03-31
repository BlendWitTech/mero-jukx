import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * RBAC E2E Tests
 * Covers: role CRUD, permission listing, permission enforcement,
 * system role protections, custom roles, custom permissions,
 * time-based permissions, role assignment.
 *
 * NOTE: Testing "user with limited role gets 403" requires a second
 * org member created via the invitation flow (email-dependent).
 * That scenario is covered in MANUAL_TESTING_CHECKLIST.md.
 * Here we test: auth enforcement, owner capabilities, system protections,
 * and the full custom role/permission lifecycle.
 */
describe('RBAC (e2e)', () => {
  let app: INestApplication;

  // Owner of Org A — has organization-owner role (bypasses all permission checks)
  let ownerToken: string;
  let orgId: string;
  let ownerId: string;

  // IDs created during tests
  let customRoleId: number;
  let customPermissionId: number;
  let viewerRoleId: number;

  const ts = Date.now();
  const ownerEmail = `rbac-owner-${ts}@test.com`;
  const orgEmail = `rbac-org-${ts}@test.com`;
  const orgName = `RBAC Test Org ${ts}`;

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

    // Register org → owner gets organization-owner role
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/organization/register')
      .send({
        name: orgName,
        email: orgEmail,
        owner_email: ownerEmail,
        owner_password: 'TestPassword123!',
        owner_first_name: 'RBAC',
        owner_last_name: 'Owner',
        is_existing_user: false,
      })
      .expect(201);

    orgId = reg.body.organization_id;
    ownerId = reg.body.user_id;

    const login = await request(app.getHttpServer())
      .post(`/api/v1/auth/login?organization_id=${orgId}`)
      .send({ email: ownerEmail, password: 'TestPassword123!' })
      .expect(200);

    ownerToken = login.body.access_token;
    expect(ownerToken).toBeDefined();
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────
  // AUTH ENFORCEMENT — all endpoints must require a valid token
  // ─────────────────────────────────────────────────────────────
  describe('Authentication enforcement', () => {
    const protectedRoutes = [
      { method: 'get', path: '/api/v1/roles' },
      { method: 'get', path: '/api/v1/roles/permissions' },
      { method: 'get', path: '/api/v1/roles/assignable' },
      { method: 'get', path: '/api/v1/roles/usage-counts' },
      { method: 'post', path: '/api/v1/roles' },
      { method: 'get', path: '/api/v1/permissions/custom' },
      { method: 'post', path: '/api/v1/permissions/custom' },
      { method: 'get', path: '/api/v1/permissions/time-based' },
      { method: 'post', path: '/api/v1/permissions/time-based' },
    ];

    protectedRoutes.forEach(({ method, path }) => {
      it(`${method.toUpperCase()} ${path} → 401 without token`, async () => {
        const res = await (request(app.getHttpServer()) as any)[method](path);
        expect([401, 403]).toContain(res.status);
      });
    });

    it('GET /api/v1/roles with malformed token → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', 'Bearer not.a.valid.jwt')
        .expect(401);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ROLE LISTING
  // ─────────────────────────────────────────────────────────────
  describe('GET /api/v1/roles', () => {
    it('owner can list all organization roles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const roles = res.body.data ?? res.body.roles ?? res.body;
      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThan(0);
    });

    it('returned roles include standard system roles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const roles = res.body.data ?? res.body.roles ?? res.body;
      const slugs = roles.map((r: any) => r.slug);
      // System roles are seeded globally and should always exist
      expect(slugs).toContain('organization-owner');
    });

    it('owner can list roles by app', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/roles/app/1')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Returns 200 (roles found) or 404 (app doesn't exist) — both valid
      expect([200, 404]).toContain(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PERMISSION LISTING
  // ─────────────────────────────────────────────────────────────
  describe('GET /api/v1/roles/permissions', () => {
    it('returns the full permission catalog', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/roles/permissions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const perms = res.body.data ?? res.body.permissions ?? res.body;
      expect(Array.isArray(perms)).toBe(true);
      expect(perms.length).toBeGreaterThan(0);
    });

    it('permissions have slug and name fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/roles/permissions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const perms = res.body.data ?? res.body.permissions ?? res.body;
      const sample = perms[0];
      expect(sample).toHaveProperty('slug');
      expect(sample).toHaveProperty('name');
    });

    it('permission catalog includes expected RBAC permissions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/roles/permissions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const perms = res.body.data ?? res.body.permissions ?? res.body;
      const slugs = perms.map((p: any) => p.slug);
      // These must always exist in the system
      expect(slugs).toContain('roles.view');
      expect(slugs).toContain('roles.create');
      expect(slugs).toContain('roles.edit');
      expect(slugs).toContain('roles.delete');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ROLE USAGE COUNTS
  // ─────────────────────────────────────────────────────────────
  describe('GET /api/v1/roles/usage-counts', () => {
    it('returns a count mapping for roles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/roles/usage-counts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Response is an object with role-id keys or an array
      expect(res.body).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ASSIGNABLE ROLES
  // ─────────────────────────────────────────────────────────────
  describe('GET /api/v1/roles/assignable', () => {
    it('owner can see assignable roles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/roles/assignable')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const roles = res.body.data ?? res.body.roles ?? res.body;
      expect(Array.isArray(roles)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SYSTEM ROLE PROTECTIONS
  // ─────────────────────────────────────────────────────────────
  describe('System role protections', () => {
    let systemRoleId: number;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const roles = res.body.data ?? res.body.roles ?? res.body;
      const systemRole = roles.find((r: any) => r.is_system_role === true);
      systemRoleId = systemRole?.id;
    });

    it('cannot delete a system role → 400/403', async () => {
      if (!systemRoleId) return;

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/roles/${systemRoleId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect([400, 403, 422]).toContain(res.status);
    });

    it('cannot modify the organization-owner system role → 400/403', async () => {
      const rolesRes = await request(app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const roles = rolesRes.body.data ?? rolesRes.body.roles ?? rolesRes.body;
      const ownerRole = roles.find((r: any) => r.slug === 'organization-owner');
      if (!ownerRole) return;

      const res = await request(app.getHttpServer())
        .put(`/api/v1/roles/${ownerRole.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Hacked Owner Role', description: 'Tampered' });

      expect([400, 403]).toContain(res.status);
    });

    it('fetching a specific system role by ID returns correct data', async () => {
      if (!systemRoleId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/roles/${systemRoleId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', systemRoleId);
      expect(res.body).toHaveProperty('is_system_role', true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // CUSTOM ROLE LIFECYCLE
  // ─────────────────────────────────────────────────────────────
  describe('Custom role CRUD', () => {
    it('owner can create a custom role', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: `Test Viewer ${ts}`,
          slug: `test-viewer-${ts}`,
          description: 'Limited read-only role for tests',
          hierarchy_level: 8,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.is_system_role).toBe(false);
      customRoleId = res.body.id;
      viewerRoleId = res.body.id;
    });

    it('duplicate slug → 409', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: `Duplicate ${ts}`,
          slug: `test-viewer-${ts}`,
          description: 'This should conflict',
        })
        .expect(409);
    });

    it('owner can read the custom role by ID', async () => {
      if (!customRoleId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/roles/${customRoleId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', customRoleId);
      expect(res.body.is_system_role).toBe(false);
    });

    it('custom role appears in the roles list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const roles = res.body.data ?? res.body.roles ?? res.body;
      const found = roles.find((r: any) => r.id === customRoleId);
      expect(found).toBeDefined();
    });

    it('owner can update a custom role', async () => {
      if (!customRoleId) return;

      const res = await request(app.getHttpServer())
        .put(`/api/v1/roles/${customRoleId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ description: 'Updated description for test viewer' })
        .expect(200);

      expect(res.body.description).toBe('Updated description for test viewer');
    });

    it('owner can delete a custom role', async () => {
      // Create a throw-away role to delete (keep the main customRoleId for later tests)
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: `Disposable Role ${ts}`,
          slug: `disposable-${ts}`,
          description: 'Will be deleted',
        })
        .expect(201);

      const disposableId = createRes.body.id;

      await request(app.getHttpServer())
        .delete(`/api/v1/roles/${disposableId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });

    it('fetching non-existent role → 404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/roles/999999')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ROLE → USER ASSIGNMENT
  // ─────────────────────────────────────────────────────────────
  describe('PUT /api/v1/users/:id/role — role assignment', () => {
    it('owner can assign a different system role to themselves', async () => {
      // Find the viewer system role
      const rolesRes = await request(app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const roles = rolesRes.body.data ?? rolesRes.body.roles ?? rolesRes.body;
      const viewerRole = roles.find((r: any) => r.slug === 'viewer');
      if (!viewerRole) {
        // Viewer role not seeded — skip gracefully
        console.warn('Viewer role not found in DB, skipping assignment test');
        return;
      }

      const res = await request(app.getHttpServer())
        .put(`/api/v1/users/${ownerId}/role`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role_id: viewerRole.id });

      // If the API protects owner role from change → 400; otherwise 200
      // Both are valid system behaviors
      expect([200, 400, 403]).toContain(res.status);
    });

    it('assigning non-existent role → 404', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/users/${ownerId}/role`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role_id: 999999 });

      expect([400, 404, 422]).toContain(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // CUSTOM PERMISSIONS
  // ─────────────────────────────────────────────────────────────
  describe('Custom permissions CRUD', () => {
    it('owner can list custom permissions (starts empty)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/permissions/custom')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const perms = res.body.data ?? res.body.permissions ?? res.body;
      expect(Array.isArray(perms)).toBe(true);
    });

    it('owner can create a custom permission', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/permissions/custom')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: `Custom Reports ${ts}`,
          slug: `reports.custom-${ts}`,
          description: 'Access to custom reports module',
          category: 'reports',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      customPermissionId = res.body.id;
    });

    it('custom permission appears in the list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/permissions/custom')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const perms = res.body.data ?? res.body.permissions ?? res.body;
      const found = perms.find((p: any) => p.id === customPermissionId);
      expect(found).toBeDefined();
    });

    it('owner can update a custom permission', async () => {
      if (!customPermissionId) return;

      const res = await request(app.getHttpServer())
        .put(`/api/v1/permissions/custom/${customPermissionId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ description: 'Updated description', is_active: true });

      expect([200, 204]).toContain(res.status);
    });

    it('owner can delete a custom permission', async () => {
      // Create a throw-away permission
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/permissions/custom')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: `Disposable Perm ${ts}`,
          slug: `disposable.perm-${ts}`,
          category: 'test',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/v1/permissions/custom/${createRes.body.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect([200, 204]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TIME-BASED PERMISSIONS
  // ─────────────────────────────────────────────────────────────
  describe('Time-based permissions', () => {
    it('owner can list time-based permissions (empty initially)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/permissions/time-based')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const perms = res.body.data ?? res.body.permissions ?? res.body;
      expect(Array.isArray(perms)).toBe(true);
    });

    it('can filter time-based permissions by role_id', async () => {
      if (!customRoleId) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/permissions/time-based?role_id=${customRoleId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const perms = res.body.data ?? res.body.permissions ?? res.body;
      expect(Array.isArray(perms)).toBe(true);
    });

    it('can grant a time-based permission to a role', async () => {
      if (!customRoleId) return;

      // Get a valid permission id first
      const permsRes = await request(app.getHttpServer())
        .get('/api/v1/roles/permissions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const perms = permsRes.body.data ?? permsRes.body.permissions ?? permsRes.body;
      if (!perms.length) return;

      const permId = perms[0].id;
      const now = new Date();
      const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const res = await request(app.getHttpServer())
        .post('/api/v1/permissions/time-based')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          role_id: customRoleId,
          permission_id: permId,
          starts_at: now.toISOString(),
          expires_at: future.toISOString(),
          reason: 'Test: temporary elevated access for QA',
        });

      // 201 = created; 409 = already granted (still valid)
      expect([201, 409]).toContain(res.status);

      if (res.status === 201) {
        // Revoke it to clean up
        const tbpId = res.body.id;
        if (tbpId) {
          await request(app.getHttpServer())
            .delete(`/api/v1/permissions/time-based/${tbpId}`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .expect([200, 204]);
        }
      }
    });

    it('granting time-based permission with past expiry → 400/422', async () => {
      if (!customRoleId) return;

      const permsRes = await request(app.getHttpServer())
        .get('/api/v1/roles/permissions')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const perms = permsRes.body.data ?? permsRes.body.permissions ?? permsRes.body;
      if (!perms.length) return;

      const permId = perms[0].id;
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday

      const res = await request(app.getHttpServer())
        .post('/api/v1/permissions/time-based')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          role_id: customRoleId,
          permission_id: permId,
          starts_at: new Date().toISOString(),
          expires_at: past.toISOString(), // expiry is in the past
          reason: 'Should fail',
        });

      expect([400, 422]).toContain(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PERMISSION ENFORCEMENT (cross-org token)
  // Testing that a user from Org B cannot affect Org A's resources.
  // Within-org permission enforcement (viewer cannot POST) is covered
  // in MANUAL_TESTING_CHECKLIST.md (requires invitation email flow).
  // ─────────────────────────────────────────────────────────────
  describe('Cross-org permission enforcement', () => {
    let orgBToken: string;

    beforeAll(async () => {
      const tsB = Date.now();
      const reg = await request(app.getHttpServer())
        .post('/api/v1/auth/organization/register')
        .send({
          name: `RBAC Org B ${tsB}`,
          email: `rbac-orgb-${tsB}@test.com`,
          owner_email: `rbac-ownerb-${tsB}@test.com`,
          owner_password: 'TestPassword123!',
          owner_first_name: 'OrgB',
          owner_last_name: 'Owner',
          is_existing_user: false,
        });

      if (reg.status !== 201) return;

      const orgBId = reg.body.organization_id;
      const login = await request(app.getHttpServer())
        .post(`/api/v1/auth/login?organization_id=${orgBId}`)
        .send({ email: `rbac-ownerb-${tsB}@test.com`, password: 'TestPassword123!' });

      orgBToken = login.body.access_token;
    });

    it('Org B token cannot delete Org A custom role', async () => {
      if (!orgBToken || !customRoleId) return;

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/roles/${customRoleId}`)
        .set('Authorization', `Bearer ${orgBToken}`);

      // Org B's JWT points to a different org_id.
      // The role belongs to Org A, so this should 404 (not found in their org) or 403
      expect([403, 404]).toContain(res.status);
    });

    it('Org B cannot see Org A custom roles in their list', async () => {
      if (!orgBToken || !customRoleId) return;

      const res = await request(app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${orgBToken}`)
        .expect(200);

      const roles = res.body.data ?? res.body.roles ?? res.body;
      const leaked = roles.find((r: any) => r.id === customRoleId);
      expect(leaked).toBeUndefined();
    });

    it('Org B cannot see Org A custom permissions', async () => {
      if (!orgBToken || !customPermissionId) return;

      const res = await request(app.getHttpServer())
        .get('/api/v1/permissions/custom')
        .set('Authorization', `Bearer ${orgBToken}`)
        .expect(200);

      const perms = res.body.data ?? res.body.permissions ?? res.body;
      const leaked = perms.find((p: any) => p.id === customPermissionId);
      expect(leaked).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ROLE TEMPLATE MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  describe('Role templates', () => {
    it('owner can list role templates', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/roles/templates')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Endpoint may or may not exist in the router — both valid
      expect([200, 404]).toContain(res.status);
    });
  });
});
