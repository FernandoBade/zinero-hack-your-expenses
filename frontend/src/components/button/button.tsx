import type { JSX } from "preact";
import { ButtonSize, ButtonVariant } from "@shared/enums/ui.enums";
import { Icon } from "@/components/icon/icon";
import type { ButtonProps } from "@/components/button/button.types";
import { classNames } from "@/utils/classNames";
import { t, tOptional } from "@/utils/i18n/translate";

const variantMap: Record<ButtonVariant, string> = {
    [ButtonVariant.PRIMARY]: "btn-primary",
    [ButtonVariant.SECONDARY]: "btn-secondary",
    [ButtonVariant.ACCENT]: "btn-accent",
    [ButtonVariant.OUTLINE]: "btn-outline",
    [ButtonVariant.GHOST]: "btn-ghost",
    [ButtonVariant.LINK]: "btn-link px-2",
};

const sizeMap: Record<ButtonSize, string> = {
    [ButtonSize.SM]: "btn-sm",
    [ButtonSize.MD]: "",
    [ButtonSize.LG]: "btn-lg",
};

const sizeTypographyMap: Record<ButtonSize, string> = {
    [ButtonSize.SM]: "text-button-sm",
    [ButtonSize.MD]: "text-button-md",
    [ButtonSize.LG]: "text-button-lg",
};

/**
 * @summary Renders the design-system button with typed variants, sizes, and loading state.
 * @param props Button configuration.
 * @returns Button component.
 */

export function Button({
    label,
    children,
    ariaLabel,
    variant = ButtonVariant.PRIMARY,
    size = ButtonSize.MD,
    disabled = false,
    loading = false,
    iconLeft,
    iconRight,
    type = "button",
    onClick,
}: ButtonProps): JSX.Element {
    const hasCustomContent = children !== undefined && children !== null;
    const handleClick: JSX.MouseEventHandler<HTMLButtonElement> = (event) => {
        const button = event.currentTarget;
        const bounds = button.getBoundingClientRect();
        const hasPointerCoordinates = event.clientX !== 0 || event.clientY !== 0;
        const rippleX = hasPointerCoordinates ? event.clientX - bounds.left : bounds.width / 2;
        const rippleY = hasPointerCoordinates ? event.clientY - bounds.top : bounds.height / 2;
        const rippleSize = Math.max(bounds.width, bounds.height) * 2;

        button.style.setProperty("--btn-ripple-x", `${rippleX}px`);
        button.style.setProperty("--btn-ripple-y", `${rippleY}px`);
        button.style.setProperty("--btn-ripple-size", `${rippleSize}px`);
        button.classList.remove("is-rippling");
        void button.offsetWidth;
        button.classList.add("is-rippling");

        onClick?.(event);
    };

    return (
        <button
            type={type}
            class={classNames(
                "btn btn-ripple inline-flex items-center justify-center gap-2 font-ui",
                variantMap[variant],
                sizeMap[size],
                sizeTypographyMap[size]
            )}
            disabled={disabled || loading}
            aria-busy={loading}
            aria-label={tOptional(ariaLabel)}
            onClick={handleClick}
        >
            {loading ? <span class="loading loading-spinner loading-xs self-center" aria-hidden="true" /> : null}
            {!loading && iconLeft ? (
                <span class="inline-flex items-center shrink-0 mt-px">
                    <Icon name={iconLeft} />
                </span>
            ) : null}
            {label ? <span class="inline-flex items-center leading-none">{t(label)}</span> : null}
            {!label && hasCustomContent ? <span class="inline-flex items-center leading-none">{children}</span> : null}
            {!loading && iconRight ? (
                <span class="inline-flex items-center shrink-0 mt-px">
                    <Icon name={iconRight} />
                </span>
            ) : null}
        </button>
    );
}
