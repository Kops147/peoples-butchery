# GoDaddy DNS Configuration Guide 🚀

Follow these steps to point your domains to your new **Alibaba Cloud ECS** instance.

## 📍 Your Server Information
- **Server IP Address**: `8.213.51.107`
- **Location**: Riyadh, Saudi Arabia (me-central-1)
- **Status**: Operational

---

## 🛠️ Step 1: Login to GoDaddy
1. Go to [GoDaddy.com](https://www.godaddy.com) and log in.
2. Navigate to your **Domains** dashboard.
3. For each domain (**thepeoplesbutchery.co.za**, **ytype.xyz**, **clearalldebt.xyz**, **wapay**, **cv2cash**, **socialdrop**, **bizkit**):
   - Click **Manage DNS**.

---

## 📝 Step 2: Update DNS Records
For **EVERY domain**, ensure you have the following settings:

| Type | Name | Value | TTL | Action |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `8.213.51.107` | Default | Edit existing or Add |
| **CNAME** | `www` | `@` | Default | Edit existing or Add |

> [!TIP]
> If you have an existing **A Record** pointing to a different IP (like Netlify or an old host), click the "Edit" button (pencil icon) and replace the old IP with `8.213.51.107`.

---

## ⏳ Step 3: Propagation Checklist
- [ ] Wait **10 to 60 minutes** for global propagation.
- [ ] You can check the status at [DNSChecker.org](https://dnschecker.org/#A/thepeoplesbutchery.co.za).
- [ ] Once the IP shows as `8.213.51.107` across all regions, the site is live!

---

## 🔒 Next Step: SSL (HTTPS)
Once DNS has propagated, I will provide the command to generate the **Free SSL Certificate** (Let's Encrypt) directly on the ECS instance so that your "Not Secure" warning disappears.

---

**Boom! 🚀 Your professional enterprise setup is almost complete.**
