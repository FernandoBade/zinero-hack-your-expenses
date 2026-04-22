import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));
const sharedRoot = path.resolve(frontendRoot, "../shared");
const testApiBaseUrl = process.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export default mergeConfig(
    viteConfig,
    defineConfig({
        define: {
            "import.meta.env.VITE_API_BASE_URL": JSON.stringify(testApiBaseUrl),
        },
        resolve: {
            alias: {
                "@": path.resolve(frontendRoot, "src"),
                "@shared": sharedRoot,
            },
        },
        test: {
            globals: true,
            environment: "node",
            include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
            server: {
                deps: {
                    inline: ["@phosphor-icons/react"],
                },
            },
            coverage: {
                provider: "v8",
                reporter: ["text", "html", "lcov"],
                include: ["src/utils/intl/**/*.ts", "src/state/userPreferences.store.ts"],
                exclude: [
                    "src/config/**",
                    "src/bootstrap/**",
                    "src/main.tsx",
                    "src/App.tsx",
                    "src/routes/**",
                    "src/styles/**",
                    "src/types/**",
                    "src/**/__generated__/**",
                    "src/**/test-helpers/**",
                ],
                thresholds: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80,
                },
            },
        },
    })
);
