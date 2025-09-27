import { Switch as HeadlessSwitch } from "@headlessui/react";
import clsx from "clsx";
import { motion, type Transition } from "framer-motion";
import React from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

const spring: Transition = {
  type: "spring",
  stiffness: 700,
  damping: 30,
};

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  className,
  disabled = false,
}) => {
  return (
    <HeadlessSwitch
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={clsx(
        "group relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900",
        className,
        {
          "cursor-pointer": !disabled,
          "cursor-not-allowed opacity-50": disabled,
        },
        checked ? "bg-indigo-600" : "bg-neutral-200 dark:bg-neutral-700",
      )}
    >
      <span className="sr-only">Use setting</span>
      <motion.span
        animate={{
          x: checked ? 20 : 0, // 20px = 1.25rem
        }}
        transition={spring}
        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0"
      />
    </HeadlessSwitch>
  );
};
