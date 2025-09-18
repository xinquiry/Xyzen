from fastmcp.server.auth import BearerAuthProvider

from internal import configs

bohrium_config = configs.Auth.Bohrium

bohrium_mcp_auth = BearerAuthProvider(
    jwks_uri=bohrium_config.JwksUri,  # Bohrium 的 JWKS 端点
    issuer=bohrium_config.Issuer,  # Bohrium 服务地址
    algorithm=bohrium_config.Algorithm,  # Bohrium 通常使用 RS256
    audience=bohrium_config.Audience,  # Bohrium 中配置的应用的 Client ID
)
