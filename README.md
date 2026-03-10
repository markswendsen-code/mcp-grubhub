# @striderlabs/mcp-grubhub

[![npm](https://img.shields.io/npm/v/@striderlabs/mcp-grubhub)](https://www.npmjs.com/package/@striderlabs/mcp-grubhub)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

MCP server for Grubhub — let AI agents order food delivery.

Built by [Strider Labs](https://striderlabs.ai).

## Features

- 🔐 **Login** with email/password via browser automation
- 🔍 **Search restaurants** by name, cuisine, or food type
- 📜 **Browse menus** with full item details and prices
- 🛒 **Manage cart** — add items, view, and clear
- 💳 **Place orders** with a confirmation step
- 📍 **Track orders** with real-time status
- 📋 **Order history** — browse past orders
- 💾 **Persistent sessions** — stay logged in across restarts

## Installation

```bash
npm install -g @striderlabs/mcp-grubhub
```

Or run directly with npx:

```bash
npx @striderlabs/mcp-grubhub
```

## Configuration

Add to your MCP client configuration (e.g., Claude Desktop `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "grubhub": {
      "command": "npx",
      "args": ["-y", "@striderlabs/mcp-grubhub"]
    }
  }
}
```

## Authentication

On first use, call `grubhub_login` with your email and password. The server uses Playwright browser automation to log in and saves session cookies to `~/.config/striderlabs-mcp-grubhub/cookies.json` for future use.

To log out:

```
grubhub_logout
```

## Available Tools

### Authentication

| Tool | Description |
|------|-------------|
| `grubhub_status` | Check login status |
| `grubhub_login` | Log in with email and password |
| `grubhub_logout` | Clear stored session |

### Ordering

| Tool | Description |
|------|-------------|
| `grubhub_set_address` | Set delivery address |
| `grubhub_search_restaurants` | Search by query or cuisine |
| `grubhub_get_restaurant` | Get restaurant details and full menu |
| `grubhub_add_to_cart` | Add item to cart |
| `grubhub_view_cart` | View current cart |
| `grubhub_clear_cart` | Clear all cart items |
| `grubhub_checkout` | Preview or place order |

### Tracking

| Tool | Description |
|------|-------------|
| `grubhub_track_order` | Track active order status |
| `grubhub_get_orders` | Get order history |

## Example Usage

```
1. grubhub_login — log in with your credentials
2. grubhub_set_address — set your delivery address
3. grubhub_search_restaurants — find a restaurant
4. grubhub_get_restaurant — browse the menu
5. grubhub_add_to_cart — add items
6. grubhub_checkout (confirm=false) — review order
7. grubhub_checkout (confirm=true) — place order
8. grubhub_track_order — track delivery
```

## License

MIT — [Strider Labs](https://striderlabs.ai)
