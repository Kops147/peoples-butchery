#!/usr/bin/env node
/**
 * find-printer.js
 * Run this once to discover your POS printer on the network or USB.
 * Usage: node find-printer.js
 */
'use strict';

const net   = require('net');
const os    = require('os');
const { execSync } = require('child_process');

// ── 1. USB check via escpos-usb ──────────────────────────
console.log('\n=== USB PRINTERS ===');
try {
  const USB = require('escpos-usb');
  const devices = USB.findPrinter();
  if (devices && devices.length) {
    devices.forEach(d => console.log('  USB found:', JSON.stringify(d)));
  } else {
    console.log('  None found via escpos-usb');
  }
} catch(e) {
  console.log('  escpos-usb not available:', e.message);
}

// ── 2. System USB (lsusb) ────────────────────────────────
console.log('\n=== lsusb (look for receipt / thermal / Epson / Star / Bixolon / XP) ===');
try {
  const out = execSync('lsusb 2>/dev/null || echo "lsusb not available"').toString();
  out.split('\n').forEach(l => {
    if (/epson|star|bixolon|citizen|seiko|pos|thermal|receipt|xp-|58mm|80mm|printer/i.test(l)) {
      console.log(' *', l);
    } else if (l.trim()) {
      console.log('  ', l);
    }
  });
} catch(e) { console.log('  lsusb error:', e.message); }

// ── 3. CUPS printers ─────────────────────────────────────
console.log('\n=== CUPS / lpstat ===');
try {
  const out = execSync('lpstat -v 2>/dev/null || echo "lpstat not available"').toString();
  console.log(out || '  None');
} catch(e) { console.log('  lpstat error:', e.message); }

// ── 4. Network scan — common POS printer ports ───────────
console.log('\n=== NETWORK SCAN (port 9100 — RAW printing) ===');
console.log('Scanning local subnet for port 9100 (this takes ~10s)...\n');

function getLocalSubnet() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const parts = iface.address.split('.');
        return parts.slice(0,3).join('.'); // e.g. 192.168.1
      }
    }
  }
  return '192.168.1';
}

const subnet = getLocalSubnet();
console.log(`Subnet: ${subnet}.x\n`);
const found = [];
let done = 0;
const total = 254;

for (let i = 1; i <= total; i++) {
  const host = `${subnet}.${i}`;
  const sock = new net.Socket();
  sock.setTimeout(800);
  sock.connect(9100, host, () => {
    console.log(`  ✅ FOUND printer at ${host}:9100`);
    found.push(host);
    sock.destroy();
  });
  sock.on('timeout', () => { sock.destroy(); });
  sock.on('error', () => { sock.destroy(); });
  sock.on('close', () => {
    done++;
    if (done === total) {
      if (!found.length) console.log('  No devices found on port 9100');
      console.log('\n=== DONE ===');
      console.log('Copy the IP above into print-server.js PRINTER_HOST variable.');
    }
  });
}
