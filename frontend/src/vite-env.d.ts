interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly MODE: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare module "*.css";
declare module "*.png" {
    const src: string;
    export default src;
}
declare module "*.svg" {
    const src: string;
    export default src;
}
