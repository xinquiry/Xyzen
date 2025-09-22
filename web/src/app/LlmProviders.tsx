import { LoadingSpinner } from "@/components/base/LoadingSpinner";
import { useXyzen } from "@/store";
import type { LlmProviderResponse } from "@/types/llmProvider";
import { Button } from "@headlessui/react";
import {
  CheckCircleIcon,
  CircleStackIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useEffect } from "react";

interface ProviderStatusIndicatorProps {
  isActive: boolean;
  isAvailable: boolean;
}

const ProviderStatusIndicator: React.FC<ProviderStatusIndicatorProps> = ({
  isActive,
  isAvailable,
}) => {
  return (
    <div className="flex items-center">
      {isActive && (
        <CheckCircleIcon
          className="h-4 w-4 text-green-500 mr-2"
          title="Active Provider"
        />
      )}
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          isAvailable ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span
        className={`ml-2 text-xs font-medium ${
          isAvailable
            ? "text-green-700 dark:text-green-300"
            : "text-red-700 dark:text-red-300"
        }`}
      >
        {isAvailable ? "Available" : "Unavailable"}
      </span>
    </div>
  );
};

interface LlmProviderCardProps {
  provider: LlmProviderResponse;
  onRemove: (id: number) => void;
  onSetActive: (id: number) => void;
}

const LlmProviderCard: React.FC<LlmProviderCardProps> = ({
  provider,
  onRemove,
  onSetActive,
}) => {
  const getProviderTypeDisplay = (type: string) => {
    switch (type) {
      case "openai":
        return "OpenAI";
      case "azure_openai":
        return "Azure OpenAI";
      case "anthropic":
        return "Anthropic";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <div
      className={`group relative flex items-center justify-between rounded-lg border p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 ${
        provider.is_active
          ? "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30"
          : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center">
          <ProviderStatusIndicator
            isActive={provider.is_active}
            isAvailable={provider.is_available}
          />
          <h3 className="ml-3 truncate text-sm font-medium text-neutral-800 dark:text-white">
            {provider.Name}
          </h3>
        </div>
        <div className="mt-1 flex items-center text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1">
            <CircleStackIcon className="h-3 w-3" />
            {getProviderTypeDisplay(provider.provider_type)}
          </span>
          <span className="mx-1.5">·</span>
          <span className="truncate">{provider.Model}</span>
        </div>
        <p className="mt-1 truncate text-xs text-neutral-400">{provider.Api}</p>
      </div>
      <div className="ml-4 flex items-center space-x-2">
        {!provider.is_active && (
          <button
            onClick={() => onSetActive(provider.id)}
            className="invisible rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-100 group-hover:visible dark:text-indigo-400 dark:hover:bg-indigo-900/50"
            title="Set as Active"
          >
            Activate
          </button>
        )}
        <button
          onClick={() => onRemove(provider.id)}
          className="invisible rounded p-1 text-neutral-400 hover:bg-red-100 hover:text-red-600 group-hover:visible dark:hover:bg-neutral-800 dark:hover:text-red-500"
          title="Remove Provider"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export function LlmProviders() {
  const {
    llmProviders,
    llmProvidersLoading,
    fetchLlmProviders,
    removeLlmProvider,
    switchActiveProvider,
    backendUrl,
    openAddLlmProviderModal,
  } = useXyzen();

  useEffect(() => {
    if (backendUrl) {
      fetchLlmProviders();
    }
  }, [backendUrl, fetchLlmProviders]);

  const handleSetActive = async (id: number) => {
    try {
      await switchActiveProvider(id);
    } catch (error) {
      console.error("Failed to set active provider:", error);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await removeLlmProvider(id);
    } catch (error) {
      console.error("Failed to remove provider:", error);
    }
  };

  return (
    <div className="p-4 dark:text-neutral-200">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">LLM Providers</h2>
        <Button
          onClick={openAddLlmProviderModal}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 py-1.5 px-3 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-indigo-500 data-[open]:bg-indigo-700 data-[focus]:outline-1 data-[focus]:outline-white dark:bg-indigo-500 dark:data-[hover]:bg-indigo-400"
        >
          <PlusIcon className="h-4 w-4" />
          Add Provider
        </Button>
      </div>

      {llmProvidersLoading ? (
        <LoadingSpinner centered />
      ) : llmProviders.length > 0 ? (
        <div className="space-y-2">
          {llmProviders.map((provider) => (
            <LlmProviderCard
              key={provider.id}
              provider={provider}
              onRemove={handleRemove}
              onSetActive={handleSetActive}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
            No LLM Providers Found
          </h3>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Get started by adding your first LLM provider to enable AI
            conversations.
          </p>
          <Button
            onClick={openAddLlmProviderModal}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-indigo-600 py-2 px-4 text-sm font-semibold text-white shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-indigo-500 data-[open]:bg-indigo-700 data-[focus]:outline-1 data-[focus]:outline-white dark:bg-indigo-500 dark:data-[hover]:bg-indigo-400"
          >
            <PlusIcon className="h-5 w-5" />
            Add Your First Provider
          </Button>
        </div>
      )}
    </div>
  );
}
