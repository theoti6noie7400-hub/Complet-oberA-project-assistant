// The shared SAV option is opt-in; the server session always remains authoritative.
export const RECIPE_API_ENABLED = import.meta.env.VITE_INTERNAL_API === "1" ||
  (import.meta.env.VITE_SAV_RECIPE_API === "1" && typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname));
