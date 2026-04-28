# The Peoples Butchery - E-Commerce Platform

**Status:** Production-ready | **Domain:** thepeoplesbutchery.co.za

Complete e-commerce & order management system for The Peoples Butchery, located at 76 Meeu St, East Lynne, Pretoria.

## 🚀 Technology Stack

### Frontend
- HTML5 / CSS3 / JavaScript (vanilla)
- Responsive design
- Print templates for reports & invoices
- Local storage state management

### Backend
- **Node.js + Express.js** - REST API
- **PostgreSQL** - Relational database
- **JWT** - Authentication & authorization
- **bcryptjs** - Password hashing
- **Helmet** - Security headers

### Infrastructure
- **GoDaddy VPS** - Ubuntu 22.04 LTS
- **Nginx** - Reverse proxy & static serving
- **PM2** - Process management
- **Let's Encrypt** - SSL/TLS certificates

## 📁 Project Structure

```
nilos-butchery/
├── frontend/
│   ├── index.html                 # Home page
│   ├── shop.html                  # Product catalog & cart
│   ├── login.html                 # User authentication
│   ├── register.html              # User registration
│   ├── admin.html                 # Admin panel
│   ├── dashboard.html             # Order dashboard
│   ├── print_*.html               # Report templates
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js                 # Core app logic
│   │   ├── shop.js                # Shopping cart & orders
│   │   ├── admin.js               # Admin functions
│   │   └── dashboard.js           # Order tracking
│   └── assets/
│
├── backend/                        # NEW: Production API
│   ├── src/
│   │   ├── server.js              # Express server entry
│   │   ├── config/database.js     # PostgreSQL & schema
│   │   ├── middleware/auth.js     # JWT authentication
│   │   ├── routes/
│   │   │   ├── auth.js            # /api/auth
│   │   │   ├── users.js           # /api/users
│   │   │   ├── products.js        # /api/products
│   │   │   ├── orders.js          # /api/orders
│   │   │   └── admin.js           # /api/admin
│   │   └── controllers/           # Business logic
│   ├── package.json               # Dependencies
│   ├── .env.example               # Environment template
│   └── README.md                  # Backend docs
│
├── GODADDY_DEPLOYMENT.md          # NEW: Production deployment guide
├── agent.md                       # AI assistant rules
└── README.md                      # This file

```

## 🎯 Key Features

### Customer Portal
- ✅ User registration & authentication
- ✅ Product catalog browsing
- ✅ Shopping cart & checkout
- ✅ Order tracking with real-time status
- ✅ Loyalty points system (1 point per R10 spent)
- ✅ Referral rewards program
- ✅ Delivery fee calculation (5km free, R2/km after)
- ✅ Order history & receipts

### Admin Dashboard
- ✅ Order management interface
- ✅ Order status automation (pending → braai → packaging → dispatched)
- ✅ Product inventory management
- ✅ Customer management
- ✅ Financial reporting
- ✅ Revenue analytics

### Loyalty Programs
- **Points System:** 1 point earned per R10 spent
- **Redemption:** 10 points = R1 credit
- **Tier Rewards:** 
  - 5,000 points = full lamb
  - 20,000 points = full cow
- **Referral Bonuses:** 100 points per successful referral

## 🔧 Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Npm

### Development Environment

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with local database credentials
npm run dev
# API runs on http://localhost:3000

