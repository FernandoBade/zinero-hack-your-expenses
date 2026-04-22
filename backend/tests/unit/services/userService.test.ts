import bcrypt from 'bcrypt';
import { TokenType } from '../../../../shared/enums/auth.enums';
import { UserService } from '../../../src/service/userService';
import { UserRepository } from '../../../src/repositories/userRepository';
import { TokenService } from '../../../src/service/tokenService';
import { FilterOperator, SortOrder } from '../../../../shared/enums/operator.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import { makeCreateUserInput, makeDbUser, makeUser } from '../../helpers/factories';
import { sendEmailVerificationEmail } from '../../../src/utils/email/authEmail';

const ftpClientMock = {
    access: jest.fn(),
    ensureDir: jest.fn(),
    list: jest.fn(),
    remove: jest.fn(),
    rename: jest.fn(),
    uploadFrom: jest.fn(),
    close: jest.fn(),
};

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

jest.mock('basic-ftp', () => ({
    Client: jest.fn(() => ftpClientMock),
}));

jest.mock('../../../src/utils/email/authEmail', () => ({
    sendEmailVerificationEmail: jest.fn(),
}));

type HashFn = (data: string | Buffer, saltOrRounds: string | number) => Promise<string>;
type CompareFn = (data: string | Buffer, encrypted: string) => Promise<boolean>;

const hashMock = bcrypt.hash as jest.MockedFunction<HashFn>;
const compareMock = bcrypt.compare as jest.MockedFunction<CompareFn>;
const sendEmailVerificationMock = sendEmailVerificationEmail as jest.MockedFunction<typeof sendEmailVerificationEmail>;
const isResource = (value: string): value is Resource => Object.values(Resource).includes(value as Resource);

