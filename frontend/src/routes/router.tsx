import { AppRoutePath } from "@shared/enums/routes.enums";
import { Route, Switch } from "wouter-preact";
import { AppLayout } from "@/components/layout/app-layout";
import { DashboardPage } from "@/pages/dashboard/dashboard";
import { ForgotPasswordPage } from "@/pages/forgot-password/forgot-password";
import { LoginPage } from "@/pages/login/login";
import { ResetPasswordPage } from "@/pages/reset-password/reset-password";
import { SandboxPage } from "@/pages/sandbox/sandbox";
import { SignupPage } from "@/pages/signup/signup";
import { VerifyEmailPage } from "@/pages/verify-email/verify-email";
import { RequireAuth } from "@/routes/guards/requireAuth";

/**
 * @summary Defines the application route tree with authenticated and public sections.
 */
export function AppRouter() {
  return (
    <AppLayout>
      <Switch>
        <Route path={AppRoutePath.LOGIN} component={LoginPage} />
        <Route path={AppRoutePath.SIGNUP} component={SignupPage} />
        <Route path={AppRoutePath.VERIFY_EMAIL} component={VerifyEmailPage} />
        <Route path={AppRoutePath.FORGOT_PASSWORD} component={ForgotPasswordPage} />
        <Route path={AppRoutePath.RESET_PASSWORD} component={ResetPasswordPage} />
        <Route path={AppRoutePath.DASHBOARD}>
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        </Route>
        <Route path={AppRoutePath.SANDBOX}>
          <RequireAuth>
            <SandboxPage />
          </RequireAuth>
        </Route>
        <Route component={LoginPage} />
      </Switch>
    </AppLayout>
  );
}