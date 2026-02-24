import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
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
   * Helper method to convert username to ObjectId
   */
  private async getUserIdByUsername(username: string): Promise<MongooseSchema.Types.ObjectId> {
    const user = await this.userModel.findOne({ username });
    if (!user) {
      throw new NotFoundException(`User '${username}' not found`);
    }
    return user._id;
  }

  /**
   * Create a new board with unique slug and invite code
   */
  async createBoard(dto: CreateBoardDto): Promise<BoardDocument> {
    // Convert username to ObjectId
    const creatorId = await this.getUserIdByUsername(dto.createdBy);

    const baseSlug = generateSlug(dto.name);
    const slug = await ensureUniqueSlug(baseSlug, this.boardModel);
    const inviteCode = await ensureUniqueInviteCode(this.boardModel);

    const board = new this.boardModel({
      name: dto.name,
      slug,
      createdBy: creatorId,
      admins: [creatorId], // Creator is automatically an admin
      members: [creatorId], // Creator is automatically a member
      inviteCode,
      settings: dto.settings || {},
    });

    const savedBoard = await board.save();

    // Add board slug to user's boardSlugs array
    await this.userModel.findByIdAndUpdate(
      creatorId,
      { $addToSet: { boardSlugs: savedBoard.slug } },
    );

    // Populate before returning
    return savedBoard.populate(['createdBy', 'admins', 'members']);
  }

  /**
   * Find a board by its slug
   */
  async findBySlug(slug: string): Promise<BoardDocument> {
    const board = await this.boardModel
      .findOne({ slug })
      .populate(['createdBy', 'admins', 'members', 'pendingRequests.userId']);
    if (!board) {
      throw new NotFoundException(`Board with slug "${slug}" not found`);
    }
    return board;
  }

  /**
   * Find a board by its invite code
   */
  async findByInviteCode(code: string): Promise<BoardDocument> {
    const board = await this.boardModel
      .findOne({ inviteCode: code })
      .populate(['createdBy', 'admins', 'members']);
    if (!board) {
      throw new NotFoundException(`Board with invite code "${code}" not found`);
    }
    return board;
  }

  /**
   * Find all boards where a user is a member or admin
   */
  async findBoardsByUsername(username: string): Promise<BoardDocument[]> {
    const userId = await this.getUserIdByUsername(username);

    return this.boardModel
      .find({
        $or: [{ admins: userId }, { members: userId }],
      })
      .populate(['createdBy', 'admins', 'members'])
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
    const userId = await this.getUserIdByUsername(username);

    const board = await this.boardModel.findById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    // Check if user is already a member
    if (board.members.some(id => id.toString() === userId.toString())) {
      throw new BadRequestException('User is already a member of this board');
    }

    // Check if user already has a pending request
    const existingRequest = board.pendingRequests.find(
      (req) => req.userId.toString() === userId.toString(),
    );
    if (existingRequest) {
      throw new BadRequestException('User already has a pending access request');
    }

    board.pendingRequests.push({
      userId,
      requestedAt: new Date(),
      message,
    });

    const savedBoard = await board.save();
    return savedBoard.populate(['createdBy', 'admins', 'members', 'pendingRequests.userId']);
  }

  /**
   * Approve a member's access request
   */
  async approveMember(
    boardId: string,
    adminUsername: string,
    usernameToApprove: string,
  ): Promise<BoardDocument> {
    const adminId = await this.getUserIdByUsername(adminUsername);
    const userIdToApprove = await this.getUserIdByUsername(usernameToApprove);

    const board = await this.boardModel.findById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    // Check if requester is an admin
    if (!board.admins.some(id => id.toString() === adminId.toString())) {
      throw new ForbiddenException('Only admins can approve members');
    }

    // Find the pending request
    const requestIndex = board.pendingRequests.findIndex(
      (req) => req.userId.toString() === userIdToApprove.toString(),
    );
    if (requestIndex === -1) {
      throw new NotFoundException('Access request not found');
    }

    // Remove from pending requests and add to members
    board.pendingRequests.splice(requestIndex, 1);
    board.members.push(userIdToApprove);

    const savedBoard = await board.save();

    // Add board slug to approved user's boardSlugs array
    await this.userModel.findByIdAndUpdate(
      userIdToApprove,
      { $addToSet: { boardSlugs: savedBoard.slug } },
    );

    return savedBoard.populate(['createdBy', 'admins', 'members', 'pendingRequests.userId']);
  }

  /**
   * Deny a member's access request
   */
  async denyRequest(
    boardId: string,
    adminUsername: string,
    usernameToDeny: string,
  ): Promise<BoardDocument> {
    const adminId = await this.getUserIdByUsername(adminUsername);
    const userIdToDeny = await this.getUserIdByUsername(usernameToDeny);

    const board = await this.boardModel.findById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    // Check if requester is an admin
    if (!board.admins.some(id => id.toString() === adminId.toString())) {
      throw new ForbiddenException('Only admins can deny requests');
    }

    // Find and remove the pending request
    const requestIndex = board.pendingRequests.findIndex(
      (req) => req.userId.toString() === userIdToDeny.toString(),
    );
    if (requestIndex === -1) {
      throw new NotFoundException('Access request not found');
    }

    board.pendingRequests.splice(requestIndex, 1);

    const savedBoard = await board.save();
    return savedBoard.populate(['createdBy', 'admins', 'members', 'pendingRequests.userId']);
  }

  /**
   * Check if a user is a member of a board
   */
  async isMember(boardId: string, username: string): Promise<boolean> {
    const userId = await this.getUserIdByUsername(username);
    const board = await this.boardModel.findById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    return board.members.some(id => id.toString() === userId.toString());
  }

  /**
   * Check if a user is an admin of a board
   */
  async isAdmin(boardId: string, username: string): Promise<boolean> {
    const userId = await this.getUserIdByUsername(username);
    const board = await this.boardModel.findById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    return board.admins.some(id => id.toString() === userId.toString());
  }

  /**
   * Update board settings (admin only)
   */
  async updateBoardSettings(
    boardId: string,
    adminUsername: string,
    settings: Partial<Board['settings']>,
  ): Promise<BoardDocument> {
    const adminId = await this.getUserIdByUsername(adminUsername);

    const board = await this.boardModel.findById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    // Check if requester is an admin
    if (!board.admins.some(id => id.toString() === adminId.toString())) {
      throw new ForbiddenException('Only admins can update board settings');
    }

    board.settings = { ...board.settings, ...settings };
    const savedBoard = await board.save();
    return savedBoard.populate(['createdBy', 'admins', 'members']);
  }
}
