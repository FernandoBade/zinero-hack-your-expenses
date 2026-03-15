import {
    validateCreateUser,
    validateUpdateUser,
    validateCreateAccount,
    validateUpdateAccount,
    validateCreateCategory,
    validateUpdateCategory,
    validateCreateSubcategory,
    validateUpdateSubcategory,
    validateCreateCreditCard,
    validateUpdateCreditCard,
    validateCreateTag,
    validateUpdateTag,
    validateCreateTransaction,
    validateUpdateTransaction,
    validateFeedbackRequest,
} from '../../../src/utils/validation/validateRequest';
import { createValidationError } from '../../../src/utils/validation/errors';
import {
    isString,
    isNumber,
    isNumberArray,
    isBoolean,
    isISODateString,
    isMonetaryString,
    isEnum,
    isValidEmail,
    hasMinLength,
} from '../../../src/utils/validation/guards';
import { ErrorCode as Resource } from '../../../../shared/errors/error-codes';
import { AccountType } from '../../../../shared/enums/account.enums';
import { CategoryColor, CategoryType } from '../../../../shared/enums/category.enums';
import { CreditCardFlag } from '../../../../shared/enums/creditCard.enums';
import { TransactionSource, TransactionType } from '../../../../shared/enums/transaction.enums';
import { Currency, Language, Profile, Theme } from '../../../../shared/enums/user.enums';

const lang = Language.EN_US;

describe('validation errors', () => {
    it('creates validation error objects', () => {
        expect(createValidationError('name', Resource.VALIDATION_ERROR)).toEqual({
            field: 'name',
            errorCode: Resource.VALIDATION_ERROR,
        });
    });
});

describe('validation guards', () => {
    it('validates strings', () => {
        expect(isString('ok')).toBe(true);
        expect(isString('')).toBe(false);
        expect(isString(1)).toBe(false);
    });

    it('validates numbers', () => {
        expect(isNumber(1)).toBe(true);
        expect(isNumber(NaN)).toBe(false);
        expect(isNumber('1')).toBe(false);
    });

    it('validates number arrays', () => {
        expect(isNumberArray([1, 2, 3])).toBe(true);
        expect(isNumberArray([])).toBe(true);
        expect(isNumberArray([1, '2'])).toBe(false);
        expect(isNumberArray('1,2')).toBe(false);
    });

    it('validates booleans', () => {
        expect(isBoolean(true)).toBe(true);
        expect(isBoolean(false)).toBe(true);
        expect(isBoolean('true')).toBe(false);
    });

    it('validates ISO date strings', () => {
        expect(isISODateString('2024-01-01T00:00:00.000Z')).toBe(true);
        expect(isISODateString('invalid')).toBe(false);
        expect(isISODateString(new Date('2024-01-01'))).toBe(false);
        expect(isISODateString(1)).toBe(false);
    });

    it('validates monetary strings', () => {
        expect(isMonetaryString('100')).toBe(true);
        expect(isMonetaryString('100.50')).toBe(true);
        expect(isMonetaryString('100.567')).toBe(false);
        expect(isMonetaryString(100)).toBe(false);
    });

    it('validates enum membership', () => {
        expect(isEnum(CategoryType.EXPENSE, CategoryType)).toBe(true);
        expect(isEnum('invalid', CategoryType)).toBe(false);
    });

    it('validates email format', () => {
        expect(isValidEmail('user@example.com')).toBe(true);
        expect(isValidEmail('invalid')).toBe(false);
    });

    it('validates minimum length', () => {
        expect(hasMinLength('abcd', 3)).toBe(true);
        expect(hasMinLength('a', 2)).toBe(false);
    });
});

