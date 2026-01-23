import { describe, it, expect } from 'vitest';
import { createUser, updateUser, validateUser, isUser, type CreateUserData } from './User';

describe('User Model', () => {
  describe('validateUser', () => {
    it('should pass validation for valid user data', () => {
      const data: CreateUserData = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        provider: 'google',
      };
      const errors = validateUser(data);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should fail validation for missing id', () => {
      const data = { username: 'test', email: 'test@example.com', provider: 'google' as const };
      const errors = validateUser(data);
      expect(errors.id).toBeDefined();
    });

    it('should fail validation for missing username', () => {
      const data = { id: 'user-123', email: 'test@example.com', provider: 'google' as const };
      const errors = validateUser(data);
      expect(errors.username).toBeDefined();
    });

    it('should fail validation for invalid email', () => {
      const data: CreateUserData = {
        id: 'user-123',
        username: 'test',
        email: 'invalid-email',
        provider: 'google',
      };
      const errors = validateUser(data);
      expect(errors.email).toBeDefined();
    });

    it('should fail validation for invalid provider', () => {
      const data = { id: 'user-123', username: 'test', email: 'test@example.com', provider: 'invalid' as any };
      const errors = validateUser(data);
      expect(errors.provider).toBeDefined();
    });

    it('should fail validation for username too long', () => {
      const data: CreateUserData = {
        id: 'user-123',
        username: 'a'.repeat(51),
        email: 'test@example.com',
        provider: 'google',
      };
      const errors = validateUser(data);
      expect(errors.username).toBeDefined();
    });
  });

  describe('createUser', () => {
    it('should create user with valid data', () => {
      const data: CreateUserData = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        provider: 'google',
      };
      const user = createUser(data);
      expect(user.id).toBe('user-123');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.provider).toBe('google');
      expect(user.requiresPasswordChange).toBe(false);
      expect(user.createdAt).toBeDefined();
    });

    it('should trim whitespace from fields', () => {
      const data: CreateUserData = {
        id: '  user-123  ',
        username: '  testuser  ',
        email: '  TEST@EXAMPLE.COM  ',
        provider: 'google',
      };
      const user = createUser(data);
      expect(user.id).toBe('user-123');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
    });

    it('should set requiresPasswordChange when provided', () => {
      const data: CreateUserData = {
        id: 'user-123',
        username: 'test',
        email: 'test@example.com',
        provider: 'local',
        requiresPasswordChange: true,
      };
      const user = createUser(data);
      expect(user.requiresPasswordChange).toBe(true);
    });

    it('should include avatar when provided', () => {
      const data: CreateUserData = {
        id: 'user-123',
        username: 'test',
        email: 'test@example.com',
        provider: 'google',
        avatar: 'https://example.com/avatar.jpg',
      };
      const user = createUser(data);
      expect(user.avatar).toBe('https://example.com/avatar.jpg');
    });

    it('should throw error for invalid data', () => {
      const data = { id: '', username: 'test', email: 'test@example.com', provider: 'google' as const };
      expect(() => createUser(data)).toThrow();
    });
  });

  describe('updateUser', () => {
    const baseUser = createUser({
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      provider: 'google',
    });

    it('should update username', () => {
      const updated = updateUser(baseUser, { username: 'newusername' });
      expect(updated.username).toBe('newusername');
    });

    it('should update email', () => {
      const updated = updateUser(baseUser, { email: 'new@example.com' });
      expect(updated.email).toBe('new@example.com');
    });

    it('should update requiresPasswordChange', () => {
      const updated = updateUser(baseUser, { requiresPasswordChange: true });
      expect(updated.requiresPasswordChange).toBe(true);
    });

    it('should throw error for invalid email', () => {
      expect(() => updateUser(baseUser, { email: 'invalid' })).toThrow();
    });

    it('should throw error for username too long', () => {
      expect(() => updateUser(baseUser, { username: 'a'.repeat(51) })).toThrow();
    });
  });

  describe('isUser', () => {
    it('should return true for valid user object', () => {
      const user = createUser({
        id: 'user-123',
        username: 'test',
        email: 'test@example.com',
        provider: 'google',
      });
      expect(isUser(user)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isUser(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isUser('not a user')).toBe(false);
    });

    it('should return false for object missing required fields', () => {
      expect(isUser({ id: '123' })).toBe(false);
    });

    it('should return false for invalid provider', () => {
      expect(isUser({ id: '123', username: 'test', email: 'test@example.com', provider: 'invalid' })).toBe(false);
    });
  });
});
