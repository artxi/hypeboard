import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  rootMongooseTestModule,
  closeInMongodConnection,
  clearDatabase,
} from '../../test/utils/test-db';
import { BoardsModule } from './boards.module';
import { AuthModule } from '../auth/auth.module';
import { Board, BoardSchema } from '../schemas/board.schema';
import { User, UserSchema } from '../schemas/user.schema';

describe('Boards E2E', () => {
  let app: INestApplication;
  let adminToken: string;
  let memberToken: string;
  let adminUsername: string;
  let memberUsername: string;
  let boardSlug: string;
  let inviteCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        rootMongooseTestModule(),
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: Board.name, schema: BoardSchema },
        ]),
        AuthModule,
        BoardsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await closeInMongodConnection();
    await app.close();
  });

  afterEach(async () => {
    // Don't clear database between tests in this suite since we build on previous tests
  });

  describe('Setup test users', () => {
    it('should register admin user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'adminuser',
          password: 'password123',
        })
        .expect(201);

      adminToken = response.body.accessToken;
      adminUsername = 'adminuser';
    });

    it('should register member user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'memberuser',
          password: 'password123',
        })
        .expect(201);

      memberToken = response.body.accessToken;
      memberUsername = 'memberuser';
    });
  });

  describe('POST /boards', () => {
    it('should create board (requires auth)', async () => {
      const createBoardDto = {
        name: 'Test Board',
        createdBy: adminUsername,
      };

      const response = await request(app.getHttpServer())
        .post('/boards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createBoardDto)
        .expect(201);

      expect(response.body).toHaveProperty('board');
      expect(response.body).toHaveProperty('inviteLink');
      expect(response.body.board.name).toBe('Test Board');
      expect(response.body.board.slug).toBeDefined();
      expect(response.body.board.createdBy).toBe(adminUsername);
      expect(response.body.board.admins).toContain(adminUsername);
      expect(response.body.board.members).toContain(adminUsername);

      // Save for later tests
      boardSlug = response.body.board.slug;
      inviteCode = response.body.board.inviteCode;
    });

    it('should return 401 without auth token', async () => {
      const createBoardDto = {
        name: 'Another Board',
        createdBy: adminUsername,
      };

      await request(app.getHttpServer())
        .post('/boards')
        .send(createBoardDto)
        .expect(401);
    });
  });

  describe('GET /boards/:slug', () => {
    it('should return board details for members', async () => {
      const response = await request(app.getHttpServer())
        .get(`/boards/${boardSlug}`)
        .query({ username: adminUsername })
        .expect(200);

      expect(response.body.name).toBe('Test Board');
      expect(response.body.slug).toBe(boardSlug);
      expect(response.body.createdBy).toBe(adminUsername);
      expect(response.body.admins).toContain(adminUsername);
      expect(response.body.members).toContain(adminUsername);
      expect(response.body).toHaveProperty('inviteCode');
    });

    it('should return 404 for non-members', async () => {
      await request(app.getHttpServer())
        .get(`/boards/${boardSlug}`)
        .query({ username: memberUsername })
        .expect(404);
    });
  });

  describe('GET /boards/invite/:code', () => {
    it('should return board info from invite code (public)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/boards/invite/${inviteCode}`)
        .expect(200);

      expect(response.body.name).toBe('Test Board');
      expect(response.body.slug).toBe(boardSlug);
      expect(response.body.createdBy).toBe(adminUsername);
    });

    it('should return 404 for invalid invite code', async () => {
      await request(app.getHttpServer())
        .get('/boards/invite/INVALID')
        .expect(404);
    });
  });

  describe('POST /boards/:slug/request-access', () => {
    it('should add pending request', async () => {
      const requestAccessDto = {
        username: memberUsername,
        message: 'Please let me join!',
      };

      const response = await request(app.getHttpServer())
        .post(`/boards/${boardSlug}/request-access`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(requestAccessDto)
        .expect(200);

      expect(response.body.message).toContain('submitted successfully');
      expect(response.body.status).toBe('pending');
    });

    it('should return 400 if user already has pending request', async () => {
      const requestAccessDto = {
        username: memberUsername,
        message: 'Another request',
      };

      await request(app.getHttpServer())
        .post(`/boards/${boardSlug}/request-access`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(requestAccessDto)
        .expect(400);
    });
  });

  describe('POST /boards/:slug/approve-member', () => {
    it('should approve member (requires auth + admin)', async () => {
      const approveMemberDto = {
        adminUsername: adminUsername,
        usernameToApprove: memberUsername,
      };

      const response = await request(app.getHttpServer())
        .post(`/boards/${boardSlug}/approve-member`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(approveMemberDto)
        .expect(200);

      expect(response.body.message).toContain('approved successfully');
      expect(response.body.members).toContain(memberUsername);
    });

    it('should return 401 without auth token', async () => {
      const approveMemberDto = {
        adminUsername: adminUsername,
        usernameToApprove: 'someuser',
      };

      await request(app.getHttpServer())
        .post(`/boards/${boardSlug}/approve-member`)
        .send(approveMemberDto)
        .expect(401);
    });
  });

  describe('POST /boards/:slug/deny-request', () => {
    beforeAll(async () => {
      // Register another user to test deny
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'denyuser',
          password: 'password123',
        });

      const denyUserToken = response.body.accessToken;

      // Request access
      await request(app.getHttpServer())
        .post(`/boards/${boardSlug}/request-access`)
        .set('Authorization', `Bearer ${denyUserToken}`)
        .send({
          username: 'denyuser',
          message: 'Please approve',
        });
    });

    it('should deny request (requires auth + admin)', async () => {
      const denyRequestDto = {
        adminUsername: adminUsername,
        usernameToDeny: 'denyuser',
      };

      const response = await request(app.getHttpServer())
        .post(`/boards/${boardSlug}/deny-request`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(denyRequestDto)
        .expect(200);

      expect(response.body.message).toContain('denied');
    });

    it('should return 403 if non-admin tries to deny', async () => {
      // First create another pending request
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'anotheruser',
          password: 'password123',
        });

      const anotherUserToken = response.body.accessToken;

      await request(app.getHttpServer())
        .post(`/boards/${boardSlug}/request-access`)
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .send({
          username: 'anotheruser',
          message: 'Let me in',
        });

      // Member (non-admin) tries to deny
      const denyRequestDto = {
        adminUsername: memberUsername,
        usernameToDeny: 'anotheruser',
      };

      await request(app.getHttpServer())
        .post(`/boards/${boardSlug}/deny-request`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(denyRequestDto)
        .expect(403);
    });
  });

  describe('GET /boards', () => {
    it('should get user boards (requires auth)', async () => {
      const response = await request(app.getHttpServer())
        .get('/boards')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ username: adminUsername })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].slug).toBe(boardSlug);
    });
  });
});
