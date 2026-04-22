import type { JSX } from "preact";
import {
    CaretDownIcon,
    CaretLeftIcon,
    CaretRightIcon,
    CheckCircleIcon,
    CurrencyDollarIcon,
    EnvelopeSimpleIcon,
    FloppyDiskIcon,
    HashStraightIcon,
    InfoIcon,
    LockIcon,
    MagnifyingGlassIcon,
    PencilSimpleIcon,
    PhoneIcon,
    PlusCircleIcon,
    StarIcon,
    TrashIcon,
    UserCircleIcon,
    WarningCircleIcon,
    XCircleIcon,
    XSquareIcon,
} from "@phosphor-icons/react/ssr";
import type { IconProps as PhosphorIconProps } from "@phosphor-icons/react";
import { IconName } from "@shared/enums/icon.enums";
import type { IconProps } from "@/components/icon/icon.types";

type PhosphorIconComponent = (props: PhosphorIconProps) => JSX.Element;

const phosphorMap: Partial<Record<IconName, PhosphorIconComponent>> = {
    [IconName.SEARCH]: (props) => <MagnifyingGlassIcon {...props} />,
    [IconName.USER]: (props) => <UserCircleIcon {...props} />,
    [IconName.EMAIL]: (props) => <EnvelopeSimpleIcon {...props} />,
    [IconName.LOCK]: (props) => <LockIcon {...props} />,
    [IconName.PHONE]: (props) => <PhoneIcon {...props} />,
    [IconName.CURRENCY]: (props) => <CurrencyDollarIcon {...props} />,
    [IconName.NUMBER]: (props) => <HashStraightIcon {...props} />,
    [IconName.CLOSE]: (props) => <XCircleIcon {...props} />,
    [IconName.ERROR]: (props) => <XSquareIcon {...props} />,
    [IconName.CHECK]: (props) => <CheckCircleIcon {...props} />,
    [IconName.WARNING]: (props) => <WarningCircleIcon {...props} />,
    [IconName.INFO]: (props) => <InfoIcon {...props} />,
    [IconName.STAR]: (props) => <StarIcon {...props} />,
    [IconName.DELETE]: (props) => <TrashIcon {...props} />,
    [IconName.ADD]: (props) => <PlusCircleIcon {...props} />,
    [IconName.EDIT]: (props) => <PencilSimpleIcon {...props} />,
    [IconName.SAVE]: (props) => <FloppyDiskIcon {...props} />,
    [IconName.CHEVRON_DOWN]: (props) => <CaretDownIcon {...props} />,
    [IconName.CHEVRON_LEFT]: (props) => <CaretLeftIcon {...props} />,
    [IconName.CHEVRON_RIGHT]: (props) => <CaretRightIcon {...props} />,
};

/**
 * @summary Renders a Phosphor icon using typed names, weights, and sizing.
 */

export function Icon({ name, size = 20, weight = "duotone", mirrored = false }: IconProps): JSX.Element | null {
    const IconComponent = phosphorMap[name];

    if (!IconComponent) {
        return null;
    }

    return (
        <span class="icon-phosphor" data-icon-weight={weight} aria-hidden="true">
            <IconComponent size={size} weight={weight} mirrored={mirrored} />
        </span>
    );
}
