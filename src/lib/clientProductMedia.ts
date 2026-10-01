import { PRODUCTS, type ProductCatalogItem } from "./assistantData";
import { OBERA_PRODUCT_IMAGES } from "../assets/oberaProductImages";

// An exact catalog model is required; an image or diagnostic for a similar
// product (including an ATEX variant) must never be guessed.
export function clientProductForModel(model: string, products: ProductCatalogItem[] = PRODUCTS) {
  return products.find(product => product.name.toLocaleLowerCase("fr") === model.toLocaleLowerCase("fr")) ?? null;
}

export function clientProductPhoto(model: string, images: Record<string, string> = OBERA_PRODUCT_IMAGES) {
  const product = clientProductForModel(model);
  return product && images[product.id] ? images[product.id] : null;
}
