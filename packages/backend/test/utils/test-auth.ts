import { JwtService } from '@nestjs/jwt';
import { User } from '../../src/users/schemas/user.schema';
import * as bcrypt from 'bcryptjs';

export interface TestUser {
  _id: string;
  username: string;
  password: string;
  email: string;
  boardSlugs: string[];
}

/**
 * Create a test user object with hashed password
 */
export const createTestUser = async (
  overrides: Partial<TestUser> = {},
): Promise<TestUser> => {
  const defaultPassword = 'testpass123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  return {
    _id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    password: hashedPassword,
    email: 'test@example.com',
    boardSlugs: [],
    ...overrides,
  };
};

/**
 * Generate a JWT token for testing
 */
export const generateTestToken = (jwtService: JwtService, userId: string, username: string): string => {
  return jwtService.sign({ sub: userId, username });
};

/**
 * Create mock user credentials for login
 */
export const mockUserCredentials = () => ({
  username: 'testuser',
  password: 'testpass123',
  email: 'test@example.com',
});
