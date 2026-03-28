import { AppRoutePath } from "@shared/enums/routes.enums";
import { navigate as navigateWithHistory } from "wouter-preact/use-browser-location";

type NavigationPath = AppRoutePath;
type NavigationSearchParamValue = string | number | boolean;
type NavigationSearchParams = Readonly<Record<string, NavigationSearchParamValue | null | undefined>>;

function buildPath(path: NavigationPath, searchParams?: NavigationSearchParams): string {
  if (searchParams === undefined) {
    return path;
  }

  const query = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    query.set(key, String(value));
  });

  const search = query.toString();
  return search.length > 0 ? `${path}?${search}` : path;
}

/**
 * @summary Pushes a new route using the centralized navigation API.
 * @param path Target typed route path.
 * @returns No return value.
 */

export function navigate(path: NavigationPath, searchParams?: NavigationSearchParams): void {
  navigateWithHistory(buildPath(path, searchParams));
}

/**
 * @summary Replaces the current route entry using the centralized navigation API.
 * @param path Target typed route path.
 * @returns No return value.
 */

export function replace(path: NavigationPath, searchParams?: NavigationSearchParams): void {
  navigateWithHistory(buildPath(path, searchParams), { replace: true });
}