from fastmcp.server.auth import BearerAuthProvider

casdoor_mcp_auth = BearerAuthProvider(
    jwks_uri="http://localhost:8000/.well-known/jwks",  # Casdoor 的 JWKS 端点
    issuer="http://localhost:8000",  # Casdoor 服务地址
    algorithm="RS256",  # Casdoor 通常使用 RS256
    audience="2b717a4a24b88beadef2",  # 您在 Casdoor 中配置的应用
)
