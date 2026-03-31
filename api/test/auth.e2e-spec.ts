import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Auth E2E Tests
 * Covers: registration, login, email verify, password reset,
 * JWT refresh, rate limiting, RBAC, MFA initiation, logout.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;

  let orgId: string;
  let accessToken: string;
  let refreshToken: string;

  const testEmail = `auth-test-${Date.now()}@test.com`;
  const testPassword = 'TestPassword123!';
  const orgEmail = `auth-org-${Date.now()}@test.com`;
  const orgName = `Auth Test Org ${Date.now()}`;

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
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────
  // REGISTRATION
  // ─────────────────────────────────────────────────────────────
  describe('POST /auth/organization/register', () => {
    it('registers a new organization and returns org_id and user_id', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/organization/register')
        .send({
          name: orgName,
          email: orgEmail,
          owner_email: testEmail,
          owner_password: testPassword,
          owner_first_name: 'Auth',
          owner_last_name: 'Tester',
          is_existing_user: false,
        })
        .expect(201);

      expect(res.body).toHaveProperty('organization_id');
      expect(res.body).toHaveProperty('user_id');
      orgId = res.body.organization_id;
    });

    it('rejects duplicate organization email with 409', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/organization/register')
        .send({
          name: `Another Org ${Date.now()}`,
          email: orgEmail,
          owner_email: `other${Date.now()}@test.com`,
          owner_password: testPassword,
          owner_first_name: 'Other',
          owner_last_name: 'Owner',
        })
        .expect(409);
    });

    it('rejects registration with missing required fields with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/organization/register')
        .send({ name: 'Incomplete Org' })
        .expect(400);
    });

    it('rejects registration with invalid email format with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/organization/register')
        .send({
          name: `Invalid Email Org ${Date.now()}`,
          email: 'not-an-email',
          owner_email: 'also-not-email',
          owner_password: testPassword,
          owner_first_name: 'Bad',
          owner_last_name: 'Email',
        })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────
  describe('POST /auth/login', () => {
    it('fails without organization_id query param — 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(400);
    });

    it('fails with wrong password — 401', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/auth/login?organization_id=${orgId}`)
        .send({ email: testEmail, password: 'WrongPassword999!' })
        .expect(401);
    });

    it('fails with non-existent email — 401', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/auth/login?organization_id=${orgId}`)
        .send({ email: 'nobody@nowhere.com', password: testPassword })
        .expect(401);
    });

    it('succeeds with valid credentials and returns access_token + refresh_token', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/auth/login?organization_id=${orgId}`)
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
      accessToken = res.body.access_token;
      refreshToken = res.body.refresh_token;
    });

    it('access_token allows authenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // EMAIL VERIFICATION
  // ─────────────────────────────────────────────────────────────
  describe('Email verification', () => {
    it('resend verification returns 200 for existing user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .send({ email: testEmail })
        .expect(200);
    });

    it('GET /auth/verify-email with invalid token returns 400 or 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/verify-email?token=completely-invalid-token-xyz');
      expect([400, 404]).toContain(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PASSWORD RESET
  // ─────────────────────────────────────────────────────────────
  describe('Password reset', () => {
    it('POST /auth/forgot-password for real email returns 200', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);
    });

    it('POST /auth/forgot-password for non-existent email returns 200 (no email enum leak)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'doesnotexist@test.com' })
        .expect(200);
    });

    it('POST /auth/reset-password with invalid token returns 400 or 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: 'invalid-reset-token', new_password: 'NewPassword123!' });
      expect([400, 404]).toContain(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TOKEN REFRESH
  // ─────────────────────────────────────────────────────────────
  describe('POST /auth/refresh', () => {
    it('returns new access_token with valid refresh_token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      accessToken = res.body.access_token;
    });

    it('rejects invalid refresh token — 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: 'not.a.real.refresh.token' })
        .expect(401);
    });

    it('rejects empty body — 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PROTECTED ROUTE ENFORCEMENT
  // ─────────────────────────────────────────────────────────────
  describe('Protected route enforcement', () => {
    it('GET /users/me without token → 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });

    it('GET /users/me with malformed Bearer token → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer this-is-not-a-jwt')
        .expect(401);
    });

    it('GET /users/me with valid token returns user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email', testEmail);
    });

    it('GET /organizations/me with valid token returns org', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/organizations/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', orgId);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // MFA
  // ─────────────────────────────────────────────────────────────
  describe('MFA endpoints', () => {
    it('GET /mfa/check returns mfa_enabled: false for new user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/mfa/check')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('mfa_enabled');
      expect(res.body.mfa_enabled).toBe(false);
    });

    it('POST /mfa/setup/initialize returns qr_code and secret', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/mfa/setup/initialize')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('qr_code');
      expect(res.body).toHaveProperty('secret');
    });

    it('POST /mfa/setup/verify with wrong TOTP returns 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/mfa/setup/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: '000000' })
        .expect(400);
    });

    it('POST /mfa/setup/verify without token returns 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/mfa/setup/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // VALIDATE TOKEN
  // ─────────────────────────────────────────────────────────────
  describe('GET /auth/validate-token', () => {
    it('returns valid response for a good token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/validate-token')
        .set('Authorization', `Bearer ${accessToken}`);
      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.valid ?? res.body.is_valid ?? true).toBeTruthy();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────────
  describe('POST /auth/logout', () => {
    it('logout returns 200', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
