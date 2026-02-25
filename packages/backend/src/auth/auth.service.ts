import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterViaInviteDto } from './dto/register-via-invite.dto';
import { BoardsService } from '../boards/boards.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    @Inject(forwardRef(() => BoardsService))
    private boardsService: BoardsService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ username });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const user = new this.userModel({
      username,
      passwordHash,
      boardSlugs: [],
    });

    await user.save();

    // Generate JWT token
    const payload = {
      sub: user._id.toString(),
      username: user.username,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        username: user.username,
        boardSlugs: user.boardSlugs,
      },
    };
  }

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ username });

    if (!user) {
      return null;
    }

    const isPasswordValid = await this.comparePasswords(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return null;
    }

    return {
      _id: user._id,
      username: user.username,
      boardSlugs: user.boardSlugs,
    };
  }

  async login(user: any) {
    const payload = {
      sub: user._id.toString(),
      username: user.username,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        username: user.username,
        boardSlugs: user.boardSlugs,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      username: user.username,
      boardSlugs: user.boardSlugs,
    };
  }

  async registerViaInvite(dto: RegisterViaInviteDto) {
    const { username, password, inviteCode } = dto;

    // 1. Validate invite code and get board
    const board = await this.boardsService.findByInviteCode(inviteCode);
    if (!board) {
      throw new NotFoundException('Invalid invite code');
    }

    // 2. Check if username is taken
    const existingUser = await this.userModel.findOne({ username });
    if (existingUser) {
      // Check if already a member of this board
      const isMember = board.members.some(
        id => id.toString() === existingUser._id.toString()
      );
      const isAdmin = board.admins.some(
        id => id.toString() === existingUser._id.toString()
      );

      if (isMember || isAdmin) {
        throw new ConflictException('You are already a member of this board. Please login instead.');
      }

      throw new ConflictException('Username already exists');
    }

    // 3. Hash password
    const passwordHash = await this.hashPassword(password);

    // 4. Create user with board slug
    const user = new this.userModel({
      username,
      passwordHash,
      boardSlugs: [board.slug],
    });

    // 5. Save user
    const savedUser = await user.save();

    // 6. Add user to board members
    board.members.push(savedUser._id);
    await board.save();

    // 7. Generate JWT token
    const payload = {
      sub: savedUser._id.toString(),
      username: savedUser.username,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        username: savedUser.username,
        boardSlugs: savedUser.boardSlugs,
      },
      boardSlug: board.slug,
    };
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  private async comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
