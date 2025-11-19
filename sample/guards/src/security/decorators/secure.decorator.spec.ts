import { AccessLevel } from '../../enums/access-level.enum';

// Mock the dependencies before importing the module under test
jest.mock('@nestjs/common', () => ({
    ...jest.requireActual('@nestjs/common'),
    applyDecorators: jest.fn(),
    UseGuards: jest.fn(),
}));

jest.mock('./access-level.decorator', () => ({
    RequireAccessLevel: jest.fn(),
}));

jest.mock('../guards/bearer-token.guard', () => ({
    BearerTokenGuard: class MockBearerTokenGuard {},
}));

jest.mock('../guards/user-access.guard', () => ({
    UserAccessGuard: class MockUserAccessGuard {},
}));

// Import after mocking
import { SecureEndpoint } from './secure.decorator';
import { UseGuards, applyDecorators } from '@nestjs/common';
import { BearerTokenGuard } from '../guards/bearer-token.guard';
import { UserAccessGuard } from '../guards/user-access.guard';
import { RequireAccessLevel } from './access-level.decorator';

describe('SecureEndpoint', () => {
    const mockApplyDecorators = applyDecorators as jest.Mock;
    const mockUseGuards = UseGuards as jest.Mock;
    const mockRequireAccessLevel = RequireAccessLevel as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseGuards.mockReturnValue('UseGuardsDecorator');
        mockRequireAccessLevel.mockImplementation((level: AccessLevel) => `RequireAccessLevelDecorator:${level}`);
    });

    it('should apply UseGuards with BearerTokenGuard and UserAccessGuard', () => {
        SecureEndpoint();
        expect(mockUseGuards).toHaveBeenCalledWith(BearerTokenGuard, UserAccessGuard);
        expect(mockApplyDecorators).toHaveBeenCalledWith('UseGuardsDecorator');
    });

    it('should apply RequireAccessLevel if accessLevel is provided', () => {
        SecureEndpoint(AccessLevel.ADMIN);
        expect(mockRequireAccessLevel).toHaveBeenCalledWith(AccessLevel.ADMIN);
        expect(mockApplyDecorators).toHaveBeenCalledWith(
            'UseGuardsDecorator',
            `RequireAccessLevelDecorator:${AccessLevel.ADMIN}`
        );
    });

    it('should not call RequireAccessLevel if accessLevel is not provided', () => {
        SecureEndpoint();
        expect(mockRequireAccessLevel).not.toHaveBeenCalled();
    });

    it('should return the result of applyDecorators', () => {
        mockApplyDecorators.mockReturnValue('decoratorResult');
        const result = SecureEndpoint();
        expect(result).toBe('decoratorResult');
    });
});