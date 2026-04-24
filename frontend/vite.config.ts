import path from "node:path";
import { fileURLToPath } from "node:url";
import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));
const sharedRoot = path.resolve(frontendRoot, "../shared");

export default defineConfig({
    plugins: [preact()],
    resolve: {
        alias: {
            "@": path.resolve(frontendRoot, "src"),
            "@shared": sharedRoot,
        },
    },
    server: {
        port: 5000,
        strictPort: true,
        fs: {
            allow: [path.resolve(__dirname, "..")],
        },
    },
});
