"use server";

import { dbStore } from "@/lib/dbStore";
import { Product, ProductBatch, ProductWithBatches, ProductUnit, OrderWithRelations, CartItem, Expense, PaymentMode, Category } from "@/lib/types";

// Helper to serialize Date objects from Postgres to strings
function serialize<T>(data: T): T {
  if (data === null || data === undefined) return data;
  return JSON.parse(JSON.stringify(data));
}

export async function verifyPasscode(enteredPasscode: string): Promise<{ success: boolean; role?: 'staff' | 'admin' }> {
  const adminPasscode = process.env.ADMIN_PASSCODE || "admin123";
  const staffPasscode = process.env.STAFF_PASSCODE || process.env.NEXT_PUBLIC_STAFF_PASSCODE || "staff123";

  const normalizedEntered = enteredPasscode.replace(/\s/g, "");

  if (normalizedEntered === adminPasscode) {
    return { success: true, role: 'admin' };
  }
  if (normalizedEntered === staffPasscode) {
    return { success: true, role: 'staff' };
  }

  return { success: false };
}

// Categories
export async function fetchCategories(): Promise<Category[]> {
  return serialize(await dbStore.listCategories());
}

export async function createCategory(name: string): Promise<Category> {
  return serialize(await dbStore.addCategory(name.trim()));
}

export async function removeCategory(id: string): Promise<void> {
  return await dbStore.deleteCategory(id);
}

// Products
export async function fetchProducts(): Promise<ProductWithBatches[]> {
  return serialize(await dbStore.listProductsWithBatches());
}

export async function createProduct(data: { name: string; description: string | null; category: string; gst_rate: number; low_stock_threshold: number; tracks_serial?: boolean }): Promise<Product> {
  return serialize(await dbStore.addProduct(data));
}

export async function editProduct(id: string, data: Partial<Product>): Promise<Product | null> {
  return serialize(await dbStore.updateProduct(id, data));
}

export async function removeProduct(id: string): Promise<void> {
  return await dbStore.deleteProduct(id);
}

// Batches
export async function createBatch(
  productId: string,
  data: Omit<ProductBatch, 'id' | 'product_id' | 'arrived_at'> & { serials?: string[] },
): Promise<ProductBatch> {
  return serialize(await dbStore.addBatch({
    product_id: productId,
    ...data,
  }));
}

export async function editBatch(id: string, data: Partial<ProductBatch>): Promise<ProductBatch | null> {
  return serialize(await dbStore.updateBatch(id, data));
}

export async function removeBatch(id: string): Promise<void> {
  return await dbStore.deleteBatch(id);
}

// Product units (individual IMEI / serial rows)
export async function fetchProductUnits(productId: string): Promise<ProductUnit[]> {
  return serialize(await dbStore.listUnits(productId));
}

export async function editUnitSerial(id: string, serial: string): Promise<ProductUnit | null> {
  return serialize(await dbStore.updateUnitSerial(id, serial.trim()));
}

export async function removeUnit(id: string): Promise<{ deleted: boolean; reason?: string }> {
  return await dbStore.deleteUnit(id);
}

export async function addUnits(batchId: string, productId: string, serials: string[]): Promise<number> {
  return await dbStore.addUnitsToBatch(batchId, productId, serials);
}

// Orders
export async function fetchOrders(): Promise<OrderWithRelations[]> {
  return serialize(await dbStore.listOrdersWithRelations());
}

export async function fetchOrderById(id: string): Promise<OrderWithRelations | null> {
  return serialize(await dbStore.getOrderWithRelations(id));
}

export async function orderIdExists(id: string): Promise<boolean> {
  return await dbStore.orderIdExists(id);
}

export async function submitOrder(payload: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string | null;
  source: 'ONLINE' | 'OFFLINE';
  isGst: boolean;
  billDate: string;
  items: CartItem[];
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  discountAmount: number;
  gstPercentage: number;
  gstAmount: number;
  deliveryFee: number;
  grandTotal: number;
  cashReceived: number;
  paymentMode: PaymentMode;
}): Promise<{ orderId: string }> {
  return await dbStore.submitOrder(payload);
}

export async function removeOrder(id: string): Promise<void> {
  return await dbStore.deleteOrder(id);
}

// Expenses
export async function fetchExpenses(): Promise<Expense[]> {
  return serialize(await dbStore.listExpenses());
}

export async function createExpense(data: {
  title: string;
  category: string;
  amount: number;
  payment_mode: string;
  notes: string | null;
  expense_date: string;
}): Promise<Expense> {
  return serialize(await dbStore.addExpense(data));
}

export async function editExpense(id: string, data: Partial<Expense>): Promise<Expense | null> {
  return serialize(await dbStore.updateExpense(id, data));
}

export async function removeExpense(id: string): Promise<void> {
  return await dbStore.deleteExpense(id);
}
