/**
 * Grubhub Browser Automation
 *
 * Playwright-based automation for Grubhub operations.
 */
import { chromium } from "playwright";
import { saveCookies, loadCookies, getAuthState } from "./auth.js";
const GRUBHUB_BASE_URL = "https://www.grubhub.com";
const DEFAULT_TIMEOUT = 30000;
let browser = null;
let context = null;
let page = null;
async function initBrowser() {
    if (browser)
        return;
    browser = await chromium.launch({
        headless: true,
        args: [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-setuid-sandbox",
        ],
    });
    context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 800 },
        locale: "en-US",
    });
    await loadCookies(context);
    page = await context.newPage();
    // Block images/fonts for speed
    await page.route("**/*.{png,jpg,jpeg,gif,svg,woff,woff2}", (route) => route.abort());
}
async function getPage() {
    await initBrowser();
    if (!page)
        throw new Error("Page not initialized");
    return page;
}
async function getContext() {
    await initBrowser();
    if (!context)
        throw new Error("Context not initialized");
    return context;
}
/**
 * Check if user is logged in
 */
export async function checkAuth() {
    const ctx = await getContext();
    const p = await getPage();
    await p.goto(GRUBHUB_BASE_URL, { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT });
    await p.waitForTimeout(2000);
    const authState = await getAuthState(ctx);
    await saveCookies(ctx);
    return authState;
}
/**
 * Log in with email/password via browser automation
 */
export async function login(email, password) {
    const p = await getPage();
    const ctx = await getContext();
    try {
        await p.goto(`${GRUBHUB_BASE_URL}/login`, {
            waitUntil: "domcontentloaded",
            timeout: DEFAULT_TIMEOUT,
        });
        await p.waitForTimeout(2000);
        // Fill email
        const emailInput = p.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
        await emailInput.waitFor({ timeout: 10000 });
        await emailInput.fill(email);
        // Fill password
        const passwordInput = p.locator('input[type="password"], input[name="password"]').first();
        await passwordInput.waitFor({ timeout: 5000 });
        await passwordInput.fill(password);
        // Submit
        const submitButton = p.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")').first();
        await submitButton.waitFor({ timeout: 5000 });
        await submitButton.click();
        // Wait for navigation/redirect after login
        await p.waitForTimeout(4000);
        const authState = await getAuthState(ctx);
        if (!authState.isLoggedIn) {
            // Check for error message on page
            const errorMsg = await p.locator('[class*="error"], [data-testid*="error"], .error-message').first().textContent().catch(() => "");
            return {
                success: false,
                error: errorMsg?.trim() || "Login failed. Please check your credentials.",
            };
        }
        await saveCookies(ctx);
        return { success: true, email };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Login failed",
        };
    }
}
/**
 * Set delivery address
 */
export async function setAddress(address) {
    const p = await getPage();
    const ctx = await getContext();
    try {
        await p.goto(GRUBHUB_BASE_URL, { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT });
        await p.waitForTimeout(2000);
        // Try clicking the address entry area
        const addressTrigger = p.locator('[data-testid="delivery-address-input"], [class*="deliveryAddress"], input[placeholder*="address" i], input[placeholder*="Enter" i]').first();
        if (await addressTrigger.isVisible({ timeout: 5000 })) {
            await addressTrigger.click();
            await p.waitForTimeout(500);
        }
        // Fill address
        const addressInput = p.locator('input[placeholder*="address" i], input[placeholder*="Enter" i], [data-testid="delivery-address-input"]').first();
        await addressInput.waitFor({ timeout: 8000 });
        await addressInput.fill(address);
        await p.waitForTimeout(1500);
        // Select first autocomplete suggestion
        const suggestion = p.locator('[class*="autocomplete"] li, [class*="suggestion"], [role="option"], [class*="AddressSuggestion"]').first();
        if (await suggestion.isVisible({ timeout: 4000 })) {
            await suggestion.click();
            await p.waitForTimeout(1000);
        }
        else {
            // Press Enter if no dropdown
            await addressInput.press("Enter");
            await p.waitForTimeout(1000);
        }
        // Hit any confirm/save button
        const confirmBtn = p.locator('button:has-text("Search"), button:has-text("Done"), button:has-text("Confirm"), button:has-text("Find Food")').first();
        if (await confirmBtn.isVisible({ timeout: 2000 })) {
            await confirmBtn.click();
            await p.waitForTimeout(2000);
        }
        await saveCookies(ctx);
        return { success: true, formattedAddress: address };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to set address",
        };
    }
}
/**
 * Search restaurants
 */
