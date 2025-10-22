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

import "katex/dist/katex.css";

interface MarkdownProps {
  content: string;
  className?: string; // optional extra classes for the markdown root
}

const Markdown: React.FC<MarkdownProps> = function Markdown(props) {
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
        <div className="code-block-container group">
          <div className="code-block-header">
            {lang ? (
              <span className="code-block-header__label">{lang}</span>
            ) : (
              <span className="code-block-header__label">code</span>
            )}
          </div>
          <div className="code-block-content">
            <button
              onClick={() => copyToClipboard(code)}
              className={clsx(
                "code-block-copy-button",
                copiedCode === code && "copied",
              )}
              aria-label={copiedCode === code ? "Copied" : "Copy"}
              title={copiedCode === code ? "Copied" : "Copy"}
            >
              {copiedCode === code ? (
                <CheckIcon className="icon icon-check" />
              ) : (
                <ClipboardIcon className="icon" />
              )}
            </button>
            <div
              className={clsx("syntax-highlighter-wrapper", isDark && "dark")}
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
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };
  return (
    <article className={clsx("prose", "markdown", className)}>
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
