import { Request, Response } from 'express';
import { versionMiddleware, VersionMap } from './index.js';

interface MockRequest extends Partial<Request> {
    version?: string;
}

describe('Version Middleware', () => {
    let mockRequest: MockRequest;
    let mockResponse: Partial<Response>;
    let mockNext: jest.Mock;
    let handlers: VersionMap;
    let v1Handler: jest.Mock;
    let v2Handler: jest.Mock;
    let v2_1Handler: jest.Mock;
    let v3Handler: jest.Mock;

    beforeEach(() => {
        mockRequest = {
            params: {},
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();

        // Create mock handlers that return their version number
        v1Handler = jest.fn().mockImplementation((req, res) => res.json({ version: 'v1.0' }));
        v2Handler = jest.fn().mockImplementation((req, res) => res.json({ version: 'v2.0' }));
        v2_1Handler = jest.fn().mockImplementation((req, res) => res.json({ version: 'v2.1' }));
        v3Handler = jest.fn().mockImplementation((req, res) => res.json({ version: 'v3.0' }));

        handlers = {
            'v1.0': v1Handler,
            'v2.0': v2Handler,
            'v2.1': v2_1Handler,
            'v3.0': v3Handler,
        };
    });

    describe('Version normalization and matching', () => {
        test.each([
            ['v1', 'v1.0'],
            ['1', 'v1.0'],
            ['V1.0', 'v1.0'],
            ['1.0', 'v1.0'],
            ['v1.0', 'v1.0'],
        ])('normalizes %s to %s', (input, expected) => {
            mockRequest.params = { version: input };
            versionMiddleware(handlers)(mockRequest as Request, mockResponse as Response, mockNext);
            expect(v1Handler).toHaveBeenCalled();
        });
    });

    describe('Version fallback behavior', () => {
        test.each([
            ['v1.5', 'v1.0'], // Should fall back to v1.0
            ['v2.05', 'v2.0'], // Should fall back to v2.0
            ['v2.2', 'v2.1'], // Should fall back to v2.1
            ['v4.0', 'v3.0'], // Should use latest when requested version is too high
        ])('falls back from %s to %s', (requested, fallback) => {
            mockRequest.params = { version: requested };
            versionMiddleware(handlers)(mockRequest as Request, mockResponse as Response, mockNext);

            const expectedHandler = handlers[fallback];
            expect(expectedHandler).toHaveBeenCalled();
        });
    });

    describe('X-version handling', () => {
        test.each([
            ['v2.x', 'v2.1'], // Should use highest v2.x version
            ['2.x', 'v2.1'], // Should work without 'v' prefix
            ['v3.x', 'v3.0'], // Should match single v3.x version
            ['v1.x', 'v1.0'], // Should match single v1.x version
        ])('handles wildcard %s to use %s', (requested, expected) => {
            mockRequest.params = { version: requested };
            versionMiddleware(handlers)(mockRequest as Request, mockResponse as Response, mockNext);

            const expectedHandler = handlers[expected];
            expect(expectedHandler).toHaveBeenCalled();
        });
    });

    describe('Error handling', () => {
        test('handles invalid version format gracefully', () => {
            mockRequest.params = { version: 'invalid' };
            versionMiddleware(handlers)(mockRequest as Request, mockResponse as Response, mockNext);
            expect(v3Handler).toHaveBeenCalled(); // Should use latest version
        });

        test('handles empty version map', () => {
            mockRequest.params = { version: 'v1.0' };
            versionMiddleware({})(mockRequest as Request, mockResponse as Response, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });

        test('handles undefined version parameter', () => {
            mockRequest.params = {};
            versionMiddleware(handlers)(mockRequest as Request, mockResponse as Response, mockNext);
            expect(v3Handler).toHaveBeenCalled(); // Should use latest version
        });
    });

    describe('Version comparison edge cases', () => {
        test.each([
            ['v2.0.0', 'v2.0'], // Should treat v2.0.0 same as v2.0
            ['v2.0.1', 'v2.0'], // Should fall back to v2.0
            ['v2.1.0', 'v2.1'], // Should match v2.1
            ['v2.1.1', 'v2.1'], // Should fall back to v2.1
        ])('handles patch versions %s correctly using %s', (requested, expected) => {
            mockRequest.params = { version: requested };
            versionMiddleware(handlers)(mockRequest as Request, mockResponse as Response, mockNext);

            const expectedHandler = handlers[expected];
            expect(expectedHandler).toHaveBeenCalled();
        });
    });

    describe('Version source priority', () => {
        test('prefers req.params.version over req.version', () => {
            mockRequest = {
                params: { version: 'v3.0' },
                version: 'v1.0',
            };
            versionMiddleware(handlers)(mockRequest as Request, mockResponse as Response, mockNext);
            expect(v3Handler).toHaveBeenCalled();
        });

        test('falls back to req.version when params.version is undefined', () => {
            mockRequest = {
                params: {},
                version: 'v2.0',
            };
            versionMiddleware(handlers)(mockRequest as Request, mockResponse as Response, mockNext);
            expect(v2Handler).toHaveBeenCalled();
        });
    });

    describe('Semantic version handling', () => {
        test.each([
            ['v3', 'v3.0.0'],
            ['v3.0', 'v3.0.0'],
            ['v3.0.0', 'v3.0.0'],
            ['v3.1', 'v3.0.0'], // Should fall back
            ['v3.0.1', 'v3.0.0'], // Should fall back
        ])('matches %s against semantic version %s', (requested, expected) => {
            const semverHandlers = {
                'v3.0.0': v3Handler,
            };
            mockRequest.params = { version: requested };
            versionMiddleware(semverHandlers)(
                mockRequest as Request,
                mockResponse as Response,
                mockNext,
            );
            expect(v3Handler).toHaveBeenCalled();
        });
    });
});
