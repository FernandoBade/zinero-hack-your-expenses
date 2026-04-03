import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { EyeClosedIcon, EyeIcon } from "@phosphor-icons/react";
import { Input } from "@/components/input/input";
import type { PasswordInputProps } from "@/components/password-input/password-input.types";
import { classNames } from "@/utils/classNames";
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
    const {
        visibleIcon,
        hiddenIcon,
        toggleButtonClassName,
        showAriaLabel = SHOW_PASSWORD_KEY,
        hideAriaLabel = HIDE_PASSWORD_KEY,
        ...inputProps
    } = props;

    return (
        <Input
            {...inputProps}
            type={isVisible ? InputType.TEXT : InputType.PASSWORD}
            rightSlot={
                <button
                    type="button"
                    class={classNames(
                        "inline-flex items-center justify-center text-base-content/40 transition hover:text-base-content/70",
                        toggleButtonClassName
                    )}
                    aria-label={t(isVisible ? hideAriaLabel : showAriaLabel)}
                    onClick={() => setIsVisible((currentValue) => !currentValue)}
                >
                    {isVisible ? (
                        hiddenIcon ?? <EyeClosedIcon size={24} weight="regular" />
                    ) : (
                        visibleIcon ?? <EyeIcon size={24} weight="regular" />
                    )}
                </button>
            }
        />
    );
}