export async function searchRestaurants(query, options) {
    const p = await getPage();
    const ctx = await getContext();
    try {
        let searchUrl;
        if (options?.cuisine) {
            searchUrl = `${GRUBHUB_BASE_URL}/delivery/${encodeURIComponent(options.cuisine.toLowerCase().replace(/\s+/g, "-"))}_food/`;
        }
        else {
            searchUrl = `${GRUBHUB_BASE_URL}/search?queryText=${encodeURIComponent(query)}`;
        }
        await p.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT });
        await p.waitForTimeout(3000);
        // Wait for restaurant cards
        const cards = p.locator('[class*="restaurantCard"], [class*="restaurant-card"], [data-testid*="restaurant"], li[class*="restaurant"]');
        await cards.first().waitFor({ timeout: 10000 }).catch(() => { });
        const restaurants = [];
        const cardCount = await cards.count();
        for (let i = 0; i < Math.min(cardCount, 20); i++) {
            const card = cards.nth(i);
            try {
                const name = await card.locator('h6, h3, h2, [class*="restaurantName"], [class*="name"]').first().textContent() || "";
                const cuisineText = await card.locator('[class*="cuisine"], [class*="category"]').first().textContent().catch(() => "") || "";
                const ratingText = await card.locator('[class*="rating"], [aria-label*="stars"]').first().textContent().catch(() => "0") || "0";
                const deliveryTimeText = await card.locator('[class*="deliveryTime"], [class*="delivery-time"], span:has-text("min")').first().textContent().catch(() => "") || "";
                const feeText = await card.locator('[class*="deliveryFee"], [class*="delivery-fee"]').first().textContent().catch(() => "Free") || "Free";
                // Extract restaurant ID from link href
                const link = await card.locator('a[href*="/restaurant/"]').first().getAttribute("href").catch(() => "");
                const idMatch = link?.match(/\/restaurant\/([^/]+)/);
                if (name.trim()) {
                    restaurants.push({
                        id: idMatch?.[1] || String(i),
                        name: name.trim(),
                        cuisine: cuisineText.split(/[,•]/).map((c) => c.trim()).filter(Boolean),
                        rating: parseFloat(ratingText.replace(/[^0-9.]/g, "")) || 0,
                        deliveryTime: deliveryTimeText.trim(),
                        deliveryFee: feeText.trim(),
                    });
                }
            }
            catch {
                // Skip problematic cards
            }
        }
        await saveCookies(ctx);
        return { success: true, restaurants };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to search restaurants",
        };
    }
}
/**
 * Get restaurant details and menu
 */
