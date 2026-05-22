#!/usr/bin/env node
/**
 * ============================================================
 *  The Peoples Butchery — Local POS Print Server
 *  Runs on the shop PC. Receives print jobs from the web app.
 *  Supports: Network (TCP/IP 9100), USB, Serial
 * ============================================================
 *
 *  SETUP:
 *    1. npm install
 *    2. Edit PRINTER_CONFIG below (network IP or usb/serial)
 *    3. node print-server.js
 *
 *  ENDPOINTS:
 *    GET  /health          — liveness check
 *    POST /print           — print a receipt (JSON body)
 *    POST /print/order     — print a full online order receipt
 *    GET  /print?orderNumber=XXXXX  — legacy barcode-scanner endpoint
 */

'use strict';

const express = require('express');
const cors    = require('cors');

// ── ⚙️  CONFIGURE YOUR PRINTER HERE ─────────────────────────
// Run `node find-printer.js` first to discover the address.
const PRINTER_CONFIG = {
  type: 'network',          // 'network' | 'usb' | 'serial'
  host: '192.168.1.100',    // Network: change to your printer's IP
  port: 9100,               // Network: usually 9100
  // usb: { vid: 0x04b8, pid: 0x0e27 },   // USB: vid/pid from find-printer.js
  // serial: { path: '/dev/ttyUSB0', baudRate: 9600 }  // Serial
};

const PAPER_WIDTH   = 48;    // chars across — 80mm paper=48, 58mm paper=32
const STORE_NAME    = "THE PEOPLES BUTCHERY";
const STORE_ADDRESS = "76 Meeu St, East Lynne, Pretoria";
const STORE_PHONE   = "012 XXX XXXX";
const PORT          = 3001;
// ─────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// ── ESC/POS raw TCP helper ───────────────────────────────────
const net = require('net');

function printRaw(buffer) {
  return new Promise((resolve, reject) => {
    if (PRINTER_CONFIG.type === 'network') {
      const sock = new net.Socket();
      sock.setTimeout(5000);
      sock.connect(PRINTER_CONFIG.port, PRINTER_CONFIG.host, () => {
        sock.write(buffer, () => {
          sock.end();
          resolve();
        });
      });
      sock.on('timeout', () => { sock.destroy(); reject(new Error('Printer timeout')); });
      sock.on('error', reject);
    } else if (PRINTER_CONFIG.type === 'usb') {
      // USB via escpos-usb
      try {
        const escpos = require('escpos');
        const USB    = require('escpos-usb');
        escpos.USB   = USB;
        const device = new USB(PRINTER_CONFIG.usb.vid, PRINTER_CONFIG.usb.pid);
        device.open(err => {
          if (err) return reject(err);
          device.write(buffer, () => { device.close(); resolve(); });
        });
      } catch(e) { reject(e); }
    } else {
      reject(new Error('Unsupported printer type: ' + PRINTER_CONFIG.type));
    }
  });
}

// ── ESC/POS command builder ──────────────────────────────────
const ESC = 0x1B, GS = 0x1D;
const CMD = {
  INIT:         Buffer.from([ESC, 0x40]),
  ALIGN_LEFT:   Buffer.from([ESC, 0x61, 0x00]),
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
  ALIGN_RIGHT:  Buffer.from([ESC, 0x61, 0x02]),
  BOLD_ON:      Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF:     Buffer.from([ESC, 0x45, 0x00]),
  DOUBLE_HEIGHT:Buffer.from([ESC, 0x21, 0x10]),
  NORMAL_SIZE:  Buffer.from([ESC, 0x21, 0x00]),
  CUT:          Buffer.from([GS,  0x56, 0x42, 0x00]),
  FEED3:        Buffer.from([ESC, 0x64, 0x03]),
  FEED1:        Buffer.from([ESC, 0x64, 0x01]),
};

function line(text='') { return Buffer.from(text + '\n', 'utf8'); }
function divider(ch='-') { return line(ch.repeat(PAPER_WIDTH)); }
function padRow(left, right, width=PAPER_WIDTH) {
  const gap = width - left.length - right.length;
  return line(left + ' '.repeat(Math.max(1, gap)) + right);
}

