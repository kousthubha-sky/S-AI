import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    allowedHosts: [
      'localhost',
      'gadgets-projects-ports-cross.trycloudflare.com',//backend
      'relaxation-xml-carlos-via.trycloudflare.com ' // Allow all localtunnel subdomains
    ],
  },
});
