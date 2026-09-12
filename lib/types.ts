export type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  gst_rate: number; // Default GST % for this product (editable at billing)
  low_stock_threshold: number;
  created_at: string;
};

export type ProductBatch = {
  id: string;
  product_id: string;
  batch_no: string | null;
  manufacturer: string | null; // Brand / supplier
  hsn_code: string | null;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  arrived_at: string;
};

export type ProductWithBatches = Product & {
  batches: ProductBatch[];
  total_stock: number;
  active_selling_price: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  created_at: string;
};

export type OrderRow = {
  id: string;
  customer_id: string;
  source: 'ONLINE' | 'OFFLINE';
  status: 'COMPLETED' | 'PENDING';
  is_gst: boolean; // true = GST invoice, false = non-GST bill
  subtotal: number;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: number;
  discount_amount: number;
  gst_percentage: number;
  gst_amount: number;
  delivery_fee: number;
  grand_total: number;
  cash_received: number;
  bill_date: string;
  created_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  batch_id: string | null;
  snapshot_name: string;
  snapshot_price: number;
  quantity: number;
};

export type OrderWithRelations = OrderRow & {
  customer_name: string;
  customer_phone: string;
  items: OrderItemRow[];
};

export type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  payment_mode: string; // CASH | UPI | CARD | BANK | OTHER
  notes: string | null;
  expense_date: string;
  created_at: string;
};

export type CartItem = {
  id: string;
  product_id: string | null;
  batch_id: string | null;
  name: string;
  desc: string;
  price: number;
  qty: number;
};
