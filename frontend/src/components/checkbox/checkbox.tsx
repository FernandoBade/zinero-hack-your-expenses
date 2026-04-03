import type { JSX } from "preact";
import { classNames } from "@/utils/classNames";
import { t } from "@/utils/i18n/translate";
import type { CheckboxProps } from "@/components/checkbox/checkbox.types";

/**
 * @summary Renders a controlled checkbox with typed label and error support.
 * @param props Checkbox configuration.
 * @returns Checkbox field component.
 */
export function Checkbox({
    label,
    children,
    checked,
    error,
    disabled = false,
    id,
    name,
    labelClassName,
    onChange,
}: CheckboxProps): JSX.Element {
    const handleChange: JSX.GenericEventHandler<HTMLInputElement> = (event): void => {
        onChange?.(event.currentTarget.checked);
    };

    return (
        <div class="form-control gap-2">
            <label class="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-3" for={id}>
                <input
                    id={id}
                    name={name}
                    type="checkbox"
                    class="checkbox checkbox-sm mt-0.5 shrink-0 rounded-md border-base-100/30 bg-base-100/90 text-primary"
                    checked={checked}
                    disabled={disabled}
                    onChange={handleChange}
                />
                <span class={classNames("block text-body text-base-100", labelClassName)}>{label ? t(label) : children}</span>
            </label>
            {error ? <span class="text-caption text-error !text-error">{t(error)}</span> : null}
        </div>
    );
}
