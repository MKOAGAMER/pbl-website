import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Preserved prototype modules that are no longer part of the App Router build.
    "app/components/home/**",
    "app/lib/data/**",
    "app/lib/supabase/**",
    "app/lib/utils.ts",
    "app/types/**",
  ]),
]);

export default eslintConfig;
