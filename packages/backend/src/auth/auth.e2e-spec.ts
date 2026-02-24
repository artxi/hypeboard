import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import {
  rootMongooseTestModule,
  closeInMongodConnection,
  clearDatabase,
} from '../../test/utils/test-db';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth.module';
import { User, UserSchema } from '../schemas/user.schema';

describe('Auth E2E', () => {
  let app: INestApplication;
  let authToken: string;
  let testUsername: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        rootMongooseTestModule(),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        AuthModule,
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
    await clearDatabase();
  });

  describe('POST /auth/register', () => {
    it('should register new user with 201 status', async () => {
      const registerDto = {
        username: 'newuser',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('newuser');
      expect(response.body.user.boardSlugs).toEqual([]);

      // Save for later tests
      testUsername = registerDto.username;
      authToken = response.body.accessToken;
    });

    it('should return 409 for duplicate username', async () => {
      const registerDto = {
        username: 'duplicateuser',
        password: 'password123',
      };

      // Register once
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Try to register again with same username
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);

      expect(response.body.message).toContain('Username already exists');
    });

    it('should return 400 for invalid registration data', async () => {
      const invalidDto = {
        username: '',
        password: 'short',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Register a user for login tests
      const registerDto = {
        username: 'loginuser',
        password: 'password123',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);
    });

    it('should login with valid credentials', async () => {
      const loginDto = {
        username: 'loginuser',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('loginuser');
    });

    it('should return 401 for invalid credentials', async () => {
      const loginDto = {
        username: 'loginuser',
        password: 'wrongpassword',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });

    it('should return 401 for non-existent user', async () => {
      const loginDto = {
        username: 'nonexistent',
        password: 'password123',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    beforeEach(async () => {
      // Register and get token
      const registerDto = {
        username: 'meuser',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto);

      authToken = response.body.accessToken;
    });

    it('should return user info with valid JWT', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.username).toBe('meuser');
      expect(response.body).toHaveProperty('boardSlugs');
    });

    it('should return 401 without JWT token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should return 401 with invalid JWT token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });
  });
});
