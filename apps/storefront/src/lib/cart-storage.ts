/**
 * The Cart's own `id` field IS the public cart token this backend uses to
 * identify an anonymous shopper's cart — there is no session/cookie
 * mechanism for this by design (see the storefront-public.controller.ts
 * contract). We persist that bare token client-side in localStorage and
 * pass it back on every subsequent call.
 */

const CART_ID_STORAGE_KEY = "erp-storefront:cart-id";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function getStoredCartId(): string | null {
  if (!hasWindow()) {
    return null;
  }

  try {
    return window.localStorage.getItem(CART_ID_STORAGE_KEY);
  } catch {
    // Private browsing / storage disabled — behave as if there is no cart
    // yet rather than throwing and breaking the page.
    return null;
  }
}

export function setStoredCartId(cartId: string): void {
  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.setItem(CART_ID_STORAGE_KEY, cartId);
  } catch {
    // Ignore — worst case the shopper has to re-add items after a reload.
  }
}

export function clearStoredCartId(): void {
  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.removeItem(CART_ID_STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
