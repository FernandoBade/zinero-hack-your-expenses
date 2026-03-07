import type { JSX } from "preact";
import { useMemo, useState } from "preact/hooks";
import { EyeClosedIcon, EyeIcon, FingerprintIcon } from "@phosphor-icons/react";
import brandLogoHorizontal from "@shared/assets/images/ZINERO_transparent_horizontal.png";
import googleLogoButton from "@shared/assets/images/google-logo-button.png";
import loginIllustration from "@shared/assets/images/login.png";
import { InputType } from "@shared/enums/input.enums";
import { AlertVariant, ButtonVariant } from "@shared/enums/ui.enums";
import { ResourceKey } from "@shared/i18n/resource.keys";
import { Alert } from "@/components/alert/alert";
import { Button } from "@/components/button/button";
import { Card } from "@/components/card/card";
import { Form } from "@/components/form/form";
import { Input } from "@/components/input/input";
import { PageContainer } from "@/components/page-container/page-container";
import { createLoginController } from "@/pages/login/login.controller";
import { t } from "@/utils/i18n/translate";

const LOGIN_TITLE_KEY = ResourceKey.AUTH_LOGIN_TITLE;
const LOGIN_SUBTITLE_KEY = ResourceKey.AUTH_LOGIN_SUBTITLE;
const LOGIN_EMAIL_LABEL_KEY = ResourceKey.FIELD_LABEL_EMAIL;
const LOGIN_EMAIL_PLACEHOLDER_KEY = ResourceKey.AUTH_LOGIN_EMAIL_PLACEHOLDER;
const LOGIN_PASSWORD_LABEL_KEY = ResourceKey.FIELD_LABEL_PASSWORD;
const LOGIN_PASSWORD_PLACEHOLDER_KEY = ResourceKey.AUTH_LOGIN_PASSWORD_PLACEHOLDER;
const LOGIN_BUTTON_KEY = ResourceKey.AUTH_LOGIN_BUTTON;
const LOGIN_SUPPORT_KEY = ResourceKey.AUTH_LOGIN_SUPPORT;
const LOGIN_DIVIDER_OR_KEY = ResourceKey.AUTH_LOGIN_DIVIDER_OR;
const LOGIN_WITH_GOOGLE_KEY = ResourceKey.AUTH_LOGIN_WITH_GOOGLE;
const SIGNUP_HINT_KEY = ResourceKey.AUTH_SIGNUP_HINT;
const SIGNUP_ACTION_KEY = ResourceKey.AUTH_SIGNUP_ACTION;
const LOGIN_ILLUSTRATION_ALT_KEY = ResourceKey.AUTH_LOGIN_ILLUSTRATION_ALT;
const AUTH_SHOW_PASSWORD_KEY = ResourceKey.AUTH_SHOW_PASSWORD;
const AUTH_HIDE_PASSWORD_KEY = ResourceKey.AUTH_HIDE_PASSWORD;
const BRAND_ALT_KEY = ResourceKey.APP_NAME;

/**
 * @summary Renders the login page and binds form events to the login controller.
 */

