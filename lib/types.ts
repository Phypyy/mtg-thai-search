/** Minimal Scryfall shapes used by this app. */

export type ScryfallObject =
  | "card"
  | "list"
  | "catalog"
  | "error"
  | "card_face";

export type ScryfallImageUris = {
  small?: string;
  normal?: string;
  large?: string;
  png?: string;
  art_crop?: string;
  border_crop?: string;
};

export type ScryfallCardFace = {
  object: "card_face";
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  image_uris?: ScryfallImageUris;
};

export type ScryfallCard = {
  object: "card";
  id: string;
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  keywords?: string[];
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
};

export type ScryfallList<T> = {
  object: "list";
  data: T[];
  has_more: boolean;
  next_page?: string;
};

export type ScryfallCatalog = {
  object: "catalog";
  uri: string;
  total_values: number;
  data: string[];
};

export type ScryfallError = {
  object: "error";
  code: string;
  status: number;
  details?: string;
  type?: string;
};
