# Frontend Web DLD - Module 04: Streak & Star Cards

This document details the UI widgets rendering current streaks, longest streaks, and performance star scores.

---

## 1. Functional Requirement Mapping
- Maps to Backend Module `04-streak-engine` (`STREAK-001`, `STREAK-002`).

---

## 2. Component Specifications

### 2.1 Streak Widget (`components/dashboard/StreakWidget.tsx`)
- Displays animated flame icon, `CurrentStreak` count in days, and `LongestStreak` watermark.
- Highlights Sunday protection badge *"Sundays do not break your streak!"*.

### 2.2 Performance Star Card (`components/dashboard/StarCard.tsx`)
- Renders total `StarScore` with star icons (+1 per check-in, -2 per missed day).
