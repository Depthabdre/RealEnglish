---

# 🧠 2. Node.js Backend README

**Filename:** `README.md` (Place in your Backend project root)

```markdown
# 🧠 Real English - Backend API

![NodeJS](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![Clean Arch](https://img.shields.io/badge/Architecture-Clean-orange?style=for-the-badge)
![AI](https://img.shields.io/badge/Powered%20By-Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)

---

## 🌱 The Mission
This backend is the "Brain" facilitating the **Natural Acquisition** method for the Real English platform. It does not just serve data; it orchestrates AI to generate stories, manages video streams for immersion, and tracks user growth through a gamified garden metaphor.

---

## 🏛️ Architecture

We follow a **Modular Monolith** approach. The system is divided into logical modules (Auth, Content, AI), but deployed as a single unit for simplicity and performance.

### **Internal Structure: Clean Architecture**
To ensure maintainability and testability, **every module** internally follows strict Clean Architecture principles (Ports & Adapters):

1.  **Domain Layer (Core):**
    *   Contains Business Entities (`Story`, `User`, `Tree`) and Logic.
    *   *Dependency:* None. Pure TypeScript.
2.  **Use Cases (Application):**
    *   Orchestrates the flow of data (e.g., `GenerateStoryUseCase`, `CalculateXPUseCase`).
    *   *Dependency:* Domain.
3.  **Interface Adapters (Presentation):**
    *   Controllers that handle HTTP requests and validate input (DTOs).
    *   *Dependency:* Use Cases.
4.  **Infrastructure (External):**
    *   Database implementations, AI Client wrappers, File Storage adapters.
    *   *Dependency:* Domain Interfaces.

### **Folder Structure**
```bash
src/
├── modules/
│   ├── identity/        # Auth, User Profile, Roles
│   ├── content/         # Story Engine, Video Feed Algorithms
│   ├── gamification/    # XP, Streaks, Garden Logic
│   └── ai_coach/        # Speech Analysis, Pollinations Image Gen
├── shared/              # Shared Kernel (Logger, DB Config, Utils)
├── app.ts               # App Entry Point
└── server.ts            # Server Config
