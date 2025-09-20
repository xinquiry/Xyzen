"use client";

import { useAuth } from "@/hooks/useAuth";
import { AuthState } from "@/service/authService";
import {
  ExclamationTriangleIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useState } from "react";

export interface AuthStatusProps {
  onTokenInput?: (token: string) => void;
  className?: string;
}

// Token输入弹窗组件
function TokenInputModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (token: string) => void;
}) {
  const [tokenInput, setTokenInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      onSubmit(tokenInput.trim());
      setTokenInput("");
      onClose();
    }
  };

  const handleClose = useCallback(() => {
    setTokenInput("");
    onClose();
  }, [onClose]);

  // 点击外部关闭弹窗
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // ESC键关闭弹窗
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
            输入访问令牌
          </h3>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-500 dark:hover:bg-neutral-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="token-input"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
            >
              访问令牌
            </label>
            <input
              id="token-input"
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="请输入您的访问令牌"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
              autoFocus
              required
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              请输入有效的访问令牌进行身份验证
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              确认
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AuthStatus({ onTokenInput, className = "" }: AuthStatusProps) {
  const auth = useAuth();
  const [showTokenModal, setShowTokenModal] = useState(false);

  // 处理token输入
  const handleTokenSubmit = async (token: string) => {
    await auth.login(token);
    onTokenInput?.(token);
  };

  if (auth.isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-indigo-600 dark:border-neutral-700 dark:border-t-indigo-500"></div>
        <span className="text-sm text-neutral-500">检查认证状态...</span>
      </div>
    );
  }

  // 根据不同状态渲染不同UI
  switch (auth.authState) {
    case AuthState.NOT_CONFIGURED:
    case AuthState.NOT_AUTHENTICATED:
    case AuthState.ERROR: {
      // 统一显示感叹号图标，点击显示弹窗
      const tooltipMessage =
        auth.authState === AuthState.NOT_CONFIGURED
          ? "认证服务未配置"
          : auth.authState === AuthState.ERROR
            ? "认证错误"
            : "未授权的用户";

      return (
        <>
          <div className={`flex items-center space-x-2 ${className}`}>
            <button
              onClick={() => setShowTokenModal(true)}
              className="flex items-center justify-center h-6 w-6 rounded-full text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 transition-colors"
              title={tooltipMessage}
            >
              <ExclamationTriangleIcon className="h-4 w-4" />
            </button>
          </div>

          <TokenInputModal
            isOpen={showTokenModal}
            onClose={() => setShowTokenModal(false)}
            onSubmit={handleTokenSubmit}
          />
        </>
      );
    }

    case AuthState.AUTHENTICATED:
      return (
        <div className={`flex items-center space-x-2 ${className}`}>
          <div className="flex items-center space-x-2">
            {auth.user?.avatar_url ? (
              <img
                src={auth.user.avatar_url}
                alt={auth.user.display_name || auth.user.username}
                className="h-6 w-6 rounded-full"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                <UserIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium max-w-16 truncate text-neutral-900 dark:text-neutral-100">
                {auth.user?.display_name || auth.user?.username}
              </span>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className={`flex items-center space-x-2 ${className}`}>
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
          <span className="text-sm text-red-600" title={auth.message}>
            未知状态
          </span>
        </div>
      );
  }
}
