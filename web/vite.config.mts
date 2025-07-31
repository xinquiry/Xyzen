import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig, type BuildOptions, type PluginOption } from "vite";
import dts from "vite-plugin-dts";

// https://vite.dev/config/
export default defineConfig(() => {
  const isLibBuild = process.env.BUILD_MODE === "library";

  const plugins: PluginOption[] = [react(), tailwindcss()];

  if (isLibBuild) {
    plugins.push(
      dts({
        insertTypesEntry: true,
        tsconfigPath: "./tsconfig.app.json",
      }),
    );
  }

  const build: BuildOptions = {
    outDir: isLibBuild ? "dist" : "site",
  };

  if (isLibBuild) {
    build.lib = {
      entry: path.resolve(import.meta.dirname, "src/index.ts"),
      name: "Xyzen",
      fileName: (format: string) => `xyzen.${format}.js`,
    };
    build.rollupOptions = {
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    };
  }

  const config = {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    build,
  };

  // For app mode, the default build config is used, which builds from index.html

  return config;
});
