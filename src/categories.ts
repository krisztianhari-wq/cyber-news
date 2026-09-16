import type { Category } from "./types";
import feeds from "../config/feeds.json";

export const CATEGORIES = feeds.categories as Category[];
export const categoryName = (id: string) => CATEGORIES.find((c) => c.id === id)?.short ?? id;