describe('UserService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('createUser', () => {
        it('returns email not verified when existing user is unverified', async () => {
            const payload = makeCreateUserInput({ email: '  TEST@Example.com  ' });
            const findManySpy = jest.spyOn(UserRepository.prototype, 'findMany').mockResolvedValue([
                makeDbUser({ emailVerifiedAt: null }),
            ]);
            const createSpy = jest.spyOn(UserRepository.prototype, 'create');

            const service = new UserService();
            const result = await service.createUser(payload);

            expect(findManySpy).toHaveBeenCalledTimes(1);
            expect(findManySpy).toHaveBeenCalledWith({
                email: { operator: FilterOperator.EQ, value: 'test@example.com' },
            });
            expect(createSpy).not.toHaveBeenCalled();
            expect(hashMock).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.EMAIL_NOT_VERIFIED });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.EMAIL_NOT_VERIFIED);
            }
        });

        it('returns email in use when existing user is verified', async () => {
            const payload = makeCreateUserInput({ email: '  TEST@Example.com  ' });
            const findManySpy = jest.spyOn(UserRepository.prototype, 'findMany').mockResolvedValue([
                makeDbUser({ emailVerifiedAt: new Date('2024-01-01T00:00:00Z') }),
            ]);
            const createSpy = jest.spyOn(UserRepository.prototype, 'create');

            const service = new UserService();
            const result = await service.createUser(payload);

            expect(findManySpy).toHaveBeenCalledTimes(1);
            expect(findManySpy).toHaveBeenCalledWith({
                email: { operator: FilterOperator.EQ, value: 'test@example.com' },
            });
            expect(createSpy).not.toHaveBeenCalled();
            expect(hashMock).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.EMAIL_IN_USE });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.EMAIL_IN_USE);
            }
        });

        it('returns sanitized user when creation succeeds', async () => {
            const payload = makeCreateUserInput({ email: '  Jane.Doe@Example.com ', hideValues: true });
            const originalPassword = payload.password;
            const findManySpy = jest.spyOn(UserRepository.prototype, 'findMany').mockResolvedValue([]);
            hashMock.mockResolvedValue('hashed-password');
            const created = makeDbUser({ id: 2, email: 'jane.doe@example.com', password: 'hashed-password', hideValues: true });
            const createSpy = jest.spyOn(UserRepository.prototype, 'create').mockResolvedValue(created);
            const createTokenSpy = jest.spyOn(TokenService.prototype, 'createEmailVerificationToken').mockResolvedValue({
                success: true,
                data: { token: 'verify-token', expiresAt: new Date('2099-01-01T00:00:00Z') },
            });
            sendEmailVerificationMock.mockResolvedValue();

            const service = new UserService();
            const result = await service.createUser(payload);

            expect(findManySpy).toHaveBeenCalledWith({
                email: { operator: FilterOperator.EQ, value: 'jane.doe@example.com' },
            });
            expect(hashMock).toHaveBeenCalledWith(originalPassword, 10);
            expect(createSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'jane.doe@example.com',
                    password: 'hashed-password',
                    hideValues: true,
                })
            );
            expect(createTokenSpy).toHaveBeenCalledWith(created.id);
            expect(sendEmailVerificationMock).toHaveBeenCalledWith(
                created.email,
                'verify-token',
                created.id,
                created.language
            );
            expect(result).toEqual(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        id: created.id,
                        email: created.email,
                    }),
                })
            );
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).not.toHaveProperty('password');
            }
        });

        it('strips forbidden privilege fields before persistence', async () => {
            const payload = {
                ...makeCreateUserInput(),
                profile: 'master' as any,
                active: false as any,
            };
            jest.spyOn(UserRepository.prototype, 'findMany').mockResolvedValue([]);
            hashMock.mockResolvedValue('hashed-password');
            const created = makeDbUser({ id: 22, password: 'hashed-password' });
            const createSpy = jest.spyOn(UserRepository.prototype, 'create').mockResolvedValue(created);
            jest.spyOn(TokenService.prototype, 'createEmailVerificationToken').mockResolvedValue({
                success: true,
                data: { token: 'verify-token', expiresAt: new Date('2099-01-01T00:00:00Z') },
            });
            sendEmailVerificationMock.mockResolvedValue();

            const service = new UserService();
            await service.createUser(payload as any);

            const createArg = createSpy.mock.calls[0][0] as Record<string, unknown>;
            expect(createArg).not.toHaveProperty('profile');
            expect(createArg).not.toHaveProperty('active');
        });

        it('returns internal server error when verification token creation fails', async () => {
            const payload = makeCreateUserInput({ email: '  Jane.Doe@Example.com ' });
            jest.spyOn(UserRepository.prototype, 'findMany').mockResolvedValue([]);
            hashMock.mockResolvedValue('hashed-password');
            const created = makeDbUser({ id: 3, email: 'jane.doe@example.com', password: 'hashed-password' });
            jest.spyOn(UserRepository.prototype, 'create').mockResolvedValue(created);
            const deleteSpy = jest.spyOn(UserRepository.prototype, 'delete').mockResolvedValue();
            const createTokenSpy = jest.spyOn(TokenService.prototype, 'createEmailVerificationToken').mockResolvedValue({
                success: false,
                error: Resource.INTERNAL_SERVER_ERROR,
            });

            const service = new UserService();
            const result = await service.createUser(payload);

            expect(createTokenSpy).toHaveBeenCalledWith(created.id);
            expect(deleteSpy).toHaveBeenCalledWith(created.id);
            expect(sendEmailVerificationMock).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
        });

        it('throws when repository create rejects', async () => {
            const payload = makeCreateUserInput();
            jest.spyOn(UserRepository.prototype, 'findMany').mockResolvedValue([]);
            hashMock.mockResolvedValue('hashed-password');
            jest.spyOn(UserRepository.prototype, 'create').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new UserService();
            let caught: unknown;

            try {
                await service.createUser(payload);
            } catch (error) {
                caught = error;
            }

            expect(caught).toBeInstanceOf(Error);
            if (caught instanceof Error) {
                expect(isResource(caught.message)).toBe(true);
                if (isResource(caught.message)) {
                }
            }
        });
    });

    describe('getUsers', () => {
        it('returns sanitized users when repository succeeds', async () => {
            const users = [makeDbUser({ id: 1, password: 'hash1' }), makeDbUser({ id: 2, password: 'hash2' })];
            const findManySpy = jest.spyOn(UserRepository.prototype, 'findMany').mockResolvedValue(users);

            const service = new UserService();
            const result = await service.getUsers({ limit: 2, offset: 4, sort: 'email', order: SortOrder.DESC });

            expect(findManySpy).toHaveBeenCalledWith(undefined, {
                limit: 2,
                offset: 4,
                sort: 'email',
                order: 'desc',
            });
            expect(result).toEqual(
                expect.objectContaining({
                    success: true,
                    data: expect.any(Array),
                })
            );
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toHaveLength(2);
                result.data.forEach(user => {
                    expect(user).not.toHaveProperty('password');
                });
            }
        });

        it('returns internal server error when repository throws', async () => {
            jest.spyOn(UserRepository.prototype, 'findMany').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new UserService();
            const result = await service.getUsers();

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('countUsers', () => {
        it('returns total count when repository succeeds', async () => {
            const countSpy = jest.spyOn(UserRepository.prototype, 'count').mockResolvedValue(12);

            const service = new UserService();
            const result = await service.countUsers();

            expect(countSpy).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: true, data: 12 });
        });

        it('returns internal server error when repository throws', async () => {
            jest.spyOn(UserRepository.prototype, 'count').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new UserService();
            const result = await service.countUsers();

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('getUserById', () => {
        it('returns user not found when repository returns null', async () => {
            const findSpy = jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(null);

            const service = new UserService();
            const result = await service.getUserById(9);

            expect(findSpy).toHaveBeenCalledWith(9);
            expect(result).toEqual({ success: false, error: Resource.USER_NOT_FOUND });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.USER_NOT_FOUND);
            }
        });

        it('returns sanitized user when repository returns a record', async () => {
            const user = makeDbUser({ id: 7, password: 'hash' });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(user);

            const service = new UserService();
            const result = await service.getUserById(7);

            expect(result).toEqual(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({ id: 7, email: user.email }),
                })
            );
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).not.toHaveProperty('password');
            }
        });

        it('throws when repository lookup rejects', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new UserService();
            let caught: unknown;

            try {
                await service.getUserById(3);
            } catch (error) {
                caught = error;
            }

            expect(caught).toBeInstanceOf(Error);
            if (caught instanceof Error) {
                expect(isResource(caught.message)).toBe(true);
                if (isResource(caught.message)) {
                }
            }
        });
    });

    describe('getUsersByEmail', () => {
        it('returns sanitized users when repository succeeds', async () => {
            const users = [makeDbUser({ id: 4, password: 'hash' })];
            const findManySpy = jest.spyOn(UserRepository.prototype, 'findMany').mockResolvedValue(users);

            const service = new UserService();
            const result = await service.getUsersByEmail('example', { limit: 5, offset: 10, sort: 'email', order: SortOrder.ASC });

            expect(findManySpy).toHaveBeenCalledWith(
                { email: { operator: FilterOperator.LIKE, value: 'example' } },
                { limit: 5, offset: 10, sort: 'email', order: 'asc' }
            );
            expect(result).toEqual(
                expect.objectContaining({
                    success: true,
                    data: expect.any(Array),
                })
            );
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toHaveLength(1);
                expect(result.data[0]).not.toHaveProperty('password');
            }
        });

        it('returns internal server error when repository throws', async () => {
            jest.spyOn(UserRepository.prototype, 'findMany').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new UserService();
            const result = await service.getUsersByEmail('example');

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('getUserByEmailExact', () => {
        it('returns sanitized users when repository succeeds', async () => {
            const users = [makeDbUser({ id: 4, password: 'hash' })];
            const findManySpy = jest.spyOn(UserRepository.prototype, 'findMany').mockResolvedValue(users);

            const service = new UserService();
            const result = await service.getUserByEmailExact('  Test@Example.com ', { limit: 5, offset: 10, sort: 'email', order: SortOrder.ASC });

            expect(findManySpy).toHaveBeenCalledWith(
                { email: { operator: FilterOperator.EQ, value: 'test@example.com' } },
                { limit: 5, offset: 10, sort: 'email', order: 'asc' }
            );
            expect(result).toEqual(
                expect.objectContaining({
                    success: true,
                    data: expect.any(Array),
                })
            );
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toHaveLength(1);
                expect(result.data[0]).not.toHaveProperty('password');
            }
        });

        it('returns internal server error when repository throws', async () => {
            jest.spyOn(UserRepository.prototype, 'findMany').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new UserService();
            const result = await service.getUserByEmailExact('test@example.com');

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('findUserByEmailExact', () => {
        it('returns user not found when repository returns no results', async () => {
            const findManySpy = jest.spyOn(UserRepository.prototype, 'findMany').mockResolvedValue([]);

            const service = new UserService();
            const result = await service.findUserByEmailExact('  Test@Example.com ');

            expect(findManySpy).toHaveBeenCalledWith(
                { email: { operator: FilterOperator.EQ, value: 'test@example.com' } },
                { limit: 2 }
            );
            expect(result).toEqual({ success: false, error: Resource.USER_NOT_FOUND });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.USER_NOT_FOUND);
            }
        });

        it('returns sanitized user when repository returns a record', async () => {
            const user = makeDbUser({ id: 9, password: 'hash' });
            const findManySpy = jest.spyOn(UserRepository.prototype, 'findMany').mockResolvedValue([user]);

            const service = new UserService();
            const result = await service.findUserByEmailExact('USER@example.com');

            expect(findManySpy).toHaveBeenCalledWith(
                { email: { operator: FilterOperator.EQ, value: 'user@example.com' } },
                { limit: 2 }
            );
            expect(result).toEqual(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({ id: user.id, email: user.email }),
                })
            );
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).not.toHaveProperty('password');
            }
        });

        it('returns internal server error when multiple users share the same email', async () => {
            const users = [
                makeDbUser({ id: 1, email: 'dup@example.com' }),
                makeDbUser({ id: 2, email: 'dup@example.com' }),
            ];
            jest.spyOn(UserRepository.prototype, 'findMany').mockResolvedValue(users);

            const service = new UserService();
            const result = await service.findUserByEmailExact('dup@example.com');

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('countUsersByEmail', () => {
        it('returns total count when repository succeeds', async () => {
            const countSpy = jest.spyOn(UserRepository.prototype, 'count').mockResolvedValue(3);

            const service = new UserService();
            const result = await service.countUsersByEmail('tester');

            expect(countSpy).toHaveBeenCalledWith({ email: { operator: FilterOperator.LIKE, value: 'tester' } });
            expect(result).toEqual({ success: true, data: 3 });
        });

        it('returns internal server error when repository throws', async () => {
            jest.spyOn(UserRepository.prototype, 'count').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new UserService();
            const result = await service.countUsersByEmail('tester');

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('updateUser', () => {
        it('returns no records found when current user does not exist', async () => {
            const findSpy = jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(null);
            const updateSpy = jest.spyOn(UserRepository.prototype, 'update');

            const service = new UserService();
            const result = await service.updateUser(4, { firstName: 'New' });

            expect(findSpy).toHaveBeenCalledWith(4);
            expect(updateSpy).not.toHaveBeenCalled();
            expect(compareMock).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.NO_RECORDS_FOUND });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.NO_RECORDS_FOUND);
            }
        });

        it('returns invalid credentials when password changes without current password proof', async () => {
            const current = makeDbUser({ id: 5, password: 'hashed-current' });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(current);
            const updateSpy = jest.spyOn(UserRepository.prototype, 'update');

            const service = new UserService();
            const result = await service.updateUser(5, { password: 'new-password' });

            expect(compareMock).not.toHaveBeenCalled();
            expect(updateSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.INVALID_CREDENTIALS });
        });

        it('returns invalid credentials when email changes without current password proof', async () => {
            const current = makeDbUser({ id: 5, password: 'hashed-current' });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(current);
            const lookupSpy = jest.spyOn(UserRepository.prototype, 'findMany');

            const service = new UserService();
            const result = await service.updateUser(5, { email: 'new@example.com' });

            expect(compareMock).not.toHaveBeenCalled();
            expect(lookupSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.INVALID_CREDENTIALS });
        });

        it('returns invalid credentials when current password proof is wrong', async () => {
            const current = makeDbUser({ id: 5, password: 'hashed-current' });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(current);
            compareMock.mockResolvedValue(false);
            const updateSpy = jest.spyOn(UserRepository.prototype, 'update');

            const service = new UserService();
            const result = await service.updateUser(5, {
                password: 'new-password',
                currentPassword: 'wrong-password',
            });

            expect(compareMock).toHaveBeenCalledWith('wrong-password', current.password);
            expect(updateSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.INVALID_CREDENTIALS });
        });

        it('removes password update when password matches current hash', async () => {
            const current = makeDbUser({ id: 5, password: 'hashed' });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(current);
            compareMock
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(true);
            const updated = makeDbUser({ id: 5, password: current.password, firstName: 'Updated' });
            const updateSpy = jest.spyOn(UserRepository.prototype, 'update').mockResolvedValue(updated);

            const service = new UserService();
            const result = await service.updateUser(5, {
                password: 'hashed',
                currentPassword: 'current-password',
                firstName: 'Updated',
            });

            expect(compareMock).toHaveBeenNthCalledWith(1, 'current-password', current.password);
            expect(compareMock).toHaveBeenNthCalledWith(2, 'hashed', current.password);
            expect(hashMock).not.toHaveBeenCalled();
            expect(updateSpy).toHaveBeenCalledTimes(1);
            const updateArg = updateSpy.mock.calls[0][1];
            expect(updateArg).not.toHaveProperty('password');
            expect(updateArg).not.toHaveProperty('currentPassword');
            expect(result).toEqual(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({ id: 5, firstName: 'Updated' }),
                })
            );
        });

        it('rehashes password when updated password differs', async () => {
            const current = makeDbUser({ id: 6, password: 'hashed-old' });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(current);
            compareMock
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);
            hashMock.mockResolvedValue('hashed-new');
            const updated = makeDbUser({ id: 6, password: 'hashed-new' });
            const updateSpy = jest.spyOn(UserRepository.prototype, 'update').mockResolvedValue(updated);

            const service = new UserService();
            const result = await service.updateUser(6, {
                password: 'new-password',
                currentPassword: 'current-password',
            });

            expect(compareMock).toHaveBeenNthCalledWith(1, 'current-password', current.password);
            expect(compareMock).toHaveBeenNthCalledWith(2, 'new-password', current.password);
            expect(hashMock).toHaveBeenCalledWith('new-password', 10);
            expect(updateSpy).toHaveBeenCalledWith(6, expect.objectContaining({ password: 'hashed-new' }));
            expect(result).toEqual(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({ id: 6 }),
                })
            );
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).not.toHaveProperty('password');
            }
        });

        it('normalizes email and returns email in use when another user already owns it', async () => {
            const current = makeDbUser({ id: 7, email: 'current@example.com', password: 'hashed-current' });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(current);
            compareMock.mockResolvedValue(true);
            const findManySpy = jest.spyOn(UserRepository.prototype, 'findMany').mockResolvedValue([
                makeDbUser({ id: 88, email: 'new@example.com' }),
            ]);
            const updateSpy = jest.spyOn(UserRepository.prototype, 'update');

            const service = new UserService();
            const result = await service.updateUser(7, {
                email: ' NEW@EXAMPLE.COM ',
                currentPassword: 'current-password',
            });

            expect(compareMock).toHaveBeenCalledWith('current-password', current.password);
            expect(findManySpy).toHaveBeenCalledWith(
                { email: { operator: FilterOperator.EQ, value: 'new@example.com' } },
                { limit: 2 }
            );
            expect(updateSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.EMAIL_IN_USE });
        });

        it('re-verifies email and revokes refresh tokens when email changes', async () => {
            const current = makeDbUser({ id: 8, email: 'current@example.com', password: 'hashed-current' });
            const updated = makeDbUser({
                id: 8,
                email: 'new@example.com',
                emailVerifiedAt: null,
                password: current.password,
            });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(current);
            jest.spyOn(UserRepository.prototype, 'findMany').mockResolvedValue([]);
            compareMock.mockResolvedValue(true);
            const updateSpy = jest.spyOn(UserRepository.prototype, 'update').mockResolvedValue(updated);
            const deleteTokensSpy = jest.spyOn(TokenService.prototype, 'deleteByUserIdAndType')
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(2);
            const createTokenSpy = jest.spyOn(TokenService.prototype, 'createEmailVerificationToken').mockResolvedValue({
                success: true,
                data: { token: 'verify-token', expiresAt: new Date('2099-01-01T00:00:00Z') },
            });
            sendEmailVerificationMock.mockResolvedValue();

            const service = new UserService();
            const result = await service.updateUser(8, {
                email: ' NEW@EXAMPLE.COM ',
                currentPassword: 'current-password',
            });

            expect(compareMock).toHaveBeenCalledWith('current-password', current.password);
            expect(updateSpy).toHaveBeenCalledWith(8, expect.objectContaining({
                email: 'new@example.com',
                emailVerifiedAt: null,
            }));
            expect(deleteTokensSpy).toHaveBeenNthCalledWith(1, 8, TokenType.EMAIL_VERIFICATION);
            expect(createTokenSpy).toHaveBeenCalledWith(8);
            expect(sendEmailVerificationMock).toHaveBeenCalledWith(
                'new@example.com',
                'verify-token',
                8,
                updated.language
            );
            expect(deleteTokensSpy).toHaveBeenNthCalledWith(2, 8, TokenType.REFRESH);
            expect(result).toEqual(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        id: 8,
                        email: 'new@example.com',
                        emailVerifiedAt: null,
                    }),
                })
            );
        });

        it('rolls back the persisted user when email verification follow-up fails', async () => {
            const current = makeDbUser({ id: 9, email: 'current@example.com', password: 'hashed-current' });
            const updated = makeDbUser({
                id: 9,
                email: 'new@example.com',
                emailVerifiedAt: null,
                password: current.password,
            });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(current);
            jest.spyOn(UserRepository.prototype, 'findMany').mockResolvedValue([]);
            compareMock.mockResolvedValue(true);
            const updateSpy = jest.spyOn(UserRepository.prototype, 'update')
                .mockResolvedValueOnce(updated)
                .mockResolvedValueOnce(current);
            const deleteTokensSpy = jest.spyOn(TokenService.prototype, 'deleteByUserIdAndType')
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(1);
            jest.spyOn(TokenService.prototype, 'createEmailVerificationToken').mockResolvedValue({
                success: true,
                data: { token: 'verify-token', expiresAt: new Date('2099-01-01T00:00:00Z') },
            });
            sendEmailVerificationMock.mockRejectedValueOnce(new Error('smtp unavailable'));

            const service = new UserService();
            const result = await service.updateUser(9, {
                email: 'new@example.com',
                currentPassword: 'current-password',
                firstName: 'Changed',
            });

            expect(updateSpy).toHaveBeenNthCalledWith(1, 9, expect.objectContaining({
                email: 'new@example.com',
                emailVerifiedAt: null,
                firstName: 'Changed',
            }));
            expect(updateSpy).toHaveBeenNthCalledWith(2, 9, expect.objectContaining({
                firstName: current.firstName,
                email: current.email,
                emailVerifiedAt: current.emailVerifiedAt,
                password: current.password,
            }));
            expect(deleteTokensSpy).toHaveBeenNthCalledWith(1, 9, TokenType.EMAIL_VERIFICATION);
            expect(deleteTokensSpy).toHaveBeenNthCalledWith(2, 9, TokenType.EMAIL_VERIFICATION);
            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
        });

        it('allows trusted reset-password updates without current password proof', async () => {
            const current = makeDbUser({ id: 10, password: 'hashed-old' });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(current);
            compareMock.mockResolvedValue(false);
            hashMock.mockResolvedValue('hashed-reset');
            const updated = makeDbUser({ id: 10, password: 'hashed-reset' });
            const updateSpy = jest.spyOn(UserRepository.prototype, 'update').mockResolvedValue(updated);

            const service = new UserService();
            const result = await service.updateUser(
                10,
                { password: 'reset-password' },
                { skipCurrentPasswordCheck: true }
            );

            expect(compareMock).toHaveBeenCalledTimes(1);
            expect(compareMock).toHaveBeenCalledWith('reset-password', current.password);
            expect(hashMock).toHaveBeenCalledWith('reset-password', 10);
            expect(updateSpy).toHaveBeenCalledWith(10, expect.objectContaining({ password: 'hashed-reset' }));
            expect(result).toEqual(expect.objectContaining({
                success: true,
                data: expect.objectContaining({ id: 10 }),
            }));
        });

        it('strips forbidden privilege fields before updating', async () => {
            const current = makeDbUser({ id: 16, password: 'hashed-old' });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(current);
            const updateSpy = jest.spyOn(UserRepository.prototype, 'update').mockResolvedValue(current);

            const service = new UserService();
            await service.updateUser(16, {
                firstName: 'New',
                currentPassword: 'secret123' as any,
                profile: 'master' as any,
                active: false as any,
            } as any);

            const updateArg = updateSpy.mock.calls[0][1] as Record<string, unknown>;
            expect(updateArg).toEqual(expect.objectContaining({ firstName: 'New' }));
            expect(updateArg).not.toHaveProperty('profile');
            expect(updateArg).not.toHaveProperty('active');
            expect(updateArg).not.toHaveProperty('currentPassword');
        });

        it('throws when repository update rejects', async () => {
            const current = makeDbUser({ id: 7, password: 'hashed-old' });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(current);
            compareMock
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);
            hashMock.mockResolvedValue('hashed-new');
            jest.spyOn(UserRepository.prototype, 'update').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new UserService();
            let caught: unknown;

            try {
                await service.updateUser(7, {
                    password: 'new-password',
                    currentPassword: 'current-password',
                });
            } catch (error) {
                caught = error;
            }

            expect(caught).toBeInstanceOf(Error);
            if (caught instanceof Error) {
                expect(isResource(caught.message)).toBe(true);
                if (isResource(caught.message)) {
                }
            }
        });
    });

    describe('deleteUser', () => {
        it('returns user not found when repository returns null', async () => {
            const findSpy = jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(null);
            const deleteSpy = jest.spyOn(UserRepository.prototype, 'delete');

            const service = new UserService();
            const result = await service.deleteUser(10);

            expect(findSpy).toHaveBeenCalledWith(10);
            expect(deleteSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.USER_NOT_FOUND });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.USER_NOT_FOUND);
            }
        });

        it('deletes and returns id when user exists', async () => {
            const user = makeDbUser({ id: 11 });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(user);
            const deleteSpy = jest.spyOn(UserRepository.prototype, 'delete').mockResolvedValue();

            const service = new UserService();
            const result = await service.deleteUser(11);

            expect(deleteSpy).toHaveBeenCalledWith(11);
            expect(result).toEqual({ success: true, data: { id: 11 } });
        });

        it('throws when repository delete rejects', async () => {
            const user = makeDbUser({ id: 12 });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(user);
            jest.spyOn(UserRepository.prototype, 'delete').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new UserService();
            let caught: unknown;

            try {
                await service.deleteUser(12);
            } catch (error) {
                caught = error;
            }

            expect(caught).toBeInstanceOf(Error);
            if (caught instanceof Error) {
                expect(isResource(caught.message)).toBe(true);
                if (isResource(caught.message)) {
                }
            }
        });
    });

    describe('findOne', () => {
        it('returns user not found when repository returns null', async () => {
            const findSpy = jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(null);

            const service = new UserService();
            const result = await service.findOne(20);

            expect(findSpy).toHaveBeenCalledWith(20);
            expect(result).toEqual({ success: false, error: Resource.USER_NOT_FOUND });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.USER_NOT_FOUND);
            }
        });

        it('returns user when repository returns a record', async () => {
            const user = makeDbUser({ id: 21 });
            const expected = makeUser({ id: 21 });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(user);

            const service = new UserService();
            const result = await service.findOne(21);

            expect(result).toEqual({ success: true, data: expected });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toHaveProperty('password');
            }
        });

        it('throws when repository lookup rejects', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new UserService();
            let caught: unknown;

            try {
                await service.findOne(22);
            } catch (error) {
                caught = error;
            }

            expect(caught).toBeInstanceOf(Error);
            if (caught instanceof Error) {
                expect(isResource(caught.message)).toBe(true);
                if (isResource(caught.message)) {
                }
            }
        });
    });

    describe('uploadAvatar', () => {
        const originalEnv = process.env;

        beforeEach(() => {
            process.env = { ...originalEnv };
            process.env.FTP_HOST = 'ftp.example.com';
            process.env.FTP_PORT = '21';
            process.env.FTP_USER = 'ftp-user';
            process.env.FTP_PASSWORD = 'ftp-pass';
            process.env.FTP_UPLOAD_PATH = '/public_html/zinero/users';

            ftpClientMock.access.mockResolvedValue(undefined);
            ftpClientMock.ensureDir.mockResolvedValue(undefined);
            ftpClientMock.list.mockResolvedValue([]);
            ftpClientMock.remove.mockResolvedValue(undefined);
            ftpClientMock.rename.mockResolvedValue(undefined);
            ftpClientMock.uploadFrom.mockResolvedValue(undefined);
            ftpClientMock.close.mockReturnValue(undefined);
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        it('returns user not found when user does not exist', async () => {
            const findSpy = jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(null);
            const updateSpy = jest.spyOn(UserRepository.prototype, 'update');

            const service = new UserService();
            const file = {
                buffer: Buffer.from('avatar'),
                mimetype: 'image/png',
                originalname: 'avatar.png',
            } as Express.Multer.File;
            const result = await service.uploadAvatar(99, file);

            expect(findSpy).toHaveBeenCalledWith(99);
            expect(updateSpy).not.toHaveBeenCalled();
            expect(ftpClientMock.access).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.USER_NOT_FOUND });
        });

        it('uploads avatar and updates url when upload succeeds', async () => {
            const user = makeDbUser({ id: 7 });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(user);
            const updateSpy = jest.spyOn(UserRepository.prototype, 'update').mockResolvedValue({
                ...user,
                avatarUrl: 'https://zinero.bade.digital/zinero/users/7/avatar/avatar.png',
            });

            const service = new UserService();
            const file = {
                buffer: Buffer.from('avatar-bytes'),
                mimetype: 'image/png',
                originalname: 'photo.png',
            } as Express.Multer.File;
            const result = await service.uploadAvatar(7, file);

            expect(ftpClientMock.access).toHaveBeenCalledWith({
                host: 'ftp.example.com',
                port: 21,
                user: 'ftp-user',
                password: 'ftp-pass',
            });
            expect(ftpClientMock.ensureDir).toHaveBeenCalledWith('/public_html/zinero/users/7/avatar');
            expect(ftpClientMock.uploadFrom).toHaveBeenCalledWith(expect.any(Object), 'avatar.png');
            expect(updateSpy).toHaveBeenCalledWith(7, {
                avatarUrl: 'https://zinero.bade.digital/zinero/users/7/avatar/avatar.png',
            });
            expect(result).toEqual({
                success: true,
                data: { url: 'https://zinero.bade.digital/zinero/users/7/avatar/avatar.png' },
            });
        });

        it('returns internal server error when ftp upload fails', async () => {
            const user = makeDbUser({ id: 8 });
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(user);
            jest.spyOn(UserRepository.prototype, 'update');
            ftpClientMock.uploadFrom.mockRejectedValue(new Error('ftp error'));

            const service = new UserService();
            const file = {
                buffer: Buffer.from('avatar-bytes'),
                mimetype: 'image/jpeg',
                originalname: 'avatar.jpg',
            } as Express.Multer.File;
            const result = await service.uploadAvatar(8, file);

            expect(ftpClientMock.access).toHaveBeenCalledTimes(1);
            expect(ftpClientMock.close).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
        });
    });
});



