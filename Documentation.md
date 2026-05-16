# Sanaa Platform — Developer Documentation

> **صنعة** is a full-stack freelance service marketplace connecting clients with skilled freelancers. Clients browse and order services, freelancers manage their profiles and incoming work, and admins oversee the entire platform.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Folder Structure](#4-folder-structure)
5. [Database Schema](#5-database-schema)
6. [API Reference](#6-api-reference)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Authentication Flow](#8-authentication-flow)
9. [Getting Started](#9-getting-started)
10. [Environment Configuration](#10-environment-configuration)

---

## 1. Project Overview

Sanaa is a two-sided marketplace where:

- **Clients** browse a service catalog, place orders, save favorites, and leave reviews.
- **Freelancers** create profiles, list services, manage incoming orders, and upload portfolio images.
- **Admins** approve freelancer profiles, manage users, view platform-wide stats, and resolve reports.

### Core Features

| Feature | Description |
|---------|-------------|
| 🔐 Auth & OTP | JWT login/register with email OTP verification and refresh tokens |
| 👤 Freelancer Profiles | Profession, city, experience, bio, profile image, portfolio gallery |
| 🗂️ Service Catalog | Browseable/searchable services organized by category |
| 📦 Order Management | Clients create orders; freelancers accept/reject; status tracking |
| ❤️ Favorites | Clients save and remove favorite services |
| ⭐ Reviews | Clients rate and review freelancers after completed orders |
| 💳 Payments | Stripe payment intents linked to orders with invoice generation |
| 🤖 AI Chatbot | Anthropic-powered assistant for platform guidance |
| 🔔 Real-time Notifications | SignalR hub pushes alerts on order updates |
| 🚩 Reports | Users can report freelancers or services; admins resolve them |
| 🛡️ Admin Panel | Dashboard stats, user control, freelancer approval workflow |

---

## 2. Tech Stack

### Backend
| Component | Technology |
|-----------|-----------|
| Framework | ASP.NET Core Web API (.NET 8) |
| Database | SQL Server |
| ORM | Entity Framework Core 8 (Code-First) |
| Authentication | JWT Bearer Tokens + Refresh Tokens |
| Real-time | SignalR |
| Email | SMTP via Gmail |
| Payments | Stripe API |
| AI | Anthropic Claude API |
| File Storage | Local file upload service |

### Frontend
| Component | Technology |
|-----------|-----------|
| Markup | Vanilla HTML5 (RTL / Arabic-first) |
| Styles | Vanilla CSS3 with CSS Variables & Neumorphic design |
| Scripts | Vanilla JavaScript (ES6 Modules) |
| Icons | Font Awesome 6 |
| Fonts | Google Fonts — Tajawal |

---

## 3. Architecture Overview

The backend follows a strict **3-Tier Architecture**. Each layer has a single responsibility and communicates only with its adjacent layer.

```
┌─────────────────────────────────────────────────────┐
│                  CLIENT (Browser)                    │
│         HTML + CSS + Vanilla JS (ES Modules)         │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP (JSON + JWT)
                        ▼
┌─────────────────────────────────────────────────────┐
│              Sanaa.API  (Presentation Layer)          │
│   Controllers · Program.cs · DTOs · SignalR Hubs     │
│   • Routes incoming HTTP requests                    │
│   • Validates input via DTOs                         │
│   • Enforces [Authorize] + Role guards               │
│   • Calls BLL services via injected interfaces       │
└───────────────────────┬─────────────────────────────┘
                        │ Interface contracts (DI)
                        ▼
┌─────────────────────────────────────────────────────┐
│              Sanaa.BLL  (Business Logic Layer)        │
│         Interfaces · Services · DTOs                 │
│   • Implements all business rules                    │
│   • Orchestrates calls to DAL                        │
│   • Maps Entities ↔ DTOs                            │
│   • Sends emails, notifications, etc.                │
└───────────────────────┬─────────────────────────────┘
                        │ EF Core DbContext
                        ▼
┌─────────────────────────────────────────────────────┐
│              Sanaa.DAL  (Data Access Layer)           │
│         SanaaDbContext · Entities · Migrations       │
│   • Defines the database schema via Code-First       │
│   • Applies Fluent API configuration                 │
│   • Manages migrations                               │
└───────────────────────┬─────────────────────────────┘
                        │ SQL
                        ▼
                  ┌──────────────┐
                  │   SanaaDB    │
                  │  SQL Server  │
                  └──────────────┘
```

### Dependency Direction Rule
> **API → BLL → DAL** — a lower layer never imports from a higher one. The API project only knows about BLL interfaces; it never touches `SanaaDbContext` directly.

### Dependency Injection
All services are registered in `Program.cs` as **Scoped** (one instance per HTTP request):

```csharp
builder.Services.AddScoped<IOrderService,    OrderService>();
builder.Services.AddScoped<IFavoritesService, FavoritesService>();
builder.Services.AddScoped<IFreelancerService, FreelancerService>();
// ... (all 15 interfaces registered the same way)
```

---

## 4. Folder Structure

```
SanaaPlatform/
│
├── Backend/
│   ├── SanaaPlatform.sln
│   │
│   ├── Sanaa.API/                        ← Presentation Layer
│   │   ├── Program.cs                    (Entry point: DI, JWT, CORS, Rate Limiting)
│   │   ├── appsettings.json              (Connection string, JWT secrets, SMTP, Stripe)
│   │   ├── Controllers/
│   │   │   ├── AdminController.cs
│   │   │   ├── AuthController.cs
│   │   │   ├── CategoriesController.cs
│   │   │   ├── ChatbotController.cs
│   │   │   ├── FavoritesController.cs
│   │   │   ├── FreelancersController.cs
│   │   │   ├── InvoicesController.cs
│   │   │   ├── OrdersController.cs
│   │   │   ├── PaymentsController.cs
│   │   │   ├── ReportsController.cs
│   │   │   ├── ReviewsController.cs
│   │   │   ├── ServicesController.cs
│   │   │   └── UsersController.cs
│   │   ├── DTOs/                         (Request/Response models for the API surface)
│   │   ├── Hubs/
│   │   │   └── NotificationHub.cs        (SignalR real-time notifications)
│   │   └── Services/
│   │       ├── FileUploadService.cs
│   │       └── SignalRNotificationService.cs
│   │
│   ├── Sanaa.BLL/                        ← Business Logic Layer
│   │   ├── Interfaces/
│   │   │   ├── IAuthService.cs
│   │   │   ├── ICategoryService.cs
│   │   │   ├── IChatbotService.cs
│   │   │   ├── IEmailService.cs
│   │   │   ├── IFavoritesService.cs
│   │   │   ├── IFileUploadService.cs
│   │   │   ├── IFreelancerService.cs
│   │   │   ├── IInvoiceService.cs
│   │   │   ├── INotificationService.cs
│   │   │   ├── IOrderService.cs
│   │   │   ├── IOtpService.cs
│   │   │   ├── IPaymentService.cs
│   │   │   ├── IReportService.cs
│   │   │   ├── IReviewService.cs
│   │   │   ├── IServiceService.cs
│   │   │   └── IUserService.cs
│   │   ├── Services/
│   │   │   ├── CategoryService.cs
│   │   │   ├── ChatbotService.cs
│   │   │   ├── EmailService.cs
│   │   │   ├── FavoritesService.cs
│   │   │   ├── FreelancerService.cs
│   │   │   ├── InvoiceService.cs
│   │   │   ├── OrderService.cs
│   │   │   ├── OtpService.cs
│   │   │   ├── PaymentService.cs
│   │   │   ├── ReportService.cs
│   │   │   ├── ReviewService.cs
│   │   │   ├── ServiceService.cs
│   │   │   └── UserService.cs
│   │   └── DTOs/                         (Shared data contracts between BLL ↔ API)
│   │       ├── AuthDTOs.cs
│   │       ├── FavoriteDTOs.cs
│   │       ├── OrderDTOs.cs
│   │       ├── ServiceDTOs.cs
│   │       ├── PaginationDTOs.cs         (Generic PagedResponse<T>)
│   │       └── ... (16 total)
│   │
│   └── Sanaa.DAL/                        ← Data Access Layer
│       ├── SanaaDbContext.cs             (EF Core DbContext — 13 DbSets)
│       ├── Entities/
│       │   ├── User.cs
│       │   ├── FreeLancerProfile.cs
│       │   ├── Service.cs
│       │   ├── Category.cs
│       │   ├── FreelancerService.cs      (Join table: Freelancer ↔ Service)
│       │   ├── FavoriteService.cs        (Join table: User ↔ Service)
│       │   ├── Order.cs
│       │   ├── Review.cs
│       │   ├── Payment.cs
│       │   ├── Invoice.cs
│       │   ├── OtpCode.cs
│       │   ├── RefreshToken.cs
│       │   └── Report.cs
│       └── Migrations/                   (7 migration snapshots)
│
└── Frontend/
    └── san3a-edit/
        ├── index.html                    (Home page)
        ├── post.html                     (Service catalog / browse)
        ├── freelancer.html               (Freelancer dashboard)
        ├── customer.html                 (Customer dashboard)
        ├── Login.html
        ├── Register.html
        ├── js/
        │   ├── api.js                    ★ Central HTTP client (apiFetch wrapper)
        │   ├── auth.js                   ★ Auth state & requireAuth guard
        │   ├── login.js
        │   ├── FreelancerJS.js           (Freelancer dashboard logic)
        │   ├── customerJS.js             (Customer dashboard logic)
        │   ├── post.js                   (Service catalog + favorites)
        │   ├── scripts.js                (Home page)
        │   └── ... (15 JS files total)
        └── css/
            ├── CustomerStyle.css
            ├── FreelancerStyle.css
            ├── post.css
            └── ... (13 CSS files total)
```

---

## 5. Database Schema

### Entity Relationship Overview

```
User ──────────────────── FreelancerProfile  (1:1, optional)
 │                                │
 │                                │ (via FreelancerService join table)
 │                                └──────────── Service ──── Category
 │                                                  │
 │ (FavoriteService join table)                     │
 └──── FavoriteService ────────────────────────────┘
 │
 ├── Order ──── Payment ──── Invoice
 │      │
 │      └── Review
 │
 ├── OtpCode
 ├── RefreshToken
 └── Report
```

### Entity Descriptions

#### `User`
The central identity entity. Every person on the platform is a `User`.

| Column | Type | Notes |
|--------|------|-------|
| UserID | int PK | Auto-increment |
| FullName | string | |
| Email | string | Unique |
| PasswordHash | string | BCrypt hashed |
| Phone | string | |
| Role | string | `"admin"` / `"client"` / `"freelancer"` |
| IsActive | bool | Toggled by admin |
| IsEmailVerified | bool | Set after OTP |
| IsDeleted | bool | Soft delete flag |
| DeletedAt | DateTime? | Timestamp of soft delete |

> **Global Query Filter:** All queries automatically exclude `IsDeleted = true` users.

---

#### `FreelancerProfile`
Extended profile for users with role `"freelancer"`. Created separately after registration.

| Column | Type | Notes |
|--------|------|-------|
| FreelancerID | int PK, FK → User | Shared primary key |
| Profession | string | e.g., "Graphic Designer" |
| ExperienceYears | int | |
| City | string | |
| Bio | string | |
| ProfileImageUrl | string | URL to uploaded image |
| PortfolioImagesJson | string | JSON array of image URLs |
| AverageRating | decimal(3,2) | Recalculated on new reviews |
| ApprovalStatus | enum | `Pending(0)`, `Approved(1)`, `Rejected(2)` |

---

#### `Service`
A service type (e.g., "Logo Design"). This is a platform-level catalog entry, not tied to a specific freelancer.

| Column | Type | Notes |
|--------|------|-------|
| ServiceID | int PK | |
| CategoryID | int? FK → Category | Nullable; SetNull on category delete |
| Title | string | |
| Description | string | |
| BasePrice | decimal (money) | |
| IsActive | bool | |
| CreatedAt | DateTime | |

---

#### `FreelancerService` *(join table)*
Links a `FreelancerProfile` to the `Service`s they offer. Allows a custom price override.

| Column | Type | Notes |
|--------|------|-------|
| FreelancerID | int (composite PK) | FK → FreelancerProfile |
| ServiceID | int (composite PK) | FK → Service |
| CustomPrice | decimal? | Overrides BasePrice if set |
| IsAvailable | bool | Toggled by freelancer |

---

#### `FavoriteService` *(join table)*
Tracks which services a client has saved as favorites.

| Column | Type | Notes |
|--------|------|-------|
| UserID | int (composite PK) | FK → User (cascade delete) |
| ServiceID | int (composite PK) | FK → Service (cascade delete) |
| SavedAt | DateTime | UTC timestamp |

---

#### `Order`
The core transactional entity. Created when a client engages a freelancer for a service.

| Column | Type | Notes |
|--------|------|-------|
| OrderID | int PK | |
| ClientID | int FK → User | Restrict delete |
| FreelancerID | int FK → FreelancerProfile | Restrict delete |
| ServiceID | int? FK → Service | |
| Description | string | Client's custom instructions |
| Location | string | |
| OrderDate | DateTime | |
| ServicePriceSnapshot | decimal | Price at order time (immutable) |
| Status | enum | `Pending(0)`, `Accepted(1)`, `Rejected(2)`, `Completed(3)` |
| PaymentStatus | enum? | Linked payment state |

---

#### `Payment` & `Invoice`
One-to-one with `Order`. Created via Stripe webhook on successful charge.

---

#### `Review`
Left by a client after an order is completed.

| Column | Type | Notes |
|--------|------|-------|
| ReviewID | int PK | |
| OrderID | int FK | Restrict delete |
| FreelancerID | int FK | Restrict delete |
| ClientID | int FK | Restrict delete |
| Rating | int | 1–5 (validated via `[Range(1,5)]`) |
| Comment | string | |
| ReviewDate | DateTime | |

---

#### `OtpCode` & `RefreshToken`
Both cascade-delete with their parent `User`. OTPs are time-limited codes for email verification and password reset.

---

#### `Report`
A user-submitted complaint against a target (freelancer, service, etc.).

| Column | Notes |
|--------|-------|
| TargetType | e.g., `"freelancer"`, `"service"` |
| TargetID | ID of the reported entity |

> **Unique Index:** `(ReporterID, TargetType, TargetID)` — prevents duplicate reports from the same user.

---

## 6. API Reference

> **Base URL:** `https://localhost:7101`  
> **Auth:** All protected endpoints require `Authorization: Bearer <token>` in the request header.

---

### Auth Controller `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | ❌ | Register new user. Body: `{ fullName, email, password, phone, role }` |
| POST | `/login` | ❌ | Login. Returns `accessToken` + `refreshToken`. Body: `{ email, password }` |
| POST | `/send-otp` | ❌ | Send OTP to email. Body: `{ email, purpose }` |
| POST | `/verify-otp` | ❌ | Verify OTP code. Body: `{ email, code, purpose }` |
| POST | `/forgot-password` | ❌ | Trigger password reset email. Body: `{ email }` |
| POST | `/reset-password` | ❌ | Reset password with OTP code. Body: `{ email, code, newPassword }` |
| POST | `/refresh` | ❌ | Exchange refresh token for new access token. Body: `{ refreshToken }` |
| POST | `/logout` | ❌ | Invalidate refresh token. Body: `{ refreshToken }` |

---

### Admin Controller `/api/Admin`
> 🔒 Requires role: **admin**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard-stats` | Platform-wide stats (user count, order count, revenue, etc.) |
| PUT | `/toggle-user-status/{id}` | Activate or deactivate a user account |
| DELETE | `/users/{id}` | Soft-delete a user |
| GET | `/users/deleted` | List all soft-deleted users |
| GET | `/freelancers` | List all freelancers |
| GET | `/freelancers/pending` | List freelancers awaiting approval |
| PUT | `/freelancers/{id}/approve` | Approve a freelancer profile |
| PUT | `/freelancers/{id}/reject` | Reject a freelancer profile |

---

### Freelancers Controller `/api/Freelancers`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/profile` | 🔒 freelancer | Create freelancer profile. Body: `{ userID, profession, experienceYears, city, serviceIds[] }` |
| GET | `/{userId}` | ❌ | Get public profile for a freelancer |
| GET | `/search` | ❌ | Search freelancers by `profession`, `city`, or `serviceId` |
| POST | `/profile-image` | 🔒 freelancer | Upload profile picture (`multipart/form-data`) |
| POST | `/portfolio` | 🔒 freelancer | Add image to portfolio gallery (`multipart/form-data`) |
| DELETE | `/portfolio?imageUrl=` | 🔒 freelancer | Remove image from portfolio |
| GET | `/{userId}/portfolio` | ❌ | Get a freelancer's portfolio images |

---

### Services Controller `/api/Services`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | List all active services |
| POST | `/` | 🔒 admin | Create a new service. Body: `{ categoryID?, title, description, basePrice }` |
| GET | `/{id}` | ❌ | Get single service details |
| PUT | `/{id}` | 🔒 admin | Update service. Body: `{ categoryID?, title, description, basePrice, isActive }` |
| DELETE | `/{id}` | 🔒 admin | Delete service |

---

### Categories Controller `/api/Categories`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | List categories with optional `?search=`, `?page=`, `?pageSize=` |
| POST | `/` | 🔒 admin | Create category. Body: `{ name, description?, imageUrl? }` |
| GET | `/{id}` | ❌ | Get single category |
| PUT | `/{id}` | 🔒 admin | Update category |
| DELETE | `/{id}` | 🔒 admin | Delete category (services become uncategorized) |

---

### Orders Controller `/api/Orders`
> 🔒 All require authentication

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/` | client | Create order. Body: `{ freelancerID, serviceID, description, location }` |
| GET | `/my-orders` | client | Paginated list of client's own orders. `?pageNumber=&pageSize=` |
| GET | `/freelancer` | freelancer | Paginated list of orders assigned to the freelancer |
| PUT | `/{orderId}/status` | freelancer | Update order status. `?status=` (0=Pending, 1=Accepted, 2=Rejected, 3=Completed) |
| PUT | `/{orderId}/cancel` | client | Cancel a pending order |

---

### Favorites Controller `/api/Favorites`
> 🔒 All require authentication (client role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all favorited services for the logged-in user (with Title, BasePrice, SavedAt) |
| POST | `/{serviceId}` | Add a service to favorites. Returns 400 if already saved or service inactive |
| DELETE | `/{serviceId}` | Remove a service from favorites. Returns 404 if not found |

---

### Reviews Controller `/api/Reviews`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/add` | 🔒 client | Submit review. Body: `{ orderID, freelancerID, rating(1-5), comment }` |
| GET | `/freelancer/{freelancerId}` | ❌ | Get all reviews for a freelancer |

---

### Payments Controller `/api/Payments`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/create-intent` | 🔒 | Create Stripe payment intent. Body: `{ orderId, amount }` |
| POST | `/webhook` | ❌ | Stripe webhook endpoint (called by Stripe, not the client) |

---

### Additional Controllers

| Controller | Endpoint | Description |
|-----------|---------|-------------|
| Invoices | `GET /api/Invoices/order/{orderId}` | Fetch invoice for a completed/paid order |
| Reports | `POST /api/Reports` | Submit a report against a user or service |
| Reports | `GET /api/Reports` | (Admin) List all reports with optional `?status=` filter |
| Reports | `PUT /api/Reports/{id}/status` | (Admin) Update report resolution status |
| Chatbot | `POST /api/Chatbot/message` | Send message to AI assistant. Body: `{ message, conversationHistory[] }` |
| Users | `GET /api/Users` | Search users by `SearchTerm`, `City`, `Profession` |

---

### Pagination Pattern

Paginated endpoints return a consistent `PagedResponse<T>` envelope:

```json
{
  "data": [ ... ],
  "totalCount": 42,
  "pageNumber": 1,
  "pageSize": 10,
  "totalPages": 5
}
```

---

## 7. Frontend Architecture

### Core Utilities

The entire frontend is coordinated by two central files that every page imports:

#### `js/api.js` — The HTTP Client

All API calls go through `apiFetch()`. It automatically:
- Prepends the base URL (`https://localhost:7101`)
- Injects the `Authorization: Bearer <token>` header
- Handles **401 responses** by silently refreshing the access token and retrying the original request (with a queue to prevent race conditions on parallel calls)
- Redirects to `Login.html` if the refresh also fails

```js
// Usage — anywhere in the app
import { apiFetch } from './api.js';

const orders = await apiFetch('/api/Orders/my-orders?pageNumber=1&pageSize=10');
```

**Exported functions:**
- `apiFetch(endpoint, options)` — JSON requests (auto-injects auth header)
- `apiJSON(endpoint, body, method)` — Convenience wrapper for JSON POST/PUT
- `apiUpload(endpoint, formData)` — Multipart file upload with auth

---

#### `js/auth.js` — Auth State & Route Guards

Manages the user session stored in `localStorage`.

**Key exported functions:**

| Function | Description |
|----------|-------------|
| `login(email, password)` | Calls `/api/auth/login`, stores token + user object |
| `logout()` | Calls `/api/auth/logout`, clears localStorage |
| `requireAuth(allowedRoles)` | **Route guard** — returns user or redirects |
| `getCurrentUser()` | Returns parsed user object from localStorage |
| `redirectByRole(role)` | Navigates to the correct dashboard by role |

**`requireAuth` guard pattern** — used at the top of every protected page:

```js
import { requireAuth } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    // If not logged in → redirects to Login.html automatically
    // If wrong role → redirects to correct dashboard
    const user = requireAuth(['client']);
    if (!user) return; // execution stops here if unauthorized

    // Safe to proceed — user is authenticated and has the correct role
    console.log(`Welcome, ${user.fullName}`);
});
```

---

### Page-Level JS Files

| File | Page | Key Responsibilities |
|------|------|---------------------|
| `login.js` | `Login.html` | Form submit, password toggle, OTP redirect |
| `FreelancerJS.js` | `freelancer.html` | `requireAuth(['freelancer'])`, profile data from `/api/users/profile`, service/order management |
| `customerJS.js` | `customer.html` | `requireAuth(['client'])`, loads orders from `/api/Orders/my-orders`, favorites from `/api/Favorites` |
| `post.js` | `post.html` | Service catalog display, sorting, currency toggle, `addToFavorites()` |
| `scripts.js` | `index.html` | Home page, top freelancers section |
| `AdminJS.js` | `Admin.html` | Admin dashboard stats, user/freelancer management |

---

### Adding Favorites from a Service Card

The `addToFavorites` function (in `post.js`) is attached as a global `window` property so it can be called from inline `onclick` attributes despite the file being a module:

```js
// post.js
window.addToFavorites = async function(serviceId, btnElement) {
    const user = requireAuth(['client']);
    if (!user) return;

    await apiFetch(`/api/Favorites/${serviceId}`, { method: 'POST' });

    // Visual feedback: outline heart → solid red heart
    btnElement.querySelector('i').classList.replace('far', 'fas');
    btnElement.querySelector('i').style.color = '#e74c3c';
};
```

**HTML card usage:**
```html
<button class="fav-btn"
        onclick="addToFavorites(1, this); event.stopPropagation();"
        aria-label="أضف للمفضلة">
    <i class="far fa-heart"></i>
</button>
```
> `event.stopPropagation()` is essential here because the card is an `<a>` tag — without it, clicking the heart would also navigate to the service detail page.

---

### Token Storage

```
localStorage
├── accessToken    → JWT (short-lived, ~15 min)
├── refreshToken   → Opaque token (long-lived, ~7 days)
└── currentUser    → JSON: { userID, fullName, email, role, ... }
```

---

## 8. Authentication Flow

### Registration & Email Verification

```
1. POST /api/auth/register  → account created (IsEmailVerified = false)
2. POST /api/auth/send-otp  → OTP emailed to user
3. POST /api/auth/verify-otp → IsEmailVerified = true
4. Redirect to Login page
```

### Login & Token Lifecycle

```
1. POST /api/auth/login
   ← { accessToken, refreshToken, user }

2. Store both tokens in localStorage

3. Every API request:
   → Authorization: Bearer <accessToken>

4. On 401 (token expired):
   → api.js queues the request
   → POST /api/auth/refresh  { refreshToken }
   ← { accessToken, refreshToken (rotated) }
   → Update localStorage
   → Retry all queued requests

5. On refresh failure:
   → Clear localStorage
   → Redirect to Login.html
```

### Password Reset

```
1. POST /api/auth/forgot-password  { email }
2. User receives OTP via email
3. POST /api/auth/verify-otp       { email, code, purpose: "PasswordReset" }
4. POST /api/auth/reset-password   { email, code, newPassword }
```

### Role-Based Routing

After login, `redirectByRole()` sends users to their dashboard:

| Role | Destination |
|------|-------------|
| `admin` | `Admin.html` |
| `client` | `customer.html` |
| `freelancer` | `freelancer.html` |

---

## 9. Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8)
- [SQL Server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) (Express or Developer edition)
- [Visual Studio 2022](https://visualstudio.microsoft.com/) or [VS Code](https://code.visualstudio.com/)
- A modern browser (Chrome, Edge, Firefox)

---

### Backend Setup

**Step 1 — Clone and open the solution**
```bash
cd Backend
start SanaaPlatform.sln   # opens in Visual Studio
```

**Step 2 — Configure the connection string**

Open `Sanaa.API/appsettings.json` and update `DefaultConnection`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=YOUR_SERVER;Database=SanaaDB;Trusted_Connection=True;TrustServerCertificate=True;"
}
```

For a local default SQL Server instance, `Server=.` usually works.

**Step 3 — Apply migrations and create the database**

In Visual Studio → **Package Manager Console** (set Default Project to `Sanaa.DAL`):
```
Update-Database
```

Or via the .NET CLI from the solution root:
```bash
dotnet ef database update --project Backend/Sanaa.DAL --startup-project Backend/Sanaa.API
```

**Step 4 — Run the API**

```bash
cd Backend/Sanaa.API
dotnet run
```

The API will start at: `https://localhost:7101`  
Swagger UI is available at: `https://localhost:7101/swagger`

---

### Frontend Setup

The frontend is plain HTML/CSS/JS — no build step required.

**Option A — Open directly in browser (simplest)**
```
Open Frontend/san3a-edit/index.html in your browser
```
> ⚠️ ES6 modules (`import`/`export`) require a proper HTTP server — they do **not** work when opened via `file://` protocol.

**Option B — Serve with VS Code Live Server (recommended)**
1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in VS Code
2. Right-click `index.html` → **Open with Live Server**
3. Browser opens at `http://127.0.0.1:5500`

**Option C — Serve with Node.js**
```bash
cd Frontend/san3a-edit
npx serve .
```

---

### First Run Checklist

- [ ] SQL Server is running
- [ ] `Update-Database` completed without errors (check for `SanaaDB` in SSMS)
- [ ] API starts and Swagger loads at `https://localhost:7101/swagger`
- [ ] Frontend served over HTTP (not `file://`)
- [ ] `API_BASE_URL` in `js/api.js` matches the running API URL

---

## 10. Environment Configuration

All secrets live in `Sanaa.API/appsettings.json`. Do **not** commit real credentials to version control — use `appsettings.Development.json` or user secrets for local development.

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.;Database=SanaaDB;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "YOUR_LONG_SECRET_KEY_MIN_32_CHARS",
    "Issuer": "SanaaAPI",
    "Audience": "SanaaUsers"
  },
  "Smtp": {
    "Host": "smtp.gmail.com",
    "Port": 587,
    "Username": "your-email@gmail.com",
    "Password": "your-app-password",
    "SenderEmail": "your-email@gmail.com",
    "SenderName": "Sanaa"
  },
  "Stripe": {
    "PublishableKey": "pk_test_...",
    "SecretKey": "sk_test_...",
    "WebhookSecret": "whsec_..."
  },
  "Anthropic": {
    "ApiKey": "sk-ant-..."
  }
}
```

### Rate Limiting (configured in `Program.cs`)

| Policy | Limit |
|--------|-------|
| OTP endpoints | 3 requests / 10 minutes |
| Chatbot | 20 requests / minute |
| Login | 5 requests / minute |
| Global (all endpoints) | 60 requests / minute |

---

## Appendix — Adding a New Feature (Developer Guide)

Follow this checklist when adding any new feature to maintain the 3-tier pattern:

```
1. DAL  → Create Entity class in Sanaa.DAL/Entities/
2. DAL  → Add DbSet<T> to SanaaDbContext.cs
3. DAL  → Configure relationships in OnModelCreating() (Fluent API)
4. DAL  → Run: Add-Migration <MigrationName>  →  Update-Database

5. BLL  → Add response DTO to Sanaa.BLL/DTOs/
6. BLL  → Define interface in Sanaa.BLL/Interfaces/IYourService.cs
7. BLL  → Implement in Sanaa.BLL/Services/YourService.cs

8. API  → Create Controller in Sanaa.API/Controllers/
9. API  → Register: builder.Services.AddScoped<IYourService, YourService>()

10. Frontend → Import { apiFetch } from './api.js'
11. Frontend → Import { requireAuth } from './auth.js'
12. Frontend → Call apiFetch('/api/YourEndpoint', { method: 'POST', body: ... })
```

---

*Documentation generated for Sanaa Platform — v1.0 — May 2026*
