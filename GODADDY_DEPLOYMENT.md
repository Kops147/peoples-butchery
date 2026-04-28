# The Peoples Butchery - GoDaddy VPS Deployment Guide

## Prerequisites
- GoDaddy VPS running Ubuntu 22.04 LTS
- SSH access to your VPS
- Domain: thepeoplesbutchery.co.za

## Step 1: Server Setup

```bash
# SSH into your VPS
ssh root@your_vps_ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install PostgreSQL 15
apt install -y postgresql postgresql-contrib

# Install nginx (reverse proxy)
apt install -y nginx

# Install PM2 (process manager)
npm install -g pm2
```

## Step 2: Database Setup

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE thepeoplesbutchery;
CREATE USER butchery_user WITH PASSWORD 'generate_strong_password_here';
ALTER ROLE butchery_user SET client_encoding TO 'utf8';
ALTER ROLE butchery_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE butchery_user SET default_transaction_deferrable TO on;
ALTER ROLE butchery_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE thepeoplesbutchery TO butchery_user;
\c thepeoplesbutchery
GRANT ALL ON SCHEMA public TO butchery_user;
EOF
```

## Step 3: Deploy Application

```bash
# Create app directory
mkdir -p /var/www/thepeoplesbutchery
cd /var/www/thepeoplesbutchery

# Clone or upload your repository
git clone <your-repo-url> .
# OR
# Upload via SFTP/SCP

# Install dependencies
cd backend
npm install

# Create .env file with production values
cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=thepeoplesbutchery
DB_USER=butchery_user
DB_PASSWORD=your_strong_password
NODE_ENV=production
PORT=3000
API_URL=https://api.thepeoplesbutchery.co.za
JWT_SECRET=generate_32_char_random_string_here
JWT_EXPIRY=7d
CLIENT_URL=https://thepeoplesbutchery.co.za
ADMIN_EMAIL=admin@thepeoplesbutchery.co.za
ADMIN_PIN=peoples2024
EOF

# Set permissions
chmod 600 .env
chown -R www-data:www-data /var/www/thepeoplesbutchery
```

## Step 4: Setup PM2

```bash
cd /var/www/thepeoplesbutchery/backend

# Start application with PM2
pm2 start src/server.js --name "peoples-butchery-api"

# Make it auto-start on reboot
pm2 startup
pm2 save
```

## Step 5: Configure Nginx Reverse Proxy

```bash
# Create nginx config
sudo tee /etc/nginx/sites-available/thepeoplesbutchery > /dev/null << 'EOF'
upstream peoples_api {
  server 127.0.0.1:3000;
}

server {
  listen 80;
  listen [::]:80;
  server_name api.thepeoplesbutchery.co.za;

  location / {
    proxy_pass http://peoples_api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}

server {
  listen 80;
  listen [::]:80;
  server_name thepeoplesbutchery.co.za www.thepeoplesbutchery.co.za;

  root /var/www/thepeoplesbutchery;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/thepeoplesbutchery /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## Step 6: SSL Certificate (Let's Encrypt)

```bash
# Install certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --nginx -d api.thepeoplesbutchery.co.za -d thepeoplesbutchery.co.za

# Auto-renew
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Step 7: Firewall Rules

```bash
# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Step 8: Frontend Deployment

Copy the frontend files to `/var/www/thepeoplesbutchery/`:
- index.html
- admin.html
- dashboard.html
- register.html
- login.html
- shop.html
- css/
- js/
- assets/

Update API URLs in frontend JS files to point to `https://api.thepeoplesbutchery.co.za`

## Monitoring & Maintenance

```bash
# View logs
pm2 logs peoples-butchery-api

# Monitor CPU/Memory
pm2 monit

# Restart application
pm2 restart peoples-butchery-api

# Check nginx status
sudo systemctl status nginx

# View nginx error logs
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Database connection issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Connect to database directly
psql -h localhost -U butchery_user -d thepeoplesbutchery
```

### Application won't start
```bash
# Check PM2 logs
pm2 logs peoples-butchery-api --err

# Check if port 3000 is in use
lsof -i :3000
```

### SSL/HTTPS issues
```bash
# Renew certificates manually
sudo certbot renew --force-renewal

# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/api.thepeoplesbutchery.co.za/cert.pem -text -noout | grep -A 2 "Not Before\|Not After"
```

## Environment Variables Checklist

- ✓ DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
- ✓ NODE_ENV=production
- ✓ JWT_SECRET (strong, unique string)
- ✓ API_URL and CLIENT_URL point to correct domains
- ✓ ADMIN credentials updated for production

## Backup Strategy

```bash
# Daily PostgreSQL backup
0 2 * * * pg_dump -U butchery_user thepeoplesbutchery > /var/backups/butchery_$(date +\%Y\%m\%d).sql

# Store backups offsite (e.g., to AWS S3)
```
