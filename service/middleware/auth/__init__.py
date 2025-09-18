import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, Optional

import jwt
import requests

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

    def __init__(self, config: Dict[str, Any]):
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


def get_auth_provider() -> Optional[BaseAuthProvider]:
    """根据配置获取认证提供商实例"""
    logger.info("开始初始化认证提供商...")
    auth_config = configs.Auth
    provider_name = auth_config.Provider.lower()
    logger.info(f"配置的认证提供商: {provider_name}")

    if provider_name == "casdoor":
        from .casdoor import CasdoorAuthProvider

        logger.info("初始化 Casdoor 认证提供商")
        provider_config = auth_config.Casdoor.model_dump()
        logger.info(f"Casdoor 配置: {provider_config}")
        return CasdoorAuthProvider(provider_config)
    elif provider_name == "bohrium":
        from .bohrium import BohriumAuthProvider

        logger.info("初始化 Bohrium 认证提供商")
        provider_config = auth_config.Bohrium.model_dump()
        logger.info(f"Bohrium 配置: {provider_config}")
        return BohriumAuthProvider(provider_config)
    else:
        logger.error(f"不支持的认证提供商: {provider_name}")
        return None


def is_auth_configured() -> bool:
    """检查是否已配置身份认证服务"""
    logger.info("检查身份认证服务配置...")
    provider = get_auth_provider()
    if provider is None:
        logger.warning("认证提供商初始化失败")
        return False

    is_configured = provider.is_configured()
    logger.info(f"身份认证服务配置检查结果: {is_configured}")
    return is_configured
