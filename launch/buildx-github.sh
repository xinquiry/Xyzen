#!/bin/bash

# =============================================
# 构建并推送镜像到 GitHub Container Registry
# =============================================

# -------------------------------
# 全局配置
# -------------------------------
SCRIPT_DIR=$(dirname "$0")
PROJECT_DIR=$(dirname "${SCRIPT_DIR}")
ENV_FILE="${PROJECT_DIR}/docker/.env.dev"

# -------------------------------
# 颜色配置
# -------------------------------
source "${SCRIPT_DIR}/colors.sh"

# -------------------------------
# 品牌显示
# -------------------------------
print_icon() {
  source "${SCRIPT_DIR}/branch.sh" && print_icon
}

# =============================================
# GitHub Container Registry 配置
# =============================================
# 修改为你的 GitHub 组织名称或用户名
GITHUB_ORG="ScienceOL"  # 修改为你的 GitHub 组织名称
VERSION=${1:-latest}    # 版本号，默认为 latest

# 镜像名称配置
WEB_IMAGE="ghcr.io/${GITHUB_ORG}/xyzen-web:${VERSION}"
SERVICE_IMAGE="ghcr.io/${GITHUB_ORG}/xyzen-service:${VERSION}"

# =============================================
# 主执行流程
# =============================================

# 显示品牌图标
print_icon

# -------------------------------
# 环境预检
# -------------------------------
echo -e "${BRIGHT_MAGENTA}\n⚙  检查 Docker 环境...${RESET}"
if ! command -v docker &> /dev/null; then
  echo -e "${BRIGHT_RED}❌ 错误：未检测到 Docker 安装${RESET}"
  exit 1
fi

# 检查 buildx 是否可用
if ! docker buildx version &> /dev/null; then
  echo -e "${BRIGHT_RED}❌ 错误：Docker Buildx 不可用${RESET}"
  echo -e "${YELLOW}请更新 Docker 到最新版本${RESET}"
  exit 1
fi

echo -e "${BRIGHT_GREEN}✓ Docker 已就绪${RESET}"

# -------------------------------
# 检查登录状态
# -------------------------------
echo -e "${BRIGHT_CYAN}\n🔐 检查 GitHub Container Registry 登录状态...${RESET}"
if ! docker login ghcr.io --get-login &> /dev/null; then
  echo -e "${BRIGHT_YELLOW}⚠️  未检测到登录状态${RESET}"
  echo -e "${YELLOW}请使用以下命令登录：${RESET}"
  echo -e "${BRIGHT_BLUE}echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin${RESET}"
  read -p "是否已经登录？(y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# =============================================
# 构建并推送 Web 镜像
# =============================================
echo -e "${BRIGHT_BLUE}\n🚀 构建 Web 前端镜像...${RESET}"
echo -e "${BRIGHT_CYAN}镜像名称: ${WEB_IMAGE}${RESET}"
echo -e "${BRIGHT_CYAN}平台: linux/amd64, linux/arm64${RESET}"

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ${WEB_IMAGE} \
  --push \
  --cache-from type=registry,ref=${WEB_IMAGE} \
  --cache-to type=inline \
  --build-arg VITE_XYZEN_BACKEND_URL=${VITE_XYZEN_BACKEND_URL:-http://localhost:48196} \
  -f ${PROJECT_DIR}/web/Dockerfile \
  ${PROJECT_DIR}/web/

if [ $? -ne 0 ]; then
  echo -e "${BRIGHT_RED}❌ Web 镜像构建失败${RESET}"
  exit 1
fi

echo -e "${BRIGHT_GREEN}✅ Web 镜像构建并推送成功！${RESET}"

# =============================================
# 构建并推送 Service 镜像
# =============================================
echo -e "${BRIGHT_BLUE}\n🚀 构建 Service 后端镜像...${RESET}"
echo -e "${BRIGHT_CYAN}镜像名称: ${SERVICE_IMAGE}${RESET}"
echo -e "${BRIGHT_CYAN}平台: linux/amd64, linux/arm64${RESET}"

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ${SERVICE_IMAGE} \
  --push \
  --cache-from type=registry,ref=${SERVICE_IMAGE} \
  --cache-to type=inline \
  -f ${PROJECT_DIR}/service/Dockerfile \
  ${PROJECT_DIR}/service/

if [ $? -ne 0 ]; then
  echo -e "${BRIGHT_RED}❌ Service 镜像构建失败${RESET}"
  exit 1
fi

echo -e "${BRIGHT_GREEN}✅ Service 镜像构建并推送成功！${RESET}"

# =============================================
# 验证多平台构建
# =============================================
echo -e "${BRIGHT_CYAN}\n🔍 验证多平台构建...${RESET}"

verify_multiplatform() {
  local image=$1
  local name=$2

  echo -e "${BRIGHT_YELLOW}检查 ${name} 镜像...${RESET}"

  MANIFEST_OUTPUT=$(docker manifest inspect ${image} 2>&1)
  if [ $? -ne 0 ]; then
    echo -e "${BRIGHT_RED}❌ 无法获取 ${name} 镜像 manifest${RESET}"
    return 1
  fi

  PLATFORMS=$(echo "$MANIFEST_OUTPUT" | jq -r '.manifests[].platform | .os + "/" + .architecture' 2>/dev/null)

  if [[ "$PLATFORMS" =~ "linux/amd64" && "$PLATFORMS" =~ "linux/arm64" ]]; then
    echo -e "${BRIGHT_GREEN}✅ ${name} 多平台构建验证通过${RESET}"
    echo -e "${YELLOW}支持的平台：${RESET}"
    echo "$PLATFORMS" | sort | uniq | sed 's/^/  • /'
    return 0
  else
    echo -e "${BRIGHT_RED}❌ ${name} 多平台构建验证失败${RESET}"
    return 1
  fi
}

verify_multiplatform ${WEB_IMAGE} "Web"
verify_multiplatform ${SERVICE_IMAGE} "Service"

# =============================================
# 完成
# =============================================
echo -e "\n${BRIGHT_GREEN}╔════════════════════════════════════════════════╗${RESET}"
echo -e "${BRIGHT_GREEN}║  ✅ 所有镜像已成功推送到 GitHub！              ║${RESET}"
echo -e "${BRIGHT_GREEN}╚════════════════════════════════════════════════╝${RESET}"

echo -e "\n${BRIGHT_CYAN}📦 镜像信息：${RESET}"
echo -e "  ${BRIGHT_BLUE}Web:     ${WEB_IMAGE}${RESET}"
echo -e "  ${BRIGHT_BLUE}Service: ${SERVICE_IMAGE}${RESET}"

echo -e "\n${BRIGHT_CYAN}🔗 查看镜像：${RESET}"
echo -e "  ${BRIGHT_BLUE}https://github.com/orgs/${GITHUB_ORG}/packages${RESET}"

echo -e "\n${BRIGHT_CYAN}📥 拉取镜像：${RESET}"
echo -e "  ${YELLOW}docker pull ${WEB_IMAGE}${RESET}"
echo -e "  ${YELLOW}docker pull ${SERVICE_IMAGE}${RESET}"
