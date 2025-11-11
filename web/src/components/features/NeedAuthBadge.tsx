import { LockClosedIcon } from "@heroicons/react/24/outline";

export default function NeedAuthBadge() {
  return (
    <div className="flex-shrink-0 flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 dark:bg-amber-900/30">
      <LockClosedIcon className="h-3 w-3 text-amber-600 dark:text-amber-400" />
      <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
        Auth
      </span>
    </div>
  );
}
