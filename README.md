# Urban Dhaga — Admin Panel

The admin dashboard for **Urban Dhaga**. Store staff use it to manage products, inventory, orders, customers and store content.


## Planned Features

- **Dashboard:** sales overview, recent orders, low-stock alerts
- **Products:** create, edit and archive products, with variants (size, color), pricing and images
- **Inventory:** stock levels for each variant
- **Orders:** view orders, update their status (pending → shipped → delivered), handle returns
- **Customers:** customer list and order history
- **Categories & Collections:** organise the catalogue
- **Auth & Roles:** admin login with role-based access (owner, staff)



## Project Structure 

```
src/
  app/
    (auth)/login/        # Admin login
    (dashboard)/         # Protected admin routes
      products/
      orders/
      customers/
      inventory/
    api/                 # Route Handlers (if the backend is in Next.js)
  components/            # Shared UI components
  lib/                   # DB client, auth, utilities
```