describe('validateRequest', () => {
    describe('validateCreateUser', () => {
        it('returns errors for invalid input', () => {
            const result = validateCreateUser(
                { firstName: 'A', lastName: 'Doe', email: 'user@example.com', password: '123456' },
                lang
            );

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual([
                createValidationError('firstName', Resource.FIRST_NAME_TOO_SHORT),
            ]);
        });

        it('returns normalized data for valid input', () => {
            const result = validateCreateUser(
                {
                    firstName: 'Ana',
                    lastName: 'Silva',
                    email: 'TEST@EXAMPLE.COM',
                    password: '123456',
                    phone: '123',
                    birthDate: '1990-01-01T00:00:00.000Z',
                    theme: Theme.DARK,
                    language: Language.EN_US,
                    currency: Currency.BRL,
                    profile: Profile.STARTER,
                    hideValues: true,
                    active: true,
                },
                lang
            );

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.email).toBe('test@example.com');
            expect(result.data.birthDate).toBe('1990-01-01T00:00:00.000Z');
            expect(result.data.theme).toBe(Theme.DARK);
            expect(result.data.hideValues).toBe(true);
            expect(result.data.active).toBe(true);
        });

        it('does not require language when omitted', () => {
            const result = validateCreateUser(
                {
                    firstName: 'Ana',
                    lastName: 'Silva',
                    email: 'user@example.com',
                    password: '123456',
                },
                lang
            );

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.language).toBeUndefined();
        });

    });

    describe('validateUpdateUser', () => {
        it('returns errors for invalid input', () => {
            const result = validateUpdateUser({ email: 'invalid' }, lang);

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual([createValidationError('email', Resource.EMAIL_INVALID)]);
        });

        it('returns normalized data for valid input', () => {
            const result = validateUpdateUser({ email: 'TEST@EXAMPLE.COM', hideValues: false, active: true }, lang);

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.email).toBe('test@example.com');
            expect(result.data.hideValues).toBe(false);
            expect(result.data.active).toBe(true);
        });
    });

    describe('validateCreateAccount', () => {
        it('returns errors for invalid input', () => {
            const result = validateCreateAccount(
                { name: 'Main', institution: 'Bank', type: AccountType.CHECKING, userId: 0 },
                lang
            );

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual([createValidationError('userId', Resource.VALIDATION_ERROR)]);
        });

        it('returns normalized data for valid input', () => {
            const result = validateCreateAccount(
                {
                    name: 'Main',
                    institution: 'Bank',
                    type: AccountType.CHECKING,
                    observation: 'note',
                    balance: '250.50',
                    userId: 2,
                    active: true,
                },
                lang
            );

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.userId).toBe(2);
            expect(result.data.observation).toBe('note');
            expect(result.data.balance).toBe('250.50');
            expect(result.data.active).toBe(true);
        });
    });

    describe('validateUpdateAccount', () => {
        it('returns errors for invalid input', () => {
            const result = validateUpdateAccount({ userId: 0 }, lang);

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual([createValidationError('userId', Resource.VALIDATION_ERROR)]);
        });

        it('returns normalized data for valid input', () => {
            const result = validateUpdateAccount({ name: 'New', observation: 'note', balance: '0.00', active: false }, lang);

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.name).toBe('New');
            expect(result.data.observation).toBe('note');
            expect(result.data.balance).toBe('0.00');
            expect(result.data.active).toBe(false);
        });
    });

    describe('validateCreateCategory', () => {
        it('returns errors for invalid input', () => {
            const result = validateCreateCategory(
                { name: 'Food', type: 'invalid', userId: 1 },
                lang
            );

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors[0].field).toBe('type');
            expect(result.errors[0].errorCode).toBe(Resource.INVALID_ENUM);
            expect(result.errors[0].params).toEqual(expect.objectContaining({ received: 'invalid' }));
        });

        it('returns normalized data for valid input', () => {
            const result = validateCreateCategory(
                {
                    name: 'Food',
                    type: CategoryType.EXPENSE,
                    color: CategoryColor.BLUE,
                    userId: 1,
                    active: true,
                },
                lang
            );

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.userId).toBe(1);
            expect(result.data.color).toBe(CategoryColor.BLUE);
            expect(result.data.active).toBe(true);
        });
    });

    describe('validateUpdateCategory', () => {
        it('returns errors for invalid input', () => {
            const result = validateUpdateCategory({ userId: -1 }, lang);

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual([createValidationError('userId', Resource.VALIDATION_ERROR)]);
        });

        it('returns normalized data for valid input', () => {
            const result = validateUpdateCategory(
                {
                    name: 'Salary',
                    type: CategoryType.INCOME,
                    color: CategoryColor.GREEN,
                    active: false,
                },
                lang
            );

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.name).toBe('Salary');
            expect(result.data.type).toBe(CategoryType.INCOME);
            expect(result.data.color).toBe(CategoryColor.GREEN);
            expect(result.data.active).toBe(false);
        });
    });

    describe('validateCreateSubcategory', () => {
        it('returns errors for invalid input', () => {
            const result = validateCreateSubcategory({ name: 'Sub', categoryId: 0 }, lang);

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual([createValidationError('categoryId', Resource.VALIDATION_ERROR)]);
        });

        it('returns normalized data for valid input', () => {
            const result = validateCreateSubcategory({ name: 'Sub', categoryId: 2, active: true }, lang);

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.categoryId).toBe(2);
            expect(result.data.active).toBe(true);
        });
    });

    describe('validateUpdateSubcategory', () => {
        it('returns errors for invalid input', () => {
            const result = validateUpdateSubcategory({ active: 'yes' }, lang);

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual([
                createValidationError('active', Resource.INVALID_TYPE, {
                    path: 'active',
                    expected: 'boolean',
                    received: 'yes'
                })
            ]);
        });

        it('returns normalized data for valid input', () => {
            const result = validateUpdateSubcategory({ name: 'New', categoryId: 3 }, lang);

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.name).toBe('New');
            expect(result.data.categoryId).toBe(3);
        });
    });

    describe('validateCreateCreditCard', () => {
        it('returns errors for invalid input', () => {
            const result = validateCreateCreditCard({ name: 'Card', flag: 'invalid', userId: 1 }, lang);

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors[0].field).toBe('flag');
            expect(result.errors[0].errorCode).toBe(Resource.INVALID_ENUM);
            expect(result.errors[0].params).toEqual(expect.objectContaining({ received: 'invalid' }));
        });

        it('returns normalized data for valid input', () => {
            const result = validateCreateCreditCard(
                {
                    name: 'Card',
                    flag: CreditCardFlag.VISA,
                    observation: 'note',
                    balance: '0.00',
                    limit: '5000.00',
                    userId: 1,
                    accountId: 5,
                    active: true,
                },
                lang
            );

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.userId).toBe(1);
            expect(result.data.accountId).toBe(5);
            expect(result.data.balance).toBe('0.00');
            expect(result.data.limit).toBe('5000.00');
            expect(result.data.active).toBe(true);
        });
    });

    describe('validateUpdateCreditCard', () => {
        it('returns errors for invalid input', () => {
            const result = validateUpdateCreditCard({ accountId: 0 }, lang);

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual([createValidationError('accountId', Resource.VALIDATION_ERROR)]);
        });

        it('returns normalized data for valid input', () => {
            const result = validateUpdateCreditCard({ name: 'New', flag: CreditCardFlag.AMEX, limit: '8000.00', accountId: 2 }, lang);

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.name).toBe('New');
            expect(result.data.flag).toBe(CreditCardFlag.AMEX);
            expect(result.data.accountId).toBe(2);
            expect(result.data.limit).toBe('8000.00');
        });
    });

    describe('validateCreateTag', () => {
        it('returns errors for invalid input', () => {
            const result = validateCreateTag({ name: '', userId: 0 }, lang);

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual(
                expect.arrayContaining([
                    createValidationError('name', Resource.FIELD_REQUIRED, {
                        field: 'name'
                    }),
                    createValidationError('userId', Resource.VALIDATION_ERROR),
                ])
            );
        });

        it('returns normalized data for valid input', () => {
            const result = validateCreateTag({ name: 'Urgent', userId: 5, active: true }, lang);

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.name).toBe('Urgent');
            expect(result.data.userId).toBe(5);
            expect(result.data.active).toBe(true);
        });
    });

    describe('validateUpdateTag', () => {
        it('returns errors for invalid input', () => {
            const result = validateUpdateTag({ userId: 0 }, lang);

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual([createValidationError('userId', Resource.VALIDATION_ERROR)]);
        });

        it('returns normalized data for valid input', () => {
            const result = validateUpdateTag({ name: 'Travel', active: false }, lang);

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.name).toBe('Travel');
            expect(result.data.active).toBe(false);
        });
    });

    describe('validateCreateTransaction', () => {
        it('returns errors when category and subcategory are missing', () => {
            const result = validateCreateTransaction(
                {
                    value: '10.00',
                    date: '2024-01-01T00:00:00.000Z',
                    transactionType: TransactionType.EXPENSE,
                    transactionSource: TransactionSource.ACCOUNT,
                    isInstallment: false,
                    isRecurring: false,
                    accountId: 1,
                },
                lang
            );

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual(
                expect.arrayContaining([
                    createValidationError('categoryId', Resource.CATEGORY_OR_SUBCATEGORY_REQUIRED),
                    createValidationError('subcategoryId', Resource.CATEGORY_OR_SUBCATEGORY_REQUIRED),
                ])
            );
        });

        it('returns errors when totalMonths is missing for installments', () => {
            const result = validateCreateTransaction(
                {
                    value: '10.00',
                    date: '2024-01-01T00:00:00.000Z',
                    categoryId: 1,
                    transactionType: TransactionType.EXPENSE,
                    transactionSource: TransactionSource.ACCOUNT,
                    isInstallment: true,
                    isRecurring: false,
                    accountId: 1,
                },
                lang
            );

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual([createValidationError('totalMonths', Resource.TOTAL_MONTHS_REQUIRED)]);
        });

        it('returns normalized data for valid input', () => {
            const result = validateCreateTransaction(
                {
                    value: '25.00',
                    date: '2024-01-01T00:00:00.000Z',
                    categoryId: 2,
                    observation: 'note',
                    transactionType: TransactionType.INCOME,
                    transactionSource: TransactionSource.ACCOUNT,
                    isInstallment: false,
                    isRecurring: false,
                    accountId: 2,
                    tags: [1, 2],
                    active: true,
                },
                lang
            );

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.date).toBe('2024-01-01T00:00:00.000Z');
            expect(result.data.value).toBe('25.00');
            expect(result.data.categoryId).toBe(2);
            expect(result.data.accountId).toBe(2);
            expect(result.data.tags).toEqual([1, 2]);
            expect(result.data.active).toBe(true);
        });

        it('normalizes monetary values with comma separators', () => {
            const result = validateCreateTransaction(
                {
                    value: '111111,11',
                    date: '2024-01-01T00:00:00.000Z',
                    categoryId: 2,
                    transactionType: TransactionType.EXPENSE,
                    transactionSource: TransactionSource.ACCOUNT,
                    isInstallment: false,
                    isRecurring: false,
                    accountId: 2,
                },
                lang
            );

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.value).toBe('111111.11');
        });

        it('rejects imprecise numeric float input values', () => {
            const result = validateCreateTransaction(
                {
                    value: 0.1 + 0.2,
                    date: '2024-01-01T00:00:00.000Z',
                    categoryId: 2,
                    transactionType: TransactionType.EXPENSE,
                    transactionSource: TransactionSource.ACCOUNT,
                    isInstallment: false,
                    isRecurring: false,
                    accountId: 2,
                },
                lang
            );

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual(
                expect.arrayContaining([
                    createValidationError('value', Resource.INVALID_TYPE, {
                        path: 'value',
                        expected: 'string',
                        received: String(0.1 + 0.2)
                    }),
                ])
            );
        });

        it('rejects zero values explicitly', () => {
            const result = validateCreateTransaction(
                {
                    value: '0.00',
                    date: '2024-01-01T00:00:00.000Z',
                    categoryId: 2,
                    transactionType: TransactionType.EXPENSE,
                    transactionSource: TransactionSource.ACCOUNT,
                    isInstallment: false,
                    isRecurring: false,
                    accountId: 2,
                },
                lang
            );

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual(
                expect.arrayContaining([
                    createValidationError('value', Resource.TOO_SMALL, {
                        path: 'value',
                        min: 1
                    }),
                ])
            );
        });
    });

    describe('validateUpdateTransaction', () => {
        it('returns errors for invalid input', () => {
            const result = validateUpdateTransaction({ paymentDay: 40 }, lang);

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual([createValidationError('paymentDay', Resource.PAYMENT_DAY_OUT_OF_RANGE)]);
        });

        it('returns normalized data for valid input', () => {
            const result = validateUpdateTransaction(
                {
                    transactionSource: TransactionSource.CREDIT_CARD,
                    creditCardId: 5,
                    date: '2024-01-01T00:00:00.000Z',
                    tags: [3],
                    isInstallment: false,
                    isRecurring: false,
                },
                lang
            );

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.transactionSource).toBe(TransactionSource.CREDIT_CARD);
            expect(result.data.creditCardId).toBe(5);
            expect(result.data.date).toBe('2024-01-01T00:00:00.000Z');
            expect(result.data.tags).toEqual([3]);
            expect(result.data.isInstallment).toBe(false);
            expect(result.data.isRecurring).toBe(false);
        });

        it('rejects imprecise numeric float input values in updates', () => {
            const result = validateUpdateTransaction(
                {
                    value: 0.1 + 0.2,
                },
                lang
            );

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual(
                expect.arrayContaining([
                    createValidationError('value', Resource.INVALID_TYPE, {
                        path: 'value',
                        expected: 'string',
                        received: String(0.1 + 0.2)
                    }),
                ])
            );
        });
    });

    describe('validateFeedbackRequest', () => {
        it('returns errors for missing fields', () => {
            const result = validateFeedbackRequest({ title: '', message: '' }, lang);

            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.errors).toEqual([
                createValidationError('title', Resource.FIELD_REQUIRED, {
                    field: 'title'
                }),
                createValidationError('message', Resource.FIELD_REQUIRED, {
                    field: 'message'
                }),
            ]);
        });

        it('returns normalized data for valid input', () => {
            const result = validateFeedbackRequest({ title: '  Feedback ', message: '  Hello  ' }, lang);

            expect(result.success).toBe(true);
            if (!result.success) return;
            expect(result.data.title).toBe('Feedback');
            expect(result.data.message).toBe('Hello');
        });
    });
});



