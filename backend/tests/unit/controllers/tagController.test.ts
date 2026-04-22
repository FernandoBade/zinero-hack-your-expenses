import TagController from '../../../src/controller/tagController';
import { TagService } from '../../../src/service/tagService';
import { HTTPStatus } from '../../../../shared/enums/http-status.enums';
import { LogCategory, LogOperation, LogType } from '../../../../shared/enums/log.enums';
import { SortOrder } from '../../../../shared/enums/operator.enums';
import { Profile } from '../../../../shared/enums/user.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import * as commons from '../../../src/utils/commons';
import { createMockRequest, createMockResponse, createNext } from '../../helpers/mockExpress';
import type { TagEntity } from '../../../../shared/domains/tag/tag.types';

const authUser = { id: 999 };
const masterUser = { id: 1, profile: Profile.MASTER };
const DEFAULT_ISO_DATE = '2024-01-01T00:00:00.000Z';
const createAuthRequest = (overrides: Parameters<typeof createMockRequest>[0] = {}) =>
    createMockRequest({ user: authUser, ...overrides });

const makeTag = (overrides: Partial<TagEntity> = {}): TagEntity => {
    return {
        id: overrides.id ?? 1,
        userId: overrides.userId ?? authUser.id,
        name: overrides.name ?? 'Urgent',
        active: overrides.active ?? true,
        createdAt: overrides.createdAt ?? DEFAULT_ISO_DATE,
        updatedAt: overrides.updatedAt ?? DEFAULT_ISO_DATE,
    };
};

