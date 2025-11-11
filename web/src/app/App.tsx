import { Progress } from "@/components/animate-ui/components/radix/progress";
import { autoLogin } from "@/core/auth";
import { useAuth } from "@/hooks/useAuth";
import { useXyzen } from "@/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { CenteredInput } from "@/components/features";
import { DEFAULT_BACKEND_URL } from "@/configs";
import { MOBILE_BREAKPOINT } from "@/configs/common";
import useTheme from "@/hooks/useTheme";
import { LAYOUT_STYLE } from "@/store/slices/uiSlice/types";
import { AppFullscreen } from "./AppFullscreen";
import { AppSide } from "./AppSide";
import AuthErrorScreen from "./auth/AuthErrorScreen";

// 创建 React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export interface XyzenProps {
  backendUrl?: string;
  showLlmProvider?: boolean;
}

export function Xyzen({
  backendUrl = DEFAULT_BACKEND_URL,
  showLlmProvider = false,
}: XyzenProps) {
  const { isXyzenOpen, layoutStyle, setBackendUrl, toggleXyzen } = useXyzen();
  const { status } = useAuth();

  // Initialize theme at the top level so it works for both layouts
  useTheme();
  const [mounted, setMounted] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1920,
  );
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setMounted(true);
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Global keyboard shortcut: Cmd/Ctrl + Shift + X toggles sidebar open/close
  useEffect(() => {
    const isEditableTarget = (el: Element | null) => {
      if (!el) return false;
      const tag = (el as HTMLElement).tagName;
      const editable = (el as HTMLElement).isContentEditable;
      return (
        editable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (el as HTMLElement).closest?.('[role="textbox"]') !== null
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key === "X" || e.key === "x")
      ) {
        // Avoid toggling when typing in inputs/editable areas
        if (isEditableTarget(document.activeElement)) return;
        e.preventDefault();
        toggleXyzen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleXyzen]);

  // Ensure backend URL is configured in the store before attempting auto-login.
  useEffect(() => {
    setBackendUrl(backendUrl);
    void autoLogin();
  }, [backendUrl, setBackendUrl]);

  // Simulate progressive loading feedback while authentication status is pending.
  useEffect(() => {
    let intervalId: number | undefined;

    if (status === "idle" || status === "loading") {
      setProgress(10);
      intervalId = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          const increment = Math.random() * 12 + 4;
          return Math.min(prev + increment, 90);
        });
      }, 280);
    }

    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [status]);

  useEffect(() => {
    if (status === "succeeded" || status === "failed") {
      setProgress(100);
    }
  }, [status]);

  const handleRetry = useCallback(() => {
    void autoLogin();
  }, []);

  const isAuthenticating = status === "idle" || status === "loading";
  const authFailed = status === "failed";
  // 手机阈值：512px 以下强制 Sidebar（不可拖拽，全宽）
  const isMobile = viewportWidth < MOBILE_BREAKPOINT;
  const isSidebarLayout = isMobile || layoutStyle === LAYOUT_STYLE.Sidebar;

  if (!mounted) return null;

  const shouldShowCompactInput =
    layoutStyle === LAYOUT_STYLE.Sidebar && !isXyzenOpen && !isMobile;

  const mainLayout = shouldShowCompactInput ? (
    <CenteredInput />
  ) : isMobile ? (
    // 小于阈值：强制 Sidebar，全宽且不可拖拽
    <AppSide
      backendUrl={backendUrl}
      showLlmProvider={showLlmProvider}
      isMobile
      showAuthError={authFailed}
      onRetryAuth={handleRetry}
    />
  ) : layoutStyle === LAYOUT_STYLE.Sidebar ? (
    // 大于等于阈值：尊重设置为 Sidebar，桌面可拖拽
    <AppSide
      backendUrl={backendUrl}
      showLlmProvider={showLlmProvider}
      showAuthError={authFailed && isXyzenOpen}
      onRetryAuth={handleRetry}
    />
  ) : (
    // 大于等于阈值：默认/设置为 fullscreen
    <AppFullscreen backendUrl={backendUrl} showLlmProvider={showLlmProvider} />
  );

  const gatedContent = isAuthenticating ? (
    <AuthLoadingScreen progress={progress} />
  ) : authFailed ? (
    // 在 Sidebar 模式下，不全屏拦截，让侧边面板内联显示错误卡片；
    // 在全屏布局时，仍然展示全屏错误页。
    isSidebarLayout ? (
      <>{mainLayout}</>
    ) : (
      <AuthErrorScreen onRetry={handleRetry} variant="fullscreen" />
    )
  ) : (
    <>{mainLayout}</>
  );

  return (
    <QueryClientProvider client={queryClient}>
      {gatedContent}
    </QueryClientProvider>
  );
}

function AuthLoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <Progress value={progress} className="w-56" />
    </div>
  );
}
