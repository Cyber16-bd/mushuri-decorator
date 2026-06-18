/* ===========================================================
   মুশুরীখোলা ডেকোরেটর - Bill Management App
   Pure Vanilla JS + LocalStorage + jsPDF
   =========================================================== */

const SHOP = {
  name: 'মুশুরীখোলা ডেকোরেটর',
  owner: 'প্রোঃ মো: আব্দুস সাত্তার',
  phone1: '01322217130',
  phone2: '01404-349087',
  address: 'সুজানগর চৌমুহনী, বখশী মাজারের সামনে, ১৭ নং ওয়ার্ড, কুমিল্লা সিটি কর্পোরেশন।'
};

const DEFAULT_PRODUCTS = [
  'স্টেইজ বক্স','গেইট সিঙ্গেল/বক্স গেইট','প্যান্ডেল কাপড়','প্যান্ডেল টিনের','প্যান্ডেল ট্রিপল সহ',
  'চেয়ার','ফরমিকা টেবিল','কাঠের টেবিল','কাচের প্লেট','মেলামাইন প্লেট','হাফ প্লেট মেলামাইন',
  'হাফ প্লেট কাচ','ডেগ','কড়াই','গ্লাস','বালতি','কার্পেট','বল স্টিল','চামচ','সাইড পর্দা',
  'ড্রাম','লবণদানি','জগ','রাইস ডিস','কারি বাটি','কোক সেট','হাফ ড্রাম','ফেন','বড় বল','বেসিং','গাড়ি ভাড়া'
];

const STORAGE_KEYS = {
  products: 'mushuri_products',
  bills: 'mushuri_bills',
  nextProductId: 'mushuri_next_product_id',
  nextBillId: 'mushuri_next_bill_id',
  nextBillNumber: 'mushuri_next_bill_number'
};

/* ---------- Storage helpers ---------- */
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Storage read error', key, e);
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write error', key, e);
    showToast('সংরক্ষণে সমস্যা হয়েছে', 'error');
  }
}

/* ---------- Initialize data on first run ---------- */
function initData() {
  let products = loadJSON(STORAGE_KEYS.products, null);
  if (products === null) {
    products = DEFAULT_PRODUCTS.map((name, idx) => ({
      id: idx + 1,
      name: name,
      price: 0,
      sortOrder: idx,
      isActive: true
    }));
    saveJSON(STORAGE_KEYS.products, products);
    saveJSON(STORAGE_KEYS.nextProductId, products.length + 1);
  }
  let bills = loadJSON(STORAGE_KEYS.bills, null);
  if (bills === null) {
    bills = [];
    saveJSON(STORAGE_KEYS.bills, bills);
    saveJSON(STORAGE_KEYS.nextBillId, 1);
    saveJSON(STORAGE_KEYS.nextBillNumber, 1);
  }
}

function getProducts() {
  return loadJSON(STORAGE_KEYS.products, []);
}
function getActiveProducts() {
  return getProducts().filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}
function getAllProductsSorted() {
  return getProducts().sort((a, b) => a.sortOrder - b.sortOrder);
}
function setProducts(products) {
  saveJSON(STORAGE_KEYS.products, products);
}

function getBills() {
  return loadJSON(STORAGE_KEYS.bills, []);
}
function setBills(bills) {
  saveJSON(STORAGE_KEYS.bills, bills);
}

function nextProductId() {
  const id = loadJSON(STORAGE_KEYS.nextProductId, 1);
  saveJSON(STORAGE_KEYS.nextProductId, id + 1);
  return id;
}
function nextBillId() {
  const id = loadJSON(STORAGE_KEYS.nextBillId, 1);
  saveJSON(STORAGE_KEYS.nextBillId, id + 1);
  return id;
}
function getNextBillNumber() {
  const bills = getBills();
  if (bills.length === 0) return 1;
  const maxNum = Math.max(...bills.map(b => b.billNumber));
  return maxNum + 1;
}

/* ---------- Number formatting (Bengali-friendly, no forced decimals) ---------- */
function fmtNum(v) {
  v = Number(v) || 0;
  if (Math.round(v) === v) return String(Math.round(v));
  return v.toFixed(2);
}

/* ---------- Toast ---------- */
function showToast(message, type) {
  type = type || 'success';
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

/* ---------- Tab navigation ---------- */
let currentTab = 'home';
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + tab).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nav === tab);
  });
  if (tab === 'home') renderHomeDashboard();
  if (tab === 'billlist') renderBillList();
  if (tab === 'settings') renderProductSettings();
}

