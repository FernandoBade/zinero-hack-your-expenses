import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { EyeClosedIcon, EyeIcon } from "@phosphor-icons/react";
import { Input } from "@/components/input/input";
import type { PasswordInputProps } from "@/components/password-input/password-input.types";
import { InputType } from "@shared/enums/input.enums";
import { t } from "@/utils/i18n/translate";

const SHOW_PASSWORD_KEY = "auth.password.toggle.show";
const HIDE_PASSWORD_KEY = "auth.password.toggle.hide";

/**
 * @summary Renders a shared password field with toggle visibility control.
 * @param props Password input configuration.
 * @returns Password input component.
 */
export function PasswordInput(props: PasswordInputProps): JSX.Element {
    const [isVisible, setIsVisible] = useState<boolean>(false);

    return (
        <Input
            {...props}
            type={isVisible ? InputType.TEXT : InputType.PASSWORD}
            rightSlot={
                <button
                    type="button"
                    class="inline-flex items-center justify-center text-base-content/40 transition hover:text-base-content/70"
                    aria-label={t(isVisible ? HIDE_PASSWORD_KEY : SHOW_PASSWORD_KEY)}
                    onClick={() => setIsVisible((currentValue) => !currentValue)}
                >
                    {isVisible ? (
                        <EyeClosedIcon size={24} weight="regular" />
                    ) : (
                        <EyeIcon size={24} weight="regular" />
                    )}
                </button>
            }
        />
    );
}