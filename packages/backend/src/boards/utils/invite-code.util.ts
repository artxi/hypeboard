import { Model } from 'mongoose';
import { Board } from '../../schemas/board.schema';

/**
 * Generate a random URL-safe invite code
 * Example: "hB7k3P9x" (8 characters)
 */
export function generateInviteCode(length: number = 8): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';

  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

/**
 * Ensure the invite code is unique in the database
 */
export async function ensureUniqueInviteCode(
  boardModel: Model<Board>,
): Promise<string> {
  let code = generateInviteCode();

  while (await boardModel.findOne({ inviteCode: code })) {
    code = generateInviteCode();
  }

  return code;
}
