import { TagService } from '../../../src/service/tagService';
import { TagRepository } from '../../../src/repositories/tagRepository';
import { UserService } from '../../../src/service/userService';
import { SortOrder } from '../../../../shared/enums/operator.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import type { TagEntity } from '../../../../shared/domains/tag/tag.types';
import { SelectTag } from '../../../src/db/schema';
import { makeSanitizedUser } from '../../helpers/factories';
const isResource = (value: string): value is Resource => Object.values(Resource).includes(value as Resource);

const DEFAULT_ISO_DATE = new Date('2024-01-01T00:00:00Z').toISOString();

const makeDbTag = (overrides: Partial<SelectTag> = {}): SelectTag => {
    const now = new Date('2024-01-01T00:00:00Z');
    return {
        id: overrides.id ?? 1,
        userId: overrides.userId ?? 1,
        name: overrides.name ?? 'Urgent',
        active: overrides.active ?? true,
        createdAt: overrides.createdAt ?? now,
        updatedAt: overrides.updatedAt ?? now,
    };
};

const makeTag = (overrides: Partial<TagEntity> = {}): TagEntity => {
    return {
        id: overrides.id ?? 1,
        userId: overrides.userId ?? 1,
        name: overrides.name ?? 'Urgent',
        active: overrides.active ?? true,
        createdAt: overrides.createdAt ?? DEFAULT_ISO_DATE,
        updatedAt: overrides.updatedAt ?? DEFAULT_ISO_DATE,
    };
};

