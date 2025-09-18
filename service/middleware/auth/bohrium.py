from typing import Any, Dict

from . import AuthResult, BaseAuthProvider, UserInfo


class BohriumAuthProvider(BaseAuthProvider):
    """Bohrium 认证提供商"""

    def get_provider_name(self) -> str:
        return "bohrium"

    def validate_token(self, access_token: str) -> AuthResult:
        """验证 access_token 并获取用户信息"""
        if not self.is_configured():
            return AuthResult(
                success=False,
                error_code="AUTH_NOT_CONFIGURED",
                error_message="Bohrium authentication is not configured",
            )

        try:
            # 解码 JWT token
            payload = self.decode_jwt_token(access_token)
            if not payload:
                return AuthResult(success=False, error_code="INVALID_TOKEN", error_message="Invalid or expired token")

            # 解析用户信息
            user_info = self.parse_user_info(payload)
            return AuthResult(success=True, user_info=user_info)

        except Exception as e:
            return AuthResult(
                success=False, error_code="TOKEN_VALIDATION_ERROR", error_message=f"Token validation failed: {str(e)}"
            )

    def parse_user_info(self, token_payload: Dict[str, Any]) -> UserInfo:
        """从 token payload 解析用户信息"""
        # Bohrium token 结构解析
        return UserInfo(
            id=token_payload.get("sub", ""),
            username=token_payload.get("username", token_payload.get("preferred_username", "")),
            email=token_payload.get("email"),
            display_name=token_payload.get("name", token_payload.get("username", "")),
            avatar_url=token_payload.get("avatar"),
            roles=token_payload.get("roles", []),
            extra={
                "iss": token_payload.get("iss"),
                "aud": token_payload.get("aud"),
                "exp": token_payload.get("exp"),
                "iat": token_payload.get("iat"),
                "client_id": token_payload.get("client_id"),
                "scope": token_payload.get("scope", ""),
            },
        )
