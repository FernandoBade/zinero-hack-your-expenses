import { LogService } from '../../../src/service/logService';
import { LogRepository } from '../../../src/repositories/logRepository';
import { UserRepository } from '../../../src/repositories/userRepository';
import { LogCategory, LogOperation, LogType } from '../../../../shared/enums/log.enums';
import { FilterOperator } from '../../../../shared/enums/operator.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import { SelectLog } from '../../../src/db/schema';
import { db } from '../../../src/db';
import { logs } from '../../../src/db/schema';
import * as commons from '../../../src/utils/commons';
import { makeDbUser } from '../../helpers/factories';
const isResource = (value: string): value is Resource => Object.values(Resource).includes(value as Resource);

const makeLog = (overrides: Partial<SelectLog> = {}): SelectLog => {
    const now = new Date('2024-01-01T00:00:00Z');
    return {
        id: overrides.id ?? 1,
        type: overrides.type ?? LogType.SUCCESS,
        operation: overrides.operation ?? LogOperation.CREATE,
        category: overrides.category ?? LogCategory.USER,
        detail: overrides.detail ?? 'detail',
        userId: overrides.userId ?? 1,
        createdAt: overrides.createdAt ?? now,
        updatedAt: overrides.updatedAt ?? now,
    };
};

describe('LogService', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        logSpy = jest.spyOn(commons, 'createLog').mockResolvedValue();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('createLog', () => {
        it('returns success without persisting when audit rules skip', async () => {
            const findSpy = jest.spyOn(UserRepository.prototype, 'findById');
            const createSpy = jest.spyOn(LogRepository.prototype, 'create');

            const service = new LogService();
            const result = await service.createLog(LogType.SUCCESS, LogOperation.CREATE, LogCategory.USER, 'message', 3);
            expect(result.success).toBe(true);
            expect(result).not.toHaveProperty('data');
            expect(findSpy).not.toHaveBeenCalled();
            expect(createSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: true });
        });

        it('creates log with null user when user id is invalid', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(null);
            const createSpy = jest.spyOn(LogRepository.prototype, 'create').mockResolvedValue(makeLog({ id: 11, userId: null }));

            const service = new LogService();
            const result = await service.createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.USER, 'message', 999);

            expect(createSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: LogType.ERROR,
                    userId: null,
                })
            );
            expect(result).toEqual({ success: true, data: { id: 11 } });
        });

        it('returns success without persisting when type is debug', async () => {
            const findSpy = jest.spyOn(UserRepository.prototype, 'findById');
            const createSpy = jest.spyOn(LogRepository.prototype, 'create');

            const service = new LogService();
            const result = await service.createLog(LogType.DEBUG, LogOperation.CREATE, LogCategory.LOG, 'debug', 1);

            expect(findSpy).not.toHaveBeenCalled();
            expect(createSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: true });
        });

        it('creates log for UPDATE when detail is not empty', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(makeDbUser({ id: 4 }));
            const createSpy = jest.spyOn(LogRepository.prototype, 'create').mockResolvedValue(makeLog({ id: 13 }));

            const service = new LogService();
            const result = await service.createLog(
                LogType.SUCCESS,
                LogOperation.UPDATE,
                LogCategory.USER,
                '{"name":{"from":"Old","to":"New"}}',
                4
            );

            expect(createSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    operation: LogOperation.UPDATE,
                    detail: '{"name":{"from":"Old","to":"New"}}',
                    userId: 4,
                })
            );
            expect(result).toEqual({ success: true, data: { id: 13 } });
        });

        it('returns success without persisting when UPDATE detail is empty', async () => {
            const findSpy = jest.spyOn(UserRepository.prototype, 'findById');
            const createSpy = jest.spyOn(LogRepository.prototype, 'create');

            const service = new LogService();
            const result = await service.createLog(LogType.SUCCESS, LogOperation.UPDATE, LogCategory.USER, '{}', 2);

            expect(findSpy).not.toHaveBeenCalled();
            expect(createSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: true });
        });

        it('returns internal server error when repository create fails', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockResolvedValue(makeDbUser({ id: 2 }));
            jest.spyOn(LogRepository.prototype, 'create').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new LogService();
            const result = await service.createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.USER, 'message', 2);

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });

        it('throws when user lookup rejects', async () => {
            jest.spyOn(UserRepository.prototype, 'findById').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new LogService();
            let caught: unknown;

            try {
                await service.createLog(LogType.ERROR, LogOperation.CREATE, LogCategory.USER, 'message', 2);
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

    describe('deleteOldLogs', () => {
        it('deletes old logs and writes debug log', async () => {
            const whereSpy = jest.fn().mockResolvedValue([{ affectedRows: 3 }]);
            const originalDelete = db.delete.bind(db);
            const deleteSpy = jest.spyOn(db, 'delete').mockImplementation((...args) => {
                const builder = originalDelete(...args);
                jest.spyOn(builder, 'where').mockImplementation(whereSpy);
                return builder;
            });

            const service = new LogService();
            const result = await service.deleteOldLogs();

            expect(deleteSpy).toHaveBeenCalledWith(logs);
            expect(whereSpy).toHaveBeenCalledWith(expect.any(Object));
            expect(logSpy).toHaveBeenCalledWith(
                LogType.DEBUG,
                LogOperation.DELETE,
                LogCategory.LOG,
                expect.stringContaining('Deleted 3 logs'),
                undefined
            );
            expect(result).toEqual({ success: true, data: { deleted: 3 } });
        });

        it('returns internal server error when deletion fails', async () => {
            jest.spyOn(db, 'delete').mockImplementation(() => {
                throw new Error(Resource.INTERNAL_SERVER_ERROR);
            });

            const service = new LogService();
            const result = await service.deleteOldLogs();

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });

    describe('getLogsByUser', () => {
        it('returns invalid user id when userId is invalid', async () => {
            const findManySpy = jest.spyOn(LogRepository.prototype, 'findMany');

            const service = new LogService();
            const result = await service.getLogsByUser(0);

            expect(findManySpy).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false, error: Resource.INVALID_USER_ID });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INVALID_USER_ID);
            }
        });

        it('returns logs when repository succeeds', async () => {
            const logList = [makeLog({ id: 1 }), makeLog({ id: 2 })];
            const findManySpy = jest.spyOn(LogRepository.prototype, 'findMany').mockResolvedValue(logList);

            const service = new LogService();
            const result = await service.getLogsByUser(2);

            expect(findManySpy).toHaveBeenCalledWith({ userId: { operator: FilterOperator.EQ, value: 2 } });
            expect(result).toEqual({ success: true, data: logList });
        });

        it('returns internal server error when repository throws', async () => {
            jest.spyOn(LogRepository.prototype, 'findMany').mockRejectedValue(new Error(Resource.INTERNAL_SERVER_ERROR));

            const service = new LogService();
            const result = await service.getLogsByUser(3);

            expect(result).toEqual({ success: false, error: Resource.INTERNAL_SERVER_ERROR });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe(Resource.INTERNAL_SERVER_ERROR);
            }
        });
    });
});


