# 🎬 CinemaGo 2.0: Booking Ecosystem

![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)
![Status](https://img.shields.io/badge/Status-Milestone%202-brightgreen?style=for-the-badge)

**CinemaGo** is a high-performance movie booking platform designed for digital natives in Astana. Evolved from a simple guest-oriented tool into a robust user-centric ecosystem, it combines a modern **Neo-Brutalism UI** with a powerful **Go/MongoDB** backend.

---

## 🚀 Project Vision & Strategy

### 1.1 Relevance
In a market dominated by cluttered legacy systems (Ticketon, Kino.kz), CinemaGo provides a "speed-to-ticket" experience. By implementing **JWT (JSON Web Tokens)**, we offer a persistent, personalized environment with real-time loyalty rewards.

### 1.2 The Competitive Edge
* **Performance:** Leveraging Go’s concurrency for sub-millisecond API responses and asynchronous notifications.
* **UX/UI:** A bold **Neo-Brutalism** aesthetic tailored for Gen Z (Ages 16-25).
* **Retention:** A custom **Bonus System (loyalty ₸)** that creates a "hook" for repeat customers.
* **AI Integration:** Built-in AI assistance for user support and movie recommendations.

---

## ✨ Key Features

* 🎟 **Advanced Booking Engine:** Interactive seating plan with real-time seat mapping.
* 💰 **Dynamic Pricing:** Automatic 20% student discounts and promo code validation.
* 💎 **Loyalty System:** Earn and spend bonuses (₸) tracked in a real-time dashboard.
* 🔍 **Multi-Criteria Filtering:** Filter by categories (Space, Scary, New), price, dates, and specific Astana cinemas.
* 💳 **Financial Integration:** Simulated **Halyk Bank** payment gateway for secure transactions.
* 📊 **Data Portability:** Export stats (PDF/Reports) for booking history and sales trends.
* 🎬 **TMDb Integration:** Rich media retrieval (posters, trailers, ratings).

---

## 🏗 Architectural Design

### 1.1 Layered Structure
* **Handler Layer:** Managed HTTP routing and request parsing.
* **Middleware Layer:** JWT validation and Role-Based Access Control (RBAC).
* **Service Layer:** Business logic (Bonus calculations, Pricing logic).
* **Repository Layer:** Direct interaction with **MongoDB Atlas**.

### 1.2 Technical Decisions
1.  **Stateless Auth:** JWT used for horizontal scalability. Identity propagation via `context.Context`.
2.  **NoSQL Persistence:** MongoDB handles flexible TMDb metadata and dynamic seating arrays efficiently.
3.  **Concurrency:** Go routines used for async email notifications (booking confirmations).

---

## 📊 System Diagrams (Visuals)

### 2.1 Use-Case Diagram
*(Insert your Mermaid/Lucidchart Use-Case image here)*

### 2.2 Entity Relationship Diagram (ERD)
*(Insert your Mermaid/Lucidchart ERD image here)*

### 2.3 Sequence Diagram (Booking Flow)
*(Insert your Mermaid/Lucidchart Sequence image here)*

---

## 📅 Project Plan (Gantt Chart)

| Week | Phase | Milestone |
|:---:|:---|:---|
| **W7** | **Foundation** | JWT Auth implementation, MongoDB Atlas setup, UI Skeleton. |
| **W8** | **Core Dev** | Interactive Seat Map, Halyk Payment logic, Pricing engine. |
| **W9** | **Integration** | User Profile Dashboard, Email Service, Admin Dashboard sync. |
| **W10** | **Finalization** | System Stress Testing, Bug Fixing, Final Presentation. |

---

## 👩‍💻 Team Responsibilities & Impact

| Member | Focus | Contribution |
|:---:|:---:|:---|
| **Altynay** | **Frontend & UI** | Developed Neo-Brutalism UI, live search (debounce), and Admin Dashboard sync. |
| **Nuray** | **Backend & Security** | Engineered JWT Auth, built `authFetch`, and optimized ticketing via Go routines. |
| **Aknur** | **Database & Services** | Migrated to MongoDB Atlas, Halyk Payment simulation, and automated Email Service. |

---

## 🛠 Setup & Installation

1. **Clone the repo:**
   ```bash
   git clone [https://github.com/Altusha4/cinema.git](https://github.com/Altusha4/cinema.git)