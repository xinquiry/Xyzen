import { useXyzen } from "@/store";
import { useEffect, useState } from "react";

import { CenteredInput } from "@/components/features";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { DEFAULT_BACKEND_URL } from "@/configs";
import useTheme from "@/hooks/useTheme";
import { AppFullscreen } from "./AppFullscreen";
import { AppSide } from "./AppSide";
import { McpListModal } from "./McpListModal";

export interface XyzenProps {
  backendUrl?: string;
  showLlmProvider?: boolean;
}

export function Xyzen({
  backendUrl = DEFAULT_BACKEND_URL,
  showLlmProvider = false,
}: XyzenProps) {
  const { isXyzenOpen, layoutStyle } = useXyzen();

  // Initialize theme at the top level so it works for both layouts
  useTheme();
  const [mounted, setMounted] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1920,
  );

  useEffect(() => {
    setMounted(true);
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!mounted) return null;

  // 手机阈值：512px 以下强制 Sidebar（不可拖拽，全宽）
  const MOBILE_BREAKPOINT = 512;
  const isMobile = viewportWidth < MOBILE_BREAKPOINT;

  if (!isXyzenOpen) {
    return <CenteredInput />;
  }

  return (
    <>
      {isMobile ? (
        // 小于阈值：强制 Sidebar，全宽且不可拖拽
        <AppSide
          backendUrl={backendUrl}
          showLlmProvider={showLlmProvider}
          isMobile
        />
      ) : layoutStyle === "sidebar" ? (
        // 大于等于阈值：尊重设置为 Sidebar，桌面可拖拽
        <AppSide backendUrl={backendUrl} showLlmProvider={showLlmProvider} />
      ) : (
        // 大于等于阈值：默认/设置为 fullscreen
        <AppFullscreen
          backendUrl={backendUrl}
          showLlmProvider={showLlmProvider}
        />
      )}
      <McpListModal />
      <SettingsModal />
    </>
  );
}
