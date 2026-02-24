import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { RequestAccessDto } from './dto/request-access.dto';
import { ApproveMemberDto } from './dto/approve-member.dto';
import { DenyRequestDto } from './dto/deny-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  /**
   * GET /boards - Get all boards for a user
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserBoards(@Query('username') username: string) {
    if (!username) {
      throw new NotFoundException('Username required');
    }
    const boards = await this.boardsService.findBoardsByUsername(username);

    // Transform populated user objects back to usernames for backward compatibility
    return boards.map(board => this.transformBoardResponse(board));
  }

  /**
   * Helper to transform board response with populated users back to usernames
   */
  private transformBoardResponse(board: any) {
    const boardObj = board.toObject ? board.toObject() : board;
    return {
      ...boardObj,
      createdBy: boardObj.createdBy?.username || boardObj.createdBy,
      admins: boardObj.admins?.map((admin: any) => admin?.username || admin) || [],
      members: boardObj.members?.map((member: any) => member?.username || member) || [],
      pendingRequests: boardObj.pendingRequests?.map((req: any) => ({
        username: req.userId?.username || req.userId,
        requestedAt: req.requestedAt,
        message: req.message,
      })) || [],
    };
  }

  /**
   * POST /boards - Create a new board
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createBoard(@Body() createBoardDto: CreateBoardDto, @Request() req) {
    const board = await this.boardsService.createBoard(createBoardDto);

    // Generate invite link (you can adjust the base URL as needed)
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${board.inviteCode}`;

    return {
      board: this.transformBoardResponse(board),
      inviteLink,
    };
  }

  /**
   * GET /boards/invite/:code - Get board info from invite code (public)
   * This must come before :slug route to avoid conflicts
   */
  @Get('invite/:code')
  async getBoardByInviteCode(@Param('code') code: string) {
    const board = await this.boardsService.findByInviteCode(code);
    const boardObj = board.toObject ? board.toObject() : board;

    // Return only basic info for the join page
    return {
      name: boardObj.name,
      slug: boardObj.slug,
      createdBy: boardObj.createdBy?.username || boardObj.createdBy,
      isPublic: boardObj.isPublic,
    };
  }

  /**
   * GET /boards/:slug - Get board details (requires membership)
   * Query param: username (required to verify access)
   */
  @Get(':slug')
  async getBoard(
    @Param('slug') slug: string,
    @Query('username') username?: string,
  ) {
    const board = await this.boardsService.findBySlug(slug);
    const boardObj = board.toObject ? board.toObject() : board;

    // Check if user has access (member or admin)
    const isMember = username ? await this.boardsService.isMember(board._id.toString(), username) : false;
    const isAdmin = username ? await this.boardsService.isAdmin(board._id.toString(), username) : false;

    if (username && !isMember && !isAdmin) {
      throw new NotFoundException('Board not found or access denied');
    }

    const transformedBoard = this.transformBoardResponse(boardObj);

    return {
      name: transformedBoard.name,
      slug: transformedBoard.slug,
      createdBy: transformedBoard.createdBy,
      settings: transformedBoard.settings,
      lastActivity: transformedBoard.lastActivity,
      isPublic: transformedBoard.isPublic,
      // Only show member list and pending requests to admins
      ...(isAdmin && {
        admins: transformedBoard.admins,
        members: transformedBoard.members,
        pendingRequests: transformedBoard.pendingRequests,
        inviteCode: transformedBoard.inviteCode,
      }),
    };
  }

  /**
   * POST /boards/:slug/request-access - Request access to a board
   */
  @Post(':slug/request-access')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async requestAccess(
    @Param('slug') slug: string,
    @Body() requestAccessDto: RequestAccessDto,
  ) {
    const board = await this.boardsService.findBySlug(slug);

    await this.boardsService.addPendingRequest(
      board._id.toString(),
      requestAccessDto.username,
      requestAccessDto.message,
    );

    return {
      message: 'Access request submitted successfully',
      status: 'pending',
    };
  }

  /**
   * POST /boards/:slug/approve-member - Approve an access request (admin only)
   */
  @Post(':slug/approve-member')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async approveMember(
    @Param('slug') slug: string,
    @Body() approveMemberDto: ApproveMemberDto,
  ) {
    const board = await this.boardsService.findBySlug(slug);

    const updatedBoard = await this.boardsService.approveMember(
      board._id.toString(),
      approveMemberDto.adminUsername,
      approveMemberDto.usernameToApprove,
    );

    const transformedBoard = this.transformBoardResponse(updatedBoard);

    return {
      message: 'Member approved successfully',
      members: transformedBoard.members,
    };
  }

  /**
   * POST /boards/:slug/deny-request - Deny an access request (admin only)
   */
  @Post(':slug/deny-request')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async denyRequest(
    @Param('slug') slug: string,
    @Body() denyRequestDto: DenyRequestDto,
  ) {
    const board = await this.boardsService.findBySlug(slug);

    await this.boardsService.denyRequest(
      board._id.toString(),
      denyRequestDto.adminUsername,
      denyRequestDto.usernameToDeny,
    );

    return {
      message: 'Access request denied',
    };
  }

  /**
   * GET /boards/:slug/pending-requests - Get pending access requests (admin only)
   */
  @Get(':slug/pending-requests')
  async getPendingRequests(
    @Param('slug') slug: string,
    @Query('adminUsername') adminUsername: string,
  ) {
    if (!adminUsername) {
      throw new NotFoundException('Admin username required');
    }

    const board = await this.boardsService.findBySlug(slug);

    // Verify admin status
    const isAdmin = await this.boardsService.isAdmin(
      board._id.toString(),
      adminUsername,
    );

    if (!isAdmin) {
      throw new NotFoundException('Board not found or access denied');
    }

    const transformedBoard = this.transformBoardResponse(board);

    return {
      pendingRequests: transformedBoard.pendingRequests,
    };
  }
}
