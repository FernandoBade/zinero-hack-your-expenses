import type { IRoute } from 'express-serve-static-core';
import { verifyToken } from '../../../src/utils/auth/verifyToken';
import { rateLimitSignup } from '../../../src/utils/auth/rateLimiter';
import router from '../../../src/routes/userRoutes';

jest.mock('../../../src/utils/auth/verifyToken', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('../../../src/controller/userController', () => ({
  __esModule: true,
  default: {
    getUsers: jest.fn(),
    getUserById: jest.fn(),
    getUsersByEmail: jest.fn(),
    createUser: jest.fn(),
    uploadAvatar: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  },
}));

type HttpMethod = 'get' | 'post' | 'put' | 'delete';
type RouteWithMethods = IRoute & { methods: Record<string, boolean> };

const isRouteWithMethods = (route: IRoute | undefined): route is RouteWithMethods => {
  return Boolean(route && 'methods' in route);
};

const getRoute = (path: string, method: HttpMethod): RouteWithMethods => {
  const layer = router.stack.find(item => {
    if (!item.route || !isRouteWithMethods(item.route)) {
      return false;
    }
    return item.route.path === path && item.route.methods[method];
  });

  if (!layer || !layer.route || !isRouteWithMethods(layer.route)) {
    throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  }

  return layer.route;
};

const getHandlers = (path: string, method: HttpMethod) => getRoute(path, method).stack.map(layer => layer.handle);

describe('userRoutes', () => {
  describe('GET', () => {
    it('registers /search with verifyToken and getUsersByEmail', () => {
      const route = getRoute('/search', 'get');
      const handlers = getHandlers('/search', 'get');

      expect(route.path).toBe('/search');
      expect(route.methods.get).toBe(true);
      expect(handlers).toHaveLength(2);
      expect(handlers[0]).toBe(verifyToken);
      expect(handlers[1]).toEqual(expect.any(Function));
      expect(handlers[1].toString()).toContain('getUsersByEmail');
    });

    it('registers /:id with verifyToken and getUserById', () => {
      const route = getRoute('/:id', 'get');
      const handlers = getHandlers('/:id', 'get');

      expect(route.path).toBe('/:id');
      expect(route.methods.get).toBe(true);
      expect(handlers).toHaveLength(2);
      expect(handlers[0]).toBe(verifyToken);
      expect(handlers[1]).toEqual(expect.any(Function));
      expect(handlers[1].toString()).toContain('getUserById');
    });

    it('registers / with verifyToken and getUsers', () => {
      const route = getRoute('/', 'get');
      const handlers = getHandlers('/', 'get');

      expect(route.path).toBe('/');
      expect(route.methods.get).toBe(true);
      expect(handlers).toHaveLength(2);
      expect(handlers[0]).toBe(verifyToken);
      expect(handlers[1]).toEqual(expect.any(Function));
      expect(handlers[1].toString()).toContain('getUsers');
    });
  });

  describe('POST', () => {
    it('registers / with createUser', () => {
      const route = getRoute('/', 'post');
      const handlers = getHandlers('/', 'post');

      expect(route.path).toBe('/');
      expect(route.methods.post).toBe(true);
      expect(handlers).toHaveLength(2);
      expect(handlers).not.toContain(verifyToken);
      expect(handlers[0]).toBe(rateLimitSignup);
      expect(handlers[1]).toEqual(expect.any(Function));
      expect(handlers[1].toString()).toContain('createUser');
    });

    it('registers /upload/avatar with verifyToken and uploadAvatar', () => {
      const route = getRoute('/upload/avatar', 'post');
      const handlers = getHandlers('/upload/avatar', 'post');

      expect(route.path).toBe('/upload/avatar');
      expect(route.methods.post).toBe(true);
      expect(handlers).toHaveLength(3);
      expect(handlers[0]).toBe(verifyToken);
      expect(handlers[2]).toEqual(expect.any(Function));
      expect(handlers[2].toString()).toContain('uploadAvatar');
    });
  });

  describe('PUT', () => {
    it('registers /:id with verifyToken and updateUser', () => {
      const route = getRoute('/:id', 'put');
      const handlers = getHandlers('/:id', 'put');

      expect(route.path).toBe('/:id');
      expect(route.methods.put).toBe(true);
      expect(handlers).toHaveLength(2);
      expect(handlers[0]).toBe(verifyToken);
      expect(handlers[1]).toEqual(expect.any(Function));
      expect(handlers[1].toString()).toContain('updateUser');
    });
  });

  describe('DELETE', () => {
    it('registers /:id with verifyToken and deleteUser', () => {
      const route = getRoute('/:id', 'delete');
      const handlers = getHandlers('/:id', 'delete');

      expect(route.path).toBe('/:id');
      expect(route.methods.delete).toBe(true);
      expect(handlers).toHaveLength(2);
      expect(handlers[0]).toBe(verifyToken);
      expect(handlers[1]).toEqual(expect.any(Function));
      expect(handlers[1].toString()).toContain('deleteUser');
    });
  });
});
