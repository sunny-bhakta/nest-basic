import { Injectable } from '@nestjs/common';

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
}