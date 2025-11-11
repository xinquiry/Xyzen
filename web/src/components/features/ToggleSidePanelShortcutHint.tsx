import { useMemo } from "react";

export default function ToggleSidePanelShortcutHint() {
  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /(Mac|iPhone|iPad|Apple)/i.test(navigator.userAgent);
  }, []);
  return (
    <span className="inline-flex items-center gap-1 rounded bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
      {isMac ? (
        <>
          <kbd className="font-mono">⌘</kbd>+
          <kbd className="font-mono">shift</kbd>+
          <kbd className="font-mono">X</kbd>
        </>
      ) : (
        <>
          <kbd className="font-mono">ctrl</kbd>+
          <kbd className="font-mono">shift</kbd>+
          <kbd className="font-mono">X</kbd>
        </>
      )}
      <span className="pl-1">关闭侧边栏</span>
    </span>
  );
}