export function LoginPage(): JSX.Element {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [error, setError] = useState<ResourceKey | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const controller = useMemo(() => createLoginController({ setError }), []);

    const handleSubmit = async (): Promise<void> => {
        setIsSubmitting(true);
        await controller.onSubmit(email, password);
        setIsSubmitting(false);
    };

    return (
        <section class="min-h-screen bg-gradient-to-br from-stone-900 to-stone-700">
            <PageContainer>
                <div class="flex min-h-[calc(100vh-3rem)] items-center py-4">
                    <div class="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:gap-16">
                        <div class="mx-auto w-full max-w-md">
                            <div class="[&>article]:!border-base-content/20 [&>article]:!shadow-2xl [&_.card-body]:!p-6 sm:[&_.card-body]:!p-8">
                                <Card bgColor="neutral">
                                    <header class="mb-6 flex flex-col items-center gap-5 text-center">
                                        <img src={brandLogoHorizontal} alt={t(BRAND_ALT_KEY)} class="mb-6 w-full" />
                                        <div class="space-y-2">
                                            <h1 class="text-page-title text-base-100">{t(LOGIN_TITLE_KEY)}</h1>
                                            <p class="text-body font-semibold text-base-100/90">{t(LOGIN_SUBTITLE_KEY)}</p>
                                        </div>
                                    </header>

                                    <Form onSubmit={handleSubmit} disabled={isSubmitting}>
                                        <div class="space-y-4 [&_label>span]:!text-base-100">
                                            <Input
                                                id="login-email"
                                                name="email"
                                                label={LOGIN_EMAIL_LABEL_KEY}
                                                placeholder={LOGIN_EMAIL_PLACEHOLDER_KEY}
                                                type={InputType.EMAIL}
                                                value={email}
                                                autoComplete="email"
                                                required
                                                onChange={setEmail}
                                            />

                                            <Input
                                                id="login-password"
                                                name="password"
                                                label={LOGIN_PASSWORD_LABEL_KEY}
                                                type={showPassword ? InputType.TEXT : InputType.PASSWORD}
                                                value={password}
                                                placeholder={LOGIN_PASSWORD_PLACEHOLDER_KEY}
                                                autoComplete="current-password"
                                                rightSlot={
                                                    <button
                                                        type="button"
                                                        class="inline-flex items-center justify-center text-base-content/40 transition hover:text-base-content/70"
                                                        aria-label={t(showPassword ? AUTH_HIDE_PASSWORD_KEY : AUTH_SHOW_PASSWORD_KEY)}
                                                        onClick={() => setShowPassword((currentValue) => !currentValue)}
                                                    >
                                                        {showPassword ? (
                                                            <EyeClosedIcon size={20} weight="regular" />
                                                        ) : (
                                                            <EyeIcon size={20} weight="regular" />
                                                        )}
                                                    </button>
                                                }
                                                required
                                                onChange={setPassword}
                                            />
                                        </div>

                                        {error ? <Alert variant={AlertVariant.ERROR} message={error} /> : null}

                                        <div class="space-y-4 pt-1">
                                            <div class="[&>button]:w-full">
                                                <Button type="submit" variant={ButtonVariant.PRIMARY} loading={isSubmitting}>
                                                    <span class="inline-flex items-center gap-2">
                                                        <FingerprintIcon size={24} weight="duotone" />
                                                        <span class="text-button-lg font-semibold">{t(LOGIN_BUTTON_KEY)}</span>
                                                    </span>
                                                </Button>
                                            </div>

                                            <div class="mb-2 text-right [&>button]:!text-base-100/90">
                                                <Button type="button" variant={ButtonVariant.LINK} label={LOGIN_SUPPORT_KEY} />
                                            </div>

                                            <div class="flex items-center gap-4">
                                                <span class="h-px flex-1 bg-base-100/40" />
                                                <span class="text-body text-base-100">{t(LOGIN_DIVIDER_OR_KEY)}</span>
                                                <span class="h-px flex-1 bg-base-100/40" />
                                            </div>

                                            <div class="[&>button]:w-full [&>button]:!border-base-100/80 [&>button]:!text-base-100">
                                                <Button type="button" variant={ButtonVariant.OUTLINE}>
                                                    <span class="inline-flex items-center gap-3">
                                                        <img src={googleLogoButton} alt="" class="h-6 w-6" aria-hidden="true" />
                                                        <span class="text-button-lg font-semibold">{t(LOGIN_WITH_GOOGLE_KEY)}</span>
                                                    </span>
                                                </Button>
                                            </div>

                                            <div class="pt-2 text-center">
                                                <span class="text-body text-base-100/90">{t(SIGNUP_HINT_KEY)} </span>
                                                <Button type="button" variant={ButtonVariant.LINK} label={SIGNUP_ACTION_KEY} />
                                            </div>
                                        </div>
                                    </Form>
                                </Card>
                            </div>
                        </div>

                        <figure class="hidden lg:flex lg:items-center lg:justify-center">
                            <img
                                src={loginIllustration}
                                alt={t(LOGIN_ILLUSTRATION_ALT_KEY)}
                                class="h-auto w-full max-w-[44rem] object-contain"
                            />
                        </figure>
                    </div>
                </div>
            </PageContainer>
        </section>
    );
}