export async function getRestaurant(restaurantId) {
    const p = await getPage();
    const ctx = await getContext();
    try {
        const url = restaurantId.startsWith("http")
            ? restaurantId
            : `${GRUBHUB_BASE_URL}/restaurant/${restaurantId}`;
        await p.goto(url, { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT });
        await p.waitForTimeout(3000);
        const name = await p.locator('h1, [class*="restaurantName"]').first().textContent() || "Unknown Restaurant";
        const address = await p.locator('[class*="address"], [data-testid*="address"]').first().textContent().catch(() => "") || "";
        const hours = await p.locator('[class*="hours"], [data-testid*="hours"]').first().textContent().catch(() => "") || "";
        const ratingText = await p.locator('[class*="rating"]').first().textContent().catch(() => "0") || "0";
        // Wait for menu items
        await p.locator('[class*="menuItem"], [data-testid*="menu-item"]').first().waitFor({ timeout: 10000 }).catch(() => { });
        const categories = [];
        // Get menu sections
        const sections = p.locator('[class*="menuSection"], [class*="menu-section"], section:has([class*="menuItem"])');
        const sectionCount = await sections.count();
        for (let s = 0; s < sectionCount; s++) {
            const section = sections.nth(s);
            const categoryName = await section.locator('h3, h2, [class*="sectionTitle"], [class*="section-title"]').first().textContent().catch(() => "") || "Menu";
            const items = [];
            const menuItems = section.locator('[class*="menuItem"], [data-testid*="menu-item"]');
            const itemCount = await menuItems.count();
            for (let i = 0; i < Math.min(itemCount, 30); i++) {
                const item = menuItems.nth(i);
                try {
                    const itemName = await item.locator('h6, h4, h3, [class*="itemName"], [class*="item-name"]').first().textContent() || "";
                    const description = await item.locator('p, [class*="description"]').first().textContent().catch(() => "") || "";
                    const priceText = await item.locator('[class*="price"], span:has-text("$")').first().textContent().catch(() => "$0") || "$0";
                    const popular = await item.locator('[class*="popular"], [class*="badge"]').isVisible().catch(() => false);
                    const itemId = await item.getAttribute("data-item-id").catch(() => "") || `item-${s}-${i}`;
                    if (itemName.trim()) {
                        items.push({
                            id: itemId,
                            name: itemName.trim(),
                            description: description.trim(),
                            price: parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0,
                            popular,
                        });
                    }
                }
                catch {
                    // Skip problematic items
                }
            }
            if (items.length > 0) {
                categories.push({ name: categoryName.trim(), items });
            }
        }
        await saveCookies(ctx);
        return {
            success: true,
            name: name.trim(),
            address: address.trim(),
            hours: hours.trim(),
            rating: parseFloat(ratingText.replace(/[^0-9.]/g, "")) || 0,
            categories,
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to get restaurant",
        };
    }
}
/**
 * Add item to cart
 */
export async function addToCart(restaurantId, itemName, quantity = 1, specialInstructions) {
    const p = await getPage();
    const ctx = await getContext();
    try {
        const currentUrl = p.url();
        if (!currentUrl.includes(restaurantId)) {
            const url = restaurantId.startsWith("http")
                ? restaurantId
                : `${GRUBHUB_BASE_URL}/restaurant/${restaurantId}`;
            await p.goto(url, { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT });
            await p.waitForTimeout(3000);
        }
        // Find and click the menu item
        const menuItem = p
            .locator(`[class*="menuItem"]:has-text("${itemName}"), [data-testid*="menu-item"]:has-text("${itemName}")`)
            .first();
        await menuItem.waitFor({ timeout: 8000 });
        await menuItem.click();
        await p.waitForTimeout(2000);
        // Adjust quantity
        if (quantity > 1) {
            for (let i = 1; i < quantity; i++) {
                const increaseBtn = p.locator('button[aria-label*="increase" i], button[aria-label*="plus" i], button:has-text("+")').first();
                if (await increaseBtn.isVisible({ timeout: 2000 })) {
                    await increaseBtn.click();
                    await p.waitForTimeout(300);
                }
            }
        }
        // Add special instructions
        if (specialInstructions) {
            const instructionsInput = p.locator('textarea[placeholder*="instruction" i], input[placeholder*="instruction" i], [class*="specialInstructions"] textarea').first();
            if (await instructionsInput.isVisible({ timeout: 2000 })) {
                await instructionsInput.fill(specialInstructions);
            }
        }
        // Click add to cart
        const addButton = p
            .locator('button:has-text("Add to order"), button:has-text("Add to cart"), button:has-text("Add item"), [data-testid*="add-to-cart"]')
            .first();
        await addButton.waitFor({ timeout: 5000 });
        await addButton.click();
        await p.waitForTimeout(2000);
        // Get cart total
        const cartTotalText = await p.locator('[class*="cartTotal"], [class*="cart-total"], [data-testid*="cart-total"]').first().textContent().catch(() => "$0") || "$0";
        await saveCookies(ctx);
        return {
            success: true,
            cartTotal: parseFloat(cartTotalText.replace(/[^0-9.]/g, "")) || 0,
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to add item to cart",
        };
    }
}
/**
 * View current cart
 */
