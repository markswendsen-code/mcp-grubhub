# @striderlabs/mcp-grubhub

**Order food delivery via Grubhub using AI agents**

[![npm](https://img.shields.io/npm/v/@striderlabs/mcp-grubhub)](https://www.npmjs.com/package/@striderlabs/mcp-grubhub)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://mcpservers.org/servers/strider-labs-grubhub)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

Part of [Strider Labs](https://striderlabs.ai) — action execution for personal AI agents.

## For Agents

This connector is designed for personal AI agents to autonomously order food on behalf of their human. Agents can:

- **Understand context:** "My user usually orders from Thai places in the morning and Italian restaurants in the evening"
- **Optimize for preferences:** Search restaurants that match dietary restrictions, price range, or past favorites
- **Execute autonomously:** Place complete orders (search → menu → cart → checkout) in a single agent turn
- **Track delivery:** Monitor orders and notify the user when food is arriving

**Example agent workflow:**
> Agent: "The user said they're hungry. Search for Thai restaurants near 123 Main St, find Pad Thai, add a large order to the cart, and place it with default payment method."

The agent calls:
1. `grubhub_set_address` → "123 Main St"
2. `grubhub_search_restaurants` → { query: "Thai", cuisine: "Thai" }
3. `grubhub_get_restaurant` → Browse menus
4. `grubhub_add_to_cart` → Add Pad Thai
5. `grubhub_checkout` → { confirm: true } to place order
6. `grubhub_track_order` → Monitor delivery status

All in seconds, without human intervention.

## Features

- 🔐 **Login** with email/password via browser automation
- 🔍 **Search restaurants** by name, cuisine, or food type
- 📜 **Browse menus** with full item details and prices
- 🛒 **Manage cart** — add items, view, and clear
- 💳 **Place orders** with a confirmation step
- 📍 **Track orders** with real-time status
- 📋 **Order history** — browse past orders
- 💾 **Persistent sessions** — stay logged in across restarts

## Quick Start

### Install

```bash
npm install @striderlabs/mcp-grubhub
```

Or with npx:

```bash
npx @striderlabs/mcp-grubhub
```

### Claude Desktop Configuration

Add to your `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

### Your Agent Can Now

```
"Order Thai food from nearby restaurants with delivery in under 30 minutes"
→ Agent searches → Browses menus → Places order → Confirms delivery
```

## Metrics

- **Weekly downloads:** 112 (Apr 8-14, 2026) — Growing Strider Labs connector
- **Status:** ✅ Live in production
- **Reliability:** 85%+ task completion rate
- **Discovery:** npm, mcpservers.org, ClawHub, PulseMCP, Glama

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

## Available Elsewhere

- **npm:** [npmjs.com/@striderlabs/mcp-grubhub](https://npmjs.com/package/@striderlabs/mcp-grubhub)
- **mcpservers.org:** [Strider Labs Grubhub](https://mcpservers.org/servers/strider-labs-grubhub)
- **Full Strider Labs:** [striderlabs.ai](https://striderlabs.ai)

## License

MIT — [Strider Labs](https://striderlabs.ai)
