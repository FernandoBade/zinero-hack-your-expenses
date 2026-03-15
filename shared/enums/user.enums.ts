import { Language } from "./language.enums";
import { Theme } from "./theme.enums";

/** @summary Theme preferences for user UI. */
export { Theme };

/** @summary Supported language codes for the user. */
export { Language };

/** @summary Supported currency codes for monetary values. */
export enum Currency {
    ARS = "ARS",
    COP = "COP",
    BRL = "BRL",
    EUR = "EUR",
    USD = "USD",
}

/** @summary Available subscription profiles. */
export enum Profile {
    STARTER = "starter",
    PRO = "pro",
    MASTER = "master",
}