export async function viewCart() {
    const p = await getPage();
    const ctx = await getContext();
    try {
        // Open cart panel if not visible
        const cartButton = p.locator('[data-testid*="cart"], [class*="cartIcon"], button[aria-label*="cart" i]').first();
        if (await cartButton.isVisible({ timeout: 3000 })) {
            await cartButton.click();
            await p.waitForTimeout(2000);
        }
        const restaurant = await p.locator('[class*="cartRestaurant"], [class*="restaurant-name"]').first().textContent().catch(() => "") || "";
        const items = [];
        const cartItems = p.locator('[class*="cartItem"], [data-testid*="cart-item"]');
        const itemCount = await cartItems.count();
        for (let i = 0; i < itemCount; i++) {
            const item = cartItems.nth(i);
            const name = await item.locator('[class*="name"], span').first().textContent() || "";
            const quantityText = await item.locator('[class*="quantity"]').textContent().catch(() => "1") || "1";
            const priceText = await item.locator('[class*="price"], span:has-text("$")').first().textContent().catch(() => "$0") || "$0";
            if (name.trim()) {
                items.push({
                    name: name.trim(),
                    quantity: parseInt(quantityText.replace(/[^0-9]/g, "")) || 1,
                    price: parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0,
                });
            }
        }
        const subtotalText = await p.locator('[class*="subtotal"], span:has-text("Subtotal")').last().textContent().catch(() => "") || "";
        const feesText = await p.locator('[class*="deliveryFee"], span:has-text("Delivery fee")').last().textContent().catch(() => "") || "";
        const totalText = await p.locator('[class*="total"], span:has-text("Total")').last().textContent().catch(() => "") || "";
        await saveCookies(ctx);
        return {
            success: true,
            restaurant: restaurant.trim(),
            items,
            subtotal: parseFloat(subtotalText.replace(/[^0-9.]/g, "")) || 0,
            fees: parseFloat(feesText.replace(/[^0-9.]/g, "")) || 0,
            total: parseFloat(totalText.replace(/[^0-9.]/g, "")) || 0,
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to view cart",
        };
    }
}
/**
 * Clear cart
 */
export async function clearCart() {
    const p = await getPage();
    const ctx = await getContext();
    try {
        // Open cart if needed
        const cartButton = p.locator('[data-testid*="cart"], [class*="cartIcon"], button[aria-label*="cart" i]').first();
        if (await cartButton.isVisible({ timeout: 3000 })) {
            await cartButton.click();
            await p.waitForTimeout(1500);
        }
        // Look for a clear/empty cart button
        const clearButton = p.locator('button:has-text("Clear cart"), button:has-text("Empty cart"), button:has-text("Remove all"), [data-testid*="clear-cart"]').first();
        if (await clearButton.isVisible({ timeout: 3000 })) {
            await clearButton.click();
            await p.waitForTimeout(1000);
            // Confirm if prompted
            const confirmButton = p.locator('button:has-text("Clear"), button:has-text("Yes"), button:has-text("Confirm")').first();
            if (await confirmButton.isVisible({ timeout: 2000 })) {
                await confirmButton.click();
                await p.waitForTimeout(1000);
            }
        }
        else {
            // Remove items one by one
            let removeBtn = p.locator('button[aria-label*="remove" i], button:has-text("Remove")').first();
            while (await removeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await removeBtn.click();
                await p.waitForTimeout(800);
                removeBtn = p.locator('button[aria-label*="remove" i], button:has-text("Remove")').first();
            }
        }
        await saveCookies(ctx);
        return { success: true };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to clear cart",
        };
    }
}
/**
 * Checkout / place order
 */
