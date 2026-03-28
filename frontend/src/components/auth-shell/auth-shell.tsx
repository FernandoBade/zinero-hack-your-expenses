import type { JSX } from "preact";
import brandLogoHorizontal from "@shared/assets/images/ZINERO_transparent_horizontal.png";
import { Card } from "@/components/card/card";
import { PageContainer } from "@/components/page-container/page-container";
import type { AuthShellProps, AuthShellSize } from "@/components/auth-shell/auth-shell.types";
import { classNames } from "@/utils/classNames";
import { t } from "@/utils/i18n/translate";

const widthClassMap: Readonly<Record<AuthShellSize, string>> = {
    compact: "max-w-[34rem]",
    form: "max-w-[42rem]",
    wide: "max-w-[58rem]",
};

const BRAND_ALT_KEY = "app.name";

/**
 * @summary Wraps public authentication pages with the shared dark panel and branded header.
 * @param props Shell configuration.
 * @returns Authentication shell layout.
 */
export function AuthShell({ title, subtitle, children, size = "form" }: AuthShellProps): JSX.Element {
    return (
        <section class="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(94,234,212,0.1),_transparent_30%),linear-gradient(135deg,_#2b2623_0%,_#221e1b_45%,_#312b28_100%)] text-base-100">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.04)_0%,_transparent_60%)]" aria-hidden="true" />
            <PageContainer>
                <div class="flex min-h-screen items-center justify-center py-6 sm:py-8 lg:py-10">
                    <div class={classNames("relative z-10 w-full", widthClassMap[size])}>
                        <div class="[&>article]:border-white/6 [&>article]:bg-[#4a443f]/95 [&>article]:shadow-[0_30px_90px_rgba(0,0,0,0.4)] [&>article]:backdrop-blur-sm [&_.card-body]:gap-8 [&_.card-body]:px-5 [&_.card-body]:py-6 sm:[&_.card-body]:gap-9 sm:[&_.card-body]:px-7 sm:[&_.card-body]:py-8 lg:[&_.card-body]:px-9 lg:[&_.card-body]:py-10 [&_.label-text]:!text-base-100 [&_.label-text-alt]:!text-base-100/70 [&_button.btn-link]:!min-h-0 [&_button.btn-link]:!px-0 [&_button.btn-link]:!text-primary [&_button.btn-link]:!no-underline hover:[&_button.btn-link]:!text-primary/80">
                            <Card>
                                <div class="flex flex-col gap-8">
                                    <header class="flex flex-col items-center gap-6 text-center">
                                        <img src={brandLogoHorizontal} alt={t(BRAND_ALT_KEY)} class="w-full max-w-[18rem] sm:max-w-[22rem]" />
                                        <div class="space-y-3">
                                            <h1 class="text-[2.25rem] font-semibold leading-tight text-base-100 sm:text-[3rem]">{t(title)}</h1>
                                            <p class="mx-auto max-w-2xl text-base leading-7 text-base-100/85 sm:text-xl sm:leading-8">{t(subtitle)}</p>
                                        </div>
                                    </header>
                                    {children}
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </PageContainer>
        </section>
    );
}