# Frontend
# Open index.html in browser or serve with local HTTP server
# Point API calls to http://localhost:3000
```

### Production Deployment

Follow the complete step-by-step guide in **[GODADDY_DEPLOYMENT.md](GODADDY_DEPLOYMENT.md)**

Key steps:
1. Provision GoDaddy VPS (Ubuntu 22.04)
2. Install Node.js, PostgreSQL, Nginx, PM2
3. Clone repository and configure environment
4. Deploy API with PM2
5. Configure Nginx reverse proxy
6. Install SSL certificate (Let's Encrypt)
7. Deploy frontend files

## 📡 API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login & get JWT |
| GET | `/api/users/me` | Yes | Get profile |
| PUT | `/api/users/me` | Yes | Update profile |
| GET | `/api/users/loyalty` | Yes | Get loyalty info |
| GET | `/api/products` | No | List all products |
| GET | `/api/products/:id` | No | Get product details |
| POST | `/api/products` | Admin | Create product |
| PUT | `/api/products/:id` | Admin | Update product |
| POST | `/api/orders` | Yes | Create order |
| GET | `/api/orders` | Yes | Get user's orders |
| GET | `/api/orders/:id` | Yes | Get order details |
| GET | `/api/admin/stats` | Admin | Dashboard stats |
| GET | `/api/admin/orders` | Admin | All orders |
| PUT | `/api/admin/orders/:id/status` | Admin | Update order status |
| GET | `/api/admin/users` | Admin | All users |

## 🔐 Security

- ✅ JWT token-based authentication (7-day expiry)
- ✅ Bcrypt password hashing
- ✅ CORS protection
- ✅ SQL injection prevention (parameterized queries)
- ✅ Environment variable management
- ✅ HTTPS/SSL enforcement on production
- ✅ Security headers via Helmet

## 💾 Database

Automatically created tables:
- `users` - Customer accounts & loyalty
- `products` - Inventory
- `orders` - Order records
- `order_items` - Order line items
- `transactions` - Payment history

## 📊 Deployment Checklist

- [ ] Domain configured on GoDaddy
- [ ] VPS provisioned and updated
- [ ] PostgreSQL installed and configured
- [ ] Node.js 18 installed
- [ ] Repository cloned to `/var/www/thepeoplesbutchery`
- [ ] `.env` configured with production values
- [ ] Database schema migrated
- [ ] API running with PM2
- [ ] Nginx configured as reverse proxy
- [ ] SSL certificate installed
- [ ] Frontend files deployed
- [ ] Firewall rules configured (80, 443, 22)
- [ ] Backups scheduled

## 🆘 Troubleshooting

### Database connection fails
```bash
# Check PostgreSQL
sudo systemctl status postgresql
ps aux | grep postgres
```

### API won't start
```bash
# Check PM2 logs
pm2 logs peoples-butchery-api --err

# Check if port 3000 is in use
lsof -i :3000
```

### HTTPS issues
```bash
# Check certificate
openssl x509 -in /etc/letsencrypt/live/api.thepeoplesbutchery.co.za/cert.pem -text -noout | grep "Not After"
```

See [GODADDY_DEPLOYMENT.md](GODADDY_DEPLOYMENT.md#troubleshooting) for more.

## 📝 Environment Variables

All required variables are listed in `.env.example`:

```
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
NODE_ENV, PORT, API_URL, CLIENT_URL
JWT_SECRET, JWT_EXPIRY
ADMIN_EMAIL, ADMIN_PIN
```

## 🎓 Code Standards

✓ See [agent.md](agent.md) for AI assistant guidelines

- Clean, readable code (DRY principle)
- Modular architecture
- Meaningful variable names
- Consistent formatting
- No hardcoded secrets
- Input validation & error handling

## 📈 Future Roadmap

- [ ] SMS order notifications
- [ ] Email receipt delivery
- [ ] Payment gateway integration (Stripe/Payfast)
- [ ] Advanced geolocation features
- [ ] AI order automation improvements
- [ ] Customer analytics dashboard
- [ ] Inventory auto-reorder system
- [ ] Multi-location support

## 📞 Support

**Admin Portal:** https://thepeoplesbutchery.co.za/admin.html  
**API Base:** https://api.thepeoplesbutchery.co.za  
**Contact:** admin@thepeoplesbutchery.co.za

---

**The Peoples Butchery** | Premium Meat & Traditional SA Cooked Meals  
76 Meeu St, East Lynne, Pretoria | 2024
