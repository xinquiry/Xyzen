import { Xyzen } from "@/app/App";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { initI18n } from "@/i18n/i18n";

async function maybeCleanupServiceWorkerForIframeBuild(): Promise<void> {
  if (!__XYZEN_IFRAME_BUILD__) return;
  if (!("serviceWorker" in navigator)) return;

  const storageKey = "xyzen:iframe:sw-cleanup:v1";
  try {
    if (localStorage.getItem(storageKey) === "1") return;
  } catch {
    // ignore storage access failures (e.g. third-party storage restrictions)
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // ignore
    }
    return;
  }

  await Promise.all(
    registrations.map((registration) =>
      registration.unregister().catch(() => false),
    ),
  );

  try {
    localStorage.setItem(storageKey, "1");
  } catch {
    // ignore
  }

  // Ensure the page is no longer controlled by the previous SW.
  window.location.reload();
}

async function bootstrap(): Promise<void> {
  await maybeCleanupServiceWorkerForIframeBuild();

  initI18n();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Xyzen />
    </StrictMode>,
  );
}

void bootstrap();
