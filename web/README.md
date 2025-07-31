# 如何使用 Xyzen

Xyzen 是一个现代化、轻量级且可扩展的 React 聊天组件。它提供了一个功能齐全的侧边栏，可以轻松集成到任何 React 应用中。

## 安装

使用 yarn 或 npm 安装 Xyzen：

```bash
yarn add @sciol/xyzen
```

或者

```bash
npm install @sciol/xyzen
```

## 快速上手

`Xyzen` 组件开箱即用。它通过 `zustand` store 管理自己的状态。你可以通过 `useXyzen` hook 与其进行交互。

以下是如何将其集成到你的应用中的基本示例：

1.  **在你的应用布局中添加 `Xyzen` 组件**

    在你的根布局文件（例如 `App.tsx` 或 `Layout.tsx`）中，导入并渲染 `Xyzen` 组件。

    ```tsx
    // src/App.tsx
    import { Xyzen, useXyzen } from "@sciol/xyzen";

    function App() {
      const { openXyzen } = useXyzen();

      return (
        <div>
          <header>
            <h1>我的应用</h1>
            <button onClick={openXyzen}>打开聊天</button>
          </header>
          <main>{/* 你的应用内容 */}</main>
          <Xyzen />
        </div>
      );
    }

    export default App;
    ```

2.  **控制 Xyzen 面板**

    使用 `useXyzen` hook 来控制侧边栏的可见性。

    ```tsx
    import { useXyzen } from "@sciol/xyzen";

    function MyComponent() {
      const { isXyzenOpen, toggleXyzen, openXyzen, closeXyzen } = useXyzen();

      return (
        <div>
          <p>聊天面板当前是 {isXyzenOpen ? "打开" : "关闭"} 状态。</p>
          <button onClick={toggleXyzen}>切换聊天</button>
          <button onClick={openXyzen}>打开聊天</button>
          <button onClick={closeXyzen}>关闭聊天</button>
        </div>
      );
    }
    ```

## `useXyzen` Store API

`useXyzen` hook 提供了访问 Xyzen 状态和操作的接口。

### 状态 (State)

- `isXyzenOpen: boolean`: 侧边栏是否打开。
- `panelWidth: number`: 侧边栏的当前宽度。
- `activeChatChannel: string | null`: 当前活动的聊天频道 ID。
- `user: User | null`: 当前用户信息。
- `activeTabIndex: number`: 当前活动的标签页索引。
- `theme: 'light' | 'dark' | 'system'`: 当前主题。
- `chatHistory: ChatHistoryItem[]`: 聊天历史记录列表。
- `chatHistoryLoading: boolean`: 聊天历史是否正在加载。
- `channels: Record<string, ChatChannel>`: 聊天频道的映射表。
- `assistants: Assistant[]`: 可用的助手列表。

### 操作 (Actions)

- `toggleXyzen()`: 切换侧边栏的打开/关闭状态。
- `openXyzen()`: 打开侧边栏。
- `closeXyzen()`: 关闭侧边栏。
- `setPanelWidth(width: number)`: 设置侧边栏的宽度。
- `setActiveChatChannel(channelUUID: string | null)`: 设置当前活动的聊天频道。
- `setTabIndex(index: number)`: 设置活动的标签页。
- `setTheme(theme: Theme)`: 设置主题。
- `fetchChatHistory(): Promise<void>`: 异步获取聊天历史记录。
- `togglePinChat(chatId: string)`: 切换聊天的置顶状态。
- `sendMessage(payload: { channelUUID: string; message: string })`: 发送消息到指定频道。
- `createDefaultChannel()`: 创建一个新的默认聊天频道。

## 自定义

Xyzen 设计为易于扩展。你可以利用 `useXyzen` store 中的状态和操作来构建自定义功能或与其他组件集成。

例如，你可以创建一个按钮，不仅可以打开 Xyzen，还可以切换到特定的标签页：

```tsx
import { useXyzen } from "@sciol/xyzen";

function GoToHistoryButton() {
  const { openXyzen, setTabIndex } = useXyzen();

  const handleClick = () => {
    setTabIndex(1); // 1 是历史标签页的索引
    openXyzen();
  };

  return <button onClick={handleClick}>查看聊天历史</button>;
}
```
