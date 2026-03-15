import { Theme } from "@shared/enums/theme.enums";
import { getTheme, toggleTheme } from "@/state/theme.store";

export interface DashboardController {
  readonly getCurrentTheme: () => Theme;
  readonly onToggleTheme: () => Theme;
}

/**
 * @summary Builds dashboard view-model data and action handlers for the page.
 */

export function createDashboardController(): DashboardController {
  const getCurrentTheme = (): Theme => getTheme();

  const onToggleTheme = (): Theme => {
    toggleTheme();
    return getTheme();
  };

  return {
    getCurrentTheme,
    onToggleTheme,
  };
}
