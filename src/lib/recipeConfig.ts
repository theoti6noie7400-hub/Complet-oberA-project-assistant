// Vite includes the API option only when explicitly built or started for local recipe.
export const RECIPE_API_ENABLED = import.meta.env.VITE_SAV_RECIPE_API === "1" &&
  typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
