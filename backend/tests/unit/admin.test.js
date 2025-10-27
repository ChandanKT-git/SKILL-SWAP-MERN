const { requireAdmin, isAdmin, requireAdminOrOwner } = require('../../src/middleware/adminAuth');

describe('Admin Middleware', () => {
    describe('requireAdmin', () => {
        let req, res, next;

        beforeEach(() => {
            req = { user: null, ip: '127.0.0.1' };
            res = {};
            next = jest.fn();
        });

        test('should allow access for admin users', () => {
            req.user = { id: 'admin123', role: 'admin', email: 'admin@test.com' };

            requireAdmin(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });

        test('should deny access for non-admin users', () => {
            req.user = { id: 'user123', role: 'user', email: 'user@test.com' };

            requireAdmin(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
            expect(next.mock.calls[0][0].message).toBe('Admin access required');
        });

        test('should deny access for unauthenticated users', () => {
            req.user = null;

            requireAdmin(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
            expect(next.mock.calls[0][0].message).toBe('Authentication required');
        });
    });

    describe('isAdmin', () => {
        test('should return true for admin users', () => {
            const user = { role: 'admin' };
            expect(isAdmin(user)).toBe(true);
        });

        test('should return false for non-admin users', () => {
            const user = { role: 'user' };
            expect(isAdmin(user)).toBe(false);
        });

        test('should return false for null user', () => {
            expect(isAdmin(null)).toBe(false);
        });
    });

    describe('requireAdminOrOwner', () => {
        let req, res, next, middleware;

        beforeEach(() => {
            req = {
                user: null,
                params: { userId: 'resource123' },
                body: {}
            };
            res = {};
            next = jest.fn();
            middleware = requireAdminOrOwner('userId');
        });

        test('should allow access for admin users', () => {
            req.user = { id: 'admin123', role: 'admin' };

            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith();
            expect(req.isAdmin).toBe(true);
            expect(req.isOwner).toBe(false);
        });

        test('should allow access for resource owners', () => {
            req.user = { id: 'resource123', role: 'user' };

            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith();
            expect(req.isAdmin).toBe(false);
            expect(req.isOwner).toBe(true);
        });

        test('should deny access for non-admin non-owners', () => {
            req.user = { id: 'other123', role: 'user' };

            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
            expect(next.mock.calls[0][0].message).toBe('Admin access or resource ownership required');
        });
    });
});

// Remove database-dependent tests for now to focus on middleware tests