describe('TagService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('createTag', () => {
        it('returns user not found when linked user is missing', async () => {
            jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({
                success: false,
                error: Resource.USER_NOT_FOUND,
            });
            const createSpy = jest.spyOn(TagRepository.prototype, 'create');

            const service = new TagService();
            const result = await service.createTag({ name: 'Urgent', userId: 10 });

            expect(createSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.USER_NOT_FOUND });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.USER_NOT_FOUND);
            }
        });

        it('returns data already exists when tag name is duplicated', async () => {
            const sanitized = makeSanitizedUser({ id: 2 });
            jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({ success: true, data: sanitized });
            jest.spyOn(TagRepository.prototype, 'findMany').mockResolvedValue([makeDbTag({ id: 5, userId: 2, name: 'Urgent' })]);
            const createSpy = jest.spyOn(TagRepository.prototype, 'create');

            const service = new TagService();
            const result = await service.createTag({ name: 'Urgent', userId: 2 });

            expect(createSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.DATA_ALREADY_EXISTS });
        });

        it('creates tag when validations succeed', async () => {
            const sanitized = makeSanitizedUser({ id: 3 });
            jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({ success: true, data: sanitized });
            jest.spyOn(TagRepository.prototype, 'findMany').mockResolvedValue([]);
            const created = makeDbTag({ id: 7, userId: 3, name: 'Travel' });
            const expected = makeTag({ id: 7, userId: 3, name: 'Travel' });
            const createSpy = jest.spyOn(TagRepository.prototype, 'create').mockResolvedValue(created);

            const service = new TagService();
            const result = await service.createTag({ name: 'Travel', userId: 3, active: true });

            expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Travel', userId: 3, active: true }));
            expect(result).toEqual({ success: true, data: expected });
        });

        it('returns internal server error when repository create fails', async () => {
            const sanitized = makeSanitizedUser({ id: 4 });
            jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({ success: true, data: sanitized });
            jest.spyOn(TagRepository.prototype, 'findMany').mockResolvedValue([]);
            jest.spyOn(TagRepository.prototype, 'create').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new TagService();
            const result = await service.createTag({ name: 'Home', userId: 4 });

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
        });
    });

    describe('getTags', () => {
        it('returns tags when repository succeeds', async () => {
            const tags = [makeDbTag({ id: 1 }), makeDbTag({ id: 2 })];
            const expected = [makeTag({ id: 1 }), makeTag({ id: 2 })];
            const findManySpy = jest.spyOn(TagRepository.prototype, 'findMany').mockResolvedValue(tags);

            const service = new TagService();
            const result = await service.getTags({ limit: 2, offset: 0, sort: 'name', order: SortOrder.DESC });

            expect(findManySpy).toHaveBeenCalledWith(undefined, {
                limit: 2,
                offset: 0,
                sort: 'name',
                order: 'desc',
            });
            expect(result).toEqual({ success: true, data: expected });
        });
    });

    describe('getTagById', () => {
        it('returns tag not found when repository returns null', async () => {
            jest.spyOn(TagRepository.prototype, 'findById').mockResolvedValue(null);

            const service = new TagService();
            const result = await service.getTagById(10);

            expect(result).toEqual({ success: false, error: Resource.TAG_NOT_FOUND });
        });

        it('returns tag when repository returns a record', async () => {
            const tag = makeDbTag({ id: 11 });
            const expected = makeTag({ id: 11 });
            jest.spyOn(TagRepository.prototype, 'findById').mockResolvedValue(tag);

            const service = new TagService();
            const result = await service.getTagById(11);

            expect(result).toEqual({ success: true, data: expected });
        });

        it('throws when repository lookup rejects', async () => {
            jest.spyOn(TagRepository.prototype, 'findById').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new TagService();
            let caught: unknown;

            try {
                await service.getTagById(12);
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

    describe('updateTag', () => {
        it('returns user not found when new user is invalid', async () => {
            jest.spyOn(UserService.prototype, 'getUserById').mockResolvedValue({
                success: false,
                error: Resource.USER_NOT_FOUND,
            });
            const updateSpy = jest.spyOn(TagRepository.prototype, 'update');

            const service = new TagService();
            const result = await service.updateTag(7, { userId: 99 });

            expect(updateSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.USER_NOT_FOUND });
        });

        it('returns tag not found when current tag is missing', async () => {
            jest.spyOn(TagRepository.prototype, 'findById').mockResolvedValue(null);
            const updateSpy = jest.spyOn(TagRepository.prototype, 'update');

            const service = new TagService();
            const result = await service.updateTag(8, { name: 'Updated' });

            expect(updateSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.TAG_NOT_FOUND });
        });

        it('returns data already exists when name is duplicated', async () => {
            jest.spyOn(TagRepository.prototype, 'findById').mockResolvedValue(makeDbTag({ id: 9, userId: 5, name: 'Home' }));
            jest.spyOn(TagRepository.prototype, 'findMany').mockResolvedValue([makeDbTag({ id: 10, userId: 5, name: 'Travel' })]);
            const updateSpy = jest.spyOn(TagRepository.prototype, 'update');

            const service = new TagService();
            const result = await service.updateTag(9, { name: 'Travel' });

            expect(updateSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.DATA_ALREADY_EXISTS });
        });

        it('updates tag when validation succeeds', async () => {
            jest.spyOn(TagRepository.prototype, 'findById').mockResolvedValue(makeDbTag({ id: 11, userId: 6, name: 'Bills' }));
            jest.spyOn(TagRepository.prototype, 'findMany').mockResolvedValue([]);
            const updated = makeDbTag({ id: 11, userId: 6, name: 'Updated' });
            const expected = makeTag({ id: 11, userId: 6, name: 'Updated' });
            const updateSpy = jest.spyOn(TagRepository.prototype, 'update').mockResolvedValue(updated);

            const service = new TagService();
            const result = await service.updateTag(11, { name: 'Updated' });

            expect(updateSpy).toHaveBeenCalledWith(11, expect.objectContaining({ name: 'Updated' }));
            expect(result).toEqual({ success: true, data: expected });
        });
    });

    describe('deleteTag', () => {
        it('returns tag not found when repository returns null', async () => {
            jest.spyOn(TagRepository.prototype, 'findById').mockResolvedValue(null);
            const deleteSpy = jest.spyOn(TagRepository.prototype, 'delete');

            const service = new TagService();
            const result = await service.deleteTag(15);

            expect(deleteSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.TAG_NOT_FOUND });
        });

        it('deletes and returns id when tag exists', async () => {
            const tag = makeDbTag({ id: 16 });
            jest.spyOn(TagRepository.prototype, 'findById').mockResolvedValue(tag);
            const deleteSpy = jest.spyOn(TagRepository.prototype, 'delete').mockResolvedValue();

            const service = new TagService();
            const result = await service.deleteTag(16);

            expect(deleteSpy).toHaveBeenCalledWith(16);
            expect(result).toEqual({ success: true, data: { id: 16 } });
        });
    });
});


