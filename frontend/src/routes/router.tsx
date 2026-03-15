import { AppRoutePath } from "@shared/enums/routes.enums";
import { Route, Switch } from "wouter-preact";
import { AppLayout } from "@/components/layout/app-layout";
import { DashboardPage } from "@/pages/dashboard/dashboard";
import { LoginPage } from "@/pages/login/login";
import { RequireAuth } from "@/routes/guards/requireAuth";

/**
 * @summary Defines the application route tree with authenticated and public sections.
 */

export function AppRouter() {
  return (
    <AppLayout>
      <Switch>
        <Route path={AppRoutePath.LOGIN} component={LoginPage} />
        <Route path={AppRoutePath.DASHBOARD}>
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        </Route>
        <Route component={LoginPage} />
      </Switch>
    </AppLayout>
  );
}
