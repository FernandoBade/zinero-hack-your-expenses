import UserController from '../../../src/controller/userController';
import { UserService } from '../../../src/service/userService';
import { HTTPStatus } from '../../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../../shared/enums/log.enums';
import { SortOrder } from '../../../../shared/enums/operator.enums';
import { Profile } from '../../../../shared/enums/user.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import * as commons from '../../../src/utils/commons';
import { createMockRequest, createMockResponse, createNext } from '../../helpers/mockExpress';
import { makeCreateUserInput, makeSanitizedUser, makeUser } from '../../helpers/factories';

describe('UserController', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        logSpy = jest.spyOn(commons, 'createLog').mockResolvedValue();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('createUser', () => {
        it('returns 201 and payload when user creation succeeds', async () => {
            const payload = makeCreateUserInput({ email: 'UPPER@example.com' });
            const sanitized = makeSanitizedUser({ id: 5, email: 'upper@example.com' });
            const createUserSpy = jest.spyOn(UserService.prototype, 'createUser').mockResolvedValue({ success: true, data: sanitized });

            const req = createMockRequest({ body: payload });
            const res = createMockResponse();
            const next = createNext();

            await UserController.createUser(req, res, next);

            expect(createUserSpy).toHaveBeenCalledTimes(1);
            expect(createUserSpy).toHaveBeenCalledWith({
                ...payload,
                email: payload.email.trim().toLowerCase(),
            });
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.CREATED);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: sanitized,
                })
            );
            expect(logSpy).toHaveBeenCalledWith(
                LogType.SUCCESS,
                LogOperation.CREATE,
                LogCategory.USER,
                sanitized,
                sanitized.id
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 400 without calling service when validation fails', async () => {
            const createUserSpy = jest.spyOn(UserService.prototype, 'createUser');
            const req = createMockRequest({
                body: { firstName: 'A', lastName: '', email: 'invalid', password: '123' },
            });
            const res = createMockResponse();
            const next = createNext();

            await UserController.createUser(req, res, next);

            expect(createUserSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.VALIDATION_ERROR,
                    error: expect.arrayContaining([
                        expect.objectContaining({ field: 'firstName', errorCode: Resource.FIRST_NAME_TOO_SHORT }),
                        expect.objectContaining({ field: 'lastName', errorCode: Resource.LAST_NAME_TOO_SHORT }),
                        expect.objectContaining({ field: 'email', errorCode: Resource.EMAIL_INVALID }),
                        expect.objectContaining({ field: 'password', errorCode: Resource.PASSWORD_TOO_SHORT }),
                    ]),
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 400 when forbidden privilege fields are supplied', async () => {
            const createUserSpy = jest.spyOn(UserService.prototype, 'createUser');
            const req = createMockRequest({
                body: {
                    ...makeCreateUserInput(),
                    profile: Profile.MASTER,
                    active: false,
                },
            });
            const res = createMockResponse();
            const next = createNext();

            await UserController.createUser(req, res, next);

            expect(createUserSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.VALIDATION_ERROR,
                    error: expect.arrayContaining([
                        expect.objectContaining({ field: 'profile', errorCode: Resource.VALIDATION_ERROR }),
                        expect.objectContaining({ field: 'active', errorCode: Resource.VALIDATION_ERROR }),
                    ]),
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('maps service error to HTTP 400', async () => {
            const payload = makeCreateUserInput();
            const createUserSpy = jest.spyOn(UserService.prototype, 'createUser').mockResolvedValue({ success: false, error: Resource.EMAIL_IN_USE });

            const req = createMockRequest({ body: payload });
            const res = createMockResponse();
            const next = createNext();

            await UserController.createUser(req, res, next);

            expect(createUserSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.EMAIL_IN_USE,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it('returns email not verified payload when service reports unverified user', async () => {
            const payload = makeCreateUserInput({ email: 'user@example.com' });
            const createUserSpy = jest.spyOn(UserService.prototype, 'createUser').mockResolvedValue({ success: false, error: Resource.EMAIL_NOT_VERIFIED });

            const req = createMockRequest({ body: payload });
            const res = createMockResponse();
            const next = createNext();

            await UserController.createUser(req, res, next);

            expect(createUserSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.EMAIL_NOT_VERIFIED,
                    
                    error: expect.objectContaining({
                        email: 'user@example.com',
                        canResend: true,
                    }),
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 503 when signup email delivery fails', async () => {
            const payload = makeCreateUserInput();
            const createUserSpy = jest.spyOn(UserService.prototype, 'createUser').mockResolvedValue({
                success: false,
                error: Resource.EMAIL_DELIVERY_FAILED,
            });

            const req = createMockRequest({ body: payload });
            const res = createMockResponse();
            const next = createNext();

            await UserController.createUser(req, res, next);

            expect(createUserSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.SERVICE_UNAVAILABLE);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.EMAIL_DELIVERY_FAILED,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 500 and logs when create service throws', async () => {
            const payload = makeCreateUserInput();
            jest.spyOn(UserService.prototype, 'createUser').mockRejectedValue(new Error('db down'));

            const req = createMockRequest({ body: payload, user: { id: 5 } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.createUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.INTERNAL_SERVER_ERROR,
            }));
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.CREATE,
                LogCategory.USER,
                expect.any(Object),
                5,
                next
            );
        });
    });

    describe('getUsers', () => {
        it('returns 200 with data and pagination when service succeeds', async () => {
            const users = [makeSanitizedUser({ id: 1 }), makeSanitizedUser({ id: 2 })];
            jest.spyOn(UserService.prototype, 'getUsers').mockResolvedValue({ success: true, data: users });
            jest.spyOn(UserService.prototype, 'countUsers').mockResolvedValue({ success: true, data: users.length });

            const req = createMockRequest({ user: { id: 1, profile: Profile.MASTER }, query: { page: '1', pageSize: '1', sort: 'firstName', order: 'asc' } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUsers(req, res, next);

            expect(UserService.prototype.getUsers).toHaveBeenCalledTimes(1);
            expect(UserService.prototype.getUsers).toHaveBeenCalledWith({
                limit: 1,
                offset: 0,
                sort: 'firstName',
                order: SortOrder.ASC,
            });
            expect(UserService.prototype.countUsers).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: users,
                    page: 1,
                    pageSize: 1,
                    pageCount: expect.any(Number),
                    totalItems: users.length,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when listing service fails', async () => {
            const getUsersSpy = jest.spyOn(UserService.prototype, 'getUsers').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            const countUsersSpy = jest.spyOn(UserService.prototype, 'countUsers').mockResolvedValue({ success: true, data: 0 });

            const req = createMockRequest({ user: { id: 1, profile: Profile.MASTER }, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUsers(req, res, next);

            expect(getUsersSpy).toHaveBeenCalledTimes(1);
            expect(countUsersSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when count service fails', async () => {
            const getUsersSpy = jest.spyOn(UserService.prototype, 'getUsers').mockResolvedValue({ success: true, data: [] });
            const countUsersSpy = jest.spyOn(UserService.prototype, 'countUsers').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });

            const req = createMockRequest({ user: { id: 1, profile: Profile.MASTER }, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUsers(req, res, next);

            expect(getUsersSpy).toHaveBeenCalledTimes(1);
            expect(countUsersSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 500 and logs when listing throws unexpectedly', async () => {
            jest.spyOn(UserService.prototype, 'getUsers').mockRejectedValue(new Error('query failed'));
            jest.spyOn(UserService.prototype, 'countUsers').mockResolvedValue({ success: true, data: 0 });

            const req = createMockRequest({ query: {}, user: { id: 3, profile: Profile.MASTER } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUsers(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.INTERNAL_SERVER_ERROR,
            }));
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.CREATE,
                LogCategory.USER,
                expect.any(Object),
                3,
                next
            );
        });
    });

    describe('getUserById', () => {
        it('returns 400 when id is invalid', async () => {
            const getUserByIdSpy = jest.spyOn(UserService.prototype, 'getUserById');
            const req = createMockRequest({ params: { id: 'abc' } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUserById(req, res, next);

            expect(getUserByIdSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INVALID_USER_ID,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 403 when non-master user requests another user id', async () => {
            const getUserByIdSpy = jest.spyOn(UserService.prototype, 'getUserById');
            const req = createMockRequest({
                params: { id: '7' },
                user: { id: 2, profile: Profile.STARTER },
            });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUserById(req, res, next);

            expect(getUserByIdSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.UNAUTHORIZED_OPERATION,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 403 when request has no authenticated user', async () => {
            const getUserByIdSpy = jest.spyOn(UserService.prototype, 'getUserById');
            const req = createMockRequest({
                params: { id: '7' },
                user: undefined,
            });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUserById(req, res, next);

            expect(getUserByIdSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.UNAUTHORIZED_OPERATION,
            }));
        });

        it('allows master profile to fetch another user id', async () => {
            const user = makeSanitizedUser({ id: 7 });
            const getUserByIdSpy = jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({
                success: true,
                data: user,
            });
            const req = createMockRequest({
                params: { id: '7' },
                user: { id: 2, profile: Profile.MASTER },
            });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUserById(req, res, next);

            expect(getUserByIdSpy).toHaveBeenCalledWith(7);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: user }));
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when service reports not found', async () => {
            jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({ success: false, error: Resource.USER_NOT_FOUND });
            const req = createMockRequest({ params: { id: '99' }, user: { id: 99, profile: Profile.STARTER } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUserById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.USER_NOT_FOUND,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 200 when user is found', async () => {
            const user = makeSanitizedUser({ id: 7 });
            jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({ success: true, data: user });

            const req = createMockRequest({ params: { id: '7' }, user: { id: 7, profile: Profile.STARTER } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUserById(req, res, next);

            expect(UserService.prototype.getUserById).toHaveBeenCalledWith(7);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: user }));
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 500 and logs when service throws', async () => {
            const error = new Error('boom');
            jest.spyOn(UserService.prototype, 'getUserById').mockRejectedValue(error);
            const req = createMockRequest({ params: { id: '7' }, user: { id: 7, profile: Profile.STARTER } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUserById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.CREATE,
                LogCategory.USER,
                expect.any(Object),
                7,
                next
            );
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('getUsersByEmail', () => {
        it('returns 400 when search term is too short', async () => {
            const getUsersByEmailSpy = jest.spyOn(UserService.prototype, 'getUsersByEmail');
            const req = createMockRequest({ user: { id: 1, profile: Profile.MASTER }, query: { email: 'ab' } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUsersByEmail(req, res, next);

            expect(getUsersByEmailSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.SEARCH_TERM_TOO_SHORT,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 200 when search succeeds', async () => {
            const users = [makeSanitizedUser({ id: 1 })];
            jest.spyOn(UserService.prototype, 'getUsersByEmail').mockResolvedValue({ success: true, data: users });
            jest.spyOn(UserService.prototype, 'countUsersByEmail').mockResolvedValue({ success: true, data: 1 });

            const req = createMockRequest({ user: { id: 1, profile: Profile.MASTER }, query: { email: 'test', page: '1', pageSize: '10' } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUsersByEmail(req, res, next);

            expect(UserService.prototype.getUsersByEmail).toHaveBeenCalledWith('test', {
                limit: 10,
                offset: 0,
                sort: undefined,
                order: SortOrder.ASC,
            });
            expect(UserService.prototype.countUsersByEmail).toHaveBeenCalledWith('test');
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: users,
                    page: 1,
                    pageSize: 10,
                    totalItems: 1,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when listing service fails', async () => {
            const getUsersByEmailSpy = jest.spyOn(UserService.prototype, 'getUsersByEmail').mockResolvedValue({
                success: false,
                error: Resource.INTERNAL_SERVER_ERROR,
            });
            const countUsersByEmailSpy = jest.spyOn(UserService.prototype, 'countUsersByEmail').mockResolvedValue({
                success: true,
                data: 0,
            });

            const req = createMockRequest({ user: { id: 1, profile: Profile.MASTER }, query: { email: 'valid-email' } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUsersByEmail(req, res, next);

            expect(getUsersByEmailSpy).toHaveBeenCalledTimes(1);
            expect(countUsersByEmailSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.INTERNAL_SERVER_ERROR,
            }));
        });

        it('returns 400 when count service fails', async () => {
            const getUsersByEmailSpy = jest.spyOn(UserService.prototype, 'getUsersByEmail').mockResolvedValue({ success: true, data: [] });
            const countUsersByEmailSpy = jest.spyOn(UserService.prototype, 'countUsersByEmail').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });

            const req = createMockRequest({ user: { id: 1, profile: Profile.MASTER }, query: { email: 'abc' } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUsersByEmail(req, res, next);

            expect(getUsersByEmailSpy).toHaveBeenCalledTimes(1);
            expect(countUsersByEmailSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.INTERNAL_SERVER_ERROR,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 500 and logs when listing throws unexpectedly', async () => {
            jest.spyOn(UserService.prototype, 'getUsersByEmail').mockRejectedValue(new Error('query failed'));
            jest.spyOn(UserService.prototype, 'countUsersByEmail').mockResolvedValue({ success: true, data: 0 });

            const req = createMockRequest({ query: { email: 'valid-email' }, user: { id: 8, profile: Profile.MASTER } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUsersByEmail(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.INTERNAL_SERVER_ERROR,
            }));
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.CREATE,
                LogCategory.USER,
                expect.any(Object),
                8,
                next
            );
        });
    });

    describe('updateUser', () => {
        it('returns 400 for invalid id', async () => {
            const findOneSpy = jest.spyOn(UserService.prototype, 'findOne');
            const req = createMockRequest({ params: { id: '0' } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.updateUser(req, res, next);

            expect(findOneSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, errorCode: Resource.INVALID_USER_ID }));
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when user does not exist', async () => {
            jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: false, error: Resource.USER_NOT_FOUND });
            const req = createMockRequest({ params: { id: '5' }, body: { firstName: 'John' }, user: { id: 5 } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.updateUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, errorCode: Resource.USER_NOT_FOUND }));
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when validation fails', async () => {
            jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: makeUser({ id: 3 }) });
            const updateUserSpy = jest.spyOn(UserService.prototype, 'updateUser');
            const req = createMockRequest({ params: { id: '3' }, body: { firstName: 'A' }, user: { id: 3 } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.updateUser(req, res, next);

            expect(updateUserSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.VALIDATION_ERROR,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when forbidden privilege fields are supplied', async () => {
            jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: makeUser({ id: 3 }) });
            const updateUserSpy = jest.spyOn(UserService.prototype, 'updateUser');
            const req = createMockRequest({
                params: { id: '3' },
                body: { profile: Profile.MASTER, active: false },
                user: { id: 3 },
            });
            const res = createMockResponse();
            const next = createNext();

            await UserController.updateUser(req, res, next);

            expect(updateUserSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.VALIDATION_ERROR,
                error: expect.arrayContaining([
                    expect.objectContaining({ field: 'profile', errorCode: Resource.VALIDATION_ERROR }),
                    expect.objectContaining({ field: 'active', errorCode: Resource.VALIDATION_ERROR }),
                ]),
            }));
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 403 when a MASTER user attempts to change another user credentials', async () => {
            const findOneSpy = jest.spyOn(UserService.prototype, 'findOne');
            const updateUserSpy = jest.spyOn(UserService.prototype, 'updateUser');
            const req = createMockRequest({
                params: { id: '3' },
                body: { email: 'new@example.com', currentPassword: 'secret123' },
                user: { id: 1, profile: Profile.MASTER },
            });
            const res = createMockResponse();
            const next = createNext();

            await UserController.updateUser(req, res, next);

            expect(findOneSpy).not.toHaveBeenCalled();
            expect(updateUserSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.UNAUTHORIZED_OPERATION,
            }));
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 200 when update succeeds', async () => {
            const existing = makeUser({ id: 3 });
            const sanitized = makeSanitizedUser({ id: 3, firstName: 'Jane', email: 'jane@example.com' });
            const expectedDelta = {
                firstName: { from: existing.firstName, to: sanitized.firstName },
                email: { from: existing.email, to: sanitized.email },
            };
            jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: existing });
            jest.spyOn(UserService.prototype, 'updateUser').mockResolvedValue({ success: true, data: sanitized });

            const req = createMockRequest({
                params: { id: '3' },
                body: { firstName: 'Jane', email: 'JANE@EXAMPLE.COM', currentPassword: 'secret123' },
                user: { id: 3 },
            });
            const res = createMockResponse();
            const next = createNext();

            await UserController.updateUser(req, res, next);

            expect(UserService.prototype.updateUser).toHaveBeenCalledWith(3, {
                firstName: 'Jane',
                email: 'jane@example.com',
                currentPassword: 'secret123',
            });
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: sanitized }));
            expect(logSpy).toHaveBeenCalledWith(
                LogType.SUCCESS,
                LogOperation.UPDATE,
                LogCategory.USER,
                expectedDelta,
                sanitized.id
            );
        });

        it('returns 400 when update service returns failure', async () => {
            const existing = makeUser({ id: 3 });
            jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: existing });
            const updateUserSpy = jest.spyOn(UserService.prototype, 'updateUser').mockResolvedValue({
                success: false,
                error: Resource.INTERNAL_SERVER_ERROR,
            });
            const req = createMockRequest({ params: { id: '3' }, body: { firstName: 'Jane', email: 'jane@example.com' }, user: { id: 3 } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.updateUser(req, res, next);

            expect(updateUserSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.INTERNAL_SERVER_ERROR,
            }));
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 401 when update service reports invalid credentials', async () => {
            const existing = makeUser({ id: 3 });
            const updateUserSpy = jest.spyOn(UserService.prototype, 'updateUser').mockResolvedValue({
                success: false,
                error: Resource.INVALID_CREDENTIALS,
            });
            jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: existing });
            const req = createMockRequest({
                params: { id: '3' },
                body: { email: 'jane@example.com' },
                user: { id: 3 },
            });
            const res = createMockResponse();
            const next = createNext();

            await UserController.updateUser(req, res, next);

            expect(updateUserSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.UNAUTHORIZED);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.INVALID_CREDENTIALS,
            }));
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 503 when email-change delivery follow-up fails', async () => {
            const existing = makeUser({ id: 3 });
            const updateUserSpy = jest.spyOn(UserService.prototype, 'updateUser').mockResolvedValue({
                success: false,
                error: Resource.EMAIL_DELIVERY_FAILED,
            });
            jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: existing });
            const req = createMockRequest({
                params: { id: '3' },
                body: { email: 'jane@example.com', currentPassword: 'secret123' },
                user: { id: 3 },
            });
            const res = createMockResponse();
            const next = createNext();

            await UserController.updateUser(req, res, next);

            expect(updateUserSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.SERVICE_UNAVAILABLE);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.EMAIL_DELIVERY_FAILED,
            }));
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 500 and logs when update flow throws', async () => {
            jest.spyOn(UserService.prototype, 'findOne').mockRejectedValue(new Error('query failed'));

            const req = createMockRequest({ params: { id: '3' }, body: { firstName: 'Jane' }, user: { id: 3 } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.updateUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.INTERNAL_SERVER_ERROR,
            }));
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.UPDATE,
                LogCategory.USER,
                expect.any(Object),
                3,
                next
            );
        });
    });

    describe('deleteUser', () => {
        it('returns 400 for invalid id', async () => {
            const deleteSpy = jest.spyOn(UserService.prototype, 'deleteUser');
            const req = createMockRequest({ params: { id: 'abc' } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.deleteUser(req, res, next);

            expect(deleteSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, errorCode: Resource.INVALID_USER_ID }));
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when service signals failure', async () => {
            jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({ success: true, data: makeSanitizedUser({ id: 10 }) });
            jest.spyOn(UserService.prototype, 'deleteUser').mockResolvedValue({ success: false, error: Resource.USER_NOT_FOUND });
            const req = createMockRequest({ params: { id: '10' }, user: { id: 10 } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.deleteUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, errorCode: Resource.USER_NOT_FOUND }));
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 200 when deletion succeeds', async () => {
            const snapshot = makeSanitizedUser({ id: 1 });
            const { createdAt, updatedAt, ...expectedSnapshot } = snapshot;
            void createdAt;
            void updatedAt;
            jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({ success: true, data: snapshot });
            jest.spyOn(UserService.prototype, 'deleteUser').mockResolvedValue({ success: true, data: { id: 1 } });
            const req = createMockRequest({ params: { id: '1' }, user: { id: 1 } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.deleteUser(req, res, next);

            expect(UserService.prototype.deleteUser).toHaveBeenCalledWith(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { id: 1 } }));
            expect(logSpy).toHaveBeenCalledWith(
                LogType.SUCCESS,
                LogOperation.DELETE,
                LogCategory.USER,
                expectedSnapshot,
                1
            );
        });

        it('returns 500 and logs when delete flow throws', async () => {
            jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({
                success: true,
                data: makeSanitizedUser({ id: 15 }),
            });
            jest.spyOn(UserService.prototype, 'deleteUser').mockRejectedValue(new Error('delete failed'));
            const req = createMockRequest({ params: { id: '15' }, user: { id: 15 } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.deleteUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.INTERNAL_SERVER_ERROR,
            }));
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.DELETE,
                LogCategory.USER,
                expect.any(Object),
                15,
                next
            );
        });
    });

    describe('uploadAvatar', () => {
        it('returns 401 when user is missing from request', async () => {
            const uploadSpy = jest.spyOn(UserService.prototype, 'uploadAvatar');
            const req = createMockRequest({ user: undefined });
            const res = createMockResponse();
            const next = createNext();

            await UserController.uploadAvatar(req, res, next);

            expect(uploadSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.UNAUTHORIZED);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.EXPIRED_OR_INVALID_TOKEN,
                })
            );
        });

        it('returns 400 when file is missing', async () => {
            const uploadSpy = jest.spyOn(UserService.prototype, 'uploadAvatar');
            const req = createMockRequest({ user: { id: 1 }, file: undefined });
            const res = createMockResponse();
            const next = createNext();

            await UserController.uploadAvatar(req, res, next);

            expect(uploadSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.VALIDATION_ERROR,
                    error: expect.arrayContaining([
                        expect.objectContaining({ field: 'avatar', errorCode: Resource.FIELD_REQUIRED }),
                    ]),
                })
            );
        });

        it('returns 200 when upload succeeds', async () => {
            const payload = { url: 'https://bade.digital/zinero/users/1/avatar/avatar.jpg' };
            jest.spyOn(UserService.prototype, 'uploadAvatar').mockResolvedValue({ success: true, data: payload });

            const req = createMockRequest({
                user: { id: 1 },
                file: { buffer: Buffer.from('avatar'), mimetype: 'image/jpeg', size: 1024 } as Express.Multer.File,
            });
            const res = createMockResponse();
            const next = createNext();

            await UserController.uploadAvatar(req, res, next);

            expect(UserService.prototype.uploadAvatar).toHaveBeenCalledWith(1, expect.any(Object));
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: payload }));
            expect(logSpy).toHaveBeenCalledWith(
                LogType.SUCCESS,
                LogOperation.UPDATE,
                LogCategory.USER,
                { avatarUrl: payload.url },
                1
            );
        });

        it('returns 400 when avatar mime type is not allowed', async () => {
            const uploadSpy = jest.spyOn(UserService.prototype, 'uploadAvatar');
            const req = createMockRequest({
                user: { id: 1 },
                file: { buffer: Buffer.from('avatar'), mimetype: 'application/pdf', size: 1024 } as Express.Multer.File,
            });
            const res = createMockResponse();
            const next = createNext();

            await UserController.uploadAvatar(req, res, next);

            expect(uploadSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.VALIDATION_ERROR,
                error: expect.arrayContaining([expect.objectContaining({ field: 'avatar', errorCode: Resource.INVALID_TYPE })]),
            }));
        });

        it('returns 400 when avatar file exceeds size limit', async () => {
            const uploadSpy = jest.spyOn(UserService.prototype, 'uploadAvatar');
            const req = createMockRequest({
                user: { id: 1 },
                file: { buffer: Buffer.from('avatar'), mimetype: 'image/jpeg', size: 5 * 1024 * 1024 } as Express.Multer.File,
            });
            const res = createMockResponse();
            const next = createNext();

            await UserController.uploadAvatar(req, res, next);

            expect(uploadSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.VALIDATION_ERROR,
                error: expect.arrayContaining([expect.objectContaining({ field: 'avatar', errorCode: Resource.INVALID_TYPE })]),
            }));
        });

        it('returns mapped status when upload service returns business error', async () => {
            jest.spyOn(UserService.prototype, 'uploadAvatar').mockResolvedValue({
                success: false,
                error: Resource.USER_NOT_FOUND,
            });
            const req = createMockRequest({
                user: { id: 1 },
                file: { buffer: Buffer.from('avatar'), mimetype: 'image/jpeg', size: 1024 } as Express.Multer.File,
            });
            const res = createMockResponse();
            const next = createNext();

            await UserController.uploadAvatar(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.USER_NOT_FOUND,
            }));
        });

        it('returns 500 when upload service returns internal error', async () => {
            jest.spyOn(UserService.prototype, 'uploadAvatar').mockResolvedValue({
                success: false,
                error: Resource.INTERNAL_SERVER_ERROR,
            });
            const req = createMockRequest({
                user: { id: 1 },
                file: { buffer: Buffer.from('avatar'), mimetype: 'image/jpeg', size: 1024 } as Express.Multer.File,
            });
            const res = createMockResponse();
            const next = createNext();

            await UserController.uploadAvatar(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.INTERNAL_SERVER_ERROR,
            }));
        });

        it('returns 500 and logs when upload service throws', async () => {
            jest.spyOn(UserService.prototype, 'uploadAvatar').mockRejectedValue(new Error('storage unavailable'));
            const req = createMockRequest({
                user: { id: 1 },
                file: { buffer: Buffer.from('avatar'), mimetype: 'image/jpeg', size: 1024 } as Express.Multer.File,
            });
            const res = createMockResponse();
            const next = createNext();

            await UserController.uploadAvatar(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                errorCode: Resource.INTERNAL_SERVER_ERROR,
            }));
            expect(logSpy).toHaveBeenCalledWith(
                LogType.ERROR,
                LogOperation.UPDATE,
                LogCategory.USER,
                expect.any(Object),
                1,
                next
            );
        });
    });
});


