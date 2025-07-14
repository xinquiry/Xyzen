from fastmcp import FastMCP

other_mcp: FastMCP = FastMCP("Other Tools 🛠️")


@other_mcp.tool
def add(a: float, b: float) -> float:
    """Adds two numbers."""
    return a + b
