import { authService } from "@/service/authService";
import type { StateCreator } from "zustand";
import type { User, XyzenState } from "../types";

// --- Mock Data ---
const mockUser: User = {
  id: "harvey-123",
  username: "Harvey",
  avatar: `https://i.pravatar.cc/40?u=harvey`,
};

export interface AuthSlice {
  user: User | null;
  token: string | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  login: (token: string) => Promise<void>;
  logout: () => void;
  fetchUserByToken: () => Promise<void>;
}

export const createAuthSlice: StateCreator<
  XyzenState,
  [["zustand/immer", never]],
  [],
  AuthSlice
> = (set, _) => ({
  user: mockUser, // Default to mock user for now
  token: null,
  status: "idle",
  login: async (token: string) => {
    set({ status: "loading" });
    try {
      // For now, we'll just set the token and user directly
      // In a real app, you'd call authService.login(token)
      authService.setToken(token);
      set({
        token,
        user: mockUser, // Replace with actual user from API response
        status: "succeeded",
      });
    } catch (error) {
      set({ status: "failed" });
      console.error("Login failed:", error);
    }
  },
  logout: () => {
    authService.removeToken();
    set({ user: null, token: null, status: "idle" });
  },
  fetchUserByToken: async () => {
    const token = authService.getToken();
    if (token) {
      set({ status: "loading" });
      try {
        // In a real app, you would fetch the user from the backend
        // const user = await authService.getUser();
        // For now, we'll just use the mock user if a token exists
        set({
          token,
          user: mockUser,
          status: "succeeded",
        });
      } catch (error) {
        set({ status: "failed" });
        authService.removeToken();
        console.error("Failed to fetch user by token:", error);
      }
    }
  },
});
