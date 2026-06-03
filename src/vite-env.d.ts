/// <reference types="vite/client" />

declare module "*.css";

interface ImportMetaEnv {
	readonly VITE_SUPABASE_URL: string;
	readonly VITE_SUPABASE_ANON_KEY: string;
	readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

// Allow importing common image/video/asset formats used by the gallery.
declare module "*.avif";
declare module "*.heic";
declare module "*.heif";
declare module "*.tif";
declare module "*.tiff";
declare module "*.bmp";
declare module "*.svg";
declare module "*.mp4";
declare module "*.mov";
declare module "*.webm";
declare module "*.m4v";
declare module "*.mkv";
declare module "*.wmv";
declare module "*.flv";
declare module "*.3gp";
declare module "*.mpeg";