/* ---------- Date formatting dd/mm/yyyy ---------- */
function todayFormatted() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/* ===========================================================
   HOME DASHBOARD
   =========================================================== */
function renderHomeDashboard() {
  document.getElementById('home-shop-name').textContent = SHOP.name;
  document.getElementById('home-owner-name').textContent = SHOP.owner;
  document.getElementById('home-phone').textContent = 'ফোন: ' + SHOP.phone1;

  const bills = getBills();
  const totalBills = bills.length;
  const totalRevenue = bills.reduce((s, b) => s + b.grandTotal, 0);
  const totalDue = bills.reduce((s, b) => s + b.due, 0);

  document.getElementById('stat-total-bills').textContent = totalBills + 'টি';
  document.getElementById('stat-total-revenue').textContent = '৳' + fmtNum(totalRevenue);
  document.getElementById('stat-total-due').textContent = '৳' + fmtNum(totalDue);

  const recentContainer = document.getElementById('recent-bills-list');
  const emptyMsg = document.getElementById('recent-bills-empty');
  recentContainer.innerHTML = '';

  const recent = [...bills].sort((a, b) => b.billNumber - a.billNumber).slice(0, 5);
  if (recent.length === 0) {
    emptyMsg.classList.remove('hidden');
  } else {
    emptyMsg.classList.add('hidden');
    recent.forEach(bill => {
      const due = bill.due > 0 ? `<span class="text-[11px] text-red-600">বাকি: ৳${fmtNum(bill.due)}</span>` : '';
      const el = document.createElement('div');
      el.className = 'card p-3 flex items-center gap-3 cursor-pointer';
      el.onclick = () => openBillForm(bill.id);
      el.innerHTML = `
        <div class="w-9 h-9 rounded-full bg-[#0D3B66] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">${bill.billNumber}</div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-[14px] truncate">${escapeHtml(bill.customerName)}</p>
          <p class="text-[12px] text-gray-500">${bill.date}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="font-bold text-[14px] text-[#0D3B66]">৳${fmtNum(bill.grandTotal)}</p>
          ${due}
        </div>
      `;
      recentContainer.appendChild(el);
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ===========================================================
   BILL FORM SCREEN
   =========================================================== */
let bfRows = [];          // [{productName, price, qty}]
let bfEditingBillId = null;
let bfMode = 'new';        // 'new' | 'edit' | 'copy'
let previousTabBeforeForm = 'home';

function openBillForm(billId) {
  previousTabBeforeForm = currentTab;
  bfRows = [];
  bfEditingBillId = null;
  bfMode = 'new';

  document.getElementById('bf-shop-name').textContent = SHOP.name;
  document.getElementById('bf-owner-name').textContent = SHOP.owner;
  document.getElementById('bf-phone').textContent = `ফোন: ${SHOP.phone1}, ${SHOP.phone2}`;
  document.getElementById('bf-address').textContent = SHOP.address;

  if (billId) {
    const bill = getBills().find(b => b.id === billId);
    if (bill) {
      bfMode = 'edit';
      bfEditingBillId = bill.id;
      document.getElementById('billform-title').textContent = 'বিল সম্পাদনা';
      document.getElementById('bf-bill-number').value = bill.billNumber;
      document.getElementById('bf-date').value = bill.date;
      document.getElementById('bf-customer-name').value = bill.customerName;
      document.getElementById('bf-customer-address').value = bill.customerAddress || '';
      document.getElementById('bf-advance').value = fmtNum(bill.advance);
      bfRows = bill.items.map(it => ({ productName: it.productName, price: it.price, qty: it.quantity }));
    }
  } else {
    document.getElementById('billform-title').textContent = 'নতুন বিল';
    document.getElementById('bf-bill-number').value = getNextBillNumber();
    document.getElementById('bf-date').value = todayFormatted();
    document.getElementById('bf-customer-name').value = '';
    document.getElementById('bf-customer-address').value = '';
    document.getElementById('bf-advance').value = '0';
  }

  renderBfRows();
  document.getElementById('bf-advance').oninput = updateBfTotals;
  switchScreenOnly('billform');
}

function openBillFormAsCopy(billId) {
  const bill = getBills().find(b => b.id === billId);
  if (!bill) return;
  previousTabBeforeForm = currentTab;
  bfRows = bill.items.map(it => ({ productName: it.productName, price: it.price, qty: it.quantity }));
  bfMode = 'copy';
  bfEditingBillId = null;

  document.getElementById('bf-shop-name').textContent = SHOP.name;
  document.getElementById('bf-owner-name').textContent = SHOP.owner;
  document.getElementById('bf-phone').textContent = `ফোন: ${SHOP.phone1}, ${SHOP.phone2}`;
  document.getElementById('bf-address').textContent = SHOP.address;

  document.getElementById('billform-title').textContent = 'বিল অনুলিপি';
  document.getElementById('bf-bill-number').value = getNextBillNumber();
  document.getElementById('bf-date').value = todayFormatted();
  document.getElementById('bf-customer-name').value = bill.customerName;
  document.getElementById('bf-customer-address').value = bill.customerAddress || '';
  document.getElementById('bf-advance').value = '0';

  renderBfRows();
  document.getElementById('bf-advance').oninput = updateBfTotals;
  switchScreenOnly('billform');
}

function switchScreenOnly(screenName) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + screenName).classList.add('active');
}

function closeBillForm() {
  switchTab(previousTabBeforeForm);
}

function renderBfRows() {
  const container = document.getElementById('bf-rows-container');
  const emptyMsg = document.getElementById('bf-rows-empty');
  container.innerHTML = '';

  if (bfRows.length === 0) {
    emptyMsg.classList.remove('hidden');
  } else {
    emptyMsg.classList.add('hidden');
    bfRows.forEach((row, idx) => {
      const amount = (row.qty || 0) * (row.price || 0);
      const rowEl = document.createElement('div');
      rowEl.className = 'bill-row flex items-center';
      rowEl.innerHTML = `
        <div class="py-1.5 px-1 text-center text-[13px]" style="flex:0.7;">${idx + 1}</div>
        <div class="py-1.5 px-1 text-[13px]" style="flex:3;">${escapeHtml(row.productName)}</div>
        <div class="py-1 px-1" style="flex:1.6;">
          <input type="text" inputmode="decimal" class="qty-input" data-idx="${idx}"
            value="${row.qty ? row.qty : ''}" placeholder="0"
            oninput="onQtyChange(${idx}, this.value)" />
        </div>
        <div class="py-1.5 px-1 text-center text-[13px]" style="flex:1.4;">${row.price > 0 ? fmtNum(row.price) : '-'}</div>
        <div class="py-1.5 px-1 text-center text-[13px] font-semibold text-[#0D3B66]" style="flex:1.6;">${amount > 0 ? fmtNum(amount) : '-'}</div>
        <div class="py-1.5 px-1 text-center" style="flex:0.8;">
          <button onclick="removeBfRow(${idx})" class="text-red-500">
            <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      `;
      container.appendChild(rowEl);
    });
  }
  updateBfTotals();
}

function onQtyChange(idx, value) {
  const num = parseFloat(value);
  bfRows[idx].qty = isNaN(num) ? 0 : num;
  renderBfRows();
  // restore focus to the same input after re-render
  setTimeout(() => {
    const input = document.querySelector(`.qty-input[data-idx="${idx}"]`);
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, 0);
}

function removeBfRow(idx) {
  bfRows.splice(idx, 1);
  renderBfRows();
}

function bfGrandTotal() {
  return bfRows.reduce((s, r) => s + (r.qty || 0) * (r.price || 0), 0);
}

function updateBfTotals() {
  const total = bfGrandTotal();
  const advance = parseFloat(document.getElementById('bf-advance').value) || 0;
  const due = total - advance;
  document.getElementById('bf-grand-total').textContent = '৳ ' + fmtNum(total);
  document.getElementById('bf-due').textContent = '৳ ' + fmtNum(due);

  const dueRow = document.getElementById('bf-due').closest('.total-row-red');
  if (due <= 0) {
    dueRow.style.backgroundColor = 'var(--color-total-green)';
  } else {
    dueRow.style.backgroundColor = 'var(--color-due-red)';
  }
}

/* ---------- Product selection bottom sheet ---------- */
function openProductSheet() {
  const products = getActiveProducts();
  const listContainer = document.getElementById('product-sheet-list');
  listContainer.innerHTML = '';
  if (products.length === 0) {
    listContainer.innerHTML = '<p class="text-center text-gray-400 py-8 text-sm">কোনো পণ্য নেই</p>';
  } else {
    products.forEach(p => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between px-4 py-3 border-b border-black/5 active:bg-black/5';
      item.innerHTML = `
        <span class="text-[15px]">${escapeHtml(p.name)}</span>
        ${p.price > 0 ? `<span class="text-[#1A5C96] font-semibold text-sm">৳${fmtNum(p.price)}</span>` : ''}
      `;
      item.onclick = () => {
        bfRows.push({ productName: p.name, price: p.price, qty: 0 });
        closeProductSheet();
        renderBfRows();
      };
      listContainer.appendChild(item);
    });
  }
  document.getElementById('product-sheet-overlay').classList.add('active');
  document.getElementById('product-sheet').classList.add('active');
}

function closeProductSheet() {
  document.getElementById('product-sheet-overlay').classList.remove('active');
  document.getElementById('product-sheet').classList.remove('active');
}

/* ---------- Save bill ---------- */
function saveBill() {
  const name = document.getElementById('bf-customer-name').value.trim();
  if (!name) {
    showToast('নাম লিখুন', 'error');
    document.getElementById('bf-customer-name').focus();
    return;
  }
  const activeRows = bfRows.filter(r => (r.qty || 0) > 0);
  if (activeRows.length === 0) {
    showToast('অন্তত একটি পণ্যে পরিমাণ দিন', 'error');
    return;
  }

  const billNumber = parseInt(document.getElementById('bf-bill-number').value) || getNextBillNumber();
  const date = document.getElementById('bf-date').value.trim() || todayFormatted();
  const address = document.getElementById('bf-customer-address').value.trim();
  const advance = parseFloat(document.getElementById('bf-advance').value) || 0;
  const grandTotal = bfGrandTotal();
  const due = grandTotal - advance;

  const items = activeRows.map(r => ({
    productName: r.productName,
    quantity: r.qty,
    price: r.price,
    amount: r.qty * r.price
  }));

  let bills = getBills();

  if (bfMode === 'edit' && bfEditingBillId) {
    const idx = bills.findIndex(b => b.id === bfEditingBillId);
    if (idx !== -1) {
      bills[idx] = {
        ...bills[idx],
        billNumber, customerName: name, customerAddress: address, date,
        grandTotal, advance, due, items
      };
      setBills(bills);
      showToast('বিল আপডেট হয়েছে ✓');
    }
  } else {
    const newBill = {
      id: nextBillId(),
      billNumber, customerName: name, customerAddress: address, date,
      grandTotal, advance, due, items,
      createdAt: new Date().toISOString()
    };
    bills.push(newBill);
    setBills(bills);
    showToast('বিল সেভ হয়েছে ✓');
  }

  closeBillForm();
}

/* ---------- Build a bill object from current form (for PDF/share without saving) ---------- */
function bfAsBillObject() {
  const billNumber = parseInt(document.getElementById('bf-bill-number').value) || getNextBillNumber();
  const date = document.getElementById('bf-date').value.trim() || todayFormatted();
  const name = document.getElementById('bf-customer-name').value.trim();
  const address = document.getElementById('bf-customer-address').value.trim();
  const advance = parseFloat(document.getElementById('bf-advance').value) || 0;
  const grandTotal = bfGrandTotal();
  const due = grandTotal - advance;
  const items = bfRows.filter(r => (r.qty || 0) > 0).map(r => ({
    productName: r.productName, quantity: r.qty, price: r.price, amount: r.qty * r.price
  }));
  return { billNumber, date, customerName: name, customerAddress: address, advance, grandTotal, due, items };
}

/* ===========================================================
   PDF GENERATION
   Bengali Unicode text is not supported by jsPDF's built-in fonts,
   so we render the bill to an HTML canvas (browser handles Bengali
   shaping correctly) and embed that canvas as an image into the PDF.
   =========================================================== */
function buildBillCanvas(bill) {
  const scale = 2; // for crisp output
  const width = 760;
  const rowHeight = 30;
  const headerHeight = 150;
  const customerHeight = 90;
  const tableHeaderHeight = 32;
  const itemsHeight = bill.items.length * rowHeight;
  const totalsHeight = 130;
  const padding = 30;
  const height = headerHeight + customerHeight + tableHeaderHeight + itemsHeight + totalsHeight + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  let y = padding;
  const navy = '#0D3B66';
  const cx = width / 2;

  // Shop header box
  ctx.strokeStyle = navy;
  ctx.lineWidth = 2;
  ctx.strokeRect(padding, y, width - padding * 2, headerHeight - 20);
  let innerY = y + 32;
  ctx.fillStyle = navy;
  ctx.font = 'bold 24px "Noto Sans Bengali", "Hind Siliguri", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(SHOP.name, cx, innerY);
  innerY += 26;
  ctx.fillStyle = '#222';
  ctx.font = '16px "Noto Sans Bengali", "Hind Siliguri", sans-serif';
  ctx.fillText(SHOP.owner, cx, innerY);
  innerY += 22;
  ctx.fillStyle = '#1A5C96';
  ctx.font = 'bold 15px "Noto Sans Bengali", "Hind Siliguri", sans-serif';
  ctx.fillText(`ফোন: ${SHOP.phone1}, ${SHOP.phone2}`, cx, innerY);
  innerY += 20;
  ctx.fillStyle = '#555';
  ctx.font = '13px "Noto Sans Bengali", "Hind Siliguri", sans-serif';
  ctx.fillText(SHOP.address, cx, innerY);

  y += headerHeight;

  // Customer info box
  ctx.strokeStyle = navy;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(padding, y, width - padding * 2, customerHeight - 15);
  let cy = y + 26;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#000';
  ctx.font = 'bold 16px "Noto Sans Bengali", "Hind Siliguri", sans-serif';
  ctx.fillText(`বিল নং: ${bill.billNumber}`, padding + 14, cy);
  ctx.textAlign = 'right';
  ctx.fillText(`তারিখ: ${bill.date}`, width - padding - 14, cy);
  cy += 24;
  ctx.textAlign = 'left';
  ctx.font = '15px "Noto Sans Bengali", "Hind Siliguri", sans-serif';
  ctx.fillText(`নাম: ${bill.customerName}`, padding + 14, cy);
  if (bill.customerAddress) {
    cy += 20;
    ctx.fillText(`ঠিকানা: ${bill.customerAddress}`, padding + 14, cy);
  }

  y += customerHeight;

  // Table header
  const colX = {
    no: padding,
    desc: padding + 50,
    qty: width - padding - 220,
    price: width - padding - 150,
    amount: width - padding - 75
  };
  ctx.fillStyle = navy;
  ctx.fillRect(padding, y, width - padding * 2, tableHeaderHeight);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px "Noto Sans Bengali", "Hind Siliguri", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('নং', colX.no + 8, y + 21);
  ctx.fillText('বিবরণ', colX.desc, y + 21);
  ctx.textAlign = 'center';
  ctx.fillText('পরিমাণ', colX.qty + 25, y + 21);
  ctx.fillText('দর', colX.price + 25, y + 21);
  ctx.fillText('টাকা', colX.amount + 30, y + 21);

  y += tableHeaderHeight;

  // Table rows
  bill.items.forEach((item, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F5EDD8';
    ctx.fillRect(padding, y, width - padding * 2, rowHeight);
    ctx.strokeStyle = '#D0C8B0';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, y, width - padding * 2, rowHeight);

    ctx.fillStyle = '#222';
    ctx.font = '14px "Noto Sans Bengali", "Hind Siliguri", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(idx + 1), colX.no + 8, y + 20);
    ctx.fillText(item.productName, colX.desc, y + 20);
    ctx.textAlign = 'center';
    ctx.fillText(fmtNum(item.quantity), colX.qty + 25, y + 20);
    ctx.fillText(fmtNum(item.price), colX.price + 25, y + 20);
    ctx.font = 'bold 14px "Noto Sans Bengali", "Hind Siliguri", sans-serif';
    ctx.fillStyle = navy;
    ctx.fillText(fmtNum(item.amount), colX.amount + 30, y + 20);

    y += rowHeight;
  });

  y += 20;

  // Totals box (right aligned)
  const totalsBoxWidth = 280;
  const totalsBoxX = width - padding - totalsBoxWidth;
  ctx.strokeStyle = navy;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(totalsBoxX, y, totalsBoxWidth, totalsHeight - 30);

  const drawTotalRow = (label, value, rowY, bold) => {
    ctx.fillStyle = '#000';
    ctx.font = (bold ? 'bold ' : '') + '15px "Noto Sans Bengali", "Hind Siliguri", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, totalsBoxX + 14, rowY);
    ctx.textAlign = 'right';
    ctx.fillText('৳ ' + fmtNum(value), totalsBoxX + totalsBoxWidth - 14, rowY);
  };

  let ty = y + 28;
  drawTotalRow('মোট', bill.grandTotal, ty, true);
  ctx.strokeStyle = '#E0DACA';
  ctx.beginPath(); ctx.moveTo(totalsBoxX, ty + 14); ctx.lineTo(totalsBoxX + totalsBoxWidth, ty + 14); ctx.stroke();
  ty += 32;
  drawTotalRow('অগ্রিম', bill.advance, ty, false);
  ctx.beginPath(); ctx.moveTo(totalsBoxX, ty + 14); ctx.lineTo(totalsBoxX + totalsBoxWidth, ty + 14); ctx.stroke();
  ty += 32;
  drawTotalRow('বাকি', bill.due, ty, true);

  return canvas;
}

async function generateBillPdfBlob(bill) {
  const canvas = buildBillCanvas(bill);
  const imgData = canvas.toDataURL('image/png');

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 28;
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height / canvas.width) * imgWidth;
  pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
  return pdf;
}