// ─── Authorization regression tests ────────────────────────────────────────

describe('UserController — authorization enforcement', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        logSpy = jest.spyOn(commons, 'createLog').mockResolvedValue();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('getUsers — MASTER only', () => {
        it('returns 403 for a non-MASTER authenticated user', async () => {
            const getSpy = jest.spyOn(UserService.prototype, 'getUsers');
            const req = createMockRequest({ user: { id: 1, profile: undefined } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUsers(req, res, next);

            expect(getSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: Resource.UNAUTHORIZED_OPERATION }));
        });

        it('allows a MASTER user to list all users', async () => {
            jest.spyOn(UserService.prototype, 'getUsers').mockResolvedValue({ success: true, data: [] });
            jest.spyOn(UserService.prototype, 'countUsers').mockResolvedValue({ success: true, data: 0 });
            const req = createMockRequest({ user: { id: 1, profile: Profile.MASTER }, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUsers(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
        });
    });

    describe('getUsersByEmail — MASTER only', () => {
        it('returns 403 for a non-MASTER authenticated user', async () => {
            const getSpy = jest.spyOn(UserService.prototype, 'getUsersByEmail');
            const req = createMockRequest({ user: { id: 1, profile: undefined }, query: { email: 'test@example.com' } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.getUsersByEmail(req, res, next);

            expect(getSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: Resource.UNAUTHORIZED_OPERATION }));
        });
    });

    describe('updateUser — ownership enforcement', () => {
        it('returns 403 when updating another user\'s profile', async () => {
            const updateSpy = jest.spyOn(UserService.prototype, 'updateUser');
            const req = createMockRequest({ user: { id: 1 }, params: { id: '2' }, body: { firstName: 'Hacked' } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.updateUser(req, res, next);

            expect(updateSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: Resource.UNAUTHORIZED_OPERATION }));
        });

        it('allows a user to update their own profile', async () => {
            const existing = makeUser({ id: 5 });
            const updated = makeSanitizedUser({ id: 5, firstName: 'Updated' });
            jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: existing });
            jest.spyOn(UserService.prototype, 'updateUser').mockResolvedValue({ success: true, data: updated });
            const req = createMockRequest({ user: { id: 5 }, params: { id: '5' }, body: { firstName: 'Updated' } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.updateUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
        });

        it('allows a MASTER user to update any profile', async () => {
            const existing = makeUser({ id: 10 });
            const updated = makeSanitizedUser({ id: 10, firstName: 'Updated' });
            jest.spyOn(UserService.prototype, 'findOne').mockResolvedValue({ success: true, data: existing });
            jest.spyOn(UserService.prototype, 'updateUser').mockResolvedValue({ success: true, data: updated });
            const req = createMockRequest({ user: { id: 1, profile: Profile.MASTER }, params: { id: '10' }, body: { firstName: 'Updated' } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.updateUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
        });
    });

    describe('deleteUser — ownership enforcement', () => {
        it('returns 403 when deleting another user\'s account', async () => {
            const deleteSpy = jest.spyOn(UserService.prototype, 'deleteUser');
            const req = createMockRequest({ user: { id: 1 }, params: { id: '2' } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.deleteUser(req, res, next);

            expect(deleteSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.FORBIDDEN);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: Resource.UNAUTHORIZED_OPERATION }));
        });

        it('allows a user to delete their own account', async () => {
            const snapshot = makeUser({ id: 5 });
            jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({ success: true, data: snapshot });
            jest.spyOn(UserService.prototype, 'deleteUser').mockResolvedValue({ success: true, data: { id: 5 } });
            const req = createMockRequest({ user: { id: 5 }, params: { id: '5' } });
            const res = createMockResponse();
            const next = createNext();

            await UserController.deleteUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
        });
    });
});
