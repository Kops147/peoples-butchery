# domains.co.za DNS Configuration Guide 🚀

Follow these steps to point your domain to your **Alibaba Cloud ECS** instance.

## 📍 Your Server Information
- **Server IP Address**: `8.213.51.107`
- **Location**: Riyadh, Saudi Arabia (me-central-1)

---

## 🛠️ Step 1: Login to domains.co.za
1. Go to [domains.co.za](https://www.domains.co.za) and log in.
2. Navigate to **My Domains** -> **Manage Domain**.
3. Select **DNS Management** from the left-hand menu.

---

## 📝 Step 2: Update A Records
Find the entry where the **Host** is `@` (or the domain name itself) and change the **Points To** value.

| Type | Host | Points To | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `8.213.51.107` | 3600 |
| **CNAME** | `www` | `clearalldebt.xyz` | 3600 |

> [!IMPORTANT]
> If you see any existing A records pointing to Netlify or other IPs, delete them or update them to `8.213.51.107`.

---

## ⏳ Step 3: Wait for Propagation
DNS changes at domains.co.za usually take **15-45 minutes** to propagate. You can check it at [DNSChecker.org](https://dnschecker.org/#A/clearalldebt.xyz).

---

**Next Step**: Once this is live, I will help you set up the SSL certificate on the server.
