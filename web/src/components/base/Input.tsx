import { Input as HeadlessInput, type InputProps } from "@headlessui/react";
import clsx from "clsx";

const formClasses =
  "block w-full appearance-none rounded-sm border-[1px] border-neutral-300 bg-white py-[calc(theme(spacing.2)-1px)] px-[calc(theme(spacing.3)-1px)] text-neutral-950 placeholder:text-neutral-500 sm:text-sm/6 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-indigo-400";

export function Input({
  className,
  ...props
}: { className?: string } & InputProps) {
  return (
    <span className={clsx(className, "relative")}>
      <HeadlessInput
        autoComplete="off"
        className={clsx(formClasses, "pr-8")}
        {...props}
      />
    </span>
  );
}
