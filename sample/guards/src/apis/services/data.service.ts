import { Injectable, Logger } from '@nestjs/common';
import { CacheInterceptor } from '../../interceptors/cache.interceptor';

/**
 * Example data service that demonstrates direct cache manipulation
 */
@Injectable()
export class DataService {
  private readonly logger = new Logger(DataService.name);

  constructor(
    private readonly cacheInterceptor: CacheInterceptor
  ) {}

  /**
   * Example method that fetches data and manages cache manually
   */
  async getUserData(userId: string): Promise<any> {
    this.logger.log(`Fetching user data for user: ${userId}`);
    
    // Simulate data fetching
    const userData = {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      lastLogin: new Date(),
      preferences: {
        theme: 'dark',
        notifications: true
      }
    };

    this.logger.log(`User data fetched successfully for user: ${userId}`);
    return userData;
  }

  /**
   * Invalidate user-specific cache when user data changes
   */
  async updateUserData(userId: string, updateData: any): Promise<any> {
    this.logger.log(`Updating user data for user: ${userId}`);
    
    // Simulate data update
    const updatedData = {
      id: userId,
      ...updateData,
      updatedAt: new Date()
    };

    // Invalidate related cache entries
    await this.invalidateUserCache(userId);

    this.logger.log(`User data updated successfully for user: ${userId}`);
    return updatedData;
  }

  /**
   * Invalidate cache entries related to a specific user
   */
  private async invalidateUserCache(userId: string): Promise<void> {
    // Invalidate cache patterns related to this user
    const patterns = [
      `/users/${userId}`,
      `/user/${userId}`,
      `/profile/${userId}`
    ];

    for (const pattern of patterns) {
      this.cacheInterceptor.invalidateCache(pattern);
      this.logger.debug(`Invalidated cache for pattern: ${pattern}`);
    }
  }

  /**
   * Method to preload data into cache (cache warming)
   */
  async warmCache(userIds: string[]): Promise<void> {
    this.logger.log(`Warming cache for ${userIds.length} users`);
    
    for (const userId of userIds) {
      await this.getUserData(userId);
    }
    
    this.logger.log('Cache warming completed');
  }

  /**
   * Get cache statistics for this service's operations
   */
  getCacheStats(): any {
    const stats = this.cacheInterceptor.getCacheStats();
    
    return {
      ...stats,
      serviceType: 'DataService',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Example of bulk operations with selective cache invalidation
   */
  async bulkUpdateUsers(updates: Array<{ userId: string; data: any }>): Promise<any[]> {
    this.logger.log(`Performing bulk update for ${updates.length} users`);
    
    const results: any[] = [];
    const affectedUsers: string[] = [];

    for (const update of updates) {
      const result = await this.updateUserData(update.userId, update.data);
      results.push(result);
      affectedUsers.push(update.userId);
    }

    // Batch cache invalidation
    this.logger.log(`Invalidating cache for ${affectedUsers.length} users`);
    for (const userId of affectedUsers) {
      await this.invalidateUserCache(userId);
    }

    this.logger.log('Bulk update completed successfully');
    return results;
  }
}