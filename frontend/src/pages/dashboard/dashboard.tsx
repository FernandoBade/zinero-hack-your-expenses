import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { AppRoutePath } from "@shared/enums/routes.enums";
import { Theme } from "@shared/enums/theme.enums";
import { IconName } from "@shared/enums/icon.enums";
import { ButtonVariant } from "@shared/enums/ui.enums";
import { Button } from "@/components/button/button";
import { Card } from "@/components/card/card";
import { PageContainer } from "@/components/page-container/page-container";
import { navigate } from "@/routes/navigation";
import { createDashboardController } from "@/pages/dashboard/dashboard.controller";

const DASHBOARD_TITLE = 'field.theme.label';
const TOGGLE_THEME_LABEL = 'field.theme.label';
const LOGIN_ROUTE_LABEL = 'field.user_id.label';

/**
 * @summary Renders the dashboard page with KPI cards, alerts, and transactional tables.
 */

export function DashboardPage(): JSX.Element {
    const controller = createDashboardController();
    const [theme, setTheme] = useState<Theme>(controller.getCurrentTheme());

    const handleToggleTheme = (): void => {
        setTheme(controller.onToggleTheme());
    };

    return (
        <PageContainer>
            <Card title={DASHBOARD_TITLE} compact>
                <div class="flex flex-wrap gap-2">
                    <Button
                        variant={ButtonVariant.SECONDARY}
                        label={TOGGLE_THEME_LABEL}
                        iconLeft={theme === Theme.LIGHT ? IconName.STAR : IconName.INFO}
                        onClick={handleToggleTheme}
                    />
                    <Button
                        variant={ButtonVariant.GHOST}
                        label={LOGIN_ROUTE_LABEL}
                        iconLeft={IconName.CHEVRON_LEFT}
                        onClick={() => navigate(AppRoutePath.LOGIN)}
                    />
                </div>
            </Card>
        </PageContainer>
    );
}

