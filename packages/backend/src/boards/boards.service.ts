import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Board, BoardDocument } from '../schemas/board.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateBoardDto } from './dto/create-board.dto';
import { generateSlug, ensureUniqueSlug } from './utils/slug.util';
import { ensureUniqueInviteCode } from './utils/invite-code.util';

@Injectable()
export class BoardsService {
  constructor(
    @InjectModel(Board.name) private boardModel: Model<BoardDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Create a new board with unique slug and invite code
   */
  async createBoard(dto: CreateBoardDto): Promise<BoardDocument> {
    const baseSlug = generateSlug(dto.name);
    const slug = await ensureUniqueSlug(baseSlug, this.boardModel);
    const inviteCode = await ensureUniqueInviteCode(this.boardModel);

    const board = new this.boardModel({
      name: dto.name,
      slug,
      createdBy: dto.createdBy,
      admins: [dto.createdBy], // Creator is automatically an admin
      members: [dto.createdBy], // Creator is automatically a member
      inviteCode,
      settings: dto.settings || {},
    });

    const savedBoard = await board.save();

    // Add board slug to user's boardSlugs array
    await this.userModel.findOneAndUpdate(
      { username: dto.createdBy },
      { $addToSet: { boardSlugs: savedBoard.slug } },
    );

    return savedBoard;
  }

  /**
   * Find a board by its slug
   */
  async findBySlug(slug: string): Promise<BoardDocument> {
    const board = await this.boardModel.findOne({ slug });
    if (!board) {
      throw new NotFoundException(`Board with slug "${slug}" not found`);
    }
    return board;
  }

  /**
   * Find a board by its invite code
   */
  async findByInviteCode(code: string): Promise<BoardDocument> {
    const board = await this.boardModel.findOne({ inviteCode: code });
    if (!board) {
      throw new NotFoundException(`Board with invite code "${code}" not found`);
    }
    return board;
  }

  /**
   * Find all boards where a user is a member or admin
   */
  async findBoardsByUsername(username: string): Promise<BoardDocument[]> {
    return this.boardModel
      .find({
        $or: [{ admins: username }, { members: username }],
      })
      .sort({ lastActivity: -1 });
  }

  /**
   * Add a pending access request to a board
   */
  async addPendingRequest(
    boardId: string,
    username: string,
    message?: string,
  ): Promise<BoardDocument> {
    const board = await this.boardModel.findById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    // Check if user is already a member
    if (board.members.includes(username)) {
      throw new BadRequestException('User is already a member of this board');
    }

    // Check if user already has a pending request
    const existingRequest = board.pendingRequests.find(
      (req) => req.username === username,
    );
    if (existingRequest) {
      throw new BadRequestException('User already has a pending access request');
    }

    board.pendingRequests.push({
      username,
      requestedAt: new Date(),
      message,
    });

    return board.save();
  }

  /**
   * Approve a member's access request
   */
  async approveMember(
    boardId: string,
    adminUsername: string,
    usernameToApprove: string,
  ): Promise<BoardDocument> {
    const board = await this.boardModel.findById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    // Check if requester is an admin
    if (!board.admins.includes(adminUsername)) {
      throw new ForbiddenException('Only admins can approve members');
    }

    // Find the pending request
    const requestIndex = board.pendingRequests.findIndex(
      (req) => req.username === usernameToApprove,
    );
    if (requestIndex === -1) {
      throw new NotFoundException('Access request not found');
    }

    // Remove from pending requests and add to members
    board.pendingRequests.splice(requestIndex, 1);
    board.members.push(usernameToApprove);

    const savedBoard = await board.save();

    // Add board slug to approved user's boardSlugs array
    await this.userModel.findOneAndUpdate(
      { username: usernameToApprove },
      { $addToSet: { boardSlugs: savedBoard.slug } },
    );

    return savedBoard;
  }

  /**
   * Deny a member's access request
   */
  async denyRequest(
    boardId: string,
    adminUsername: string,
    usernameToDeny: string,
  ): Promise<BoardDocument> {
    const board = await this.boardModel.findById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    // Check if requester is an admin
    if (!board.admins.includes(adminUsername)) {
      throw new ForbiddenException('Only admins can deny requests');
    }

    // Find and remove the pending request
    const requestIndex = board.pendingRequests.findIndex(
      (req) => req.username === usernameToDeny,
    );
    if (requestIndex === -1) {
      throw new NotFoundException('Access request not found');
    }

    board.pendingRequests.splice(requestIndex, 1);

    return board.save();
  }

  /**
   * Check if a user is a member of a board
   */
  async isMember(boardId: string, username: string): Promise<boolean> {
    const board = await this.boardModel.findById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    return board.members.includes(username);
  }

  /**
   * Check if a user is an admin of a board
   */
  async isAdmin(boardId: string, username: string): Promise<boolean> {
    const board = await this.boardModel.findById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    return board.admins.includes(username);
  }

  /**
   * Update board settings (admin only)
   */
  async updateBoardSettings(
    boardId: string,
    adminUsername: string,
    settings: Partial<Board['settings']>,
  ): Promise<BoardDocument> {
    const board = await this.boardModel.findById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    // Check if requester is an admin
    if (!board.admins.includes(adminUsername)) {
      throw new ForbiddenException('Only admins can update board settings');
    }

    board.settings = { ...board.settings, ...settings };
    return board.save();
  }
}
