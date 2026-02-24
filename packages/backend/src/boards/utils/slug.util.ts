import { Model } from 'mongoose';
import { Board } from '../../schemas/board.schema';

/**
 * Convert a name to a URL-safe slug
 * Example: "My Awesome Board" → "my-awesome-board"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Ensure the slug is unique by appending a number if necessary
 * Example: "my-board" → "my-board-2" if "my-board" exists
 */
export async function ensureUniqueSlug(
  baseSlug: string,
  boardModel: Model<Board>,
): Promise<string> {
  let slug = baseSlug;
  let counter = 2;

  while (await boardModel.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
