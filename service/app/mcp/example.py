from fastmcp import FastMCP

example_mcp: FastMCP = FastMCP("Test Tools 🛠️")


@example_mcp.tool
def add(a: float, b: float) -> float:
    """Adds two numbers."""
    return a + b
