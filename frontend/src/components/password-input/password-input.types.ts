import type { InputProps } from "@/components/input/input.types";

/**
 * @summary Password input props reusing the shared text-input contract.
 */
export type PasswordInputProps = Omit<InputProps, "type" | "rightSlot">;
