import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

if (nextVitals[0] && nextVitals[0].rules) {
  nextVitals[0].rules["react-hooks/set-state-in-effect"] = "off";
  nextVitals[0].rules["react-hooks/immutability"] = "off";
  nextVitals[0].rules["react-hooks/purity"] = "off";
}

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
