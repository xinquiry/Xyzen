"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
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
      <div className="w-full max-w-md rounded-sm bg-white p-6 shadow-xl dark:bg-neutral-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
            输入访问令牌
          </h3>
          <button
            onClick={handleClose}
            className="rounded-sm p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-500 dark:hover:bg-neutral-700"
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
              className="w-full rounded-sm border border-neutral-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
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
              className="rounded-sm px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded-sm bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
  const [copied, setCopied] = useState(false);

  const maskedToken = (() => {
    const token = auth.token;
    if (!token) return "暂无 access_token";
    if (token.length <= 20) return "***";
    return `${token.slice(0, 10)}…${token.slice(-8)}`;
  })();

  const copyToken = useCallback(async () => {
    if (!auth.token) return;
    try {
      await navigator.clipboard.writeText(auth.token);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = auth.token;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [auth.token]);

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

  // 已登录：展示用户信息
  if (auth.isAuthenticated) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 ${className}`}
            title="认证信息"
          >
            {auth.user?.avatar ? (
              <img
                src={auth.user.avatar}
                alt={auth.user.username}
                className="h-6 w-6 rounded-full"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                <UserIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            )}

            <span className="text-sm font-medium max-w-32 truncate text-neutral-900 dark:text-neutral-100">
              {auth.user?.username}
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="text-xs">凭证</DropdownMenuLabel>

          <div className="px-2 py-1.5">
            <div className="mb-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              access_token
            </div>
            <div className="rounded-md bg-neutral-100 px-2 py-2 font-mono text-[11px] text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 break-all">
              {maskedToken}
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            disabled={!auth.token}
            onSelect={(e) => {
              e.preventDefault();
              void copyToken();
            }}
            className="gap-2"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            <span>{copied ? "已复制" : "复制 Token"}</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={!auth.token}
            onSelect={(e) => {
              e.preventDefault();
              if (!auth.token) return;
              const encoded = encodeURIComponent(auth.token);
              window.open(
                `https://chat.sciol.ac.cn/?access_token=${encoded}`,
                "_blank",
                "noopener,noreferrer",
              );
            }}
            className="gap-2"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            <span>跳转到 Web</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // 未登录或失败：显示感叹号，点击可输入 Token
  const tooltipMessage =
    auth.status === "failed" ? "认证错误或未配置" : "未授权的用户";
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
