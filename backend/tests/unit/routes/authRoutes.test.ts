import type { IRoute } from 'express-serve-static-core';
import { verifyToken } from '../../../src/utils/auth/verifyToken';
import { AuthController } from '../../../src/controller/authController';
import router from '../../../src/routes/authRoutes';
import {
  rateLimitForgotPassword,
  rateLimitLogin,
  rateLimitRefresh,
  rateLimitResendVerification,
  rateLimitResetPassword,
  rateLimitVerifyEmail,
} from '../../../src/utils/auth/rateLimiter';

jest.mock('../../../src/utils/auth/verifyToken', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('../../../src/controller/authController', () => ({
  __esModule: true,
  AuthController: {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  },
  default: {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
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

describe('authRoutes', () => {
  describe('POST', () => {
    it('registers /login with login', () => {
      const route = getRoute('/login', 'post');
      const handlers = getHandlers('/login', 'post');

      expect(route.path).toBe('/login');
      expect(route.methods.post).toBe(true);
      expect(handlers).toHaveLength(2);
      expect(handlers).not.toContain(verifyToken);
      expect(handlers[0]).toBe(rateLimitLogin);
      expect(handlers[1]).toEqual(expect.any(Function));
      expect(handlers[1].toString()).toContain('login');
      expect(AuthController.login).toBeDefined();
    });

    it('registers /refresh with refresh', () => {
      const route = getRoute('/refresh', 'post');
      const handlers = getHandlers('/refresh', 'post');

      expect(route.path).toBe('/refresh');
      expect(route.methods.post).toBe(true);
      expect(handlers).toHaveLength(2);
      expect(handlers).not.toContain(verifyToken);
      expect(handlers[0]).toBe(rateLimitRefresh);
      expect(handlers[1]).toEqual(expect.any(Function));
      expect(handlers[1].toString()).toContain('refresh');
      expect(AuthController.refresh).toBeDefined();
    });

    it('registers /logout with logout', () => {
      const route = getRoute('/logout', 'post');
      const handlers = getHandlers('/logout', 'post');

      expect(route.path).toBe('/logout');
      expect(route.methods.post).toBe(true);
      expect(handlers).toHaveLength(1);
      expect(handlers).not.toContain(verifyToken);
      expect(handlers[0]).toEqual(expect.any(Function));
      expect(handlers[0].toString()).toContain('logout');
      expect(AuthController.logout).toBeDefined();
    });

    it('registers /verify-email with verifyEmail', () => {
      const route = getRoute('/verify-email', 'post');
      const handlers = getHandlers('/verify-email', 'post');

      expect(route.path).toBe('/verify-email');
      expect(route.methods.post).toBe(true);
      expect(handlers).toHaveLength(2);
      expect(handlers).not.toContain(verifyToken);
      expect(handlers[0]).toBe(rateLimitVerifyEmail);
      expect(handlers[1]).toEqual(expect.any(Function));
      expect(handlers[1].toString()).toContain('verifyEmail');
      expect(AuthController.verifyEmail).toBeDefined();
    });

    it('registers /resend-verification with resendVerificationEmail', () => {
      const route = getRoute('/resend-verification', 'post');
      const handlers = getHandlers('/resend-verification', 'post');

      expect(route.path).toBe('/resend-verification');
      expect(route.methods.post).toBe(true);
      expect(handlers).toHaveLength(2);
      expect(handlers[0]).toBe(rateLimitResendVerification);
      expect(handlers[1]).toEqual(expect.any(Function));
      expect(handlers[1].toString()).toContain('resendVerificationEmail');
      expect(AuthController.resendVerificationEmail).toBeDefined();
    });

    it('registers /forgot-password with forgotPassword', () => {
      const route = getRoute('/forgot-password', 'post');
      const handlers = getHandlers('/forgot-password', 'post');

      expect(route.path).toBe('/forgot-password');
      expect(route.methods.post).toBe(true);
      expect(handlers).toHaveLength(2);
      expect(handlers).not.toContain(verifyToken);
      expect(handlers[0]).toBe(rateLimitForgotPassword);
      expect(handlers[1]).toEqual(expect.any(Function));
      expect(handlers[1].toString()).toContain('forgotPassword');
      expect(AuthController.forgotPassword).toBeDefined();
    });

    it('registers /reset-password with resetPassword', () => {
      const route = getRoute('/reset-password', 'post');
      const handlers = getHandlers('/reset-password', 'post');

      expect(route.path).toBe('/reset-password');
      expect(route.methods.post).toBe(true);
      expect(handlers).toHaveLength(2);
      expect(handlers).not.toContain(verifyToken);
      expect(handlers[0]).toBe(rateLimitResetPassword);
      expect(handlers[1]).toEqual(expect.any(Function));
      expect(handlers[1].toString()).toContain('resetPassword');
      expect(AuthController.resetPassword).toBeDefined();
    });
  });
});
