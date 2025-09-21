import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, Optional

import jwt
import requests
from fastapi import Header, HTTPException, Query, status

from internal import configs

# 设置日志记录器
logger = logging.getLogger(__name__)


@dataclass
class UserInfo:
    """用户信息数据类"""

    id: str
    username: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    roles: Optional[list] = None
    extra: Optional[Dict[str, Any]] = None


@dataclass
class AuthResult:
    """认证结果数据类"""

    success: bool
    user_info: Optional[UserInfo] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None


class BaseAuthProvider(ABC):
    """基础认证提供商抽象类"""

    def __init__(self, config: Dict[str, Any]) -> None:
        self.config = config
        self.issuer = config.get("Issuer")
        self.jwks_uri = config.get("JwksUri")
        self.algorithm = config.get("Algorithm", "RS256")
        self.audience = config.get("Audience")

    @abstractmethod
    def get_provider_name(self) -> str:
        """获取提供商名称"""
        pass

    @abstractmethod
    def validate_token(self, access_token: str) -> AuthResult:
        """验证 access_token 并获取用户信息"""
        pass

    @abstractmethod
    def parse_user_info(self, token_payload: Dict[str, Any]) -> UserInfo:
        """从 token payload 解析用户信息"""
        pass

    def get_jwks(self) -> Optional[Dict[str, Any]]:
        """获取 JWKS 公钥信息"""
        if not self.jwks_uri:
            logger.warning("JWKS URI 未配置")
            return None

        logger.info(f"从 {self.jwks_uri} 获取 JWKS 信息...")
        try:
            response = requests.get(self.jwks_uri, timeout=10)
            response.raise_for_status()
            jwks_data = response.json()

            if isinstance(jwks_data, dict):
                logger.info(f"成功获取 JWKS，包含 {len(jwks_data.get('keys', []))} 个密钥")
                return jwks_data
            else:
                logger.error("JWKS 响应格式无效，不是字典类型")
                return None
        except Exception as e:
            logger.error(f"从 {self.jwks_uri} 获取 JWKS 失败: {e}")
            return None

    def decode_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """解码 JWT token"""
        logger.info("开始解码 JWT token")
        try:
            # 获取 JWKS
            logger.info("获取 JWKS 公钥信息...")
            jwks = self.get_jwks()
            if not jwks:
                logger.error("无法获取 JWKS 公钥信息")
                return None

            # 获取 token header 中的 kid
            logger.info("解析 token header...")
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")
            logger.info(f"Token header kid: {kid}")

            # 找到对应的公钥
            logger.info("查找匹配的公钥...")
            key = None
            for jwk in jwks.get("keys", []):
                if jwk.get("kid") == kid:
                    logger.info(f"找到匹配的公钥，kid: {kid}")
                    key = jwt.algorithms.RSAAlgorithm.from_jwk(jwk)
                    break

            if not key:
                logger.error(f"未找到匹配的公钥，token kid: {kid}")
                return None

            # 验证并解码 token
            logger.info(f"使用算法 {self.algorithm} 验证token，issuer: {self.issuer}, audience: {self.audience}")
            payload = jwt.decode(
                token,
                key,
                algorithms=[self.algorithm],
                audience=self.audience,
                issuer=self.issuer,
                options={"verify_exp": True},
            )
            logger.info(f"Token验证成功，payload sub: {payload.get('sub')}")
            return payload

        except jwt.ExpiredSignatureError:
            logger.warning("Token 已过期")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Token 无效: {e}")
            return None
        except Exception as e:
            logger.error(f"Token 解码错误: {e}")
            return None

    def is_configured(self) -> bool:
        """检查提供商是否已正确配置"""
        is_valid = bool(self.issuer and self.audience)
        logger.info(f"认证提供商配置检查: issuer={self.issuer}, audience={self.audience}, valid={is_valid}")
        return is_valid


def _get_auth_provider() -> BaseAuthProvider:
    """根据配置获取认证提供商实例，如果配置无效则抛出错误"""
    logger.info("开始初始化认证提供商...")
    auth_config = configs.Auth
    provider_name = auth_config.Provider.lower()
    logger.info(f"配置的认证提供商: {provider_name}")

    # 首先检查认证提供商类型是否支持
    match provider_name:
        case "casdoor":
            from .casdoor import CasdoorAuthProvider

            logger.info("初始化 Casdoor 认证提供商")
            provider_config = auth_config.Casdoor.model_dump()
            logger.info(f"Casdoor 配置: {provider_config}")
            provider: BaseAuthProvider = CasdoorAuthProvider(provider_config)
        case "bohrium":
            from .bohrium import BohriumAuthProvider

            logger.info("初始化 Bohrium 认证提供商")
            provider_config = auth_config.Bohrium.model_dump()
            logger.info(f"Bohrium 配置: {provider_config}")
            provider = BohriumAuthProvider(provider_config)
        case _:
            error_msg = f"不支持的认证提供商类型: {provider_name}"
            logger.error(error_msg)
            raise ValueError(error_msg)

    # 检查认证提供商配置是否有效
    if not provider.is_configured():
        error_msg = f"认证提供商 {provider_name} 配置无效"
        logger.error(error_msg)
        raise ValueError(error_msg)

    logger.info(f"认证提供商 {provider_name} 初始化并配置检查成功")
    return provider


# 全局认证提供商实例
try:
    AuthProvider = _get_auth_provider()
except ValueError as e:
    logger.error(f"认证提供商初始化失败: {e}")
    raise RuntimeError(f"认证提供商初始化失败: {e}") from e  # 抛出异常，防止继续使用未初始化的 AuthProvider


# === 统一认证依赖函数 ===


async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """从 Authorization header 中获取当前用户ID (用于 HTTP API)"""

    # 检查 Authorization header
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")

    # 解析 Bearer token
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header format")

    access_token = authorization[7:]  # Remove "Bearer " prefix

    # 验证 token
    auth_result = AuthProvider.validate_token(access_token)
    if not auth_result.success or not auth_result.user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=auth_result.error_message or "Token validation failed",
        )

    return auth_result.user_info.id


async def get_current_user_websocket(token: Optional[str] = Query(None, alias="token")) -> str:
    """从查询参数中的token获取当前用户ID (用于 WebSocket)"""

    # 检查 token
    if not token:
        raise Exception("Missing authentication token")

    # 验证 token
    auth_result = AuthProvider.validate_token(token)
    if not auth_result.success or not auth_result.user_info:
        raise Exception(auth_result.error_message or "Token validation failed")

    return auth_result.user_info.id


def is_auth_configured() -> bool:
    """检查是否已配置身份认证服务"""
    return AuthProvider is not None
