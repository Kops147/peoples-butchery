# Peoples Butchery — Local Print Server

Runs on your **shop PC**. Receives print jobs from the web app and sends ESC/POS commands to the thermal receipt printer.

---

## Quick Start

```bash
cd print-server
npm install

# Step 1: find your printer
node find-printer.js

# Step 2: edit print-server.js — set PRINTER_CONFIG at the top
#   Network printer:  type: 'network', host: '192.168.1.XXX'
#   USB printer:      type: 'usb', usb: { vid: 0x..., pid: 0x... }

# Step 3: start
node print-server.js
```

---

## PRINTER_CONFIG options

### Network (TCP/IP) — most common for desktop thermal printers
```js
const PRINTER_CONFIG = {
  type: 'network',
  host: '192.168.1.100',   // ← your printer's IP
  port: 9100
};
```

### USB
```js
const PRINTER_CONFIG = {
  type: 'usb',
  usb: { vid: 0x04b8, pid: 0x0e27 }  // ← vid/pid from find-printer.js output
};
```

---

## Paper width
Change `PAPER_WIDTH` at the top of `print-server.js`:
- **80mm paper** → `48`
- **58mm paper** → `32`

---

## Run on startup (Windows)

Create `start-print-server.bat`:
```bat
@echo off
cd /d C:\path\to\print-server
node print-server.js
```
Add it to `shell:startup` folder (`Win+R` → `shell:startup`).

## Run on startup (Linux/Mac)

```bash
# Add to crontab
crontab -e
@reboot cd /path/to/print-server && node print-server.js >> /var/log/print-server.log 2>&1
```

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | Check if server + printer are reachable |
| `POST` | `/print` | Print a receipt (JSON body) |
| `GET`  | `/print?orderNumber=XXXX` | Legacy scanner endpoint |

### POST /print body
```json
{
  "orderNumber": "ABC123",
  "customer": "John Smith",
  "items": [
    { "name": "T-Bone 500g", "qty": 2, "price": 85.00 },
    { "name": "Boerewors 1kg", "qty": 1, "price": 65.00, "braai": true }
  ],
  "total": 235.00,
  "payMethod": "cash",
  "tendered": 250.00,
  "change": 15.00,
  "deliveryMethod": "collection",
  "date": "2026-05-21T10:30:00Z"
}
```
