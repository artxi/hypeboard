import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { BoardsService } from './boards.service';
import { Board } from '../schemas/board.schema';
import { User } from '../schemas/user.schema';
import * as slugUtil from './utils/slug.util';
import * as inviteCodeUtil from './utils/invite-code.util';

describe('BoardsService', () => {
  let service: BoardsService;
  let mockBoardModel: any;
  let mockUserModel: any;

  const mockUserId = '507f1f77bcf86cd799439011';
  const mockUserId2 = '507f1f77bcf86cd799439012';
  const mockBoardId = '607f1f77bcf86cd799439021';

  beforeEach(async () => {
    // Mock Board model constructor
    mockBoardModel = jest.fn();
    mockBoardModel.findOne = jest.fn();
    mockBoardModel.findById = jest.fn();
    mockBoardModel.find = jest.fn();
    mockBoardModel.findByIdAndUpdate = jest.fn();

    // Mock User model
    mockUserModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardsService,
        {
          provide: getModelToken(Board.name),
          useValue: mockBoardModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<BoardsService>(BoardsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBoard', () => {
    it('should create board with unique slug and invite code', async () => {
      const createBoardDto = {
        name: 'Test Board',
        createdBy: 'testuser',
      };

      const mockUser = { _id: mockUserId, username: 'testuser' };
      mockUserModel.findOne.mockResolvedValue(mockUser);

      jest.spyOn(slugUtil, 'generateSlug').mockReturnValue('test-board');
      jest.spyOn(slugUtil, 'ensureUniqueSlug').mockResolvedValue('test-board');
      jest.spyOn(inviteCodeUtil, 'ensureUniqueInviteCode').mockResolvedValue('ABC123');

      const mockBoard = {
        _id: mockBoardId,
        name: 'Test Board',
        slug: 'test-board',
        inviteCode: 'ABC123',
        createdBy: mockUserId,
        admins: [mockUserId],
        members: [mockUserId],
        settings: {},
        save: jest.fn().mockResolvedValue({
          _id: mockBoardId,
          slug: 'test-board',
          populate: jest.fn().mockResolvedValue({
            _id: mockBoardId,
            slug: 'test-board',
          }),
        }),
      };

      mockBoardModel.mockImplementation(() => mockBoard);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      const result = await service.createBoard(createBoardDto);

      expect(result).toBeDefined();
      expect(slugUtil.ensureUniqueSlug).toHaveBeenCalledWith('test-board', mockBoardModel);
      expect(inviteCodeUtil.ensureUniqueInviteCode).toHaveBeenCalledWith(mockBoardModel);
    });

    it('should add creator as admin and member', async () => {
      const createBoardDto = {
        name: 'Test Board',
        createdBy: 'testuser',
      };

      const mockUser = { _id: mockUserId, username: 'testuser' };
      mockUserModel.findOne.mockResolvedValue(mockUser);

      jest.spyOn(slugUtil, 'generateSlug').mockReturnValue('test-board');
      jest.spyOn(slugUtil, 'ensureUniqueSlug').mockResolvedValue('test-board');
      jest.spyOn(inviteCodeUtil, 'ensureUniqueInviteCode').mockResolvedValue('ABC123');

      let boardData: any = null;
      const mockBoard = {
        _id: mockBoardId,
        save: jest.fn().mockResolvedValue({
          _id: mockBoardId,
          slug: 'test-board',
          populate: jest.fn().mockResolvedValue({
            _id: mockBoardId,
            slug: 'test-board',
          }),
        }),
      };

      mockBoardModel.mockImplementation((data: any) => {
        boardData = data;
        return { ...mockBoard, ...data };
      });

      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      await service.createBoard(createBoardDto);

      expect(boardData.admins).toEqual([mockUserId]);
      expect(boardData.members).toEqual([mockUserId]);
      expect(boardData.createdBy).toEqual(mockUserId);
    });

    it('should update user\'s boardSlugs array', async () => {
      const createBoardDto = {
        name: 'Test Board',
        createdBy: 'testuser',
      };

      const mockUser = { _id: mockUserId, username: 'testuser' };
      mockUserModel.findOne.mockResolvedValue(mockUser);

      jest.spyOn(slugUtil, 'generateSlug').mockReturnValue('test-board');
      jest.spyOn(slugUtil, 'ensureUniqueSlug').mockResolvedValue('test-board');
      jest.spyOn(inviteCodeUtil, 'ensureUniqueInviteCode').mockResolvedValue('ABC123');

      const mockBoard = {
        _id: mockBoardId,
        slug: 'test-board',
        save: jest.fn().mockResolvedValue({
          _id: mockBoardId,
          slug: 'test-board',
          populate: jest.fn().mockResolvedValue({
            _id: mockBoardId,
            slug: 'test-board',
          }),
        }),
      };

      mockBoardModel.mockImplementation(() => mockBoard);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      await service.createBoard(createBoardDto);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        { $addToSet: { boardSlugs: 'test-board' } },
      );
    });
  });

  describe('findBySlug', () => {
    it('should return board when slug exists', async () => {
      const mockBoard = {
        _id: mockBoardId,
        slug: 'test-board',
        name: 'Test Board',
      };

      mockBoardModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockBoard),
      });

      const result = await service.findBySlug('test-board');

      expect(result).toEqual(mockBoard);
      expect(mockBoardModel.findOne).toHaveBeenCalledWith({ slug: 'test-board' });
    });

    it('should throw NotFoundException when slug does not exist', async () => {
      mockBoardModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findBySlug('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByInviteCode', () => {
    it('should return board when invite code exists', async () => {
      const mockBoard = {
        _id: mockBoardId,
        inviteCode: 'ABC123',
        name: 'Test Board',
      };

      mockBoardModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockBoard),
      });

      const result = await service.findByInviteCode('ABC123');

      expect(result).toEqual(mockBoard);
      expect(mockBoardModel.findOne).toHaveBeenCalledWith({ inviteCode: 'ABC123' });
    });

    it('should throw NotFoundException when invite code does not exist', async () => {
      mockBoardModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findByInviteCode('INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addPendingRequest', () => {
    it('should add request to board', async () => {
      const mockUser = { _id: mockUserId, username: 'testuser' };
      const mockBoard = {
        _id: mockBoardId,
        members: [],
        pendingRequests: [],
        save: jest.fn().mockResolvedValue({
          populate: jest.fn().mockResolvedValue({
            _id: mockBoardId,
            pendingRequests: [{ userId: mockUserId, requestedAt: expect.any(Date) }],
          }),
        }),
        push: jest.fn(),
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockBoardModel.findById.mockResolvedValue(mockBoard);

      const result = await service.addPendingRequest(mockBoardId, 'testuser', 'Please let me in');

      expect(mockBoard.pendingRequests).toHaveLength(1);
      expect(mockBoard.pendingRequests[0].userId).toEqual(mockUserId);
    });

    it('should throw BadRequestException if already member', async () => {
      const mockUser = { _id: mockUserId, username: 'testuser' };
      const mockBoard = {
        _id: mockBoardId,
        members: [mockUserId],
        pendingRequests: [],
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockBoardModel.findById.mockResolvedValue(mockBoard);

      await expect(
        service.addPendingRequest(mockBoardId, 'testuser'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveMember', () => {
    it('should add user to members and update boardSlugs', async () => {
      const mockAdmin = { _id: mockUserId, username: 'admin' };
      const mockUser = { _id: mockUserId2, username: 'newmember' };
      const mockBoard = {
        _id: mockBoardId,
        slug: 'test-board',
        admins: [mockUserId],
        members: [mockUserId],
        pendingRequests: [{ userId: mockUserId2, requestedAt: new Date() }],
        save: jest.fn().mockResolvedValue({
          slug: 'test-board',
          populate: jest.fn().mockResolvedValue({
            _id: mockBoardId,
            members: [mockUserId, mockUserId2],
            pendingRequests: [],
          }),
        }),
        splice: jest.fn(),
        push: jest.fn(),
      };

      mockUserModel.findOne.mockImplementation((query: any) => {
        if (query.username === 'admin') return Promise.resolve(mockAdmin);
        if (query.username === 'newmember') return Promise.resolve(mockUser);
        return Promise.resolve(null);
      });
      mockBoardModel.findById.mockResolvedValue(mockBoard);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      const result = await service.approveMember(mockBoardId, 'admin', 'newmember');

      expect(mockBoard.members).toContain(mockUserId2);
      expect(mockBoard.pendingRequests).toHaveLength(0);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId2,
        { $addToSet: { boardSlugs: 'test-board' } },
      );
    });

    it('should throw ForbiddenException if not admin', async () => {
      const mockNonAdmin = { _id: mockUserId2, username: 'nonadmin' };
      const mockUser = { _id: mockUserId, username: 'member' };
      const mockBoard = {
        _id: mockBoardId,
        admins: [mockUserId],
        pendingRequests: [{ userId: mockUserId, requestedAt: new Date() }],
      };

      mockUserModel.findOne.mockImplementation((query: any) => {
        if (query.username === 'nonadmin') return Promise.resolve(mockNonAdmin);
        if (query.username === 'member') return Promise.resolve(mockUser);
        return Promise.resolve(null);
      });
      mockBoardModel.findById.mockResolvedValue(mockBoard);

      await expect(
        service.approveMember(mockBoardId, 'nonadmin', 'member'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('denyRequest', () => {
    it('should remove pending request (admin only)', async () => {
      const mockAdmin = { _id: mockUserId, username: 'admin' };
      const mockUser = { _id: mockUserId2, username: 'requester' };
      const mockBoard = {
        _id: mockBoardId,
        admins: [mockUserId],
        pendingRequests: [{ userId: mockUserId2, requestedAt: new Date() }],
        save: jest.fn().mockResolvedValue({
          populate: jest.fn().mockResolvedValue({
            _id: mockBoardId,
            pendingRequests: [],
          }),
        }),
        splice: jest.fn(),
      };

      mockUserModel.findOne.mockImplementation((query: any) => {
        if (query.username === 'admin') return Promise.resolve(mockAdmin);
        if (query.username === 'requester') return Promise.resolve(mockUser);
        return Promise.resolve(null);
      });
      mockBoardModel.findById.mockResolvedValue(mockBoard);

      const result = await service.denyRequest(mockBoardId, 'admin', 'requester');

      expect(mockBoard.pendingRequests).toHaveLength(0);
    });
  });
});
