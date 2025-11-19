import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto, PaginatedResponseDto } from '../dto/user.dto';
import { AccessLevel } from '../enums/access-level.enum';

@Injectable()
export class CatalogService {
  private items: any[] = [
    {
      id: 1,
      name: 'Basic Widget',
      description: 'A simple widget for everyday use',
      price: 19.99,
      category: 'widgets',
      isPremium: false,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      tags: ['basic', 'everyday', 'affordable'],
    },
    {
      id: 2,
      name: 'Premium Gadget',
      description: 'Advanced gadget with premium features',
      price: 99.99,
      category: 'gadgets',
      isPremium: true,
      isActive: true,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      tags: ['premium', 'advanced', 'exclusive'],
    },
    {
      id: 3,
      name: 'Standard Tool',
      description: 'Reliable tool for professional use',
      price: 49.99,
      category: 'tools',
      isPremium: false,
      isActive: true,
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
      tags: ['professional', 'reliable', 'standard'],
    },
    {
      id: 4,
      name: 'Elite Package',
      description: 'Exclusive package with elite features',
      price: 199.99,
      category: 'packages',
      isPremium: true,
      isActive: true,
      createdAt: new Date('2024-01-04'),
      updatedAt: new Date('2024-01-04'),
      tags: ['elite', 'exclusive', 'luxury'],
    },
    {
      id: 5,
      name: 'Starter Kit',
      description: 'Perfect kit for beginners',
      price: 29.99,
      category: 'kits',
      isPremium: false,
      isActive: true,
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-05'),
      tags: ['beginner', 'starter', 'complete'],
    },
  ];

  // public access
  findAll(): {
    items: any[];
    total: number;
    message: string;
  } {
    const activeItems = this.items.filter(item => item.isActive);

    return {
      items: activeItems,
      total: activeItems.length,
      message: 'All catalog items retrieved successfully',
    };
  }

  // premium access required
  findPremiumItems(): {
    items: any[];
    total: number;
    message: string;
    accessLevel: string;
  } {
    const premiumItems = this.items.filter(item => item.isPremium && item.isActive);

    return {
      items: premiumItems,
      total: premiumItems.length,
      message: 'Premium items retrieved successfully',
      accessLevel: 'premium_required',
    };
  }

  // New methods to demonstrate pipes functionality
  searchItems(params: {
    searchTerm?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: string;
    tags?: string[];
    pagination: { page: number; limit: number; offset: number };
  }): PaginatedResponseDto<any> {
    let filteredItems = [...this.items];

    // Apply search term filter
    if (params.searchTerm) {
      const searchLower = params.searchTerm.toLowerCase();
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (params.category) {
      filteredItems = filteredItems.filter(item =>
        item.category.toLowerCase() === params.category?.toLowerCase()
      );
    }

    // Apply tags filter
    if (params.tags && params.tags.length > 0) {
      filteredItems = filteredItems.filter(item =>
        params.tags!.some(tag => item.tags.includes(tag.toLowerCase()))
      );
    }

    // Apply sorting
    filteredItems.sort((a, b) => {
      const field = params.sortBy || 'name';
      const order = params.sortOrder === 'desc' ? -1 : 1;
      
      if (a[field] < b[field]) return -1 * order;
      if (a[field] > b[field]) return 1 * order;
      return 0;
    });

    // Apply pagination
    const { page, limit, offset } = params.pagination;
    const total = filteredItems.length;
    const paginatedItems = filteredItems.slice(offset, offset + limit);
    const totalPages = Math.ceil(total / limit);

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  findOne(id: string): any {
    // Simulate finding by UUID (in real app, this would query database)
    const item = this.items.find(item => item.id.toString() === id.slice(-1));
    
    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return {
      ...item,
      id, // Use the provided UUID
      retrievedAt: new Date().toISOString(),
    };
  }

  // Mock user management methods for demonstration
  private users: any[] = [
    {
      id: 'user-uuid-1',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      accessLevel: AccessLevel.STANDARD,
      isActive: true,
      preferences: ['email_notifications'],
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'user-uuid-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      age: 28,
      accessLevel: AccessLevel.PREMIUM,
      isActive: true,
      preferences: ['email_notifications', 'sms_alerts'],
      createdAt: new Date('2024-01-02'),
    },
    {
      id: 'user-uuid-3',
      name: 'Admin User',
      email: 'admin@example.com',
      age: 35,
      accessLevel: AccessLevel.ADMIN,
      isActive: true,
      preferences: ['email_notifications', 'admin_alerts'],
      createdAt: new Date('2024-01-03'),
    },
  ];

  createUser(createUserDto: CreateUserDto): any {
    const newUser = {
      id: `user-uuid-${this.users.length + 1}`,
      ...createUserDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.push(newUser);

    return {
      user: newUser,
      message: 'User created successfully',
    };
  }

  updateUser(id: string, updateUserDto: UpdateUserDto): any {
    const userIndex = this.users.findIndex(user => user.id === id);
    
    if (userIndex === -1) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updatedUser = {
      ...this.users[userIndex],
      ...updateUserDto,
      updatedAt: new Date(),
    };

    this.users[userIndex] = updatedUser;

    return {
      user: updatedUser,
      message: 'User updated successfully',
    };
  }

  searchUsers(params: {
    search?: any;
    accessLevel?: AccessLevel;
    includeInactive: boolean;
  }): any {
    let filteredUsers = [...this.users];

    // Apply active/inactive filter
    if (!params.includeInactive) {
      filteredUsers = filteredUsers.filter(user => user.isActive);
    }

    // Apply access level filter
    if (params.accessLevel) {
      filteredUsers = filteredUsers.filter(user => user.accessLevel === params.accessLevel);
    }

    // Apply search filter
    if (params.search) {
      if (typeof params.search === 'string') {
        const searchLower = params.search.toLowerCase();
        filteredUsers = filteredUsers.filter(user =>
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
        );
      } else if (typeof params.search === 'object') {
        // Handle advanced search object
        for (const [field, value] of Object.entries(params.search)) {
          if (value && typeof value === 'string') {
            const searchValue = value.toLowerCase();
            filteredUsers = filteredUsers.filter(user => {
              const fieldValue = user[field];
              return fieldValue && fieldValue.toString().toLowerCase().includes(searchValue);
            });
          }
        }
      }
    }

    return {
      users: filteredUsers,
      total: filteredUsers.length,
      message: 'User search completed successfully',
      searchParams: params,
    };
  }

  bulkDeleteUsers(userIds: string[]): any {
    const deletedUsers: any[] = [];
    const notFoundIds: string[] = [];

    userIds.forEach(id => {
      const userIndex = this.users.findIndex(user => user.id === id);
      if (userIndex !== -1) {
        deletedUsers.push(this.users.splice(userIndex, 1)[0]);
      } else {
        notFoundIds.push(id);
      }
    });

    return {
      deletedUsers,
      deletedCount: deletedUsers.length,
      notFoundIds,
      message: `Bulk delete completed. ${deletedUsers.length} users deleted, ${notFoundIds.length} not found.`,
    };
  }
}