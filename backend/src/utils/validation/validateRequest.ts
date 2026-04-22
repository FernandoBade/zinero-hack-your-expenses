/**
 * @summary Compatibility facade that preserves existing validator imports while the validation layer is split by domain.
 */
export { validateCreateUser, validateUpdateUser } from "./domains/user";
export { validateCreateAccount, validateUpdateAccount } from "./domains/account";
export { validateCreateCategory, validateUpdateCategory } from "./domains/category";
export { validateCreateSubcategory, validateUpdateSubcategory } from "./domains/subcategory";
export { validateCreateCreditCard, validateUpdateCreditCard } from "./domains/creditCard";
export { validateCreateTag, validateUpdateTag } from "./domains/tag";
export { validateCreateTransaction, validateUpdateTransaction } from "./domains/transaction";
export { validateFeedbackRequest } from "./domains/feedback";
