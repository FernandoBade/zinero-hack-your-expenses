import { AppRoutePath } from "@shared/enums/routes.enums";
import { navigate as navigateWithHistory } from "wouter-preact/use-browser-location";

type NavigationPath = AppRoutePath;

/**
 * @summary Pushes a new route using the centralized navigation API.
 * @param path Target typed route path.
 * @returns No return value.
 */

export function navigate(path: NavigationPath): void {
  navigateWithHistory(path);
}

/**
 * @summary Replaces the current route entry using the centralized navigation API.
 * @param path Target typed route path.
 * @returns No return value.
 */

export function replace(path: NavigationPath): void {
  navigateWithHistory(path, { replace: true });
}
