# The Peoples Butchery - Backend API

Production-grade Node.js + Express + PostgreSQL API server for The Peoples Butchery.

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your local database credentials
# DB_HOST=localhost
# DB_USER=your_db_user
# DB_PASSWORD=your_db_password

# Start development server (with hot reload)
npm run dev

# Or production server
npm start
```

Server runs on `http://localhost:3000`

### Database Setup

```bash
# PostgreSQL must be running
# Create database and seed with initial data
npm run migrate
npm run seed
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update profile
- `GET /api/users/loyalty` - Get loyalty points & credit balance

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:orderId` - Get order details

### Admin
- `GET /api/admin/stats` - Dashboard statistics (admin)
- `GET /api/admin/orders` - All orders (admin)
- `PUT /api/admin/orders/:orderId/status` - Update order status (admin)
- `GET /api/admin/users` - All users (admin)

## Authentication

All protected endpoints require JWT token in Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Tokens expire after 7 days (configurable in .env)

## Database Schema

### Users
```
- id (PK)
- ref_number (unique)
- name, surname, email, phone
- password_hash
- address, suburb, coordinates
- credit_balance, loyalty_points
- referral_code, referred_by
- is_admin
- created_at, updated_at
```

### Products
```
- id (PK)
- name, category, description, price
- image_url, available_qty
- is_active
- created_at, updated_at
```

### Orders
```
- id (PK)
- order_number (unique)
- user_id (FK)
- total, delivery_fee, points_earned
- status (pending, braai, packaging, dispatched)
- delivery_method, delivery_address, delivery_coordinates
- created_at, updated_at
```

### Order Items
```
- id (PK)
- order_id (FK), product_id (FK)
- quantity, price
```

## Environment Variables

```
DB_HOST              PostgreSQL host
DB_PORT              PostgreSQL port (default: 5432)
DB_NAME              Database name
DB_USER              Database user
DB_PASSWORD          Database password
NODE_ENV             'development' or 'production'
PORT                 Server port (default: 3000)
API_URL              Full API URL (for CORS)
JWT_SECRET           JWT signing secret (min 32 chars)
JWT_EXPIRY           Token expiry (e.g., '7d')
CLIENT_URL           Frontend URL (for CORS)
ADMIN_EMAIL          Admin email for seeding
ADMIN_PIN            Admin PIN for portal
```

## Error Handling

All errors return JSON with error message:

```json
{
  "error": "Descriptive error message"
}
```

## Security Features

- ✓ Password hashing with bcrypt
- ✓ JWT authentication
- ✓ CORS protection
- ✓ Helmet security headers
- ✓ Input validation with express-validator
- ✓ SQL injection protection (parameterized queries)
- ✓ Environment variable management

## Deployment

See [GODADDY_DEPLOYMENT.md](../GODADDY_DEPLOYMENT.md) for production deployment guide.

## Project Structure

```
backend/
├── src/
│   ├── server.js           # Main entry point
│   ├── config/
│   │   └── database.js     # Database connection & schema
│   ├── middleware/
│   │   └── auth.js         # JWT authentication
│   ├── routes/
│   │   ├── auth.js         # Authentication endpoints
│   │   ├── users.js        # User endpoints
│   │   ├── products.js     # Product endpoints
│   │   ├── orders.js       # Order endpoints
│   │   └── admin.js        # Admin endpoints
│   └── controllers/        # Business logic (ready for expansion)
├── package.json            # Dependencies
├── .env.example            # Environment template
└── README.md               # This file
```

## Future Enhancements

- [ ] Geolocation delivery fee calculation
- [ ] AI order status automation (pending → braai → packaging)
- [ ] Email notifications
- [ ] Payment gateway integration (Stripe/Payfast)
- [ ] SMS alerts
- [ ] Advanced analytics dashboard
- [ ] Referral system automation
- [ ] Loyalty redemption system

## Support

For issues or questions, contact: admin@thepeoplesbutchery.co.za

---

**The Peoples Butchery** | Production API | 2024
