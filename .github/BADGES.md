# GitHub Actions 状态徽章

将以下徽章添加到项目的 README.md 文件中，以显示 CI/CD 状态：

## PR 检查状态

```markdown
[![PR Checks](https://github.com/ScienceOL/Xyzen/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/ScienceOL/Xyzen/actions/workflows/pr-checks.yml)
```

## Pre-commit 检查状态

```markdown
[![Pre-commit](https://github.com/ScienceOL/Xyzen/actions/workflows/pre-commit.yml/badge.svg)](https://github.com/ScienceOL/Xyzen/actions/workflows/pre-commit.yml)
```

## 组合徽章示例

```markdown
[![PR Checks](https://github.com/ScienceOL/Xyzen/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/ScienceOL/Xyzen/actions/workflows/pr-checks.yml)
[![Pre-commit](https://github.com/ScienceOL/Xyzen/actions/workflows/pre-commit.yml/badge.svg)](https://github.com/ScienceOL/Xyzen/actions/workflows/pre-commit.yml)
[![Python 3.13](https://img.shields.io/badge/python-3.13-blue.svg)](https://www.python.org/downloads/release/python-3130/)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)
```

## 使用方法

1. 复制上述 Markdown 代码
2. 粘贴到项目的 `README.md` 文件顶部
3. 徽章会自动显示最新的构建状态

## 徽章说明

- **绿色**：检查通过
- **红色**：检查失败
- **黄色**：检查正在进行中
- **灰色**：尚未运行或跳过
