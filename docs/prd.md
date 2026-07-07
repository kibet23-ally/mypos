# Requirements Document

## 1. Application Overview

<<<<<<< HEAD
**Application Name:** PosifyPro

**Description:** An enterprise-grade multi-tenant POS SaaS platform designed for businesses requiring role-based access control, real-time sales management, advanced inventory tracking, customer management, and comprehensive analytics. The system implements a one-time payment licensing model with strict role-based permissions across three user types: SuperAdmin, Owner, and Cashier. The platform delivers premium user experience comparable to Loyverse, Vend, Square POS, and Shopify POS.

---

## 2. Users and Usage Scenarios

### 2.1 Target Users

- **SuperAdmin**: System administrators managing multiple tenants, monitoring system health, SaaS metrics, and revenue analytics
- **Owner**: Business owners managing sales analytics, inventory, customers, staff, and financial reports
- **Cashier**: Front-line staff handling sales transactions, receipt printing, and shift management
- **Visitors**: Potential customers exploring the public landing page

### 2.2 Core Usage Scenarios

- SuperAdmin monitors tenant growth, MRR/ARR, churn rate, and system performance
- Owner analyzes business performance through real-time dashboards, manages inventory, tracks customer behavior, and generates reports
- Cashier processes transactions with barcode scanning, manages held sales, and tracks shift performance
- Visitors explore system features before registration

---

## 3. Page Structure and Functional Description
=======
**Application Name**: PosifyPro Sidebar Navigation System

**Description**: A professional, scalable, role-based sidebar navigation system for PosifyPro, a multi-tenant POS SaaS application. The sidebar supports four system roles (Super Admin, Owner, Manager, Cashier) with dynamic menu generation based on user permissions, responsive design across devices, and multi-tenant isolation.

## 2. Users and Usage Scenarios

**Target Users**:
- Super Admin: Platform administrators managing all tenants
- Owner: Business owners managing their own tenant
- Manager: Operational managers with limited access within a tenant
- Cashier: Front-line staff performing sales operations

**Core Usage Scenarios**:
- Users log in and see navigation menu tailored to their role and permissions
- Users navigate between different modules and pages within their authorized scope
- Users access the sidebar on desktop, tablet, and mobile devices with appropriate responsive behavior
- Owners customize Manager and Cashier permissions without code changes

## 3. Page Structure and Functionality
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)

### 3.1 Page Structure

```
<<<<<<< HEAD
PosifyPro System
├── Public Landing Page (/)
├── Authentication
│   ├── Login Page (/login)
│   └── Registration Page (/register)
├── License Activation Module
└── Dashboard (Role-based)
    ├── Header (Common)
    ├── Sidebar (Role-specific)
    └── Main Content Area
        ├── SuperAdmin Views
        │   ├── Dashboard Overview
        │   ├── Businesses Registered
        │   ├── Users & Roles
        │   ├── Reports & Analytics
        │   └── Settings
        ├── Owner Views
        │   ├── Dashboard Overview
        │   ├── Point of Sale
        │   ├── Products
        │   ├── Inventory Management
        │   ├── Customers
        │   ├── Reports Center
        │   ├── Staff
        │   └── Settings
        └── Cashier Views
            ├── Dashboard Overview
            ├── Point of Sale
            ├── Products
            ├── Sales History
            └── Profile
```

### 3.2 Public Landing Page (/)

