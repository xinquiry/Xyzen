import { CheckIcon, ClipboardIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { useXyzen } from "@/store";
import { LAYOUT_STYLE } from "@/store/slices/uiSlice/types";
import "katex/dist/katex.css";

interface MarkdownProps {
  content: string;
  className?: string; // optional extra classes for the markdown root
}

const Markdown: React.FC<MarkdownProps> = function Markdown(props) {
  const { panelWidth, layoutStyle } = useXyzen();
  const { content = "", className } = props;
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Detect theme for line number colors
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const checkTheme = () => {
      if (typeof document !== "undefined") {
        const htmlEl = document.documentElement;
        const hasDarkClass = htmlEl.classList.contains("dark");
        const prefersDark =
          window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
        setIsDark(hasDarkClass || prefersDark);
      }
    };

    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    if (typeof document !== "undefined") {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    return () => observer.disconnect();
  }, []);

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
    });
  };

  const MarkdownComponents = {
    code({
      inline,
      className,
      children,
      ...props
    }: React.ComponentPropsWithoutRef<"code"> & { inline?: boolean }) {
      const match = /language-(\w+)/.exec(className || "");
      const code = String(children).replace(/\n$/, "");
      const lang = match?.[1] ?? "";

      return !inline && match ? (
        <div
          className={clsx(
            // container
            "group relative my-5 w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1b] shadow",
            "flex flex-col",
            // avoid typography styles interfering with code block
            "not-prose",
          )}
        >
          <div className="flex h-10 items-center justify-between border-b border-white/10 bg-white/5 px-4">
            {lang ? (
              <span className="font-mono text-xs text-zinc-400">{lang}</span>
            ) : (
              <span className="font-mono text-xs text-zinc-400">code</span>
            )}
          </div>
          <div className="relative flex-1 min-h-0 p-5">
            <button
              onClick={() => copyToClipboard(code)}
              className={clsx(
                "absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md border text-zinc-300 transition",
                "opacity-0 border-white/10 bg-white/5 backdrop-blur-sm",
                "group-hover:opacity-100 focus-visible:opacity-100",
                "hover:bg-white/15 hover:border-white/20 active:scale-95",
                copiedCode === code &&
                  "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
              )}
              aria-label={copiedCode === code ? "Copied" : "Copy"}
              title={copiedCode === code ? "Copied" : "Copy"}
            >
              {copiedCode === code ? (
                <CheckIcon className="h-4 w-4" />
              ) : (
                <ClipboardIcon className="h-4 w-4" />
              )}
            </button>
            <div
              className={clsx(
                `h-full min-w-0 overflow-x-auto custom-scrollbar`,
                isDark && "dark",
              )}
            >
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={lang}
                PreTag="div"
                customStyle={{
                  background: "transparent",
                  margin: 0,
                  padding: 0,
                  fontSize: "0.875rem",
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                }}
                showLineNumbers
                wrapLines={true}
                lineNumberContainerStyle={{
                  float: "left",
                  paddingRight: "1em",
                  textAlign: "right",
                  userSelect: "none",
                }}
                lineNumberStyle={{
                  minWidth: "2.5em",
                  paddingRight: "1em",
                  textAlign: "right",
                  display: "inline-block",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: "0.75rem",
                  fontVariantNumeric: "tabular-nums",
                  color: isDark ? "#a1a1aa" : "#52525b", // zinc-400 for dark, zinc-600 for light
                }}
                lineProps={(lineNumber) => ({
                  className: lineNumber === 1 ? "pl-1" : "",
                })}
              >
                {code}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
      ) : (
        <div className={clsx("overflow-x-auto", className)} {...props}>
          {children}
        </div>
      );
    },
  };
  return (
    <article
      className={clsx("prose", "markdown", "w-full", "max-w-full", className)}
      style={{
        width: layoutStyle === LAYOUT_STYLE.Sidebar ? panelWidth - 164 : "100%",
      }}
    >
      <ReactMarkdown
        components={MarkdownComponents}
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
};

export default Markdown;
