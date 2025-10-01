/**
 * User Service
 * Business logic for user management
 */

import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { User, UpdateUserInput } from '../validations/user';
import { updateUserSchema } from '../validations/user';

export class UserService {
  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    return user as User || null;
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    
    return user as User || null;
  }

  /**
   * Update user profile
   */
  static async updateUser(input: UpdateUserInput): Promise<User | null> {
    // Validate input
    const validatedInput = updateUserSchema.parse(input);
    const { id, ...updateData } = validatedInput;
    
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser as User || null;
  }

  /**
   * Delete user account
   */
  static async deleteUser(userId: string): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();
    
    return result.length > 0;
  }
}
