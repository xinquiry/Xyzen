import logging

from fastmcp import FastMCP
from fastmcp.server.dependencies import AccessToken, get_access_token

logger = logging.getLogger(__name__)

lab_mcp: FastMCP = FastMCP(name="Lab 🚀")


@lab_mcp.tool
def show_user_info() -> dict[str, str]:
    """
    Returns the user information from the access token.
    """
    access_token: AccessToken | None = get_access_token()

    assert access_token is not None, "Access token is required for this operation."

    logger.info(f"Access token: {access_token}")
    user_id = access_token.client_id
    user_scopes = access_token.scopes
    logger.info(f"User ID: {user_id}, Scopes: {user_scopes}")

    return {
        "message": f"Hello, {user_id}! Your scopes are: {', '.join(user_scopes)}",
    }


@lab_mcp.tool
async def list_laboratory_devices(lab_name: float) -> dict[str, str]:
    """
    Lists laboratory devices with given parameters.
    """
    access_token: AccessToken | None = get_access_token()

    assert access_token is not None, "Access token is required for this operation."

    logger.info(f"Access token: {access_token}")
    user_id = access_token.client_id
    user_scopes = access_token.scopes
    logger.info(f"User ID: {user_id}, Scopes: {user_scopes}")

    return {
        "message": f"Listing devices for lab '{lab_name}' owned by",
    }


@lab_mcp.tool
async def list_device_actions(device_id: str) -> dict[str, str]:
    """
    Lists actions for a specific device.
    """
    raise NotImplementedError("This function is not implemented yet.")


@lab_mcp.tool
async def perform_device_action(device_id: str, action_key: str) -> dict[str, str]:
    """
    Performs a specific action on a device.
    """
    raise NotImplementedError("This function is not implemented yet.")


@lab_mcp.tool
def get_device_status(device_id: str) -> dict[str, str]:
    """
    Gets the status of a specific device.
    """
    raise NotImplementedError("This function is not implemented yet.")
