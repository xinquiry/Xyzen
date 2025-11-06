"use client";
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsHighlight,
  TabsHighlightItem,
  TabsList,
  TabsTrigger,
} from "@/components/animate-ui/primitives/radix/tabs";
import { useXyzen } from "@/store";
import WorkshopChat from "./WorkshopChat";

export default function Workshop() {
  const { layoutStyle } = useXyzen();

  if (layoutStyle === "fullscreen") {
    // Fullscreen: Empty workshop area (chat is handled by AppFullscreen.tsx)
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🛠️</div>
          <h3 className="text-lg font-semibold text-neutral-800 dark:text-white mb-2">
            Workshop
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Workshop area
          </p>
        </div>
      </div>
    );
  }

  // Sidebar: Workshop view with integrated chat
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="tools" className="h-full flex flex-col">
        {/* Tab Navigation */}
        <div className="border-b border-neutral-200 dark:border-neutral-800">
          <TabsHighlight className="bg-neutral-50 dark:bg-neutral-900 absolute z-0 inset-0">
            <TabsList className="h-12 inline-flex w-full px-4 bg-white dark:bg-neutral-950 relative">
              <TabsHighlightItem value="tools" className="flex-1">
                <TabsTrigger
                  value="tools"
                  className="h-full px-4 py-2 w-full text-sm font-medium text-neutral-600 data-[state=active]:text-neutral-900 dark:text-neutral-400 dark:data-[state=active]:text-white relative z-10"
                >
                  🛠️ Workshop Tools
                </TabsTrigger>
              </TabsHighlightItem>
              <TabsHighlightItem value="chat" className="flex-1">
                <TabsTrigger
                  value="chat"
                  className="h-full px-4 py-2 w-full text-sm font-medium text-neutral-600 data-[state=active]:text-neutral-900 dark:text-neutral-400 dark:data-[state=active]:text-white relative z-10"
                >
                  💬 Workshop Chat
                </TabsTrigger>
              </TabsHighlightItem>
            </TabsList>
          </TabsHighlight>
        </div>

        {/* Tab Contents */}
        <TabsContents mode="auto-height" className="flex-1 overflow-hidden">
          <TabsContent value="tools" className="h-full">
            <div className="h-full flex">
              {/* Left: Workshop Tools */}
              <div className="w-80 flex-shrink-0 border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 flex flex-col">
                <div className="border-b border-neutral-200 p-4 dark:border-neutral-800 flex-shrink-0">
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Workshop
                  </h2>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Create and design new agents
                  </p>
                </div>

                {/* Workshop Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-3">🛠️</div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Workshop tools coming soon
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Empty space for tools view */}
              <div className="flex-1 bg-white dark:bg-black flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎨</div>
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-white mb-2">
                    Agent Designer
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Design area
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="h-full">
            <div className="h-full bg-white dark:bg-black">
              <WorkshopChat />
            </div>
          </TabsContent>
        </TabsContents>
      </Tabs>
    </div>
  );
}
