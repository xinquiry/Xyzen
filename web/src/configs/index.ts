const NODE_ENV = import.meta.env.NODE_ENV;
const isDevelopment = NODE_ENV === "development";

console.log("=== Environment Debug ===");
console.log("NODE_ENV:", NODE_ENV);
console.log("isDevelopment:", isDevelopment);
console.log("VITE_BACKEND_URL:", import.meta.env.VITE_BACKEND_URL);
console.log("VITE_BACKEND_URL type:", typeof import.meta.env.VITE_BACKEND_URL);
console.log("All env vars:", import.meta.env);

export const DEFAULT_BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:48196";

console.log("Final DEFAULT_BACKEND_URL:", DEFAULT_BACKEND_URL);
