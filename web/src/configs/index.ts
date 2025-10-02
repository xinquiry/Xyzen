const NODE_ENV = import.meta.env.NODE_ENV;
const isDevelopment = NODE_ENV === "development";

console.log("=== Environment Debug ===");
console.log("NODE_ENV:", NODE_ENV);
console.log("isDevelopment:", isDevelopment);
console.log("isProduction:", NODE_ENV === "production");
console.log("VITE_BACKEND_URL:", import.meta.env.VITE_BACKEND_URL);
console.log("VITE_BACKEND_URL type:", typeof import.meta.env.VITE_BACKEND_URL);
console.log("All env vars:", import.meta.env);

// 智能后端URL配置：
// - 如果设置了VITE_BACKEND_URL环境变量，使用它
// - 开发环境默认使用localhost:48196
// - 生产环境使用相对路径，自动匹配当前域名
const getBackendURL = (): string => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  if (isDevelopment || !NODE_ENV) {
    return "http://localhost:48196";
  }

  // 生产环境：使用当前域名 + API路径
  return `${window.location.protocol}//${window.location.host}`;
};

export const DEFAULT_BACKEND_URL = getBackendURL();

console.log("Final DEFAULT_BACKEND_URL:", DEFAULT_BACKEND_URL);
