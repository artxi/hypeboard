import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
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