function buildReceiptBuffer({ orderNumber, customer, items, total, payMethod, deliveryMethod, deliveryAddress, date, change, tendered }) {
  const parts = [];
  const push = b => parts.push(b);

  push(CMD.INIT);
  push(CMD.ALIGN_CENTER);
  push(CMD.BOLD_ON);
  push(CMD.DOUBLE_HEIGHT);
  push(line(STORE_NAME));
  push(CMD.NORMAL_SIZE);
  push(CMD.BOLD_OFF);
  push(line(STORE_ADDRESS));
  push(line(STORE_PHONE));
  push(divider('='));

  push(CMD.ALIGN_LEFT);
  push(CMD.BOLD_ON);
  if (orderNumber) push(line(`ORDER: #${orderNumber}`));
  push(CMD.BOLD_OFF);
  push(line(`Date : ${new Date(date||Date.now()).toLocaleString('en-ZA')}`));
  if (customer) push(line(`Cust : ${customer}`));
  push(line(`Type : ${deliveryMethod === 'delivery' ? 'DELIVERY' : 'COLLECTION'}`));
  if (deliveryMethod === 'delivery' && deliveryAddress) {
    push(line(`Addr : ${deliveryAddress}`));
  }
  push(divider());

  // Items
  push(CMD.BOLD_ON);
  push(padRow('ITEM', 'TOTAL'));
  push(CMD.BOLD_OFF);
  push(divider());

  (items||[]).forEach(i => {
    const qty   = i.qty || i.quantity || 1;
    const name  = (i.name || `#${i.product_id||i.productId}`).substring(0, PAPER_WIDTH - 14);
    const price = parseFloat(i.price||0) * qty;
    push(padRow(`${qty}x ${name}`, `R${price.toFixed(2)}`));
    if (i.braai) push(line('   >> BRAAI'));
    if (i.pap > 0) push(line(`   >> PAP x${i.pap}`));
  });

  push(divider('='));
  push(CMD.BOLD_ON);
  push(padRow('TOTAL', `R${parseFloat(total||0).toFixed(2)}`));
  push(CMD.BOLD_OFF);

  if (payMethod) {
    const pm = payMethod === 'cash' ? `CASH  (Tendered: R${parseFloat(tendered||0).toFixed(2)})` 
             : payMethod === 'card' ? 'CARD / EFT'
             : payMethod === 'credit' ? 'ACCOUNT CREDIT'
             : payMethod.toUpperCase();
    push(line(`Pay  : ${pm}`));
    if (payMethod === 'cash' && change > 0) {
      push(CMD.BOLD_ON);
      push(padRow('CHANGE', `R${parseFloat(change).toFixed(2)}`));
      push(CMD.BOLD_OFF);
    }
  }

  push(divider('='));
  push(CMD.ALIGN_CENTER);
  push(line('Thank you for your order!'));
  push(line('thepeoplesbutchery.co.za'));
  push(CMD.FEED3);
  push(CMD.CUT);

  return Buffer.concat(parts);
}

// ── Routes ───────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ ok: true, printer: PRINTER_CONFIG, time: new Date().toISOString() });
});

// Legacy barcode scanner endpoint: GET /print?orderNumber=XXXXX
app.get('/print', async (req, res) => {
  const orderNumber = req.query.orderNumber;
  if (!orderNumber) return res.json({ success: false, error: 'No orderNumber' });
  try {
    const buf = buildReceiptBuffer({
      orderNumber,
      date: new Date().toISOString(),
      items: [],
      total: 0,
      deliveryMethod: 'collection',
      customer: ''
    });
    await printRaw(buf);
    console.log(`[PRINT] order ${orderNumber}`);
    res.json({ success: true });
  } catch(e) {
    console.error('[PRINT ERROR]', e.message);
    res.json({ success: false, error: e.message });
  }
});

// Full receipt with all order data
app.post('/print', async (req, res) => {
  try {
    const buf = buildReceiptBuffer(req.body);
    await printRaw(buf);
    console.log(`[PRINT] receipt — order ${req.body.orderNumber || 'walk-in'}`);
    res.json({ success: true });
  } catch(e) {
    console.error('[PRINT ERROR]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Full order receipt (same as /print POST, named route for clarity)
app.post('/print/order', async (req, res) => {
  try {
    const buf = buildReceiptBuffer(req.body);
    await printRaw(buf);
    console.log(`[PRINT ORDER] #${req.body.orderNumber}`);
    res.json({ success: true });
  } catch(e) {
    console.error('[PRINT ERROR]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🖨️  Peoples Butchery Print Server running on port ${PORT}`);
  console.log(`   Printer: ${PRINTER_CONFIG.type.toUpperCase()} @ ${PRINTER_CONFIG.host || PRINTER_CONFIG.usb?.vid}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Print:  POST http://localhost:${PORT}/print\n`);
});
