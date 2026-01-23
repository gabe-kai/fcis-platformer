import { logger } from '@/utils/logger';

/**
 * User authentication provider type
 */
export type UserProvider = 'google' | 'microsoft' | 'local';

/**
 * User model interface
 */
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  provider: UserProvider;
  requiresPasswordChange?: boolean;
  createdAt?: number;
  lastLogin?: number;
}

/**
 * User creation data (for creating new users)
 */
export interface CreateUserData {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  provider: UserProvider;
  requiresPasswordChange?: boolean;
}

/**
 * User update data (for updating existing users)
 */
export interface UpdateUserData {
  username?: string;
  email?: string;
  avatar?: string;
  requiresPasswordChange?: boolean;
  lastLogin?: number;
}

/**
 * Validation errors for user data
 */
export interface UserValidationErrors {
  id?: string;
  username?: string;
  email?: string;
  provider?: string;
}

/**
 * Validates user data
 */
export function validateUser(data: Partial<CreateUserData>): UserValidationErrors {
  const errors: UserValidationErrors = {};

  if (!data.id || typeof data.id !== 'string' || data.id.trim().length === 0) {
    errors.id = 'User ID is required and must be a non-empty string';
  }

  if (!data.username || typeof data.username !== 'string' || data.username.trim().length === 0) {
    errors.username = 'Username is required and must be a non-empty string';
  } else if (data.username.length > 50) {
    errors.username = 'Username must be 50 characters or less';
  }

  if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
    errors.email = 'Email is required and must be a non-empty string';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Email must be a valid email address';
  }

  if (!data.provider || !['google', 'microsoft', 'local'].includes(data.provider)) {
    errors.provider = 'Provider must be one of: google, microsoft, local';
  }

  return errors;
}

/**
 * Creates a User model from data
 */
export function createUser(data: CreateUserData): User {
  logger.debug('Creating user model', {
    component: 'UserModel',
    operation: 'create',
    userId: data.id,
  });

  const validationErrors = validateUser(data);
  const hasErrors = Object.keys(validationErrors).length > 0;

  if (hasErrors) {
    logger.warn('Invalid user data provided', {
      component: 'UserModel',
      operation: 'create',
    }, { validationErrors });
    throw new Error(`Invalid user data: ${Object.values(validationErrors).join(', ')}`);
  }

  const user: User = {
    id: data.id.trim(),
    username: data.username.trim(),
    email: data.email.trim().toLowerCase(),
    provider: data.provider,
    requiresPasswordChange: data.requiresPasswordChange ?? false,
    createdAt: Date.now(),
  };

  if (data.avatar) {
    user.avatar = data.avatar.trim();
  }

  logger.info('User model created successfully', {
    component: 'UserModel',
    operation: 'create',
    userId: user.id,
  });

  return user;
}

/**
 * Updates a user with new data
 */
export function updateUser(user: User, updates: UpdateUserData): User {
  logger.debug('Updating user model', {
    component: 'UserModel',
    operation: 'update',
    userId: user.id,
  });

  const updated: User = { ...user };

  if (updates.username !== undefined) {
    if (typeof updates.username !== 'string' || updates.username.trim().length === 0) {
      throw new Error('Username must be a non-empty string');
    }
    if (updates.username.length > 50) {
      throw new Error('Username must be 50 characters or less');
    }
    updated.username = updates.username.trim();
  }

  if (updates.email !== undefined) {
    if (typeof updates.email !== 'string' || updates.email.trim().length === 0) {
      throw new Error('Email must be a non-empty string');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      throw new Error('Email must be a valid email address');
    }
    updated.email = updates.email.trim().toLowerCase();
  }

  if (updates.avatar !== undefined) {
    updated.avatar = updates.avatar ? updates.avatar.trim() : undefined;
  }

  if (updates.requiresPasswordChange !== undefined) {
    updated.requiresPasswordChange = updates.requiresPasswordChange;
  }

  if (updates.lastLogin !== undefined) {
    updated.lastLogin = updates.lastLogin;
  }

  logger.info('User model updated successfully', {
    component: 'UserModel',
    operation: 'update',
    userId: user.id,
  });

  return updated;
}

/**
 * Type guard to check if an object is a User
 */
export function isUser(obj: unknown): obj is User {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.username === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.provider === 'string' &&
    ['google', 'microsoft', 'local'].includes(candidate.provider) &&
    (candidate.avatar === undefined || typeof candidate.avatar === 'string') &&
    (candidate.requiresPasswordChange === undefined || typeof candidate.requiresPasswordChange === 'boolean')
  );
}
