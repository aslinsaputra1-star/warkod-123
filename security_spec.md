# Security Specification - Warung Bang Kobra

## 1. System Invariants & Role Boundaries

- **Role Hierarchy**:
  - `Owner`: Akses penuh (Full access to all collections: users, products, categories, orders, expenses, reports, customers, stock mutations, settings). Bootstrapped by verified email `rayyanarasid549@gmail.com` or `users/{uid}.role == 'Owner'`.
  - `Admin`: Akses operasional luas (CRUD products, categories, orders, customers, stock mutations, expenses, reports; read user profiles). Cannot demote/delete the Owner.
  - `Kasir`: Akses operasional kasir (Create & Read orders, update order status, read products & categories, read/write customers, log stock mutations). CANNOT read reports, CANNOT read expenses, CANNOT modify products, CANNOT read/modify other user accounts.
  - `Staff`: Dapur & Gudang (Read orders, update order status, read products, log stock mutations). CANNOT read reports or expenses, CANNOT modify user accounts.
  - `Customer`: Pelanggan warung (Browse products and categories, submit new self-order QR, read their own order). CANNOT read reports, CANNOT read expenses, CANNOT read user accounts, CANNOT modify products, CANNOT access dashboard.
- **No Password in Firestore Invariant**: Under NO circumstances may passwords, PINs, or raw authentication secrets be stored in Firestore documents. All user authentication must occur via Firebase Authentication (`request.auth`).
- **Product Immutability for Customers**: Products and categories are read-only for Customers and Cashiers. Only Admin and Owner can create, update, or delete products.
- **Expense & Report Confidentiality**: `/expenses/{expenseId}` and `/reports/{reportId}` are strictly forbidden for Customers and Cashiers. Only Admin and Owner can read or write.
- **User Document Isolation**: A Customer can never read or list documents in `/users` except their own document (`request.auth.uid == userId`). A user can never elevate their own role (`role` field cannot be modified by non-Admin/Owner).
- **Order Integrity**: Total must be a positive number; status transitions must follow valid enums (`['Pending', 'Diproses', 'Selesai', 'Dibatalkan']`). Only staff/kasir/admin/owner can change status.

---

## 2. The "Dirty Dozen" Payloads (Adversarial Test Scenarios)

1. **Payload 1 (Customer reading financial reports)**:
   - Request: `GET /reports/2026-09-17` with `auth.uid = "customer_123"` and `role = "Customer"`.
   - Expected: `PERMISSION_DENIED`.
2. **Payload 2 (Customer reading operational expenses)**:
   - Request: `GET /expenses/exp_001` or `LIST /expenses` with `auth.uid = "customer_123"`.
   - Expected: `PERMISSION_DENIED`.
3. **Payload 3 (Customer attempting to alter product price)**:
   - Request: `UPDATE /products/p1` with `{ harga_jual: 500 }` by `auth.uid = "customer_123"`.
   - Expected: `PERMISSION_DENIED`.
4. **Payload 4 (Customer reading user accounts / PII)**:
   - Request: `GET /users/staff_kasir_uid` or `LIST /users` by `auth.uid = "customer_123"`.
   - Expected: `PERMISSION_DENIED`.
5. **Payload 5 (Unauthenticated malicious write injecting password into user profile)**:
   - Request: `CREATE /users/hacked_uid` with `{ password: "stolen_password_123", pin: "1234" }`.
   - Expected: `PERMISSION_DENIED`.
6. **Payload 6 (Privilege Escalation - Customer elevating role to Owner)**:
   - Request: `UPDATE /users/customer_123` with `{ role: "Owner" }` by `auth.uid = "customer_123"`.
   - Expected: `PERMISSION_DENIED`.
7. **Payload 7 (Cashier reading expenses / financial audits)**:
   - Request: `LIST /expenses` by `auth.uid = "kasir_uid"` where user document has `role: "Kasir"`.
   - Expected: `PERMISSION_DENIED`.
8. **Payload 8 (Cashier reading net profit report)**:
   - Request: `GET /reports/monthly_summary` by `auth.uid = "kasir_uid"`.
   - Expected: `PERMISSION_DENIED`.
9. **Payload 9 (Cashier attempting to delete product catalog)**:
   - Request: `DELETE /products/kobra_signature` by `auth.uid = "kasir_uid"`.
   - Expected: `PERMISSION_DENIED`.
10. **Payload 10 (Path Traversal / ID Poisoning Attack)**:
    - Request: `CREATE /orders/../../../etc/passwd` or `CREATE /orders/` with 2000-character junk string.
    - Expected: `PERMISSION_DENIED`.
11. **Payload 11 (Order Total Forgery - Negative or Non-numeric total)**:
    - Request: `CREATE /orders/ord_spoofed` with `{ total: -9999999, status: "Selesai" }` by customer.
    - Expected: `PERMISSION_DENIED`.
12. **Payload 12 (Ghost Field Injection / Shadow Update)**:
    - Request: `UPDATE /orders/ord_123` with `{ ghostField: true, isAdmin: true }` by customer.
    - Expected: `PERMISSION_DENIED`.

---

## 3. Test Runner Specification (`firestore.rules.test.ts`)

A dedicated test runner file `firestore.rules.test.ts` validates these invariants using `@firebase/rules-unit-testing` or programmatic assertions.
