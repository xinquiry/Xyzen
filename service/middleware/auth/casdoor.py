from fastmcp.server.auth import BearerAuthProvider

from internal import configs

casdoor_config = configs.Auth.Casdoor

casdoor_mcp_auth = BearerAuthProvider(
    jwks_uri=casdoor_config.JwksUri,  # Casdoor 的 JWKS 端点
    issuer=casdoor_config.Issuer,  # Casdoor 服务地址
    algorithm=casdoor_config.Algorithm,  # Casdoor 通常使用 RS256
    audience=casdoor_config.Audience,  # 您在 Casdoor 中配置的应用的 Client ID
)
