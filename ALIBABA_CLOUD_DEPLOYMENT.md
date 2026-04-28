# The Peoples Butchery - Alibaba Cloud Deployment Guide

This guide covers moving your project to **Alibaba Cloud** for a more professional, enterprise-grade setup.

## 1. Setup Alibaba Cloud Resources

### 🎁 Free Tier Tips
Alibaba Cloud offers a generous **Free Tier** for new users:
- **ECS (Server)**: New users can get a free trial (usually 3–12 months) for an entry-level instance (e.g., 2 vCPU, 2GB RAM).
- **OSS (Storage)**: Up to 20GB of free storage for 12 months.
- **RDS (Database)**: 1–3 months free trial for managed PostgreSQL.
- **Always Free**: 50+ products have an "Always Free" quota.
Check the [Alibaba Cloud Free Trial](https://www.alibabacloud.com/free) page to claim these.

### ECS (Elastic Compute Service) - For Hosting
1. Log in to your [Alibaba Cloud Console](https://home.console.aliyun.com/).
2. Navigate to **ECS** and create a new instance:
   - **Region**: South Africa (Johannesburg) or your preferred region.
   - **OS**: Ubuntu 22.04 LTS.
   - **Instance Type**: Entry-level (1 vCPU, 2GB RAM is enough to start).
3. **Security Group**: Open ports 80 (HTTP), 443 (HTTPS), and 3000 (API).

### OSS (Object Storage Service) - For Product Images
1. Navigate to **OSS** and create a bucket: `the-peoples-butchery-assets`.
2. Set **Policy** to `Public Read` (for product images).

### SMS Service - For Order Notifications
1. Navigate to **SMS Service**.
2. Apply for a **Signature** (e.g., `PeoplesButchery`) and a **Template** for order updates.

## 2. Server Configuration (Docker)

We have provided a `docker-compose.yml` that bundles the API, Database, and Nginx.

### Install Docker on ECS
```bash
sudo apt update
sudo apt install docker.io docker-compose -y
```

### Deploy the App
1. Clone your repository to the ECS instance.
2. Update the `.env` file in the `backend/` directory with your Alibaba Cloud Access Keys.
3. Start the stack:
```bash
sudo docker-compose up -d --build
```

## 3. Integration Details

### Backend API
The backend is now equipped with the `@alicloud` SDKs. 
- **Image Uploads**: See `backend/src/services/alibabaService.js` for OSS integration.
- **SMS Notifications**: Automated SMS can now be sent via `AlibabaService.sendOrderSMS`.

### Frontend
The frontend ([app.js](file:///c:/Users/SPOF/Documents/bonemeal/nilos-butchery/js/app.js)) now dynamically switches its `API_BASE_URL`:
- **Local**: `http://localhost:3000/api`
- **Production**: `https://thepeoplesbutchery.co.za/api` (via the Docker Nginx proxy).

## 5. Domain & SSL (HTTPS) Setup

### Pointing GoDaddy Domain
To move away from Netlify and use `https://www.thepeoplesbutchery.co.za`:
1. Log in to your **GoDaddy DNS Management**.
2. Find the **A Record** for `@` and change the value to your **Alibaba ECS IP Address**.
3. Create a **CNAME Record** for `www` pointing to `@`.
4. Wait for propagation (usually 10–60 minutes).

### Enabling HTTPS (Let's Encrypt)
Once your domain is pointing to the Alibaba server, you can secure it for free:
1. SSH into your ECS instance.
2. Install Certbot:
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```
3. Generate the SSL certificate:
   ```bash
   sudo certbot --nginx -d thepeoplesbutchery.co.za -d www.thepeoplesbutchery.co.za
   ```
4. Certbot will automatically update your `nginx.conf` and restart the service.

## 6. Performance: Why this is "Boom" Speed 🚀
You mentioned moving from Firebase for speed—here's why this new setup is even better:
- **Enterprise Hardware**: Alibaba's ECS and RDS are dedicated resources, unlike shared hosting.
- **PostgreSQL Power**: A relational database is much faster for the complex "Order & Inventory" queries you're running.
- **Nginx Optimizations**: We've added **Gzip Compression** and **Browser Caching** to the [nginx.conf](file:///c:/Users/SPOF/Documents/bonemeal/nilos-butchery/nginx.conf) to make pages snap open.
- **Low Latency**: If you host in the **Johannesburg** region, your Pretoria customers will have sub-20ms response times.
