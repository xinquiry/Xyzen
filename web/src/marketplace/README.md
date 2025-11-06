# Marketplace Module

优雅的第三方 MCP 市场模块，采用分层架构设计。

## 📁 目录结构

```
marketplace/
├── types/                          # 类型定义层
│   └── bohrium.ts                 # Bohrium 相关类型
├── services/                       # 数据访问层
│   └── bohriumService.ts          # Bohrium API 封装
├── hooks/                          # 状态管理层
│   └── useBohriumMcp.ts           # React Hooks
├── components/                     # 展示层
│   └── McpActivationProgress.tsx  # 可复用的 UX 反馈组件
└── index.ts                        # 统一导出
```

## 🎯 设计原则

1. **分层清晰**：Types → Services → Hooks → Components
2. **职责单一**：每层只做一件事
3. **可复用性**：组件和 Hooks 可在多处使用
4. **类型安全**：完整的 TypeScript 类型定义
5. **错误处理**：完善的错误处理和用户反馈

## 📖 使用示例

### 1. 获取 Bohrium 应用列表

```typescript
import { useBohriumAppList } from "@/marketplace";

function AppListPage() {
  const { apps, loading, error, fetchApps } = useBohriumAppList();

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {apps.map(app => (
        <div key={app.id}>{app.title}</div>
      ))}
    </div>
  );
}
```

### 2. 获取应用详情

```typescript
import { useBohriumAppDetail } from "@/marketplace";

function AppDetailPage({ appKey }: { appKey: string }) {
  const { detail, loading, error } = useBohriumAppDetail(appKey);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!detail) return null;

  return (
    <div>
      <h1>{detail.title}</h1>
      <p>{detail.description}</p>
      <p>Deployment ID: {detail.latestDeploymentId}</p>
    </div>
  );
}
```

### 3. MCP 激活流程（完整示例）

```typescript
import {
  useMcpActivation,
  McpActivationProgress
} from "@/marketplace";
import { useXyzen } from "@/store";

function McpServerDetail({ appKey }: { appKey: string }) {
  const { progress, activateMcp, reset } = useMcpActivation();
  const { addMcpServer } = useXyzen();
  const [isActivating, setIsActivating] = useState(false);

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const result = await activateMcp(appKey);

      // 激活成功后，添加到 MCP 服务器列表
      await addMcpServer({
        name: result.detail.title,
        description: result.detail.description,
        url: result.endpoint.url,
        token: result.endpoint.token,
      });

      // 提示成功
      console.log("MCP 服务器已添加！");
    } catch (error) {
      console.error("激活失败:", error);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div>
      <button onClick={handleActivate}>
        激活 MCP
      </button>

      {/* 显示激活进度 */}
      {isActivating && (
        <McpActivationProgress
          progress={progress}
          onRetry={handleActivate}
          onClose={() => {
            reset();
            setIsActivating(false);
          }}
        />
      )}
    </div>
  );
}
```

### 4. 可复用的激活进度组件

```typescript
import { McpActivationProgress } from "@/marketplace";

// 在任何需要的地方使用
<McpActivationProgress
  progress={progress}
  onRetry={() => activateMcp(appKey)}
  onClose={() => reset()}
  className="max-w-md mx-auto"
/>
```

## 🔐 认证说明

Bohrium 认证信息从 `localStorage` 中的 `access_token` 读取。确保在使用前：

```typescript
// 检查认证状态
import { useBohriumAuth } from "@/marketplace";

const { isAuthenticated } = useBohriumAuth();

if (!isAuthenticated) {
  // 提示用户登录或跳转到认证页面
}
```

## 🎨 UI/UX 特性

### McpActivationProgress 组件

- ✅ 实时进度显示（0-100%）
- ✅ 状态图标动画
- ✅ 错误处理和重试
- ✅ 用户友好的提示信息
- ✅ 支持暗色模式
- ✅ 完整的 Framer Motion 动画

### 激活流程状态

1. `idle` - 空闲状态
2. `fetching_detail` - 获取应用详情
3. `activating` - 开始激活
4. `polling` - 轮询等待沙盒就绪
5. `success` - 激活成功
6. `error` - 激活失败
7. `timeout` - 超时

## 🔄 数据流

```
用户操作
    ↓
Component (调用 Hook)
    ↓
Hook (调用 Service)
    ↓
Service (调用 API)
    ↓
返回数据 (Type 安全)
    ↓
Component 更新 UI
```

## 🚀 下一步

1. 创建 McpServerDetail 页面组件
2. 集成到 Explore 页面
3. 实现"收藏"功能（Star）
4. 添加到创建助手流程

## 📝 Notes

- 所有 API 调用都有完整的错误处理
- 轮询机制默认重试 15 次，每次间隔 3 秒
- 组件支持自定义样式和回调
- 类型定义完整，IDE 有完整的代码提示
