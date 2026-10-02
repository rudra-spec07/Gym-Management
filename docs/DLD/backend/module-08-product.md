# Backend DLD - Module 08: Product Store & Inventory Engine

This document details the backend architectural design for supplement catalog management, inventory stock locks, and member order processing.

---

## 1. Functional Requirement Traceability
- `PRODUCT-001`: Gym Supplement & Gear Catalog Management
- `PRODUCT-002`: Member Gym Product Storefront & Ordering

---

## 2. Prisma Model Definitions

```prisma
model Product {
  id            String   @id @default(uuid())
  name          String
  description   String?
  category      String   // Protein, Creatine, Accessories
  price         Decimal  @db.Decimal(10, 2)
  stockQuantity Int      @default(0)
  imageUrl      String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  orderItems OrderItem[]
}

model Order {
  id          String      @id @default(uuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  totalAmount Decimal     @db.Decimal(10, 2)
  status      OrderStatus @default(PENDING)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  orderItems OrderItem[]
  payments   Payment[]
}

model OrderItem {
  id        String  @id @default(uuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  unitPrice Decimal @db.Decimal(10, 2)
}

enum OrderStatus {
  PENDING
  FULFILLED
  CANCELLED
}
```
