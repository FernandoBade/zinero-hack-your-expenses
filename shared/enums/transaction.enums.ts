/** @summary Source of a transaction. */
export enum TransactionSource {
    ACCOUNT = "account",
    CREDIT_CARD = "creditCard",
}

/** @summary Type of a transaction. */
export enum TransactionType {
    INCOME = "income",
    EXPENSE = "expense",
}

/** @summary Sortable transaction fields used as service defaults. */
export enum TransactionSortField {
    DATE = "date",
}
