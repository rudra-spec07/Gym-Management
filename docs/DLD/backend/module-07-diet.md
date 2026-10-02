# Backend DLD - Module 07: Diet & Nutrition Services

This document details backend models and services for admin diet templates, meal breakdowns, and member assignment tracking.

---

## 1. Functional Requirement Traceability
- `DIET-001`: Diet Plan & Meal Template Management
- `DIET-002`: Diet Assignment & Member View

---

## 2. Prisma Model Definitions

```prisma
model DietPlan {
  id             String   @id @default(uuid())
  title          String
  description    String?
  category       String   // Weight Loss, Muscle Gain
  targetCalories Int
  proteinGrams   Int
  carbsGrams     Int
  fatsGrams      Int
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  dietItems       DietItem[]
  dietAssignments DietAssignment[]
}

model DietItem {
  id         String   @id @default(uuid())
  dietPlanId String
  dietPlan   DietPlan @relation(fields: [dietPlanId], references: [id], onDelete: Cascade)
  mealType   String   // Breakfast, Lunch, Dinner, etc.
  foodName   String
  quantity   String
  calories   Int
}

model DietAssignment {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  dietPlanId String
  dietPlan   DietPlan @relation(fields: [dietPlanId], references: [id])
  assignedAt DateTime @default(now())

  @@unique([userId])
}
```
