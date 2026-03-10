/**
 * Grubhub Browser Automation
 *
 * Playwright-based automation for Grubhub operations.
 */
import { AuthState } from "./auth.js";
export interface Restaurant {
    id: string;
    name: string;
    cuisine: string[];
    rating: number;
    deliveryTime: string;
    deliveryFee: string;
    minOrderAmount?: string;
    distance?: string;
}
export interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    popular?: boolean;
}
export interface MenuCategory {
    name: string;
    items: MenuItem[];
}
export interface CartItem {
    name: string;
    quantity: number;
    price: number;
    customizations?: string[];
}
export interface OrderStatus {
    orderId: string;
    status: string;
    estimatedDelivery?: string;
    restaurant: string;
    driver?: {
        name: string;
    };
    items: CartItem[];
    total: number;
}
/**
 * Check if user is logged in
 */
export declare function checkAuth(): Promise<AuthState>;
/**
 * Log in with email/password via browser automation
 */
export declare function login(email: string, password: string): Promise<{
    success: boolean;
    email?: string;
    error?: string;
}>;
/**
 * Set delivery address
 */
export declare function setAddress(address: string): Promise<{
    success: boolean;
    formattedAddress?: string;
    error?: string;
}>;
/**
 * Search restaurants
 */
export declare function searchRestaurants(query: string, options?: {
    cuisine?: string;
}): Promise<{
    success: boolean;
    restaurants?: Restaurant[];
    error?: string;
}>;
/**
 * Get restaurant details and menu
 */
export declare function getRestaurant(restaurantId: string): Promise<{
    success: boolean;
    name?: string;
    address?: string;
    hours?: string;
    rating?: number;
    categories?: MenuCategory[];
    error?: string;
}>;
/**
 * Add item to cart
 */
export declare function addToCart(restaurantId: string, itemName: string, quantity?: number, specialInstructions?: string): Promise<{
    success: boolean;
    cartTotal?: number;
    error?: string;
}>;
/**
 * View current cart
 */
export declare function viewCart(): Promise<{
    success: boolean;
    restaurant?: string;
    items?: CartItem[];
    subtotal?: number;
    fees?: number;
    total?: number;
    error?: string;
}>;
/**
 * Clear cart
 */
export declare function clearCart(): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Checkout / place order
 */
export declare function checkout(confirm?: boolean): Promise<{
    success: boolean;
    orderId?: string;
    summary?: {
        items: CartItem[];
        total: number;
        deliveryAddress?: string;
        estimatedDelivery?: string;
    };
    requiresConfirmation?: boolean;
    error?: string;
}>;
/**
 * Track an active order
 */
export declare function trackOrder(orderId?: string): Promise<{
    success: boolean;
    status?: OrderStatus;
    error?: string;
}>;
/**
 * Get order history
 */
export declare function getOrders(): Promise<{
    success: boolean;
    orders?: Array<{
        orderId: string;
        restaurant: string;
        date: string;
        total: number;
        status: string;
        items: string[];
    }>;
    error?: string;
}>;
/**
 * Cleanup browser resources
 */
export declare function cleanup(): Promise<void>;
