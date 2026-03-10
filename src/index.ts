#!/usr/bin/env node

/**
 * Strider Labs Grubhub MCP Server
 *
 * MCP server that gives AI agents the ability to search restaurants,
 * browse menus, add items to cart, place orders, and track deliveries on Grubhub.
 * https://striderlabs.ai
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  checkAuth,
  login,
  setAddress,
  searchRestaurants,
  getRestaurant,
  addToCart,
  viewCart,
  clearCart,
  checkout,
  trackOrder,
  getOrders,
  cleanup,
} from "./browser.js";
import { hasStoredCookies, clearCookies, getCookiesPath } from "./auth.js";

const server = new Server(
  { name: "strider-grubhub", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "grubhub_status",
        description:
          "Check if the user is logged in to Grubhub. Returns auth status and instructions if not authenticated. Call this before any other Grubhub operations.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "grubhub_login",
        description:
          "Log in to Grubhub with email and password via browser automation. Session is saved for future use.",
        inputSchema: {
          type: "object",
          properties: {
            email: { type: "string", description: "Grubhub account email address" },
            password: { type: "string", description: "Grubhub account password" },
          },
          required: ["email", "password"],
        },
      },
      {
        name: "grubhub_logout",
        description: "Clear the stored Grubhub session. The user will need to log in again.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "grubhub_set_address",
        description:
          "Set the delivery address for Grubhub orders. Must be set before searching for restaurants.",
        inputSchema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "Full delivery address (e.g., '123 Main St, New York, NY 10001')",
            },
          },
          required: ["address"],
        },
      },
      {
        name: "grubhub_search_restaurants",
        description:
          "Search for restaurants on Grubhub by name, food type, or cuisine. Returns a list of restaurants with ratings, delivery times, and fees.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query — restaurant name, food type, or keyword",
            },
            cuisine: {
              type: "string",
              description: "Filter by cuisine type (e.g., 'pizza', 'chinese', 'mexican')",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "grubhub_get_restaurant",
        description:
          "Get full details for a restaurant: menu categories, items with prices, hours, and address.",
        inputSchema: {
          type: "object",
          properties: {
            restaurantId: {
              type: "string",
              description: "The restaurant ID or URL slug (from search results)",
            },
          },
          required: ["restaurantId"],
        },
      },
      {
        name: "grubhub_add_to_cart",
        description: "Add a menu item to the cart.",
        inputSchema: {
          type: "object",
          properties: {
            restaurantId: {
              type: "string",
              description: "The restaurant ID (from search results)",
            },
            itemName: {
              type: "string",
              description: "Name of the menu item to add",
            },
            quantity: {
              type: "number",
              description: "Quantity to add (default: 1)",
            },
            specialInstructions: {
              type: "string",
              description: "Special preparation instructions (optional)",
            },
          },
          required: ["restaurantId", "itemName"],
        },
      },
      {
        name: "grubhub_view_cart",
        description: "View current cart contents, including items, quantities, and totals.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "grubhub_clear_cart",
        description: "Remove all items from the current cart.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "grubhub_checkout",
        description:
          "Proceed to checkout. Set confirm=false to preview order details before placing; set confirm=true to actually place the order.",
        inputSchema: {
          type: "object",
          properties: {
            confirm: {
              type: "boolean",
              description: "Set to true to place the order, false to preview",
            },
          },
          required: ["confirm"],
        },
      },
      {
        name: "grubhub_track_order",
        description:
          "Track the status of an active Grubhub order — delivery progress, estimated time, and driver info.",
        inputSchema: {
          type: "object",
          properties: {
            orderId: {
              type: "string",
              description: "Order ID to track (optional — defaults to most recent active order)",
            },
          },
        },
      },
      {
        name: "grubhub_get_orders",
        description: "Get Grubhub order history — past and active orders.",
        inputSchema: { type: "object", properties: {} },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "grubhub_status": {
        const hasCookies = hasStoredCookies();

        if (!hasCookies) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: true,
                isLoggedIn: false,
                message: "Not logged in to Grubhub. Use grubhub_login to authenticate.",
                cookiesPath: getCookiesPath(),
              }),
            }],
          };
        }

        const authState = await checkAuth();

        if (!authState.isLoggedIn) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: true,
                isLoggedIn: false,
                message: "Session expired. Use grubhub_login to authenticate again.",
              }),
            }],
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              isLoggedIn: true,
              message: "Logged in to Grubhub.",
              email: authState.email,
            }),
          }],
        };
      }

      case "grubhub_login": {
        const { email, password } = args as { email: string; password: string };
        const result = await login(email, password);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          isError: !result.success,
        };
      }

      case "grubhub_logout": {
        clearCookies();
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "Grubhub session cleared. You will need to log in again.",
            }),
          }],
        };
      }

      case "grubhub_set_address": {
        const { address } = args as { address: string };
        const result = await setAddress(address);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          isError: !result.success,
        };
      }

      case "grubhub_search_restaurants": {
        const { query, cuisine } = args as { query: string; cuisine?: string };
        const result = await searchRestaurants(query, { cuisine });
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          isError: !result.success,
        };
      }

      case "grubhub_get_restaurant": {
        const { restaurantId } = args as { restaurantId: string };
        const result = await getRestaurant(restaurantId);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          isError: !result.success,
        };
      }

      case "grubhub_add_to_cart": {
        const { restaurantId, itemName, quantity, specialInstructions } = args as {
          restaurantId: string;
          itemName: string;
          quantity?: number;
          specialInstructions?: string;
        };
        const result = await addToCart(restaurantId, itemName, quantity, specialInstructions);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          isError: !result.success,
        };
      }

      case "grubhub_view_cart": {
        const result = await viewCart();
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          isError: !result.success,
        };
      }

      case "grubhub_clear_cart": {
        const result = await clearCart();
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          isError: !result.success,
        };
      }

      case "grubhub_checkout": {
        const { confirm } = args as { confirm: boolean };
        const result = await checkout(confirm);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          isError: !result.success,
        };
      }

      case "grubhub_track_order": {
        const { orderId } = args as { orderId?: string };
        const result = await trackOrder(orderId);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          isError: !result.success,
        };
      }

      case "grubhub_get_orders": {
        const result = await getOrders();
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          isError: !result.success,
        };
      }

      default:
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }),
          }],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ success: false, error: errorMessage }),
      }],
      isError: true,
    };
  }
});

process.on("SIGINT", async () => {
  await cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await cleanup();
  process.exit(0);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Strider Grubhub MCP server running");
}

main().catch(console.error);
