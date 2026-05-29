
# 🧠 Real English - Backend API

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-5.x-000000?style=for-the-badge&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Clean Architecture](https://img.shields.io/badge/Architecture-Clean-orange?style=for-the-badge)

---

## 🌱 The Philosophy: Why We Exist

### The Broken Path
For most of us, learning English has been a source of anxiety, not joy. We spent **12 years** in school memorizing grammar rules, dissecting sentences like biology specimens, and stressing over exams.

Yet, when we try to speak, we freeze. We translate in our heads. We fear making mistakes. **The educational system treated language like a subject to be studied, not a skill to be lived.** It asked too much of your logic, and too little of your intuition. 

### The Natural Miracle
Think back to how you learned your first language (Amharic, Oromiffa, Tigrinya).
- Did you study a textbook at age two? **No.**
- Did you take a grammar exam at age three? **No.**
- **You simply lived.**

You listened to stories. You watched people. You guessed meaning from context. You made mistakes, and nobody graded you "F". You absorbed the patterns **unconsciously**.

### The Real English Way
**Real English** is a digital environment designed to recreate that natural, child-like state of acquisition. This backend acts as the invisible orchestrator—powering interactive narratives, serving addictive cultural video feeds, and tracking organic growth—without ever forcing the user to take a grammar test.

---

## ⚙️ Core Features (Backend Engines)

### 1. 📖 Interactive Story Engine
We replaced traditional tests with **Playful Narratives**.
- **The Engine:** Manages complex, graph-like JSON structures (`StoryTrail`, `StorySegment`, `SingleChoiceChallenge`) and serves them efficiently.
- **The Tech:** Supports branched storytelling, choice validation with contextual feedback, and tracks user progression. It dynamically links AWS S3 audio elements to let users listen natively.

### 2. 🎬 Immersion Feed Curator (Shorts)
We replaced lectures with **Addiction**.
- **The Engine:** Powers the TikTok-style vertical video feed by curating learning shorts (harvested from YouTube). It categorizes clips (funny, real-life, motivation, culture) and tailors the experience by difficulty. 
- **The Tech:** Tracks user watch history (`UserShortHistory`), manages saved videos for later spaced repetition, and delivers personalized infinite-scroll feeds with smart tag filtering. 

### 3. 🌻 Growth & Identity System (Auth + Profile)
We replaced grades with **Nature**.
- **The Engine:** An organic progression system centered on streaks, active days, and leveling up ("Tree Stage"). Includes secure, frictionless onboarding.
- **The Tech:** Implements Google Sign-In, OTP integrations, JWT secure sessions, and profile tracking (Avatar logic, streak calculations). Uses Nodemailer and AWS integration for account recoveries securely.

---

## 🏗️ Architecture

The backend follows **Clean Architecture** combined with a **Feature-First** directory structure. This ensures absolute separation of concerns, scalability, and high testability across all moving parts.

### **Internal Structure (Ports & Adapters)**
Every feature isolates:
1. **Domain Layer:** Business Entities (e.g., `ImmersionShort`, `User`) and pure logic. No external dependencies.
2. **Use Cases (Application):** Orchestrates the data flow (e.g., `GetPersonalizedFeed`, `GetNextStoryTrail`).
3. **Interface Adapters:** Express routes, controllers, and middlewares.
4. **Infrastructure:** PostgreSQL repositories (`Prisma`), AI clients, email services (`Nodemailer`), and file storage (`AWS S3`). 

### **Folder Structure**

```bash
src/
├── features/
│   ├── authentication/  # Sign Up, Sign In (OTP/Google Auth)
│   ├── daily_immersion/ # Video Feed Logic, YouTube Harvest, History
│   ├── profile/         # User Growth & Garden (Streaks, Levels)
│   └── story_trails/    # Interactive Story Engine, Audio delivery
├── di_container.ts      # Dependency Injection Container
└── server.ts            # Entry Point, Middleware, Routes
```
