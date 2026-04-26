import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "workflow-visual-core": resolve(__dirname, "../packages/workflow-visual-core/src/index.ts"),
    },
  },
});