async function printBillPdf() {
  const bill = bfAsBillObject();
  if (!bill.customerName) { showToast('নাম লিখুন', 'error'); return; }
  if (bill.items.length === 0) { showToast('অন্তত একটি পণ্য যোগ করুন', 'error'); return; }
  try {
    const pdf = await generateBillPdfBlob(bill);
    pdf.autoPrint ? pdf.autoPrint() : null;
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank');
  } catch (e) {
    console.error(e);
    showToast('PDF তৈরিতে সমস্যা', 'error');
  }
}

async function sharePdf() {
  const bill = bfAsBillObject();
  if (!bill.customerName) { showToast('নাম লিখুন', 'error'); return; }
  if (bill.items.length === 0) { showToast('অন্তত একটি পণ্য যোগ করুন', 'error'); return; }
  await downloadOrSharePdf(bill);
}

async function shareSavedBillPdf(billId) {
  const bill = getBills().find(b => b.id === billId);
  if (!bill) return;
  await downloadOrSharePdf(bill);
}

async function downloadOrSharePdf(bill) {
  try {
    const pdf = await generateBillPdfBlob(bill);
    const blob = pdf.output('blob');
    const fileName = `bill_${bill.billNumber}.pdf`;

    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: SHOP.name,
            text: `${SHOP.name}\nবিল নং: ${bill.billNumber}`
          });
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') return; // user cancelled
          // fall through to download
        }
      }
    }
    // Fallback: direct download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('PDF ডাউনলোড হয়েছে ✓');
  } catch (e) {
    console.error(e);
    showToast('PDF তৈরিতে সমস্যা', 'error');
  }
}

