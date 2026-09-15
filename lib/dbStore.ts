import { sql } from './db';
import {
  Product,
  ProductBatch,
  ProductWithBatches,
  Customer,
  OrderRow,
  OrderItemRow,
  OrderWithRelations,
  CartItem,
  Expense,
  PaymentMode,
} from './types';

// Utility to generate a unique ID
const uid = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const dbStore = {
  // PRODUCTS
  async listProducts(): Promise<Product[]> {
    const rows = await sql`SELECT * FROM products ORDER BY name ASC`;
    return rows as Product[];
  },

  async getProductWithBatches(id: string): Promise<ProductWithBatches | null> {
    const products = await sql`SELECT * FROM products WHERE id = ${id}`;
    if (products.length === 0) return null;

    const batches = await sql`
      SELECT * FROM product_batches
      WHERE product_id = ${id}
      ORDER BY arrived_at ASC
    `;

    const product = products[0] as Product;
    const batchList = batches as ProductBatch[];

    let total_stock = 0;
    let active_selling_price = 0;
    let foundActiveBatch = false;

    for (const batch of batchList) {
      total_stock += batch.stock_quantity;
      if (batch.stock_quantity > 0 && !foundActiveBatch) {
        active_selling_price = Number(batch.selling_price);
        foundActiveBatch = true;
      }
    }

    return {
      ...product,
      batches: batchList,
      total_stock,
      active_selling_price,
    };
  },

  async listProductsWithBatches(): Promise<ProductWithBatches[]> {
    const products = await sql`SELECT * FROM products ORDER BY name ASC`;
    const allBatches = await sql`SELECT * FROM product_batches ORDER BY arrived_at ASC`;

    return products.map((p: any) => {
      const batches = allBatches.filter((b: any) => b.product_id === p.id) as ProductBatch[];
      let total_stock = 0;
      let active_selling_price = 0;
      let foundActiveBatch = false;

      for (const batch of batches) {
        total_stock += batch.stock_quantity;
        if (batch.stock_quantity > 0 && !foundActiveBatch) {
          active_selling_price = Number(batch.selling_price);
          foundActiveBatch = true;
        }
      }

      return {
        ...(p as Product),
        batches,
        total_stock,
        active_selling_price,
      };
    });
  },

  async addProduct(input: { name: string; description: string | null; category: string; gst_rate: number; low_stock_threshold: number }): Promise<Product> {
    const id = uid();
    const rows = await sql`
      INSERT INTO products (id, name, description, category, gst_rate, low_stock_threshold)
      VALUES (${id}, ${input.name}, ${input.description}, ${input.category}, ${input.gst_rate}, ${input.low_stock_threshold})
      RETURNING *
    `;
    return rows[0] as Product;
  },

  async updateProduct(id: string, patch: Partial<Product>): Promise<Product | null> {
    if (Object.keys(patch).length === 0) return this.getProductWithBatches(id);

    // We update fields individually since dynamic SET with Neon SQL template tag is tricky
    if (patch.name !== undefined) await sql`UPDATE products SET name = ${patch.name} WHERE id = ${id}`;
    if (patch.description !== undefined) await sql`UPDATE products SET description = ${patch.description} WHERE id = ${id}`;
    if (patch.category !== undefined) await sql`UPDATE products SET category = ${patch.category} WHERE id = ${id}`;
    if (patch.gst_rate !== undefined) await sql`UPDATE products SET gst_rate = ${patch.gst_rate} WHERE id = ${id}`;
    if (patch.low_stock_threshold !== undefined) await sql`UPDATE products SET low_stock_threshold = ${patch.low_stock_threshold} WHERE id = ${id}`;

    const rows = await sql`SELECT * FROM products WHERE id = ${id}`;
    return rows.length > 0 ? (rows[0] as Product) : null;
  },

  async deleteProduct(id: string): Promise<void> {
    await sql`DELETE FROM products WHERE id = ${id}`;
  },

  // BATCHES
  async addBatch(input: {
    product_id: string;
    batch_no: string | null;
    manufacturer: string | null;
    hsn_code: string | null;
    cost_price: number;
    selling_price: number;
    stock_quantity: number;
  }): Promise<ProductBatch> {
    const id = uid();
    const rows = await sql`
      INSERT INTO product_batches (
        id, product_id, batch_no, manufacturer, hsn_code, cost_price, selling_price, stock_quantity
      ) VALUES (
        ${id}, ${input.product_id}, ${input.batch_no}, ${input.manufacturer}, ${input.hsn_code},
        ${input.cost_price}, ${input.selling_price}, ${input.stock_quantity}
      )
      RETURNING *
    `;
    return rows[0] as ProductBatch;
  },

  async updateBatch(id: string, patch: Partial<ProductBatch>): Promise<ProductBatch | null> {
    if (Object.keys(patch).length === 0) return null;

    if (patch.batch_no !== undefined) await sql`UPDATE product_batches SET batch_no = ${patch.batch_no} WHERE id = ${id}`;
    if (patch.manufacturer !== undefined) await sql`UPDATE product_batches SET manufacturer = ${patch.manufacturer} WHERE id = ${id}`;
    if (patch.hsn_code !== undefined) await sql`UPDATE product_batches SET hsn_code = ${patch.hsn_code} WHERE id = ${id}`;
    if (patch.cost_price !== undefined) await sql`UPDATE product_batches SET cost_price = ${patch.cost_price} WHERE id = ${id}`;
    if (patch.selling_price !== undefined) await sql`UPDATE product_batches SET selling_price = ${patch.selling_price} WHERE id = ${id}`;
    if (patch.stock_quantity !== undefined) await sql`UPDATE product_batches SET stock_quantity = ${patch.stock_quantity} WHERE id = ${id}`;

    const rows = await sql`SELECT * FROM product_batches WHERE id = ${id}`;
    return rows.length > 0 ? (rows[0] as ProductBatch) : null;
  },

  async deleteBatch(id: string): Promise<void> {
    await sql`DELETE FROM product_batches WHERE id = ${id}`;
  },

  // CUSTOMERS
  async upsertCustomer(name: string, phone: string): Promise<Customer> {
    const id = uid();
    const rows = await sql`
      INSERT INTO customers (id, name, phone)
      VALUES (${id}, ${name}, ${phone})
      ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
      RETURNING *
    `;
    return rows[0] as Customer;
  },

  // ORDERS
  async orderIdExists(id: string): Promise<boolean> {
    const rows = await sql`SELECT 1 FROM orders WHERE id = ${id} LIMIT 1`;
    return rows.length > 0;
  },

  async listOrdersWithRelations(): Promise<OrderWithRelations[]> {
    const orders = await sql`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      ORDER BY o.created_at DESC
    `;

    if (orders.length === 0) return [];

    const orderIds = orders.map((o: any) => o.id);
    const items = await sql`
      SELECT * FROM order_items
      WHERE order_id = ANY(${orderIds})
    `;

    return orders.map((o: any) => ({
      ...o,
      items: items.filter((i: any) => i.order_id === o.id) as OrderItemRow[],
    })) as OrderWithRelations[];
  },

  async getOrderWithRelations(id: string): Promise<OrderWithRelations | null> {
    const orders = await sql`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ${id}
    `;
    if (orders.length === 0) return null;

    const items = await sql`SELECT * FROM order_items WHERE order_id = ${id}`;

    return {
      ...(orders[0] as any),
      items: items as OrderItemRow[],
    } as OrderWithRelations;
  },

  async deleteOrder(id: string): Promise<void> {
    await sql`DELETE FROM orders WHERE id = ${id}`;
  },

  // EXPENSES
  async listExpenses(): Promise<Expense[]> {
    const rows = await sql`
      SELECT * FROM expenses
      ORDER BY expense_date DESC, created_at DESC
    `;
    return rows as Expense[];
  },

  async addExpense(input: {
    title: string;
    category: string;
    amount: number;
    payment_mode: string;
    notes: string | null;
    expense_date: string;
  }): Promise<Expense> {
    const id = uid();
    const rows = await sql`
      INSERT INTO expenses (id, title, category, amount, payment_mode, notes, expense_date)
      VALUES (
        ${id}, ${input.title}, ${input.category}, ${input.amount},
        ${input.payment_mode}, ${input.notes}, ${input.expense_date}
      )
      RETURNING *
    `;
    return rows[0] as Expense;
  },

  async updateExpense(id: string, patch: Partial<Expense>): Promise<Expense | null> {
    if (Object.keys(patch).length === 0) {
      const rows = await sql`SELECT * FROM expenses WHERE id = ${id}`;
      return rows.length > 0 ? (rows[0] as Expense) : null;
    }

    if (patch.title !== undefined) await sql`UPDATE expenses SET title = ${patch.title} WHERE id = ${id}`;
    if (patch.category !== undefined) await sql`UPDATE expenses SET category = ${patch.category} WHERE id = ${id}`;
    if (patch.amount !== undefined) await sql`UPDATE expenses SET amount = ${patch.amount} WHERE id = ${id}`;
    if (patch.payment_mode !== undefined) await sql`UPDATE expenses SET payment_mode = ${patch.payment_mode} WHERE id = ${id}`;
    if (patch.notes !== undefined) await sql`UPDATE expenses SET notes = ${patch.notes} WHERE id = ${id}`;
    if (patch.expense_date !== undefined) await sql`UPDATE expenses SET expense_date = ${patch.expense_date} WHERE id = ${id}`;

    const rows = await sql`SELECT * FROM expenses WHERE id = ${id}`;
    return rows.length > 0 ? (rows[0] as Expense) : null;
  },

  async deleteExpense(id: string): Promise<void> {
    await sql`DELETE FROM expenses WHERE id = ${id}`;
  },

  // FIFO DEDUCTION & ORDER SUBMISSION
  async submitOrder(payload: {
    orderId: string;
    customerName: string;
    customerPhone: string;
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
    // Neon HTTP doesn't natively support full interactive transactions in the simple API,
    // but we can execute them sequentially or use multiple statements.
    // For simplicity, we'll do sequential awaits which is fine for this scale,
    // or batch them if possible. Let's do sequential for clarity.

    const productIds = Array.from(
      new Set(
        payload.items
          .filter((i) => i.product_id)
          .map((i) => i.product_id as string)
      )
    );

    // Concurrently upsert customer and fetch batches for all products in 1 roundtrip
    const [customer, allBatches] = await Promise.all([
      this.upsertCustomer(payload.customerName, payload.customerPhone),
      productIds.length > 0
        ? sql`
            SELECT * FROM product_batches
            WHERE product_id = ANY(${productIds}) AND stock_quantity > 0
            ORDER BY arrived_at ASC
          `
        : Promise.resolve([]),
    ]);

    // FIFO Stock Deduction and split items in memory
    const batchList = [...(allBatches as ProductBatch[])];
    const finalOrderItems: Omit<OrderItemRow, 'id'>[] = [];
    const batchUpdates: { id: string; deduction: number }[] = [];

    for (const item of payload.items) {
      if (!item.product_id) {
        finalOrderItems.push({
          order_id: payload.orderId,
          product_id: null,
          batch_id: null,
          snapshot_name: item.name,
          snapshot_price: item.price,
          quantity: item.qty,
        });
        continue;
      }

      let remaining = item.qty;
      const matchingBatches = batchList.filter(
        (b) => b.product_id === item.product_id && b.stock_quantity > 0
      );

      for (const batch of matchingBatches) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, batch.stock_quantity);
        batch.stock_quantity -= take;
        batchUpdates.push({ id: batch.id, deduction: take });

        finalOrderItems.push({
          order_id: payload.orderId,
          product_id: item.product_id,
          batch_id: batch.id,
          snapshot_name: item.name,
          snapshot_price: Number(batch.selling_price),
          quantity: take,
        });

        remaining -= take;
      }

      if (remaining > 0) {
        finalOrderItems.push({
          order_id: payload.orderId,
          product_id: item.product_id,
          batch_id: null,
          snapshot_name: item.name,
          snapshot_price: item.price,
          quantity: remaining,
        });
      }
    }

    // Subtotal is GST-inclusive (sum of line prices × qty).
    // grand_total = subtotal - discount + delivery  (GST is embedded in subtotal).
    const subtotalInclusive = payload.grandTotal + payload.discountAmount - payload.deliveryFee;

    // Insert order & execute all batch stock deductions concurrently
    await Promise.all([
      sql`
        INSERT INTO orders (
          id, customer_id, source, status, is_gst, subtotal, discount_type, discount_value,
          discount_amount, gst_percentage, gst_amount, delivery_fee, grand_total,
          cash_received, payment_mode, bill_date, created_at
        ) VALUES (
          ${payload.orderId}, ${customer.id}, ${payload.source}, 'COMPLETED', ${payload.isGst},
          ${subtotalInclusive},
          ${payload.discountType}, ${payload.discountValue}, ${payload.discountAmount},
          ${payload.gstPercentage}, ${payload.gstAmount}, ${payload.deliveryFee},
          ${payload.grandTotal}, ${payload.cashReceived}, ${payload.paymentMode},
          ${payload.billDate}, now()
        )
      `,
      ...batchUpdates.map((u) =>
        sql`UPDATE product_batches SET stock_quantity = stock_quantity - ${u.deduction} WHERE id = ${u.id}`
      ),
    ]);

    // Insert all order items concurrently
    if (finalOrderItems.length > 0) {
      await Promise.all(
        finalOrderItems.map((oi) =>
          sql`
            INSERT INTO order_items (
              id, order_id, product_id, batch_id, snapshot_name, snapshot_price, quantity
            ) VALUES (
              ${uid()}, ${oi.order_id}, ${oi.product_id}, ${oi.batch_id},
              ${oi.snapshot_name}, ${oi.snapshot_price}, ${oi.quantity}
            )
          `
        )
      );
    }

    return { orderId: payload.orderId };
  }
};
