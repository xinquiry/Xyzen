import { motion } from "framer-motion";

interface LoadingMessageProps {
  className?: string;
}

export default function LoadingMessage({
  className = "",
}: LoadingMessageProps) {
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <motion.div
        className="flex space-x-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="h-2 w-2 rounded-full bg-neutral-500 dark:bg-neutral-400"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: 0,
          }}
        />
        <motion.div
          className="h-2 w-2 rounded-full bg-neutral-500 dark:bg-neutral-400"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: 0.3,
          }}
        />
        <motion.div
          className="h-2 w-2 rounded-full bg-neutral-500 dark:bg-neutral-400"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: 0.6,
          }}
        />
      </motion.div>
      <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">
        AI正在思考...
      </span>
    </div>
  );
}