/* ===========================================================
   BILL LIST SCREEN
   =========================================================== */
function renderBillList() {
  const searchTerm = (document.getElementById('bill-search-input').value || '').trim().toLowerCase();
  let bills = getBills();
  bills = [...bills].sort((a, b) => b.billNumber - a.billNumber);

  if (searchTerm) {
    bills = bills.filter(b =>
      b.customerName.toLowerCase().includes(searchTerm) ||
      String(b.billNumber).includes(searchTerm)
    );
  }

  const container = document.getElementById('bill-list-container');
  const emptyMsg = document.getElementById('bill-list-empty');
  container.innerHTML = '';

  if (bills.length === 0) {
    emptyMsg.classList.remove('hidden');
    return;
  }
  emptyMsg.classList.add('hidden');

  bills.forEach(bill => {
    const chips = [];
    chips.push(`<span class="chip" style="background-color:#E6F4E8; color:#2e7d32;">মোট: ৳${fmtNum(bill.grandTotal)}</span>`);
    if (bill.advance > 0) chips.push(`<span class="chip" style="background-color:#FFF3E0; color:#E65100;">অগ্রিম: ৳${fmtNum(bill.advance)}</span>`);
    if (bill.due > 0) chips.push(`<span class="chip" style="background-color:#FFEEEE; color:#c62828;">বাকি: ৳${fmtNum(bill.due)}</span>`);

    const card = document.createElement('div');
    card.className = 'card p-3';
    card.innerHTML = `
      <div class="flex items-center justify-between cursor-pointer" data-open="${bill.id}">
        <span class="text-white text-xs font-bold px-2.5 py-1 rounded-full" style="background-color:#0D3B66;">বিল # ${bill.billNumber}</span>
        <span class="text-[13px] text-gray-500">${bill.date}</span>
      </div>
      <div class="mt-2 cursor-pointer" data-open="${bill.id}">
        <p class="font-bold text-[16px]">${escapeHtml(bill.customerName)}</p>
        ${bill.customerAddress ? `<p class="text-[13px] text-gray-500">${escapeHtml(bill.customerAddress)}</p>` : ''}
      </div>
      <div class="flex flex-wrap gap-1.5 mt-2">${chips.join('')}</div>
      <div class="flex justify-end gap-1 mt-1.5 border-t border-black/5 pt-1.5">
        <button class="p-2 text-[#0D3B66]" title="শেয়ার" data-action="share" data-id="${bill.id}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316M21 19a3 3 0 11-6 0 3 3 0 016 0zM9 12a3 3 0 11-6 0 3 3 0 016 0zM21 5a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
        <button class="p-2 text-[#0D3B66]" title="কপি" data-action="copy" data-id="${bill.id}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        </button>
        <button class="p-2 text-[#0D3B66]" title="এডিট" data-action="edit" data-id="${bill.id}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
        <button class="p-2 text-red-500" title="মুছুন" data-action="delete" data-id="${bill.id}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', () => openBillForm(parseInt(el.dataset.open)));
  });
  container.querySelectorAll('[data-action="share"]').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); shareSavedBillPdf(parseInt(el.dataset.id)); });
  });
  container.querySelectorAll('[data-action="copy"]').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); openBillFormAsCopy(parseInt(el.dataset.id)); });
  });
  container.querySelectorAll('[data-action="edit"]').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); openBillForm(parseInt(el.dataset.id)); });
  });
  container.querySelectorAll('[data-action="delete"]').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); confirmDeleteBill(parseInt(el.dataset.id)); });
  });
}

function confirmDeleteBill(billId) {
  const bill = getBills().find(b => b.id === billId);
  if (!bill) return;
  showConfirmModal(
    'বিল মুছুন',
    `বিল নং ${bill.billNumber} (${bill.customerName}) মুছে ফেলবেন?`,
    () => {
      let bills = getBills();
      bills = bills.filter(b => b.id !== billId);
      setBills(bills);
      closeConfirmModal();
      renderBillList();
      showToast('বিল মুছে ফেলা হয়েছে');
    }
  );
}

/* ===========================================================
   SETTINGS / PRODUCT MANAGEMENT SCREEN
   =========================================================== */
let draggedProductId = null;

function renderProductSettings() {
  const products = getAllProductsSorted();
  const container = document.getElementById('product-list-container');
  container.innerHTML = '';

  products.forEach((p, idx) => {
    const item = document.createElement('div');
    item.className = 'card p-2.5 flex items-center gap-2.5 product-item';
    item.draggable = true;
    item.dataset.id = p.id;

    const badgeColor = p.isActive ? '#0D3B66' : '#9e9e9e';
    const nameColor = p.isActive ? '#1a1a1a' : '#9e9e9e';
    const priceText = p.price > 0 ? `দর: ৳${fmtNum(p.price)}` : 'দর নির্ধারিত নয়';
    const priceColor = p.price > 0 ? '#1A5C96' : '#bbb';

    item.innerHTML = `
      <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style="background-color:${badgeColor};">${idx + 1}</div>
      <div class="flex-1 min-w-0">
        <p class="text-[15px] truncate" style="color:${nameColor};">${escapeHtml(p.name)}</p>
        <p class="text-[13px]" style="color:${priceColor};">${priceText}</p>
      </div>
      <button data-action="edit-product" data-id="${p.id}" class="p-1.5 text-[#0D3B66]">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
      </button>
      <button data-action="toggle-product" data-id="${p.id}" class="p-1.5" style="color:${p.isActive ? '#e53935' : '#43a047'};">
        ${p.isActive
          ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>'
          : '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>'}
      </button>
      <span class="drag-handle text-gray-400 p-1">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8h16M4 16h16" /></svg>
      </span>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll('[data-action="edit-product"]').forEach(el => {
    el.addEventListener('click', () => openProductDialog(parseInt(el.dataset.id)));
  });
  container.querySelectorAll('[data-action="toggle-product"]').forEach(el => {
    el.addEventListener('click', () => toggleProductActive(parseInt(el.dataset.id)));
  });

  attachDragHandlers(container);
}

function toggleProductActive(productId) {
  const products = getProducts();
  const p = products.find(x => x.id === productId);
  if (!p) return;
  if (p.isActive) {
    showConfirmModal('পণ্য মুছুন', `"${p.name}" মুছে ফেলবেন?`, () => {
      p.isActive = false;
      setProducts(products);
      closeConfirmModal();
      renderProductSettings();
      showToast('পণ্য মুছে ফেলা হয়েছে');
    });
  } else {
    p.isActive = true;
    setProducts(products);
    renderProductSettings();
    showToast('পণ্য পুনরুদ্ধার হয়েছে');
  }
}

/* ---------- Drag & drop reorder ---------- */
function attachDragHandlers(container) {
  const items = container.querySelectorAll('.product-item');
  items.forEach(item => {
    item.addEventListener('dragstart', () => {
      draggedProductId = parseInt(item.dataset.id);
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      items.forEach(i => i.classList.remove('drag-over'));
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const targetId = parseInt(item.dataset.id);
      if (draggedProductId === null || draggedProductId === targetId) return;
      reorderProducts(draggedProductId, targetId);
    });
  });
}

function reorderProducts(draggedId, targetId) {
  const products = getAllProductsSorted();
  const fromIdx = products.findIndex(p => p.id === draggedId);
  const toIdx = products.findIndex(p => p.id === targetId);
  if (fromIdx === -1 || toIdx === -1) return;

  const [moved] = products.splice(fromIdx, 1);
  products.splice(toIdx, 0, moved);

  products.forEach((p, idx) => { p.sortOrder = idx; });
  setProducts(products);
  renderProductSettings();
}

/* ---------- Product add/edit modal ---------- */
function openProductDialog(productId) {
  document.getElementById('product-modal-name-error').classList.add('hidden');
  if (productId) {
    const p = getProducts().find(x => x.id === productId);
    if (!p) return;
    document.getElementById('product-modal-title').textContent = 'পণ্য সম্পাদনা';
    document.getElementById('product-modal-id').value = p.id;
    document.getElementById('product-modal-name').value = p.name;
    document.getElementById('product-modal-price').value = p.price > 0 ? p.price : '';
  } else {
    document.getElementById('product-modal-title').textContent = 'নতুন পণ্য যোগ';
    document.getElementById('product-modal-id').value = '';
    document.getElementById('product-modal-name').value = '';
    document.getElementById('product-modal-price').value = '';
  }
  document.getElementById('product-modal-overlay').classList.add('active');
}

function closeProductDialog() {
  document.getElementById('product-modal-overlay').classList.remove('active');
}

function saveProductFromDialog() {
  const id = document.getElementById('product-modal-id').value;
  const name = document.getElementById('product-modal-name').value.trim();
  const price = parseFloat(document.getElementById('product-modal-price').value) || 0;

  if (!name) {
    document.getElementById('product-modal-name-error').classList.remove('hidden');
    return;
  }

  let products = getProducts();
  if (id) {
    const p = products.find(x => x.id === parseInt(id));
    if (p) { p.name = name; p.price = price; p.isActive = true; }
  } else {
    const maxOrder = products.length > 0 ? Math.max(...products.map(p => p.sortOrder)) : -1;
    products.push({ id: nextProductId(), name, price, sortOrder: maxOrder + 1, isActive: true });
  }
  setProducts(products);
  closeProductDialog();
  renderProductSettings();
  showToast('পণ্য সংরক্ষণ হয়েছে ✓');
}

/* ===========================================================
   GENERIC CONFIRM MODAL
   =========================================================== */
function showConfirmModal(title, message, onConfirm) {
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-message').textContent = message;
  const actionBtn = document.getElementById('confirm-modal-action');
  actionBtn.onclick = onConfirm;
  document.getElementById('confirm-modal-overlay').classList.add('active');
}
function closeConfirmModal() {
  document.getElementById('confirm-modal-overlay').classList.remove('active');
}

/* ===========================================================
   APP INIT
   =========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initData();
  renderHomeDashboard();

  // Register service worker for offline support (only if served over http/https)
  if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      // Silently ignore if it fails (e.g. opened via file://)
    });
  }
});
