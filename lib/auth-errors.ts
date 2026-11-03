// Returns what to tell someone after a failed Google sign-in, or null when closing
// the popup was their own choice and there's nothing to explain (AUTH-3).
export function signInErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups for this site, then try again.";
    case "auth/unauthorized-domain":
      return "Sign-in isn't available on this address. Open the main Distance Board site and try there.";
    case "auth/network-request-failed":
      return "Sign-in couldn't reach the internet. Check your connection and try again.";
    default:
      return "Sign-in didn't finish. Please try again.";
  }
}