export async function checkout(confirm = false) {
    const p = await getPage();
    const ctx = await getContext();
    try {
        // Navigate to checkout
        const checkoutButton = p
            .locator('button:has-text("Checkout"), a:has-text("Checkout"), [data-testid*="checkout"]')
            .first();
        if (await checkoutButton.isVisible({ timeout: 5000 })) {
            await checkoutButton.click();
            await p.waitForTimeout(3000);
        }
        else {
            await p.goto(`${GRUBHUB_BASE_URL}/checkout`, { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT });
            await p.waitForTimeout(3000);
        }
        // Collect order summary
        const items = [];
        const checkoutItems = p.locator('[class*="checkoutItem"], [class*="orderItem"], [data-testid*="checkout-item"]');
        const itemCount = await checkoutItems.count();
        for (let i = 0; i < itemCount; i++) {
            const item = checkoutItems.nth(i);
            const name = await item.locator('span, [class*="name"]').first().textContent() || "";
            const quantityText = await item.locator('[class*="quantity"]').textContent().catch(() => "1") || "1";
            const priceText = await item.locator('span:has-text("$"), [class*="price"]').first().textContent().catch(() => "$0") || "$0";
            if (name.trim()) {
                items.push({
                    name: name.trim(),
                    quantity: parseInt(quantityText.replace(/[^0-9]/g, "")) || 1,
                    price: parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0,
                });
            }
        }
        const totalText = await p.locator('[class*="total"], span:has-text("Total")').last().textContent().catch(() => "") || "";
        const total = parseFloat(totalText.replace(/[^0-9.]/g, "")) || 0;
        const addressText = await p.locator('[class*="deliveryAddress"], [data-testid*="delivery-address"]').first().textContent().catch(() => "") || "";
        const deliveryTimeText = await p.locator('[class*="deliveryTime"], span:has-text("min")').first().textContent().catch(() => "") || "";
        if (!confirm) {
            return {
                success: true,
                requiresConfirmation: true,
                summary: {
                    items,
                    total,
                    deliveryAddress: addressText.trim(),
                    estimatedDelivery: deliveryTimeText.trim(),
                },
            };
        }
        // Place the order
        const placeOrderButton = p
            .locator('button:has-text("Place order"), button:has-text("Place Order"), [data-testid*="place-order"]')
            .first();
        await placeOrderButton.waitFor({ timeout: 8000 });
        await placeOrderButton.click();
        await p.waitForTimeout(6000);
        const orderIdMatch = p.url().match(/order[_-]?id=([^&]+)|\/orders?\/([^/?]+)/);
        const orderId = orderIdMatch?.[1] || orderIdMatch?.[2] || `order-${Date.now()}`;
        await saveCookies(ctx);
        return {
            success: true,
            orderId,
            summary: {
                items,
                total,
                deliveryAddress: addressText.trim(),
                estimatedDelivery: deliveryTimeText.trim(),
            },
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to checkout",
        };
    }
}
/**
 * Track an active order
 */
