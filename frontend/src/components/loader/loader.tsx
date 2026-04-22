import type { JSX } from "preact";
import { SpinnerGapIcon } from "@phosphor-icons/react/ssr";
import { LoaderSize } from "@shared/enums/ui.enums";
import type { LoaderProps } from "@/components/loader/loader.types";
import { classNames } from "@/utils/classNames";

const sizeClassMap: Record<LoaderSize, string> = {
    [LoaderSize.SM]: "size-4",
    [LoaderSize.MD]: "size-5",
    [LoaderSize.LG]: "size-6",
};

/**
 * @summary Renders the shared loading indicator in configured sizes.
 * @param props Loader configuration.
 * @returns Loader spinner.
 */

export function Loader({ size = LoaderSize.MD }: LoaderProps): JSX.Element {
    return (
        <span class="inline-flex animate-spin items-center justify-center" aria-hidden="true">
            <SpinnerGapIcon className={classNames(sizeClassMap[size])} weight="bold" />
        </span>
    );
}

