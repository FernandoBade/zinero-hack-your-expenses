import multer from 'multer';
import { HTTPStatus } from '../../../../shared/enums/http-status.enums';
import { Language } from '../../../../shared/enums/language.enums';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import { FieldKey } from '../../../../shared/fields/field-keys';
import { createMockRequest, createMockResponse } from '../../helpers/mockExpress';
import { UploadValidation } from '../../../src/utils/upload/upload.constants';
import { handleMulterUploadError } from '../../../src/utils/upload/upload.middleware';

describe('upload.middleware', () => {
    it('handles LIMIT_FILE_SIZE errors using default field name when multer field is missing', () => {
        const req = createMockRequest({ language: Language.EN_US });
        const res = createMockResponse();
        const error = new multer.MulterError('LIMIT_FILE_SIZE');

        const handled = handleMulterUploadError(req, res, error, {
            defaultFieldName: FieldKey.AVATAR,
            invalidTypeExpected: UploadValidation.AVATAR_FILE_EXPECTED,
        });

        expect(handled).toBe(true);
        expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            errorCode: Resource.VALIDATION_ERROR,
            error: expect.arrayContaining([
                expect.objectContaining({
                    field: FieldKey.AVATAR,
                    errorCode: Resource.INVALID_TYPE,
                    params: expect.objectContaining({
                        path: FieldKey.AVATAR,
                    }),
                }),
            ]),
        }));
    });

    it('handles non-size multer errors using code as received value when field is absent', () => {
        const req = createMockRequest({ language: Language.EN_US });
        const res = createMockResponse();
        const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE');

        const handled = handleMulterUploadError(req, res, error, {
            defaultFieldName: FieldKey.FILE,
            invalidTypeExpected: UploadValidation.FEEDBACK_ATTACHMENT_EXPECTED,
        });

        expect(handled).toBe(true);
        expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            errorCode: Resource.VALIDATION_ERROR,
            error: expect.arrayContaining([
                expect.objectContaining({
                    field: FieldKey.FILE,
                    errorCode: Resource.INVALID_TYPE,
                    params: expect.objectContaining({
                        path: FieldKey.FILE,
                    }),
                }),
            ]),
        }));
    });

    it('handles generic upload errors as INVALID_TYPE', () => {
        const req = createMockRequest({ language: Language.EN_US });
        const res = createMockResponse();

        const handled = handleMulterUploadError(
            req,
            res,
            new Error('unexpected upload failure'),
            {
                defaultFieldName: FieldKey.AVATAR,
                invalidTypeExpected: UploadValidation.AVATAR_FILE_EXPECTED,
            }
        );

        expect(handled).toBe(true);
        expect(res.status).toHaveBeenCalledWith(HTTPStatus.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            errorCode: Resource.INVALID_TYPE,
        }));
    });

    it('returns false when there is no upload error to handle', () => {
        const req = createMockRequest({ language: Language.EN_US });
        const res = createMockResponse();

        const handled = handleMulterUploadError(req, res, undefined, {
            defaultFieldName: FieldKey.AVATAR,
            invalidTypeExpected: UploadValidation.AVATAR_FILE_EXPECTED,
        });

        expect(handled).toBe(false);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });
});