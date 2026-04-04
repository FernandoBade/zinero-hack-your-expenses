import type { JSX } from "preact";
import { useMemo, useState } from "preact/hooks";
import { EyeClosedIcon, EyeIcon, FingerprintIcon } from "@phosphor-icons/react";
import googleLogoButton from "@shared/assets/images/google-logo-button.png";
import { InputType } from "@shared/enums/input.enums";
import { AlertVariant, AlertStyle, ButtonVariant } from "@shared/enums/ui.enums";
import type { I18nKey } from "@shared/i18n/types/i18n-key";
import { Alert } from "@/components/alert/alert";
import { AuthShell } from "@/components/auth-shell/auth-shell";
import { Button } from "@/components/button/button";
import { Form } from "@/components/form/form";
import { Input } from "@/components/input/input";
import { createLoginController } from "@/pages/login/login.controller";
import { t } from "@/utils/i18n/translate";

const LOGIN_TITLE_KEY = 'auth.login.title';
const LOGIN_SUBTITLE_KEY = 'auth.login.subtitle';
const LOGIN_EMAIL_PLACEHOLDER_KEY = 'auth.login.email.placeholder';
const LOGIN_PASSWORD_PLACEHOLDER_KEY = "auth.login.password.placeholder";
const LOGIN_BUTTON_KEY = 'auth.login.submit';
const LOGIN_SUPPORT_KEY = 'auth.login.help.link';
const LOGIN_DIVIDER_OR_KEY = 'auth.login.divider.or';
const LOGIN_WITH_GOOGLE_KEY = 'auth.login.google.continue';
const SIGNUP_HINT_KEY = 'auth.login.signup_prompt.text';
const SIGNUP_ACTION_KEY = 'auth.login.signup_prompt.action';
const LOGIN_GOOGLE_COMMING_SOON_KEY = 'app.coming_soon';
const AUTH_SHOW_PASSWORD_KEY = 'auth.password.toggle.show';
const AUTH_HIDE_PASSWORD_KEY = 'auth.password.toggle.hide';

/**
 * @summary Renders the login page and binds form events to the login controller.
 */
export function LoginPage(): JSX.Element {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [error, setError] = useState<I18nKey | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const controller = useMemo(() => createLoginController({ setError }), []);

    const handleSubmit = async (): Promise<void> => {
        setIsSubmitting(true);
        await controller.onSubmit(email, password);
        setIsSubmitting(false);
    };

    return (
        <AuthShell size="compact" title={LOGIN_TITLE_KEY} subtitle={LOGIN_SUBTITLE_KEY}>
            <Form onSubmit={handleSubmit} disabled={isSubmitting}>
                <div class="space-y-4 [&_label>span]:!text-base-100">
                    <Input
                        id="login-email"
                        name="email"
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
                                    <EyeIcon size={20} weight="regular" />
                                ) : (
                                    <EyeClosedIcon size={20} weight="regular" />
                                )}
                            </button>
                        }
                        required
                        onChange={setPassword}
                    />
                </div>

                <div class="space-y-4">
                    <div class="[&>button]:w-full">
                        <Button type="submit" variant={ButtonVariant.PRIMARY} loading={isSubmitting}>
                            <span class="inline-flex items-center gap-2">
                                {!isSubmitting ? <FingerprintIcon size={24} weight="duotone" /> : null}
                                <span class="text-button-lg font-semibold">{t(LOGIN_BUTTON_KEY)}</span>
                            </span>
                        </Button>
                    </div>
                    {error ? <Alert variant={AlertVariant.ERROR} style={AlertStyle.OUTLINE} message={error} /> : null}
                    <div class="mb-2 text-right [&>button]:!text-base-100">
                        <Button type="button" variant={ButtonVariant.LINK} label={LOGIN_SUPPORT_KEY} onClick={controller.onNavigateToForgotPassword} />
                    </div>

                    <div class="flex items-center gap-4 pb-4">
                        <span class="h-px flex-1 bg-base-100/40" />
                        <span class="text-body text-base-100">{t(LOGIN_DIVIDER_OR_KEY)}</span>
                        <span class="h-px flex-1 bg-base-100/40" />
                    </div>

                    <div class="[&>button]:w-full [&>button]:!border-base-100/80 [&>button]:!text-base-100" title={t(LOGIN_GOOGLE_COMMING_SOON_KEY)}>
                        <Button type="button" variant={ButtonVariant.OUTLINE} disabled>
                            <span class="inline-flex cursor-not-allowed items-center gap-3">
                                <img src={googleLogoButton} alt="" class="h-6 w-6 cursor-not-allowed" aria-hidden="true" />
                                <span class="cursor-not-allowed text-button-lg font-semibold line-through text-stone-500">{t(LOGIN_WITH_GOOGLE_KEY)}</span>
                            </span>
                        </Button>
                    </div>

                    <div class="pt-1 text-center">
                        <span class="text-sm text-base-100">{t(SIGNUP_HINT_KEY)}</span>
                        <Button type="button" variant={ButtonVariant.LINK} label={SIGNUP_ACTION_KEY} onClick={controller.onNavigateToSignup} />
                    </div>
                </div>
            </Form>
        </AuthShell>
    );
}
