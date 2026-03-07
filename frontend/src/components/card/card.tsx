import type { JSX } from "preact";
import type { CardProps } from "@/components/card/card.types";
import { classNames } from "@/utils/classNames";
import { t } from "@/utils/i18n/translate";

const daisyBackgroundVarMap: Readonly<Record<string, string>> = {
    "base-100": "--b1",
    "base-200": "--b2",
    "base-300": "--b3",
    primary: "--p",
    secondary: "--s",
    accent: "--a",
    neutral: "--n",
    info: "--in",
    success: "--su",
    warning: "--wa",
    error: "--er",
};

function resolveCardBackgroundColor(value: string): string {
    const normalizedValue = value.trim();
    const variableName = daisyBackgroundVarMap[normalizedValue];

    if (!variableName) {
        return normalizedValue;
    }

    return `oklch(var(${variableName}))`;
}

/**
 * @summary Renders a semantic card container with optional heading and compact mode.
 * @param props Card configuration.
 * @returns Card component.
 */

export function Card({ title, description, children, compact = false, bgColor }: CardProps): JSX.Element {
    const cardStyle: JSX.CSSProperties | undefined = bgColor
        ? { backgroundColor: resolveCardBackgroundColor(bgColor) }
        : undefined;

    return (
        <article class="card overflow-hidden border border-base-300 bg-base-100 shadow-sm" style={cardStyle}>
            <div class={classNames("card-body min-w-0", compact ? "p-4" : undefined)}>
                {title ? <h2 class="card-title text-card-title">{t(title)}</h2> : null}
                {description ? <p class="text-body text-base-content/70">{t(description)}</p> : null}
                {children}
            </div>
        </article>
    );
}

