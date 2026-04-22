import type { Request } from 'express';
import { Profile } from '../../../../shared/enums/user.enums';
import { TransactionSource } from '../../../../shared/enums/transaction.enums';
import { ErrorCode } from '../../../../shared/errors/error-codes';
import { AccountService } from '../../service/accountService';
import { CreditCardService } from '../../service/creditCardService';

/**
 * @summary Returns true when the requester owns the resource or holds a MASTER profile.
 */
export function canAccessOwnedResource(
    requesterId: number | undefined,
    resourceOwnerId: number,
    requesterProfile: Profile | undefined
): boolean {
    if (requesterId === undefined) {
        return false;
    }

    return requesterId === resourceOwnerId || requesterProfile === Profile.MASTER;
}

/**
 * @summary Returns true when the requester can access a user-scoped resource by ID.
 */
export function canAccessRequestedUser(
    requester: Request['user'] | undefined,
    requestedUserId: number
): boolean {
    return canAccessOwnedResource(requester?.id, requestedUserId, requester?.profile);
}

/**
 * @summary Resolves the owning userId for an account- or credit-card-backed transaction source.
 */
export async function resolveTransactionOwnerUserId(
    transactionSource: TransactionSource,
    accountId: number | null | undefined,
    creditCardId: number | null | undefined
): Promise<{ success: true; userId: number } | { success: false; error: ErrorCode }> {
    if (transactionSource === TransactionSource.ACCOUNT) {
        if (!accountId) {
            return { success: false, error: ErrorCode.ACCOUNT_NOT_FOUND };
        }

        const account = await new AccountService().getAccountById(accountId);
        if (!account.success || !account.data) {
            return { success: false, error: ErrorCode.ACCOUNT_NOT_FOUND };
        }

        return { success: true, userId: account.data.userId };
    }

    if (!creditCardId) {
        return { success: false, error: ErrorCode.CREDIT_CARD_NOT_FOUND };
    }

    const creditCard = await new CreditCardService().getCreditCardById(creditCardId);
    if (!creditCard.success || !creditCard.data) {
        return { success: false, error: ErrorCode.CREDIT_CARD_NOT_FOUND };
    }

    return { success: true, userId: creditCard.data.userId };
}
