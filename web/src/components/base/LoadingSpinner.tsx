export function LoadingSpinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-indigo-600 dark:border-neutral-700 dark:border-t-indigo-500"></div>
    </div>
  );
}
