import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../schemas/user.schema';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserModel: any;
  let mockJwtService: any;

  beforeEach(async () => {
    // Create mock user model constructor
    mockUserModel = jest.fn();
    mockUserModel.findOne = jest.fn();
    mockUserModel.findById = jest.fn();

    // Create mock JWT service
    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock.jwt.token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create user and return JWT token', async () => {
      const registerDto = {
        username: 'newuser',
        password: 'password123',
      };

      mockUserModel.findOne.mockResolvedValue(null);

      // Mock the user model constructor and save
      const mockUser = {
        _id: 'user123',
        username: 'newuser',
        boardSlugs: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.mockImplementation(() => mockUser);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        accessToken: 'mock.jwt.token',
        user: {
          username: 'newuser',
          boardSlugs: [],
        },
      });
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username: 'newuser' });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user123',
        username: 'newuser',
      });
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if username exists', async () => {
      const registerDto = {
        username: 'existinguser',
        password: 'password123',
      };

      mockUserModel.findOne.mockResolvedValue({ username: 'existinguser' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username: 'existinguser' });
    });

    it('should hash password correctly', async () => {
      const registerDto = {
        username: 'newuser',
        password: 'plainpassword',
      };

      mockUserModel.findOne.mockResolvedValue(null);

      const mockUser = {
        _id: 'user123',
        username: 'newuser',
        passwordHash: '',
        boardSlugs: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.mockImplementation(function(data: any) {
        mockUser.passwordHash = data.passwordHash;
        return mockUser;
      });

      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');

      await service.register(registerDto);

      expect(bcryptHashSpy).toHaveBeenCalledWith('plainpassword', 10);
      expect(mockUser.passwordHash).toBeDefined();
      expect(typeof mockUser.passwordHash).toBe('string');
    });
  });

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      const username = 'testuser';
      const password = 'correctpassword';
      const hashedPassword = await bcrypt.hash(password, 10);

      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        passwordHash: hashedPassword,
        boardSlugs: ['board1', 'board2'],
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser(username, password);

      expect(result).toEqual({
        _id: 'user123',
        username: 'testuser',
        boardSlugs: ['board1', 'board2'],
      });
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username });
    });

    it('should return null for invalid password', async () => {
      const username = 'testuser';
      const password = 'wrongpassword';
      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        passwordHash: hashedPassword,
        boardSlugs: [],
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser(username, password);

      expect(result).toBeNull();
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username });
    });

    it('should return null for non-existent user', async () => {
      const username = 'nonexistent';
      const password = 'somepassword';

      mockUserModel.findOne.mockResolvedValue(null);

      const result = await service.validateUser(username, password);

      expect(result).toBeNull();
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username });
    });
  });

  describe('login', () => {
    it('should generate JWT with correct payload', async () => {
      const user = {
        _id: 'user123',
        username: 'testuser',
        boardSlugs: ['board1'],
      };

      const result = await service.login(user);

      expect(result).toEqual({
        accessToken: 'mock.jwt.token',
        user: {
          username: 'testuser',
          boardSlugs: ['board1'],
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user123',
        username: 'testuser',
      });
    });
  });
});
