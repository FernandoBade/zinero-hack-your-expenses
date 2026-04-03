import type { JSX } from "preact";
import brandLogoHorizontal from "@shared/assets/images/ZINERO_transparent_horizontal.png";
import { Card } from "@/components/card/card";
import { PageContainer } from "@/components/page-container/page-container";
import type { AuthShellProps, AuthShellSize } from "@/components/auth-shell/auth-shell.types";
import { classNames } from "@/utils/classNames";
import { t } from "@/utils/i18n/translate";

const widthClassMap: Readonly<Record<AuthShellSize, string>> = {
    compact: "max-w-[30.125rem]",
    form: "max-w-[38rem]",
    wide: "max-w-[52rem]",
};

const BRAND_ALT_KEY = "app.name";

/**
 * @summary Wraps public authentication pages with the shared dark panel and branded header.
 * @param props Shell configuration.
 * @returns Authentication shell layout.
 */
export function AuthShell({ title, subtitle, children, size = "form", logoClassName }: AuthShellProps): JSX.Element {
    return (
        <section class="min-h-screen bg-gradient-to-br from-stone-900 to-stone-700">
            <PageContainer>
                <div class="flex min-h-[calc(100vh-3rem)] items-center py-2">
                    <div class={classNames("mx-auto w-full", widthClassMap[size])}>
                        <div class="[&>article]:!border-base-content/20 [&>article]:!shadow-2xl [&_.card-body]:!p-6 sm:[&_.card-body]:!p-8 [&_.label-text]:!text-base-100">
                            <Card bgColor="neutral">
                                <header class="mb-6 flex flex-col items-center gap-5 text-center">
                                    <img src={brandLogoHorizontal} alt={t(BRAND_ALT_KEY)} class={classNames("mb-6 w-auto px-4", logoClassName)} />
                                    <div class="space-y-2">
                                        <h1 class="text-page-title text-base-100">{t(title)}</h1>
                                        <h2 class="text-body font-semibold text-base-100">{t(subtitle)}</h2>
                                    </div>
                                </header>
                                {children}
                            </Card>
                        </div>
                    </div>
                </div>
            </PageContainer>
        </section>
    );
}
