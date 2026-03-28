import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
  notes: string;
}

export const STOCK_CATEGORIES = [
  "Cider",
  "Beer",
  "Wine",
  "Spirits",
  "Soft Drinks",
  "Mixers",
  "Other",
] as const;

function rowToItem(row: any): StockItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    lowStockThreshold: row.low_stock_threshold,
    lastUpdatedAt: row.last_updated_at,
    lastUpdatedBy: row.last_updated_by,
    notes: row.notes ?? "",
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getStockItems(): Promise<StockItem[]> {
  const { data, error } = await supabase
    .from("stock_items")
    .select("*")
    .order("category")
    .order("name");
  if (error) throw new Error(error.message);
  return data.map(rowToItem);
}

export async function addStockItem(
  item: Omit<StockItem, "id" | "lastUpdatedAt">
): Promise<StockItem> {
  const id = `stock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase
    .from("stock_items")
    .insert({
      id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      low_stock_threshold: item.lowStockThreshold,
      last_updated_by: item.lastUpdatedBy,
      notes: item.notes,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToItem(data);
}

export async function updateStockItem(
  id: string,
  updates: Partial<Omit<StockItem, "id" | "lastUpdatedAt">>,
  updatedBy: string
): Promise<StockItem> {
  const payload: any = { last_updated_by: updatedBy };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.quantity !== undefined) payload.quantity = updates.quantity;
  if (updates.unit !== undefined) payload.unit = updates.unit;
  if (updates.lowStockThreshold !== undefined) payload.low_stock_threshold = updates.lowStockThreshold;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  const { data, error } = await supabase
    .from("stock_items")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToItem(data);
}

export async function deleteStockItem(id: string): Promise<void> {
  const { error } = await supabase.from("stock_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function seedDefaultStock(updatedBy: string): Promise<void> {
  const { data: existing } = await supabase.from("stock_items").select("id").limit(1);
  if (existing && existing.length > 0) return; // already seeded

  const defaultItems: Omit<StockItem, "id" | "lastUpdatedAt">[] = [
    // Cider
    { name: "Watermelon Cider", category: "Cider", quantity: 24, unit: "bottles", lowStockThreshold: 6, lastUpdatedBy: updatedBy, notes: "House favourite" },
    // Beers
    { name: "Peroni Nastro Azzurro", category: "Beer", quantity: 48, unit: "bottles", lowStockThreshold: 12, lastUpdatedBy: updatedBy, notes: "" },
    { name: "Estrella Damm", category: "Beer", quantity: 36, unit: "bottles", lowStockThreshold: 12, lastUpdatedBy: updatedBy, notes: "" },
    { name: "Corona Extra", category: "Beer", quantity: 30, unit: "bottles", lowStockThreshold: 10, lastUpdatedBy: updatedBy, notes: "" },
    { name: "Guinness Draught", category: "Beer", quantity: 20, unit: "cans", lowStockThreshold: 6, lastUpdatedBy: updatedBy, notes: "" },
    { name: "Heineken", category: "Beer", quantity: 40, unit: "bottles", lowStockThreshold: 12, lastUpdatedBy: updatedBy, notes: "" },
    // Wines
    { name: "Whispering Angel Rosé", category: "Wine", quantity: 12, unit: "bottles", lowStockThreshold: 4, lastUpdatedBy: updatedBy, notes: "" },
    { name: "Malbec Reserva", category: "Wine", quantity: 8, unit: "bottles", lowStockThreshold: 3, lastUpdatedBy: updatedBy, notes: "Red" },
    { name: "Sauvignon Blanc", category: "Wine", quantity: 10, unit: "bottles", lowStockThreshold: 3, lastUpdatedBy: updatedBy, notes: "White" },
    { name: "Prosecco DOC", category: "Wine", quantity: 15, unit: "bottles", lowStockThreshold: 4, lastUpdatedBy: updatedBy, notes: "Sparkling" },
    // Spirits
    { name: "Hendrick's Gin", category: "Spirits", quantity: 6, unit: "bottles", lowStockThreshold: 2, lastUpdatedBy: updatedBy, notes: "" },
    { name: "Tanqueray No. Ten", category: "Spirits", quantity: 5, unit: "bottles", lowStockThreshold: 2, lastUpdatedBy: updatedBy, notes: "" },
    { name: "Grey Goose Vodka", category: "Spirits", quantity: 7, unit: "bottles", lowStockThreshold: 2, lastUpdatedBy: updatedBy, notes: "" },
    { name: "Patron Silver Tequila", category: "Spirits", quantity: 4, unit: "bottles", lowStockThreshold: 2, lastUpdatedBy: updatedBy, notes: "" },
    { name: "Maker's Mark Bourbon", category: "Spirits", quantity: 5, unit: "bottles", lowStockThreshold: 2, lastUpdatedBy: updatedBy, notes: "" },
    { name: "Johnnie Walker Black", category: "Spirits", quantity: 6, unit: "bottles", lowStockThreshold: 2, lastUpdatedBy: updatedBy, notes: "" },
    { name: "Bacardi Carta Blanca", category: "Spirits", quantity: 8, unit: "bottles", lowStockThreshold: 2, lastUpdatedBy: updatedBy, notes: "" },
    { name: "Aperol", category: "Spirits", quantity: 6, unit: "bottles", lowStockThreshold: 2, lastUpdatedBy: updatedBy, notes: "" },
    // Mixers
    { name: "Fever-Tree Tonic", category: "Mixers", quantity: 48, unit: "cans", lowStockThreshold: 12, lastUpdatedBy: updatedBy, notes: "" },
    { name: "Fever-Tree Ginger Beer", category: "Mixers", quantity: 24, unit: "cans", lowStockThreshold: 8, lastUpdatedBy: updatedBy, notes: "" },
    { name: "Soda Water", category: "Mixers", quantity: 30, unit: "cans", lowStockThreshold: 10, lastUpdatedBy: updatedBy, notes: "" },
    // Soft Drinks
    { name: "Coca-Cola", category: "Soft Drinks", quantity: 48, unit: "cans", lowStockThreshold: 12, lastUpdatedBy: updatedBy, notes: "" },
    { name: "Diet Coke", category: "Soft Drinks", quantity: 30, unit: "cans", lowStockThreshold: 10, lastUpdatedBy: updatedBy, notes: "" },
    { name: "Lemonade", category: "Soft Drinks", quantity: 20, unit: "cans", lowStockThreshold: 8, lastUpdatedBy: updatedBy, notes: "" },
  ];

  for (const item of defaultItems) {
    await addStockItem(item).catch(console.warn);
  }
}