export async function trackOrder(orderId) {
    const p = await getPage();
    const ctx = await getContext();
    try {
        let orderUrl = `${GRUBHUB_BASE_URL}/profile/orders`;
        if (orderId) {
            orderUrl = `${GRUBHUB_BASE_URL}/orders/${orderId}`;
        }
        await p.goto(orderUrl, { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT });
        await p.waitForTimeout(3000);
        // If on orders list, click most recent active order
        if (!orderId) {
            const activeOrder = p.locator('[class*="activeOrder"], [class*="orderCard"], [data-testid*="order-card"]').first();
            if (await activeOrder.isVisible({ timeout: 3000 })) {
                await activeOrder.click();
                await p.waitForTimeout(2000);
            }
        }
        const statusText = await p.locator('[class*="orderStatus"], [data-testid*="status"], h1, h2').first().textContent() || "Unknown";
        const restaurantName = await p.locator('[class*="restaurantName"], [data-testid*="restaurant-name"]').first().textContent().catch(() => "") || "";
        const deliveryTimeText = await p.locator('[class*="estimatedTime"], span:has-text("min")').first().textContent().catch(() => "") || "";
        let driver;
        const driverName = await p.locator('[class*="driverName"], [data-testid*="driver-name"]').first().textContent().catch(() => "");
        if (driverName) {
            driver = { name: driverName.trim() };
        }
        const items = [];
        const orderItems = p.locator('[class*="orderItem"], [data-testid*="order-item"]');
        const itemCount = await orderItems.count();
        for (let i = 0; i < itemCount; i++) {
            const item = orderItems.nth(i);
            const name = await item.locator('span, [class*="name"]').first().textContent() || "";
            const quantityText = await item.locator('[class*="quantity"]').textContent().catch(() => "1") || "1";
            const priceText = await item.locator('span:has-text("$"), [class*="price"]').first().textContent().catch(() => "$0") || "$0";
            if (name.trim()) {
                items.push({
                    name: name.trim(),
                    quantity: parseInt(quantityText.replace(/[^0-9]/g, "")) || 1,
                    price: parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0,
                });
            }
        }
        const totalText = await p.locator('[class*="total"], span:has-text("Total")').last().textContent().catch(() => "") || "";
        await saveCookies(ctx);
        return {
            success: true,
            status: {
                orderId: orderId || p.url().match(/\/orders?\/([^/?]+)/)?.[1] || "unknown",
                status: statusText.trim(),
                estimatedDelivery: deliveryTimeText.trim(),
                restaurant: restaurantName.trim(),
                driver,
                items,
                total: parseFloat(totalText.replace(/[^0-9.]/g, "")) || 0,
            },
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to track order",
        };
    }
}
/**
 * Get order history
 */
export async function getOrders() {
    const p = await getPage();
    const ctx = await getContext();
    try {
        await p.goto(`${GRUBHUB_BASE_URL}/profile/orders`, {
            waitUntil: "domcontentloaded",
            timeout: DEFAULT_TIMEOUT,
        });
        await p.waitForTimeout(3000);
        const orderCards = p.locator('[class*="orderCard"], [class*="order-card"], [data-testid*="order-card"]');
        await orderCards.first().waitFor({ timeout: 8000 }).catch(() => { });
        const orders = [];
        const cardCount = await orderCards.count();
        for (let i = 0; i < Math.min(cardCount, 20); i++) {
            const card = orderCards.nth(i);
            try {
                const restaurant = await card.locator('[class*="restaurantName"], h3, h4').first().textContent().catch(() => "") || "";
                const date = await card.locator('[class*="date"], time').first().textContent().catch(() => "") || "";
                const totalText = await card.locator('[class*="total"], span:has-text("$")').first().textContent().catch(() => "$0") || "$0";
                const status = await card.locator('[class*="status"]').first().textContent().catch(() => "") || "";
                const itemsText = await card.locator('[class*="items"]').first().textContent().catch(() => "") || "";
                const itemsList = itemsText.split(",").map((s) => s.trim()).filter(Boolean);
                const link = await card.locator("a[href]").first().getAttribute("href").catch(() => "");
                const idMatch = link?.match(/\/orders?\/([^/?]+)/);
                if (restaurant.trim()) {
                    orders.push({
                        orderId: idMatch?.[1] || `order-${i}`,
                        restaurant: restaurant.trim(),
                        date: date.trim(),
                        total: parseFloat(totalText.replace(/[^0-9.]/g, "")) || 0,
                        status: status.trim(),
                        items: itemsList,
                    });
                }
            }
            catch {
                // Skip problematic cards
            }
        }
        await saveCookies(ctx);
        return { success: true, orders };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to get orders",
        };
    }
}
/**
 * Cleanup browser resources
 */
export async function cleanup() {
    if (context) {
        await saveCookies(context);
    }
    if (browser) {
        await browser.close();
        browser = null;
        context = null;
        page = null;
    }
}
