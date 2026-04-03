import type { JSX } from "preact";
import { useEffect } from "preact/hooks";
import type { FormProps } from "@/components/form/form.types";

/**
 * @summary Wraps form submission and delegates submit handling without page reload.
 * @param props Form configuration.
 * @returns Form component.
 */

export function Form({
    children,
    onSubmit,
    preventDefault = true,
    disabled = false,
    noValidate = true,
}: FormProps): JSX.Element {
    useEffect(() => {
        if (!disabled || typeof document === "undefined") {
            return;
        }

        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement) {
            activeElement.blur();
        }
    }, [disabled]);

    const handleSubmit = async (event: JSX.TargetedEvent<HTMLFormElement, Event>): Promise<void> => {
        if (preventDefault) {
            event.preventDefault();
        }

        if (disabled) {
            return;
        }

        await onSubmit?.(event);
    };

    return (
        <form noValidate={noValidate} aria-busy={disabled} onSubmit={handleSubmit}>
            <div
                class={
                    disabled
                        ? "space-y-4 [&_input]:pointer-events-none [&_input]:select-none [&_textarea]:pointer-events-none [&_select]:pointer-events-none"
                        : "space-y-4"
                }
            >
                {children}
            </div>
        </form>
    );
}