describe('TagController', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        logSpy = jest.spyOn(commons, 'createLog').mockResolvedValue();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('createTag', () => {
        it('returns 400 without calling service when validation fails', async () => {
            const createSpy = jest.spyOn(TagService.prototype, 'createTag');
            const req = createAuthRequest({ body: { name: '' } });
            const res = createMockResponse();
            const next = createNext();

            await TagController.createTag(req, res, next);

            expect(createSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.VALIDATION_ERROR,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it('maps service error to HTTP 400', async () => {
            const createSpy = jest
                .spyOn(TagService.prototype, 'createTag')
                .mockResolvedValue({ success: false, error: Resource.USER_NOT_FOUND });
            const req = createMockRequest({ user: authUser, body: { name: 'Urgent', active: undefined } });
            const res = createMockResponse();
            const next = createNext();

            await TagController.createTag(req, res, next);

            expect(createSpy).toHaveBeenCalledWith({ name: 'Urgent', userId: authUser.id, active: undefined });
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    errorCode: Resource.USER_NOT_FOUND,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 201 and logs when tag is created', async () => {
            const created = makeTag({ id: 10 });
            const createSpy = jest.spyOn(TagService.prototype, 'createTag').mockResolvedValue({ success: true, data: created });
            const req = createAuthRequest({ body: { name: 'Urgent', active: true } });
            const res = createMockResponse();
            const next = createNext();

            await TagController.createTag(req, res, next);

            expect(createSpy).toHaveBeenCalledWith({ name: 'Urgent', userId: authUser.id, active: true });
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.CREATED);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: created,
                })
            );
            expect(logSpy).toHaveBeenCalledWith(
                LogType.SUCCESS,
                LogOperation.CREATE,
                LogCategory.TAG,
                created,
                created.userId
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 500 and logs when service throws an exception', async () => {
            jest.spyOn(TagService.prototype, 'createTag').mockImplementation(() => {
                throw new Error('boom');
            });

            const req = createAuthRequest({ body: { name: 'Urgent' } });
            const res = createMockResponse();
            const next = createNext();

            await TagController.createTag(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(logSpy).toHaveBeenCalled();
        });

        it('returns 400 when the client supplies userId', async () => {
            const createSpy = jest.spyOn(TagService.prototype, 'createTag');
            const req = createAuthRequest({ body: { name: 'Urgent', userId: 12 } });
            const res = createMockResponse();
            const next = createNext();

            await TagController.createTag(req, res, next);

            expect(createSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: Resource.VALIDATION_ERROR }));
        });
    });

    describe('getTags', () => {
        it('returns 200 with data and pagination when service succeeds', async () => {
            const tags = [makeTag({ id: 1 }), makeTag({ id: 2 })];
            jest.spyOn(TagService.prototype, 'getTags').mockResolvedValue({ success: true, data: tags });
            jest.spyOn(TagService.prototype, 'countTags').mockResolvedValue({ success: true, data: tags.length });

            const req = createMockRequest({ user: masterUser, query: { page: '1', pageSize: '1', sort: 'name', order: 'desc' } });
            const res = createMockResponse();
            const next = createNext();

            await TagController.getTags(req, res, next);

            expect(TagService.prototype.getTags).toHaveBeenCalledWith({
                limit: 1,
                offset: 0,
                sort: 'name',
                order: SortOrder.DESC,
            });
            expect(TagService.prototype.countTags).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: tags,
                    page: 1,
                    pageSize: 1,
                    totalItems: tags.length,
                })
            );
            expect(logSpy).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 400 when getTags returns an error', async () => {
            jest.spyOn(TagService.prototype, 'getTags').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            jest.spyOn(TagService.prototype, 'countTags').mockResolvedValue({ success: true, data: 0 });

            const req = createMockRequest({ user: masterUser, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await TagController.getTags(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, errorCode: Resource.INTERNAL_SERVER_ERROR })
            );
        });

        it('returns 400 when countTags returns an error', async () => {
            jest.spyOn(TagService.prototype, 'getTags').mockResolvedValue({ success: true, data: [] });
            jest.spyOn(TagService.prototype, 'countTags').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });

            const req = createMockRequest({ user: masterUser, query: {} });
            const res = createMockResponse();
            const next = createNext();

            await TagController.getTags(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, errorCode: Resource.INTERNAL_SERVER_ERROR })
            );
        });
    });

    describe('getTagById', () => {
        describe('getTagsByUser', () => {
            it('returns 400 when userId is invalid', async () => {
                const req = createMockRequest({ params: { userId: 'abc' } });
                const res = createMockResponse();
                const next = createNext();

                await TagController.getTagsByUser(req, res, next);

                expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
                expect(res.json).toHaveBeenCalledWith(
                    expect.objectContaining({ success: false, errorCode: Resource.INVALID_USER_ID })
                );
            });

            it('returns 400 when service getTagsByUser fails', async () => {
                jest.spyOn(TagService.prototype, 'getTagsByUser').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
                jest.spyOn(TagService.prototype, 'countTagsByUser').mockResolvedValue({ success: true, data: 0 });

                const req = createMockRequest({ user: { id: 5 }, params: { userId: '5' } });
                const res = createMockResponse();
                const next = createNext();

                await TagController.getTagsByUser(req, res, next);

                expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
                expect(res.json).toHaveBeenCalledWith(
                    expect.objectContaining({ success: false, errorCode: Resource.INTERNAL_SERVER_ERROR })
                );
            });
        });

        it('returns 400 when id is invalid', async () => {
            const getSpy = jest.spyOn(TagService.prototype, 'getTagById');
            const req = createMockRequest({ params: { id: 'abc' } });
            const res = createMockResponse();
            const next = createNext();

            await TagController.getTagById(req, res, next);

            expect(getSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, errorCode: Resource.INVALID_TAG_ID })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 500 when service throws', async () => {
            jest.spyOn(TagService.prototype, 'getTagById').mockImplementation(() => {
                throw new Error('unexpected');
            });

            const req = createMockRequest({ params: { id: '3' } });
            const res = createMockResponse();
            const next = createNext();

            await TagController.getTagById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(logSpy).toHaveBeenCalled();
        });

        it('returns 400 when service reports not found', async () => {
            jest.spyOn(TagService.prototype, 'getTagById').mockResolvedValue({ success: false, error: Resource.TAG_NOT_FOUND });
            const req = createMockRequest({ params: { id: '5' } });
            const res = createMockResponse();
            const next = createNext();

            await TagController.getTagById(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, errorCode: Resource.TAG_NOT_FOUND })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 200 when tag is found', async () => {
            const tag = makeTag({ id: 4 });
            jest.spyOn(TagService.prototype, 'getTagById').mockResolvedValue({ success: true, data: tag });
            const req = createAuthRequest({ params: { id: '4' } });
            const res = createMockResponse();
            const next = createNext();

            await TagController.getTagById(req, res, next);

            expect(TagService.prototype.getTagById).toHaveBeenCalledWith(4);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: tag }));
            expect(logSpy).not.toHaveBeenCalled();
        });
    });


    describe('updateTag', () => {
        it('returns 400 when existing tag is not found', async () => {
            jest.spyOn(TagService.prototype, 'getTagById').mockResolvedValue({ success: false, error: Resource.TAG_NOT_FOUND });
            const req = createMockRequest({ params: { id: '9' }, body: { name: 'DoesNotMatter', userId: 1 } });
            const res = createMockResponse();
            const next = createNext();

            await TagController.updateTag(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, errorCode: Resource.TAG_NOT_FOUND })
            );
        });

        it('returns 500 when service throws an exception during update', async () => {
            const existing = makeTag({ id: 12 });
            jest.spyOn(TagService.prototype, 'getTagById').mockResolvedValue({ success: true, data: existing });
            jest.spyOn(TagService.prototype, 'updateTag').mockImplementation(() => {
                throw new Error('boom');
            });

            const req = createAuthRequest({ params: { id: '12' }, body: { name: 'Whatever' } });
            const res = createMockResponse();
            const next = createNext();

            await TagController.updateTag(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.INTERNAL_SERVER_ERROR);
            expect(logSpy).toHaveBeenCalled();
        });

        it('returns 400 for invalid id', async () => {
            const req = createMockRequest({ params: { id: '0' } });
            const res = createMockResponse();
            const next = createNext();

            await TagController.updateTag(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, errorCode: Resource.INVALID_TAG_ID })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 400 when validation fails', async () => {
            const existing = makeTag({ id: 8 });
            jest.spyOn(TagService.prototype, 'getTagById').mockResolvedValue({ success: true, data: existing });
            const updateSpy = jest.spyOn(TagService.prototype, 'updateTag');
            const req = createAuthRequest({ params: { id: '8' }, body: { userId: 5 } });
            const res = createMockResponse();
            const next = createNext();

            await TagController.updateTag(req, res, next);

            expect(updateSpy).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, errorCode: Resource.VALIDATION_ERROR })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 200 and logs when update succeeds', async () => {
            const existing = makeTag({ id: 11, name: 'Old' });
            const updated = makeTag({ id: 11, name: 'Updated' });
            const expectedDelta = { name: { from: existing.name, to: updated.name } };
            jest.spyOn(TagService.prototype, 'getTagById').mockResolvedValue({ success: true, data: existing });
            jest.spyOn(TagService.prototype, 'updateTag').mockResolvedValue({ success: true, data: updated });
            const req = createAuthRequest({ params: { id: '11' }, body: { name: 'Updated' } });
            const res = createMockResponse();
            const next = createNext();

            await TagController.updateTag(req, res, next);

            expect(TagService.prototype.updateTag).toHaveBeenCalledWith(11, { name: 'Updated' });
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: updated }));
            expect(logSpy).toHaveBeenCalledWith(
                LogType.SUCCESS,
                LogOperation.UPDATE,
                LogCategory.TAG,
                expectedDelta,
                updated.userId
            );
        });
    });

    describe('deleteTag', () => {
        it('returns 400 when deleteTag reports failure', async () => {
            jest.spyOn(TagService.prototype, 'getTagById').mockResolvedValue({ success: true, data: makeTag({ id: 40 }) });
            jest.spyOn(TagService.prototype, 'deleteTag').mockResolvedValue({ success: false, error: Resource.INTERNAL_SERVER_ERROR });

            const req = createAuthRequest({ params: { id: '40' } });            const res = createMockResponse();
            const next = createNext();

            await TagController.deleteTag(req, res, next);

            expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ success: false, errorCode: Resource.INTERNAL_SERVER_ERROR })
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('returns 200 and logs when deletion succeeds', async () => {
            const snapshot = makeTag({ id: 41 });
            jest.spyOn(TagService.prototype, 'getTagById').mockResolvedValue({ success: true, data: snapshot });
            jest.spyOn(TagService.prototype, 'deleteTag').mockResolvedValue({ success: true, data: { id: 41 } });

            const req = createAuthRequest({ params: { id: '41' } });
            const res = createMockResponse();
            const next = createNext();

            await TagController.deleteTag(req, res, next);

            expect(TagService.prototype.deleteTag).toHaveBeenCalledWith(41);
            expect(res.status).toHaveBeenCalledWith(HTTPStatus.OK);
            expect(logSpy).toHaveBeenCalledWith(
                LogType.SUCCESS,
                LogOperation.DELETE,
                LogCategory.TAG,
                expect.objectContaining({ id: 41 }),
                authUser.id
            );
        });
    });
});


