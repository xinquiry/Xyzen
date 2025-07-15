# import logging
# from collections.abc import AsyncGenerator
# from contextlib import asynccontextmanager

# import uvicorn
# from fastapi import FastAPI
# from fastmcp.server.http import StreamableHTTPSessionManager, setup_auth_middleware_and_routes
# from mcp.server.auth.middleware.bearer_auth import RequireAuthMiddleware
# from starlette.routing import Mount
# from starlette.types import Receive, Scope, Send

# from handler.mcp import lab_mcp, other_mcp
# from handler.mcp.lab import lab_auth
# from middleware.logger import LOGGING_CONFIG
# from utils.scope import serialize_scope

# logger = logging.getLogger(__name__)


# # TODO: 自动化 MCP Server 发现并自动挂载到 FastAPI 主路由
# # 创建会话管理器
# lab_session_manager = StreamableHTTPSessionManager(
#     app=lab_mcp._mcp_server,
#     event_store=None,
#     json_response=False,
#     stateless=False,
# )

# other_session_manager = StreamableHTTPSessionManager(
#     app=other_mcp._mcp_server,
#     event_store=None,
#     json_response=False,
#     stateless=False,
# )


# # ASGI 处理器
# async def handle_lab_asgi(scope: Scope, receive: Receive, send: Send) -> None:
#     logger.info(f"Handling request for lab MCP: {scope['path']}")
#     logger.debug(f"Scope: {serialize_scope(scope)}")

#     # Get Auth header from scope if needed
#     token = next((v.decode() for k, v in scope.get("headers", []) if k == b"authorization"), None)
#     if token:
#         logger.debug(f"Authorization token: {token}")
#     # TODO: 实现根据 token 的鉴权，使用 BearerAuthProvider 或者自己实现。

#     await lab_session_manager.handle_request(scope, receive, send)


# async def handle_other_asgi(scope: Scope, receive: Receive, send: Send) -> None:
#     await other_session_manager.handle_request(scope, receive, send)


# @asynccontextmanager
# async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
#     async with lab_session_manager.run(), other_session_manager.run():
#         yield


# app = FastAPI(
#     title="Xyzen Service - Optimized",
#     description="FastAPI + MCP integrated service",
#     version="0.1.0",
#     lifespan=lifespan,
# )

# auth_middleware, auth_routes, required_scopes = setup_auth_middleware_and_routes(lab_auth)

# # 使用 Mount 但直接挂载 ASGI 处理器（最优性能）
# app.router.routes.extend(
#     [
#         Mount("/mcp/lab", RequireAuthMiddleware(handle_lab_asgi, required_scopes=required_scopes)),
#         Mount("/mcp/other", handle_other_asgi),
#     ]
# )


# if __name__ == "__main__":
#     uvicorn.run(
#         "cmd.main:app",
#         host="127.0.0.1",
#         port=48200,
#         log_config=LOGGING_CONFIG,
#         log_level="debug",
#         reload=True,
#     )
