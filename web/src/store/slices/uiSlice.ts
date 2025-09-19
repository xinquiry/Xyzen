import xyzenService from "@/service/xyzenService";
import type { StateCreator } from "zustand";
import type { Theme, XyzenState } from "../types";

export interface UiSlice {
  backendUrl: string;
  isXyzenOpen: boolean;
  panelWidth: number;
  activeTabIndex: number;
  theme: Theme;
  isAddMcpServerModalOpen: boolean;
  isAddLlmProviderModalOpen: boolean;

  toggleXyzen: () => void;
  openXyzen: () => void;
  closeXyzen: () => void;
  setPanelWidth: (width: number) => void;
  setTabIndex: (index: number) => void;
  setTheme: (theme: Theme) => void;
  setBackendUrl: (url: string) => void;
  openAddMcpServerModal: () => void;
  closeAddMcpServerModal: () => void;
  openAddLlmProviderModal: () => void;
  closeAddLlmProviderModal: () => void;
}

export const createUiSlice: StateCreator<
  XyzenState,
  [["zustand/immer", never]],
  [],
  UiSlice
> = (set) => ({
  backendUrl: "",
  isXyzenOpen: false,
  panelWidth: 380,
  activeTabIndex: 0,
  theme: "system",
  isAddMcpServerModalOpen: false,
  isAddLlmProviderModalOpen: false,

  toggleXyzen: () =>
    set((state: { isXyzenOpen: boolean }) => ({
      isXyzenOpen: !state.isXyzenOpen,
    })),
  openXyzen: () => set({ isXyzenOpen: true }),
  closeXyzen: () => set({ isXyzenOpen: false }),
  setPanelWidth: (width) => set({ panelWidth: width }),
  setTabIndex: (index) => set({ activeTabIndex: index }),
  setTheme: (theme) => set({ theme }),
  setBackendUrl: (url) => {
    set({ backendUrl: url });
    xyzenService.setBackendUrl(url);
  },
  openAddMcpServerModal: () => set({ isAddMcpServerModalOpen: true }),
  closeAddMcpServerModal: () => set({ isAddMcpServerModalOpen: false }),
  openAddLlmProviderModal: () => set({ isAddLlmProviderModalOpen: true }),
  closeAddLlmProviderModal: () => set({ isAddLlmProviderModalOpen: false }),
});