#### 3.2.1 Hero Section
- Displays headline and subheadline
- Contains Get Started button (links to /register) and Login button (links to /login)
- Uses Primary color (#0F172A) and Accent color (#3B82F6)
- Applies Main gradient: linear-gradient(135deg,#0F172A 0%,#1E293B 50%,#3B82F6 100%)

#### 3.2.2 Features Section
- Showcases key capabilities with feature cards
- Highlights role-based access, real-time analytics, inventory management, multi-tenant architecture

#### 3.2.3 Pricing Section
- Presents one-time payment licensing model
- Emphasizes value benefits

#### 3.2.4 Testimonials Section
- Displays customer testimonials with quotes, names, and business types

#### 3.2.5 Footer
- Contains navigation links, copyright information, contact links
- Uses Primary background (#0F172A)

#### 3.2.6 Design Requirements
- Premium visual design with glassmorphism cards, premium shadows, smooth transitions
- Consistent color tokens: Primary:#0F172A, Secondary:#1E293B, Accent:#3B82F6, Light Accent:#60A5FA, Background:#F8FAFC, Cards:#FFFFFF, Text:#0F172A, Muted:#64748B, Success:#22C55E, Warning:#F59E0B, Danger:#EF4444
- Mobile-first responsive layout
- Modern typography with better spacing
- No authentication required

### 3.3 Authentication Pages

#### 3.3.1 Registration Page (/register)
- User inputs business name, email, password, selects initial role
- System creates tenant record with is_activated set to false
- Generates unique license_key
- Premium form design with glassmorphism effects

#### 3.3.2 Login Page (/login)
- User inputs email and password
- System validates credentials, returns JWT token
- Redirects to License Activation Module if tenant not activated
- Redirects to role-specific Dashboard if activated
- Premium form design with Button gradient: linear-gradient(135deg,#2563EB 0%,#3B82F6 100%)

### 3.4 License Activation Module

- Displays license_key and payment instructions
- User submits payment confirmation
- System validates payment, updates is_activated to true
- Grants dashboard access after activation
- Premium UI with glassmorphism cards

### 3.5 Dashboard Layout

#### 3.5.1 Header (Common)
- Displays Business Name
- Shows personalized greeting: \"Welcome [Username]\"
- Displays live-updating Date/Time clock (format: YYYY-MM-DD HH:MM:SS Day)
- Responsive design
- Premium styling with glassmorphism effects

#### 3.5.2 Sidebar (Role-specific)

**SuperAdmin Sidebar:**
- Dashboard Overview
- Businesses Registered
- Users & Roles
- Reports & Analytics
- Settings

**Owner Sidebar:**
- Dashboard Overview
- Point of Sale
- Products
- Inventory Management
- Customers
- Reports Center
- Staff
- Settings

**Cashier Sidebar:**
- Dashboard Overview
- Point of Sale
- Products
- Sales History
- Profile

#### 3.5.3 Main Content Area

**SuperAdmin Views:**

- **Dashboard Overview**: Displays KPI cards (Total Tenants, Active Tenants, New Tenants, Trial Accounts, Expiring Subscriptions, MRR, ARR, Total Revenue, Revenue Growth, Churn Rate, Conversion Rate, Active Users, Total Staff, Database Usage, API Requests) and Recharts visualizations (Revenue Growth line chart, Tenant Growth area chart, Subscription Distribution pie chart, Monthly Recurring Revenue bar chart, Churn Analysis line chart, Active Users Trend area chart, Plan Comparison bar chart, SaaS Growth Metrics composite chart)

- **Businesses Registered**: Table listing all tenants with registration date, activation status, license details, pagination, search, filters

- **Users & Roles**: Table showing all users across tenants with role assignments, activity status, pagination, search

- **Reports & Analytics**: Interactive charts showing tenant growth, revenue distribution, usage patterns using Recharts

- **Settings**: Form for system configuration options

**Owner Views:**

- **Dashboard Overview**: Displays KPI cards (Today's Sales, Monthly Sales, Annual Sales, Gross Profit, Net Profit, Total Orders, Average Order Value, Total Customers, New Customers, Inventory Value, Low Stock Products, Out of Stock Products, Active Staff, Top Selling Product, Top Category, Profit Margin %) and Recharts visualizations (Daily Sales Trend line chart, Weekly Sales Trend bar chart, Monthly Revenue Trend area chart, Sales by Category pie chart, Top Products bar chart, Revenue vs Profit line chart, Customer Growth area chart, Stock Movement bar chart, Payment Method Distribution donut chart, Sales Heatmap)

- **Point of Sale**: Product grid with barcode scanning, quick product search, category filters, shopping cart, hold sale, resume sale, split payments, multiple payment methods, discounts, tax management, receipt preview, thermal receipt support, checkout functionality

- **Products**: Product management table with add/edit/delete capabilities, stock alerts, inventory tracking, pagination, search, filters

- **Inventory Management**: Displays inventory valuation, stock movement history, batch tracking, stock adjustments, stock transfer, low stock alerts, out of stock alerts, reorder suggestions, dead stock analysis, fast moving products, virtualized tables for performance

- **Customers**: Customer profiles, purchase history, customer analytics, loyalty points, customer segmentation, top customers, customer growth metrics, search, filters

- **Reports Center**: Generates reports (Daily Sales, Weekly, Monthly, Annual, Product, Inventory, Customer, Profit, Staff Performance) with date range filters, export to PDF/Excel/CSV

- **Staff**: Employee list with performance metrics, activity logs, shift summaries, add/edit/delete capabilities

- **Settings**: Business profile, tax settings, receipt customization, user preferences

**Cashier Views:**

- **Dashboard Overview**: Displays KPI cards (Today's Sales, Orders Served, Average Sale, Products Sold, Customers Served, Refunds, Shift Sales) and Recharts visualizations (Hourly Sales bar chart, Sales Trend line chart, Product Performance bar chart)

- **Point of Sale**: Simplified product selection with barcode scanning, quick search, recent sales, hold sale, resume sale, quick checkout, receipt printing

- **Products**: Read-only product catalog with search and category browsing

- **Sales History**: Transaction log for current and previous shifts with date filters

- **Profile**: Personal information, shift clock in/out, password change

#### 3.5.4 UI/UX Design Requirements

- Premium interface using Tailwind CSS with glassmorphism cards, premium shadows, smooth transitions
- Color tokens: Primary:#0F172A, Secondary:#1E293B, Accent:#3B82F6, Light Accent:#60A5FA, Background:#F8FAFC, Cards:#FFFFFF, Text:#0F172A, Muted:#64748B, Success:#22C55E, Warning:#F59E0B, Danger:#EF4444
- Gradients: Main=linear-gradient(135deg,#0F172A 0%,#1E293B 50%,#3B82F6 100%), Premium=linear-gradient(135deg,#0F172A 0%,#1E40AF 50%,#60A5FA 100%), Button=linear-gradient(135deg,#2563EB 0%,#3B82F6 100%)
- Modern typography with better spacing
- Professional tables with virtualization for large datasets
- Beautiful forms with validation feedback
- Mobile-first responsive design
- Elegant animations and transitions
- Consistent design system across all components
- Dark mode support
- Loading states, empty states, error handling for all components
- Accessibility compliance

---

## 4. Business Rules and Logic

### 4.1 System Audit & Fixes

- Fix broken pages, missing routes, unused components, duplicate code
- Fix performance bottlenecks, security vulnerabilities, Supabase issues
- Fix UI inconsistencies, mobile responsiveness, state management issues
- Add missing loading states, empty states, error handling, accessibility features

### 4.2 Landing Page Access

- Public landing page (/) accessible without authentication
- Get Started button redirects to /register
- Login button redirects to /login
- Landing page uses defined color tokens and gradients

### 4.3 RBAC Architecture

- Every API request includes JWT token in authorization header
- Backend validates user role on every request via AuthMiddleware
- Role permissions strictly enforced:
  - SuperAdmin: Full system access across all tenants
  - Owner: Full access within their own tenant only
  - Cashier: Limited access to sales and basic inventory within their tenant
- Unauthorized access returns 403 Forbidden
- Protected routes enforce authentication and authorization
- Audit logs track all user actions

### 4.4 Multi-tenant Isolation

- Each tenant operates in isolated data space
- Users access only their tenant data (except SuperAdmin)
- Tenant ID extracted from JWT filters all database queries
- Row Level Security enforced at database level

### 4.5 License Activation Flow

- New tenants start with is_activated = false
- Dashboard access blocked until payment verified
- Payment verification checks valid entry in payment/license table
- License activation is one-time and permanent
- Activated tenants have unrestricted access to role-specific features

### 4.6 Sidebar Rendering Logic

- Sidebar components rendered based on user role from JWT
- Sidebar state persists across page navigation
- Lazy loading for sidebar components

### 4.7 Date/Time Clock

- Header clock updates every second
- Displays current date and time in user's local timezone
- Format: YYYY-MM-DD HH:MM:SS Day

### 4.8 Data Visualization

- All charts rendered using Recharts library
- Chart data fetched from backend APIs and updated in real-time
- Charts handle empty data states with appropriate messages
- All analytics connected to real Supabase data
- No mock data used where real data exists

### 4.9 Dashboard KPIs

- Owner Dashboard: Today's Sales, Monthly Sales, Annual Sales, Gross Profit, Net Profit, Total Orders, Average Order Value, Total Customers, New Customers, Inventory Value, Low Stock Products, Out of Stock Products, Active Staff, Top Selling Product, Top Category, Profit Margin %
- SuperAdmin Dashboard: Total Tenants, Active Tenants, New Tenants, Trial Accounts, Expiring Subscriptions, MRR, ARR, Total Revenue, Revenue Growth, Churn Rate, Conversion Rate, Active Users, Total Staff, Database Usage, API Requests
- Cashier Dashboard: Today's Sales, Orders Served, Average Sale, Products Sold, Customers Served, Refunds, Shift Sales

### 4.10 Inventory Management

- Inventory valuation calculated based on stock levels and product costs
- Stock movement history tracks all inventory changes
- Batch tracking for products with batch numbers
- Stock adjustments allow manual inventory corrections
- Stock transfer between locations or warehouses
- Low stock alerts trigger when inventory falls below threshold
- Out of stock alerts trigger when inventory reaches zero
- Reorder suggestions based on sales velocity and lead time
- Dead stock analysis identifies slow-moving inventory
- Fast moving products identified based on sales frequency

### 4.11 POS Operations

- Barcode scanning for quick product lookup
- Quick product search by name, SKU, or category
- Recent sales display for quick reorder
- Hold sale functionality saves incomplete transactions
- Resume sale retrieves held transactions
- Split payments support multiple payment methods per transaction
- Discounts applied at item or transaction level
- Tax management calculates applicable taxes
- Receipt preview before printing
- Thermal receipt support for POS printers

### 4.12 Customer Management

- Customer profiles store contact information and preferences
- Purchase history tracks all customer transactions
- Customer analytics show spending patterns and frequency
- Loyalty points accumulate based on purchases
- Customer segmentation groups customers by behavior
- Top customers identified by total spend or frequency
- Customer growth metrics track new customer acquisition

### 4.13 Reporting Center

- Reports generated: Daily Sales, Weekly, Monthly, Annual, Product, Inventory, Customer, Profit, Staff Performance
- Date range filters allow custom reporting periods
- Export functionality supports PDF, Excel, CSV formats
- Reports use real-time data from Supabase

### 4.14 Performance Optimization

- Lazy loading for route components
- Route splitting for code optimization
- Query optimization for database operations
- Caching for frequently accessed data
- Pagination for large datasets
- Virtualized tables for rendering large lists
- Image optimization for faster loading

### 4.15 Security

- Row Level Security improvements at database level
- Permission checks on all API endpoints
- Audit logs for all user actions
- Session management with JWT expiration
- Protected routes enforce authentication
- Secure API access with token validation
- Data validation on all inputs

---

## 5. Exception and Boundary Conditions

| Scenario | Handling |
|----------|----------|
| Invalid JWT token | Return 401 Unauthorized, redirect to Login Page |
| Expired JWT token | Return 401 Unauthorized, redirect to Login Page |
| User attempts unauthorized resource | Return 403 Forbidden with error message |
| Tenant not activated attempts dashboard | Redirect to License Activation Module |
| Payment verification fails | Display error message, keep tenant non-activated |
| Database connection failure | Display system error message, log error for SuperAdmin |
| Sidebar component fails to load | Display fallback UI, log error |
| Receipt printer not connected | Display warning message, allow manual receipt generation |
| Invalid license_key format | Reject registration, display validation error |
| Duplicate business name | Allow registration (business names can be duplicated) |
| Chart data fails to load | Display error message in chart area, allow retry |
| Empty data for charts | Display \"No data available\" message with icon |
| Landing page fails to load | Display error message, provide retry option |
| Barcode scanner not connected | Display warning, allow manual product entry |
| Low stock threshold reached | Display alert notification, suggest reorder |
| Out of stock product selected | Display warning, prevent sale completion |
| Customer not found | Allow quick customer creation during checkout |
| Report generation fails | Display error message, log error, allow retry |
| Export to PDF/Excel/CSV fails | Display error message, allow retry |
| Network timeout during API request | Display timeout message, allow retry |
| Concurrent stock updates | Use database locking, display conflict message |
| Invalid discount amount | Display validation error, prevent application |
| Split payment total mismatch | Display error, require correction |

---

## 6. Acceptance Criteria

1. Visitor accesses root route (/), views premium landing page with hero section, features, pricing, testimonials, footer using defined color tokens and gradients
2. Visitor clicks Get Started button, redirects to /register with premium form design
3. User registers new business account, receives unique license_key, is_activated set to false
4. User logs in with valid credentials, receives JWT token
5. System redirects non-activated tenant to License Activation Module
6. User completes payment, system verifies payment, updates is_activated to true
7. User accesses Dashboard, sees role-specific sidebar with premium UI design
8. Owner views Dashboard Overview with all KPI cards (Today's Sales, Monthly Sales, Annual Sales, Gross Profit, Net Profit, Total Orders, Average Order Value, Total Customers, New Customers, Inventory Value, Low Stock Products, Out of Stock Products, Active Staff, Top Selling Product, Top Category, Profit Margin %) and Recharts visualizations (Daily Sales Trend, Weekly Sales Trend, Monthly Revenue Trend, Sales by Category, Top Products, Revenue vs Profit, Customer Growth, Stock Movement, Payment Method Distribution, Sales Heatmap) displaying real Supabase data
9. Owner accesses Inventory Management, views inventory valuation, stock movement history, low stock alerts, reorder suggestions, fast moving products
10. Owner accesses Customers, views customer profiles, purchase history, customer analytics, loyalty points, top customers
11. Owner accesses Reports Center, generates Daily Sales report, exports to PDF
12. Cashier processes sale using barcode scanning, applies discount, completes split payment, prints thermal receipt
13. SuperAdmin views Dashboard Overview with all KPI cards (Total Tenants, Active Tenants, New Tenants, MRR, ARR, Total Revenue, Revenue Growth, Churn Rate, Conversion Rate, Active Users, Database Usage) and Recharts visualizations (Revenue Growth, Tenant Growth, Subscription Distribution, Monthly Recurring Revenue, Churn Analysis, Active Users Trend, Plan Comparison, SaaS Growth Metrics) displaying real Supabase data
14. System performs lazy loading, route splitting, query optimization, caching, pagination, virtualized tables for optimal performance
15. All pages display loading states, empty states, error handling, and are mobile responsive with dark mode support

---

## 7. Out of Scope for Current Release

- Multi-language support
- Mobile application (iOS/Android)
- Offline mode or local data caching
- Integration with third-party accounting software
- Automated email notifications for low inventory or sales milestones
- Multi-currency support
- Employee scheduling and payroll management
- Subscription-based recurring payment model
- API access for third-party integrations
- White-label customization options
- Two-factor authentication (2FA)
- Password reset via email
- User profile customization (avatar, preferences)
- Landing page A/B testing
- SEO optimization for landing page
- Analytics tracking on landing page
- Live chat support widget
- Advanced forecasting and predictive analytics
- Automated reordering based on AI predictions
- Integration with e-commerce platforms
- Multi-location inventory synchronization
- Advanced customer segmentation with machine learning
- Automated marketing campaigns
- Gift card and voucher management
- Table management for restaurants
- Kitchen display system integration
- Delivery management integration
- Advanced employee permissions with custom roles
- Time tracking and attendance management
- Commission calculation for sales staff
- Supplier management and purchase orders
- Return and refund workflow automation
- Product bundling and combo offers
- Dynamic pricing based on demand
- Integration with payment gateways beyond current support
- Blockchain-based transaction verification
- Biometric authentication for POS access
=======
PosifyPro Application
├── Super Admin Pages
│   ├── Dashboard
│   ├── Tenants
│   │   ├── Businesses
│   │   ├── Licenses
│   │   ├── Subscription Plans
│   │   ├── Payments
│   │   └── Trial Management
│   ├── Users
│   │   ├── System Users
│   │   └── Roles & Permissions
│   ├── Business Monitoring
│   │   ├── Active Businesses
│   │   ├── Suspended Businesses
│   │   └── Login Activity
│   ├── Reports
│   │   ├── Revenue
│   │   ├── Subscription Reports
│   │   ├── Usage Analytics
│   │   └── System Analytics
│   ├── Communication
│   │   ├── Notifications
│   │   └── Announcements
│   ├── System
│   │   ├── Integrations
│   │   ├── Tax Configuration
│   │   ├── Receipt Templates
│   │   ├── Email Settings
│   │   ├── SMS Settings
│   │   ├── WhatsApp Settings
│   │   ├── Payment Gateways
│   │   └── M-Pesa Configuration
│   ├── Administration
│   │   ├── Audit Logs
│   │   ├── Activity Logs
│   │   ├── Backup & Restore
│   │   └── System Settings
│   ├── Profile
│   └── Sign Out
├── Owner Pages
│   ├── Dashboard
│   ├── Sales
│   │   ├── POS Sales
│   │   ├── Sales History
│   │   ├── Quotations
│   │   ├── Invoices
│   │   └── Returns
│   ├── Inventory
│   │   ├── Products
│   │   ├── Categories
│   │   ├── Inventory
│   │   ├── Stock Movements
│   │   └── Inventory Reports
│   ├── Customers & Suppliers
│   │   ├── Customers
│   │   └── Suppliers
│   ├── Purchasing
│   │   ├── Purchases
│   │   └── Purchase Orders
│   ├── Finance
│   │   ├── Expenses
│   │   ├── Profit & Loss
│   │   └── Revenue Reports
│   ├── Staff
│   │   ├── Staff Management
│   │   └── Roles & Permissions
│   ├── Communication
│   │   └── Notifications
│   ├── Settings
│   │   ├── Business Settings
│   │   ├── Receipt Settings
│   │   ├── Tax Settings
│   │   ├── Integrations
│   │   └── License & Subscription
│   ├── Profile
│   └── Sign Out
├── Manager Pages
│   ├── Dashboard
│   ├── Sales
│   │   ├── POS Sales
│   │   ├── Sales History
│   │   ├── Quotations
│   │   ├── Invoices
│   │   └── Returns
│   ├── Inventory
│   │   ├── Products
│   │   ├── Categories
│   │   ├── Inventory
│   │   ├── Stock Movements
│   │   └── Inventory Reports
│   ├── Customers & Suppliers
│   │   ├── Customers
│   │   └── Suppliers
│   ├── Purchasing
│   │   └── Purchases
│   ├── Finance
│   │   ├── Expenses
│   │   └── Revenue Reports
│   ├── Communication
│   │   └── Notifications
│   ├── Profile
│   └── Sign Out
└── Cashier Pages
    ├── Dashboard
    ├── Sales
    │   ├── POS Sales
    │   └── Sales History
    ├── Customers
    ├── Invoices
    │   ├── View Invoices
    │   └── Record Payments (if enabled)
    ├── Notifications
    ├── Profile
    └── Sign Out
```

### 3.2 Sidebar Navigation Component

**Functionality**:
- Display navigation menu dynamically based on logged-in user's role and permissions
- Group related menu items into logical sections with section headers
- Support collapsible sections on desktop
- Highlight the active page
- Support light and dark themes
- Hide menu items the current user is not authorized to access
- Adapt layout based on device screen size

### 3.3 Navigation Configuration

**Functionality**:
- Centralize all menu definitions in a single navigation config file
- Define menu structure for each role (Super Admin, Owner, Manager, Cashier)
- Specify permissions required for each menu item
- Support nested menu items and section grouping
- Allow future modules to be added by updating the config file

### 3.4 Permission Guard

**Functionality**:
- Protect every route with permission validation
- Check user's role and permissions before rendering protected pages
- Redirect unauthorized users to appropriate error or login page
- Prevent direct URL access to unauthorized routes

### 3.5 Role-Based Menu Generation

**Super Admin Menu**:
- Dashboard
- Tenants: Businesses, Licenses, Subscription Plans, Payments, Trial Management
- Users: System Users, Roles & Permissions
- Business Monitoring: Active Businesses, Suspended Businesses, Login Activity
- Reports: Revenue, Subscription Reports, Usage Analytics, System Analytics
- Communication: Notifications, Announcements
- System: Integrations, Tax Configuration, Receipt Templates, Email Settings, SMS Settings, WhatsApp Settings, Payment Gateways, M-Pesa Configuration
- Administration: Audit Logs, Activity Logs, Backup & Restore, System Settings
- Profile, Sign Out

**Owner Menu**:
- Dashboard
- Sales: POS Sales, Sales History, Quotations, Invoices, Returns
- Inventory: Products, Categories, Inventory, Stock Movements, Inventory Reports
- Customers & Suppliers: Customers, Suppliers
- Purchasing: Purchases, Purchase Orders
- Finance: Expenses, Profit & Loss, Revenue Reports
- Staff: Staff Management, Roles & Permissions
- Communication: Notifications
- Settings: Business Settings, Receipt Settings, Tax Settings, Integrations, License & Subscription
- Profile, Sign Out

**Manager Menu**:
- Dashboard
- Sales: POS Sales, Sales History, Quotations, Invoices, Returns
- Inventory: Products, Categories, Inventory, Stock Movements, Inventory Reports
- Customers & Suppliers: Customers, Suppliers
- Purchasing: Purchases
- Finance: Expenses, Revenue Reports
- Communication: Notifications
- Profile, Sign Out

**Cashier Menu**:
- Dashboard
- Sales: POS Sales, Sales History
- Customers: Customers
- Invoices: View Invoices, Record Payments (if enabled by Owner)
- Notifications
- Profile, Sign Out

### 3.6 Responsive Design Behavior

**Desktop (>1024px)**:
- Display expanded sidebar with section headers and full menu labels
- Support optional collapse to icon-only mode
- Allow users to toggle between expanded and collapsed states

**Tablet (768–1024px)**:
- Display collapsible drawer sidebar
- Auto-hide labels when collapsed, showing icons only
- Allow users to expand/collapse the drawer

**Mobile (<768px)**:
- Display hamburger menu icon
- Show full-screen slide-out navigation when hamburger is clicked
- Auto-close sidebar after user selects a menu item

### 3.7 Permission Customization (Owner)

**Functionality**:
- Allow Owners to customize Manager and Cashier permissions
- Provide interface to enable/disable specific features for Manager and Cashier roles
- Store permission settings in database
- Apply customized permissions when generating sidebar for Manager and Cashier users

## 4. Business Rules and Logic

### 4.1 Role-Based Access Control (RBAC)

**Super Admin Permissions**:
- Full platform access across all tenants
- Manage all businesses, users, subscriptions, payments, licenses
- Suspend or activate businesses
- Access system-wide reports and analytics
- Configure system settings, integrations, payment gateways

**Owner Permissions**:
- Full access within their own tenant only
- Cannot access other tenants' data
- Manage sales, inventory, customers, suppliers, purchases, finance, staff
- Configure business settings, receipt settings, tax settings, integrations
- Manage subscription and license for their own business
- Customize Manager and Cashier permissions

**Manager Permissions**:
- Operational management within their tenant
- Access sales, inventory, customers, suppliers, purchases, finance (limited)
- Cannot manage subscriptions, licenses, business ownership, system configuration
- Cannot delete business or access Super Admin functions
- Cannot view profit & loss reports (only revenue reports)
- Permissions can be customized by Owner

**Cashier Permissions**:
- Sales operations only within their tenant
- Access POS sales, sales history, customers
- View invoices and record payments (if enabled by Owner)
- Cannot manage products (unless enabled by Owner)
- Cannot view expenses, profit reports, inventory reports
- Cannot access tax/receipt settings, staff management, suppliers, purchases, subscriptions
- Cannot access Super Admin functions
- Permissions can be customized by Owner

### 4.2 Permission Validation

- All backend APIs must validate user permissions before processing requests
- Permission checks must occur even if users attempt to bypass UI restrictions
- Permissions are database-driven, not hardcoded
- Support granular permissions: View, Create, Edit, Delete, Export, Approve, Manage

### 4.3 Multi-Tenant Isolation

- Super Admin can access all tenants
- Owner, Manager, Cashier can only access data within their own tenant
- All database queries must filter by tenant ID (except for Super Admin)
- Prevent cross-tenant data leakage through API or UI

### 4.4 Dynamic Menu Generation

- Sidebar menu is generated dynamically based on logged-in user's role and permissions
- Menu items are filtered based on user's authorized access
- If a user lacks permission for a menu item, it is hidden from the sidebar
- Menu structure is defined in centralized navigation config file

### 4.5 Route Protection

- Every route is protected with permission guards
- Permission guards check user's role and permissions before rendering page
- Unauthorized users are redirected to error page or login page
- Direct URL access to unauthorized routes is blocked

### 4.6 Future Module Support

- Navigation config file supports adding new modules without restructuring sidebar
- Future modules include:
  - Sales: Quotations, Invoices, Returns, Credit Notes
  - Inventory: Barcode Printing, Stock Transfer, Stock Adjustment
  - Finance: Customer Statements, Supplier Statements, Cash Flow
  - CRM: Loyalty Program, Promotions, Gift Cards
  - Communication: Email Campaigns, SMS Campaigns, WhatsApp Broadcast
  - Analytics: Sales Dashboard, Customer Analytics, Product Analytics
- New modules are added by updating navigation config and defining permissions

## 5. Exceptions and Edge Cases

| Scenario | Handling |
|----------|----------|
| User has no permissions for any menu items | Display empty sidebar or default message |
| User attempts to access unauthorized route via direct URL | Redirect to error page or login page |
| User's role or permissions change during active session | Refresh sidebar menu or prompt user to re-login |
| Owner disables a feature for Manager/Cashier while they are using it | Hide menu item immediately or show access denied message |
| Sidebar fails to load due to network error | Display error message and retry button |
| User switches between light and dark themes | Sidebar updates theme styling immediately |
| User resizes browser window across responsive breakpoints | Sidebar adapts layout dynamically |
| Super Admin suspends a business while Owner is logged in | Log out Owner and display suspension notice |
| Database-driven permissions fail to load | Fall back to default role-based permissions or deny access |

## 6. Acceptance Criteria

1. User logs in with their role (Super Admin, Owner, Manager, or Cashier)
2. Sidebar displays menu items tailored to user's role and permissions
3. User clicks on a menu item and navigates to the corresponding page
4. User attempts to access an unauthorized route via direct URL and is redirected to error page
5. User resizes browser window and sidebar adapts to responsive breakpoints (desktop, tablet, mobile)
6. Owner customizes Manager permissions and Manager's sidebar updates accordingly
7. User completes a core task (e.g., Super Admin manages a business, Owner processes a sale, Manager views inventory, Cashier completes a transaction)

## 7. Out of Scope for This Release

- Keyboard shortcuts for navigation
- Drag-and-drop menu customization
- Pinning favorite menu items
- Search functionality within sidebar
- Breadcrumb navigation
- Recently accessed pages history
- Multi-language support for menu labels
- Animated transitions between menu states
- Offline mode for sidebar
- Integration with third-party analytics for menu usage tracking
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
