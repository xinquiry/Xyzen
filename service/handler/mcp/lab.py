from fastmcp import FastMCP

lab_mcp: FastMCP = FastMCP("Lab 🚀")


@lab_mcp.tool
def multiply(a: float, b: float) -> float:
    """Multiplies two numbers."""
    return a * b
