# =============================================
# 构建并推送镜像到 GitHub Container Registry
# =============================================

# -------------------------------
# 全局配置
# -------------------------------
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$EnvFile = Join-Path $ProjectDir "docker\.env.dev"

# =============================================
# GitHub Container Registry 配置
# =============================================
# 修改为你的 GitHub 组织名称或用户名
$GitHubOrg = "ScienceOL"  # 修改为你的 GitHub 组织名称
$Version = if ($args.Count -gt 0) { $args[0] } else { "latest" }

# 镜像名称配置
$WebImage = "ghcr.io/$GitHubOrg/xyzen-web:$Version"
$ServiceImage = "ghcr.io/$GitHubOrg/xyzen-service:$Version"

# 颜色配置
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Cyan = "Cyan"
$Blue = "Blue"
$Magenta = "Magenta"

# =============================================
# 主执行流程
# =============================================

Write-Host "`n⚙  检查 Docker 环境..." -ForegroundColor $Magenta

# 检查 Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 错误：未检测到 Docker 安装" -ForegroundColor $Red
    exit 1
}

# 检查 buildx
try {
    docker buildx version | Out-Null
} catch {
    Write-Host "❌ 错误：Docker Buildx 不可用" -ForegroundColor $Red
    Write-Host "请更新 Docker 到最新版本" -ForegroundColor $Yellow
    exit 1
}

Write-Host "✓ Docker 已就绪" -ForegroundColor $Green

# -------------------------------
# 检查登录状态
# -------------------------------
Write-Host "`n🔐 检查 GitHub Container Registry 登录状态..." -ForegroundColor $Cyan

$LoginCheck = docker info 2>&1 | Select-String "ghcr.io"
if (-not $LoginCheck) {
    Write-Host "⚠️  未检测到登录状态" -ForegroundColor $Yellow
    Write-Host "请使用以下命令登录：" -ForegroundColor $Yellow
    Write-Host 'echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin' -ForegroundColor $Blue

    $Response = Read-Host "是否已经登录？(y/n)"
    if ($Response -notmatch "^[Yy]$") {
        exit 1
    }
}

# =============================================
# 构建并推送 Web 镜像
# =============================================
Write-Host "`n🚀 构建 Web 前端镜像..." -ForegroundColor $Blue
Write-Host "镜像名称: $WebImage" -ForegroundColor $Cyan
Write-Host "平台: linux/amd64, linux/arm64" -ForegroundColor $Cyan

$WebDockerfile = Join-Path $ProjectDir "web\Dockerfile"
$WebContext = Join-Path $ProjectDir "web"

$BackendUrl = if ($env:VITE_XYZEN_BACKEND_URL) { $env:VITE_XYZEN_BACKEND_URL } else { "http://localhost:48196" }

docker buildx build `
    --platform linux/amd64,linux/arm64 `
    -t $WebImage `
    --push `
    --cache-from type=registry,ref=$WebImage `
    --cache-to type=inline `
    --build-arg VITE_XYZEN_BACKEND_URL=$BackendUrl `
    -f $WebDockerfile `
    $WebContext

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Web 镜像构建失败" -ForegroundColor $Red
    exit 1
}

Write-Host "✅ Web 镜像构建并推送成功！" -ForegroundColor $Green

# =============================================
# 构建并推送 Service 镜像
# =============================================
Write-Host "`n🚀 构建 Service 后端镜像..." -ForegroundColor $Blue
Write-Host "镜像名称: $ServiceImage" -ForegroundColor $Cyan
Write-Host "平台: linux/amd64, linux/arm64" -ForegroundColor $Cyan

$ServiceDockerfile = Join-Path $ProjectDir "service\Dockerfile"
$ServiceContext = Join-Path $ProjectDir "service"

docker buildx build `
    --platform linux/amd64,linux/arm64 `
    -t $ServiceImage `
    --push `
    --cache-from type=registry,ref=$ServiceImage `
    --cache-to type=inline `
    -f $ServiceDockerfile `
    $ServiceContext

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Service 镜像构建失败" -ForegroundColor $Red
    exit 1
}

Write-Host "✅ Service 镜像构建并推送成功！" -ForegroundColor $Green

# =============================================
# 验证多平台构建
# =============================================
Write-Host "`n🔍 验证多平台构建..." -ForegroundColor $Cyan

function Verify-MultiPlatform {
    param (
        [string]$Image,
        [string]$Name
    )

    Write-Host "检查 $Name 镜像..." -ForegroundColor $Yellow

    try {
        $ManifestOutput = docker manifest inspect $Image 2>&1 | ConvertFrom-Json
        $Platforms = $ManifestOutput.manifests | ForEach-Object { "$($_.platform.os)/$($_.platform.architecture)" }

        if (($Platforms -contains "linux/amd64") -and ($Platforms -contains "linux/arm64")) {
            Write-Host "✅ $Name 多平台构建验证通过" -ForegroundColor $Green
            Write-Host "支持的平台：" -ForegroundColor $Yellow
            $Platforms | Sort-Object -Unique | ForEach-Object { Write-Host "  • $_" }
            return $true
        } else {
            Write-Host "❌ $Name 多平台构建验证失败" -ForegroundColor $Red
            return $false
        }
    } catch {
        Write-Host "❌ 无法获取 $Name 镜像 manifest" -ForegroundColor $Red
        return $false
    }
}

Verify-MultiPlatform -Image $WebImage -Name "Web"
Verify-MultiPlatform -Image $ServiceImage -Name "Service"

# =============================================
# 完成
# =============================================
Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor $Green
Write-Host "║  ✅ 所有镜像已成功推送到 GitHub！              ║" -ForegroundColor $Green
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor $Green

Write-Host "`n📦 镜像信息：" -ForegroundColor $Cyan
Write-Host "  Web:     $WebImage" -ForegroundColor $Blue
Write-Host "  Service: $ServiceImage" -ForegroundColor $Blue

Write-Host "`n🔗 查看镜像：" -ForegroundColor $Cyan
Write-Host "  https://github.com/orgs/$GitHubOrg/packages" -ForegroundColor $Blue

Write-Host "`n📥 拉取镜像：" -ForegroundColor $Cyan
Write-Host "  docker pull $WebImage" -ForegroundColor $Yellow
Write-Host "  docker pull $ServiceImage" -ForegroundColor $Yellow
