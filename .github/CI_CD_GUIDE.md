# CI/CD 流水线说明

本项目使用 GitHub Actions 实现持续集成，确保代码质量和项目的稳定性。

## 🚀 触发条件

CI/CD 流水线在以下情况下自动触发：

- **Pull Request 到 main 分支**：当向 main 分支提交 PR 时
- **文件变更范围**：
  - `service/` 目录下的任何文件
  - `.pre-commit-config.yaml` 配置文件
  - `.github/workflows/` 工作流文件

## 🔄 检查流程

### 1. Pre-commit Hooks 检查

使用 `pre-commit` 工具运行与本地开发环境相同的钩子：

- **trailing-whitespace**：检查行尾空白字符
- **end-of-file-fixer**：确保文件以换行符结尾
- **check-yaml**：验证 YAML 文件语法
- **check-added-large-files**：检查大文件

#### Python 特定检查：

- **Black**：代码格式化检查（行长度 119）
- **isort**：导入语句排序检查
- **flake8**：代码风格和语法检查
- **mypy**：静态类型检查

### 2. Python 代码质量检查

独立运行每个工具，提供详细的错误信息：

```bash
# 格式化检查
black --check --line-length=119 .

# 导入排序检查
isort --check-only --profile black --line-length=119 .

# 代码规范检查
flake8 --max-line-length=119 --extend-ignore=F401,W503,F541,F841,E226 .

# 类型检查
mypy .
```

### 3. 依赖安全检查

- 使用 `safety` 工具扫描已知的安全漏洞
- 检查 `uv.lock` 中的所有依赖项
- 生成安全报告

### 4. 构建验证

- 验证项目可以正确安装
- 测试核心依赖项的导入
- 检查项目结构完整性

## 📋 本地开发建议

### 安装 pre-commit

```bash
# 安装 pre-commit
pip install pre-commit

# 在项目根目录安装钩子
pre-commit install

# 手动运行所有检查
pre-commit run --all-files
```

### 代码提交前检查

在提交代码前，建议运行以下命令：

```bash
# 进入 service 目录
cd service

# 格式化代码
uv run black --line-length=119 .

# 排序导入
uv run isort --profile black --line-length=119 .

# 检查代码规范
uv run flake8 --max-line-length=119 --extend-ignore=F401,W503,F541,F841,E226 .

# 类型检查
uv run mypy .
```

## ❌ 常见问题解决

### 1. Black 格式化失败

```bash
# 自动修复格式化问题
cd service
uv run black --line-length=119 .
```

### 2. isort 导入排序失败

```bash
# 自动修复导入排序
cd service
uv run isort --profile black --line-length=119 .
```

### 3. flake8 代码规范问题

查看错误信息，手动修复或在必要时添加 `# noqa` 注释。

### 4. mypy 类型检查失败

- 添加必要的类型注解
- 使用 `# type: ignore` 忽略特定问题（谨慎使用）
- 在 `pyproject.toml` 中配置 mypy 忽略规则

### 5. 安全漏洞检查失败

- 更新有漏洞的依赖包到安全版本
- 评估漏洞影响，如果不影响项目可临时忽略

## 🔧 配置文件

### Pre-commit 配置

- **文件**：`.pre-commit-config.yaml`
- **用途**：定义本地和 CI 中运行的代码检查钩子

### Python 项目配置

- **文件**：`service/pyproject.toml`
- **用途**：Python 项目依赖、工具配置

### VS Code 配置

- **文件**：`.vscode/settings.json`
- **用途**：编辑器设置，确保本地开发环境与 CI 一致

### GitHub Actions 工作流

- **文件**：`.github/workflows/pr-checks.yml`
- **用途**：定义 CI/CD 流水线的具体步骤

## 📊 检查结果

CI 检查完成后，您可以在 PR 页面看到：

- ✅ **绿色勾号**：所有检查通过
- ❌ **红色叉号**：检查失败，需要修复
- 🟡 **黄色圆圈**：检查正在运行

点击检查结果可以查看详细的错误信息和日志。

## 🎯 最佳实践

1. **提交前本地检查**：始终在本地运行 `pre-commit run --all-files`
2. **小步提交**：避免在单个 PR 中进行大量不相关的更改
3. **描述性提交信息**：使用清晰的提交信息说明变更内容
4. **及时修复 CI 失败**：不要让 CI 检查长时间处于失败状态
5. **保持依赖更新**：定期更新项目依赖以避免安全问题
