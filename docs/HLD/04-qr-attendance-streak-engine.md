# 04. Cryptographic QR, Attendance & Streak Engine Architecture

This document details the dynamic QR verification mechanics, single check-in transaction locking, Sunday-safe streak calculation engine, and star score algorithms.

---

## 1. Dynamic QR Code Security Engine

To prevent attendance proxy fraud (members taking photos of QR codes and sharing them remotely), the system implements a dynamic time-decaying HMAC-SHA256 token payload on the gym front-desk display.

```mermaid
sequenceDiagram
    autonumber
    participant Display as Front-Desk Display Monitor
    participant Client as Member Mobile App
    participant API as Next.js API (/api/attendance/scan)
    participant Engine as QR Verification Engine

    loop Every 30 Seconds
        Display->>Display: Generate Time Epoch (T_30) = floor(Now / 30)
        Display->>Display: Payload = GymID + T_30
        Display->>Display: Signature = HMAC_SHA256(Payload, QR_SECRET)
        Display->>Display: Render Dynamic QR Code {Payload, Signature}
    end

    Client->>Display: User Scans QR Code
    Client->>API: POST /api/attendance/scan { tokenPayload, signature }
    API->>Engine: Verify QR Signature
    Engine->>Engine: Recompute expected signature for current & previous 30s epoch
    alt Signature Valid & Timestamp within TTL (45s)
        Engine-->>API: QR Code Valid
    else Expired or Invalid Signature
        Engine-->>API: Throw HTTP 400 "Invalid or Expired QR Code"
    end
```

---

## 2. Sunday-Safe Streak Calculation Engine

### 2.1 Sunday Logic Formal Definition
The streak engine explicitly enforces `BR-SUNDAY-001`. Sunday is treated as a non-evaluating day that preserves existing streaks without incrementing or decrementing them.

```mermaid
flowchart TD
    Start[New Attendance or Batch Evaluation] --> GetDay{What Day is Today?}
    GetDay -- Sunday --> SundaySkip[Sunday Gym Holiday: No Streak Action / Retain Current Streak]
    GetDay -- Mon-Sat Eligible Day --> CheckAttendance{Did Member Attend Today?}
    
    CheckAttendance -- Yes --> IncrementStreak[CurrentStreak = CurrentStreak + 1<br>StarScore = StarScore + 1]
    CheckAttendance -- No --> MissedCheck{Was Member Absent?}
    
    MissedCheck -- Yes --> ResetStreak[CurrentStreak = 0<br>StarScore = max(0, StarScore - 2)]
    
    IncrementStreak --> UpdateLongest{CurrentStreak > LongestStreak?}
    UpdateLongest -- Yes --> SetLongest[LongestStreak = CurrentStreak]
    UpdateLongest -- No --> SaveDB[Persist User Metrics to DB]
    SetLongest --> SaveDB
    ResetStreak --> SaveDB
    SundaySkip --> End[End Engine Execution]
    SaveDB --> End
```

### 2.2 Streak Sequence Validation Examples

| Date | Day | Attendance Status | Streak Delta | Current Streak | Star Delta | Star Score | Notes |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Oct 02** | Friday | `PRESENT` | $+1$ | **1** | $+1$ | **1** | Initial attendance |
| **Oct 03** | Saturday | `PRESENT` | $+1$ | **2** | $+1$ | **2** | Consecutive weekday |
| **Oct 04** | Sunday | `HOLIDAY` | $0$ | **2** | $0$ | **2** | **Sunday: Zero effect, streak preserved** |
| **Oct 05** | Monday | `PRESENT` | $+1$ | **3** | $+1$ | **3** | Streak correctly resumes at 3 |
| **Oct 06** | Tuesday | `ABSENT` | Reset | **0** | $-2$ | **1** | Missed eligible day: Streak resets to 0 |

---

## 3. Automated 10-Day Inactivity Scanner

The inactivity detection engine executes nightly at 23:59 PM (Gym Local Timezone).

```mermaid
flowchart TD
    CronStart[Nightly Cron Execution: 23:59 PM] --> FetchMembers[Fetch All Members with Active Memberships]
    FetchMembers --> LoopMembers[Iterate Over Member List]
    LoopMembers --> CountMissed[Count Consecutive Missed Eligible Gym Days Backwards]
    CountMissed --> ExcludeSundays[Exclude Sundays from Counter]
    ExcludeSundays --> Check10{Missed Days == 10?}
    Check10 -- Yes --> FlagAlert[Generate InactivityAlert & Dispatch Admin FCM Push]
    Check10 -- No --> ContinueLoop[Next Member]
    FlagAlert --> ContinueLoop
    ContinueLoop --> EndCron[Inactivity Scanner Complete]
```
