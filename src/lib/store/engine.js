/* SoapFlow demo store — ILLUSTRATIVE DATA. All transactions are simulated client-side.
   Money: integer pesewas (minor units). Unit cost: integer GHS×10^4 per bar ("c4"). No float arithmetic on money. */
/* Ported from the HTML prototype as-is; createSoapStore() must only run in the browser (uses localStorage). */
export function createSoapStore() {
  const KEY = 'soapflow-demo-v1';
  const TODAY = '2026-10-22';
  let seed = 20261022;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pad = (n, l = 4) => String(n).padStart(l, '0');
  const addDays = (iso, d) => { const t = new Date(iso + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10); };
  const diffDays = (a, b) => Math.round((new Date(a + 'T00:00:00Z') - new Date(b + 'T00:00:00Z')) / 86400000);
  const clock = () => { const d = new Date(); return TODAY + ' ' + pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2); };
  const WH = ['TMA', 'KSI', 'TKD', 'TML'];

  const PERMS = ['inv.view', 'inv.adjust.request', 'inv.adjust.approve', 'inv.count', 'cat.edit', 'rcv.view', 'rcv.create', 'rcv.approve', 'trf.view', 'trf.create', 'trf.approve', 'trf.dispatch', 'trf.receive', 'po.view', 'po.create', 'po.approve', 'sup.view', 'so.view', 'so.create', 'so.approve', 'cus.view', 'dsp.view', 'dsp.process', 'dsp.deliver', 'fin.view', 'fin.record', 'fin.verify', 'exp.view', 'exp.create', 'exp.approve', 'rpt.ops', 'rpt.fin', 'usr.manage', 'set.manage', 'audit.view', 'cost.view'];
  const VIEW = ['inv.view', 'rcv.view', 'trf.view', 'po.view', 'sup.view', 'so.view', 'cus.view', 'dsp.view', 'fin.view', 'exp.view', 'rpt.ops', 'rpt.fin', 'audit.view', 'cost.view'];
  const ROLES = {
    admin: { name: 'System Administrator', perms: PERMS },
    owner: { name: 'Business Owner / Director', perms: PERMS.filter(p => !['dsp.deliver', 'usr.manage', 'set.manage', 'inv.count', 'dsp.process'].includes(p)) },
    ops: { name: 'Operations Manager', perms: ['inv.view', 'inv.adjust.request', 'inv.adjust.approve', 'inv.count', 'cat.edit', 'rcv.view', 'rcv.create', 'rcv.approve', 'trf.view', 'trf.create', 'trf.approve', 'trf.dispatch', 'trf.receive', 'po.view', 'po.create', 'po.approve', 'sup.view', 'so.view', 'so.approve', 'cus.view', 'dsp.view', 'dsp.process', 'exp.view', 'exp.create', 'rpt.ops', 'cost.view', 'audit.view'] },
    wm: { name: 'Warehouse Manager', perms: ['inv.view', 'inv.adjust.request', 'inv.adjust.approve', 'inv.count', 'rcv.view', 'rcv.create', 'rcv.approve', 'trf.view', 'trf.create', 'trf.approve', 'trf.dispatch', 'trf.receive', 'po.view', 'sup.view', 'so.view', 'dsp.view', 'dsp.process', 'exp.view', 'exp.create', 'rpt.ops'] },
    sk: { name: 'Storekeeper', perms: ['inv.view', 'inv.adjust.request', 'inv.count', 'rcv.view', 'rcv.create', 'trf.view', 'trf.dispatch', 'trf.receive', 'dsp.view', 'dsp.process', 'rpt.ops'] },
    proc: { name: 'Procurement Officer', perms: ['inv.view', 'cat.edit', 'rcv.view', 'po.view', 'po.create', 'sup.view', 'exp.view', 'rpt.ops', 'cost.view'] },
    sales: { name: 'Sales Officer', perms: ['inv.view', 'so.view', 'so.create', 'cus.view', 'dsp.view', 'rpt.ops'] },
    dispatch: { name: 'Dispatch Officer', perms: ['inv.view', 'so.view', 'dsp.view', 'dsp.process', 'trf.view', 'trf.dispatch', 'rpt.ops'] },
    driver: { name: 'Driver / Delivery Officer', perms: ['dsp.view', 'dsp.deliver'] },
    acct: { name: 'Accountant / Finance Officer', perms: ['inv.view', 'po.view', 'sup.view', 'so.view', 'so.approve', 'cus.view', 'fin.view', 'fin.record', 'fin.verify', 'exp.view', 'exp.create', 'exp.approve', 'rpt.ops', 'rpt.fin', 'cost.view', 'audit.view'] },
    auditor: { name: 'Read-only Auditor', perms: VIEW, readonly: true },
  };
  const PERM_LABELS = { 'inv.view': 'View stock', 'inv.adjust.request': 'Request adjustments', 'inv.adjust.approve': 'Approve adjustments', 'inv.count': 'Stocktaking', 'cat.edit': 'Edit catalogue', 'rcv.view': 'View receipts', 'rcv.create': 'Record receipts', 'rcv.approve': 'Approve & post receipts', 'trf.view': 'View transfers', 'trf.create': 'Request transfers', 'trf.approve': 'Approve transfers', 'trf.dispatch': 'Dispatch transfers', 'trf.receive': 'Receive transfers', 'po.view': 'View POs', 'po.create': 'Create POs', 'po.approve': 'Approve POs', 'sup.view': 'View suppliers', 'so.view': 'View sales orders', 'so.create': 'Create sales orders', 'so.approve': 'Approve credit/discounts', 'cus.view': 'View customers', 'dsp.view': 'View dispatch', 'dsp.process': 'Pick & dispatch', 'dsp.deliver': 'Record deliveries', 'fin.view': 'View invoices & payments', 'fin.record': 'Record payments', 'fin.verify': 'Verify payments / credit notes', 'exp.view': 'View expenses', 'exp.create': 'Record expenses', 'exp.approve': 'Approve expenses', 'rpt.ops': 'Operational reports', 'rpt.fin': 'Financial reports', 'usr.manage': 'Manage users', 'set.manage': 'System settings', 'audit.view': 'Audit trail', 'cost.view': 'See costs & valuation' };

  function seedState() {
    seed = 20261022;
    const warehouses = [
      { id: 'TMA', name: 'Tema Central', city: 'Tema', manager: 'u4', locations: ['Bay A', 'Bay B', 'Bay C', 'Quarantine cage', 'Dispatch dock'] },
      { id: 'KSI', name: 'Kumasi North', city: 'Kumasi', manager: 'u12', locations: ['Hall 1', 'Hall 2', 'Quarantine', 'Loading bay'] },
      { id: 'TKD', name: 'Takoradi Port', city: 'Takoradi', manager: 'u4', locations: ['Store 1', 'Store 2', 'Quarantine'] },
      { id: 'TML', name: 'Tamale Depot', city: 'Tamale', manager: 'u12', locations: ['Main floor', 'Quarantine'] },
    ];
    const brands = [
      { id: 'Velora', tag: 'Brand A', supplier: 'SUP-001' }, { id: 'Brightwash', tag: 'Brand B', supplier: 'SUP-002' },
      { id: 'Purecraft', tag: 'Brand C', supplier: 'SUP-003' }, { id: 'Sunmill', tag: 'Brand D', supplier: 'SUP-004' }];
    const P = (sku, name, brand, category, variant, size, cartonPacks, packBars, cost4, price, min, batch, status) => ({ sku, name, brand, category, variant, size, cartonPacks, packBars, baseUnit: 'bar', cost4, price, min, batch, expiryWarn: 60, barcode: '603' + pad(ri(1000000000, 9999999999), 10), status: status || 'Active', priceHistory: [{ date: '2026-04-01', price: Math.round(price * 0.94), by: 'Abena Owusu' }, { date: '2026-08-01', price, by: 'Abena Owusu' }] });
    const products = [
      P('VEL-BTH-100', 'Velora Bathing Soap 100 g', 'Velora', 'Bathing', 'Original', '100 g', 20, 12, 21000, 295, 2400, true),
      P('VEL-BTH-200', 'Velora Bathing Soap 200 g', 'Velora', 'Bathing', 'Original', '200 g', 12, 6, 38000, 520, 720, true),
      P('VEL-LAV-100', 'Velora Bathing Soap 100 g Lavender', 'Velora', 'Bathing', 'Lavender', '100 g', 20, 12, 22500, 310, 1440, true),
      P('BRW-LDY-250', 'Brightwash Laundry Bar 250 g', 'Brightwash', 'Laundry', 'Blue', '250 g', 10, 4, 44000, 600, 800, false),
      P('BRW-LDY-500', 'Brightwash Laundry Bar 500 g', 'Brightwash', 'Laundry', 'Blue', '500 g', 6, 4, 81000, 1080, 480, false),
      P('PUR-MPS-150', 'Purecraft Multipurpose Soap 150 g', 'Purecraft', 'Multipurpose', 'Lemon', '150 g', 16, 6, 30500, 430, 960, true),
      P('PUR-ANT-125', 'Purecraft Antibacterial Soap 125 g', 'Purecraft', 'Antibacterial', 'Classic', '125 g', 24, 6, 29000, 410, 1152, true),
      P('SUN-HRB-120', 'Sunmill Herbal Soap 120 g', 'Sunmill', 'Herbal', 'Shea', '120 g', 10, 10, 36000, 540, 600, true),
      P('SUN-OAT-090', 'Sunmill Oat Soap 90 g', 'Sunmill', 'Herbal', 'Oat', '90 g', 10, 10, 27000, 420, 0, false, 'Discontinued'),
    ];
    const pm = Object.fromEntries(products.map(p => [p.sku, p]));
    const bpc = sku => pm[sku].cartonPacks * pm[sku].packBars;
    const CT = { 'VEL-BTH-100': [212, 96, 58, 9], 'VEL-BTH-200': [140, 64, 30, 22], 'VEL-LAV-100': [48, 5, 12, 0], 'BRW-LDY-250': [310, 180, 95, 70], 'BRW-LDY-500': [120, 75, 18, 40], 'PUR-MPS-150': [96, 44, 30, 14], 'PUR-ANT-125': [70, 36, 6, 20], 'SUN-HRB-120': [52, 20, 34, 8], 'SUN-OAT-090': [3, 0, 2, 0] };
    const balances = {}; const batches = [];
    Object.keys(CT).forEach(sku => {
      const p = pm[sku];
      WH.forEach((w, i) => {
        const c = CT[sku][i]; const loose = c > 0 ? ri(0, p.cartonPacks - 1) * p.packBars : 0; const q = c * bpc(sku) + loose;
        balances[w + '|' + sku] = { wh: w, sku, sellable: q, reserved: 0, damaged: c > 20 ? ri(0, 3) * p.packBars : 0, quarantined: 0, inTransit: 0, avg: Math.round(p.cost4 * (1000 + ri(-15, 15)) / 1000), last: addDays(TODAY, -ri(0, 6)) };
        if (p.batch && q > 0) {
          const b1 = Math.round(q * 0.35 / p.packBars) * p.packBars; const code = sku.split('-')[0].slice(0, 2) + sku.split('-')[2];
          const near = (w === 'TMA' && sku === 'VEL-BTH-100') ? 38 : ri(70, 200);
          batches.push({ id: 'B' + batches.length, wh: w, sku, batch: code + '-2603' + 'A', mfg: '2026-03-' + pad(ri(2, 27), 2), exp: addDays(TODAY, near), qty: b1, bucket: 'sellable' });
          batches.push({ id: 'B' + batches.length, wh: w, sku, batch: code + '-2608' + 'B', mfg: '2026-08-' + pad(ri(2, 27), 2), exp: addDays(TODAY, ri(300, 520)), qty: q - b1, bucket: 'sellable' });
        }
      });
    });
    balances['TKD|PUR-ANT-125'].quarantined += 144;
    batches.push({ id: 'BX1', wh: 'TKD', sku: 'PUR-ANT-125', batch: 'PU125-2510C', mfg: '2025-10-04', exp: addDays(TODAY, -6), qty: 144, bucket: 'quarantined' });
    balances['TMA|VEL-BTH-200'].quarantined += 72;
    batches.push({ id: 'BX2', wh: 'TMA', sku: 'VEL-BTH-200', batch: 'VE200-2603A', mfg: '2026-03-11', exp: addDays(TODAY, 140), qty: 72, bucket: 'quarantined' });

    const L = (sku, ctn, cost4) => ({ sku, qty: ctn * bpc(sku), cost4: cost4 || pm[sku].cost4 });
    const suppliers = [
      { id: 'SUP-001', name: 'Coastal Soap Manufacturing Ltd', contact: 'Edwin Lartey', phone: '+233 30 290 1144', email: 'orders@coastalsoap.example', address: 'Heavy Industrial Area, Tema', terms: 30, brands: ['Velora'] },
      { id: 'SUP-002', name: 'Brightwash Industries', contact: 'Gifty Amoah', phone: '+233 32 202 7781', email: 'sales@brightwash.example', address: 'Ahinsan Industrial Estate, Kumasi', terms: 45, brands: ['Brightwash'] },
      { id: 'SUP-003', name: 'Purecraft Products Co.', contact: 'Felix Danquah', phone: '+233 30 277 4410', email: 'trade@purecraft.example', address: 'Spintex Road, Accra', terms: 30, brands: ['Purecraft'] },
      { id: 'SUP-004', name: 'Sunmill Naturals', contact: 'Rita Abban', phone: '+233 31 202 6650', email: 'supply@sunmill.example', address: 'Harbour Road, Takoradi', terms: 14, brands: ['Sunmill'] },
    ];
    const customers = [
      { id: 'CUS-001', name: 'Makola Wholesale Traders', type: 'Distributor', contact: 'Joseph Ankrah', phone: '+233 24 410 2290', city: 'Accra', address: 'Makola Market Block C, Accra', terms: 30, limit: 8000000, since: '2023-02-14' },
      { id: 'CUS-002', name: 'Adom Supermarket', type: 'Business', contact: 'Linda Ofosu', phone: '+233 20 118 7743', city: 'Tema', address: 'Community 9, Tema', terms: 14, limit: 3000000, since: '2024-06-01' },
      { id: 'CUS-003', name: 'Kejetia Retail Hub', type: 'Repeat buyer', contact: 'Kofi Mensah', phone: '+233 27 556 0912', city: 'Kumasi', address: 'Kejetia Market, Kumasi', terms: 0, limit: 0, since: '2024-11-20' },
      { id: 'CUS-004', name: 'Northern Star Distributors', type: 'Distributor', contact: 'Ibrahim Seidu', phone: '+233 24 903 1180', city: 'Tamale', address: 'Central Market Road, Tamale', terms: 30, limit: 2500000, since: '2023-09-03' },
      { id: 'CUS-005', name: 'Harbour View Hotel', type: 'Business', contact: 'Grace Essien', phone: '+233 31 204 5521', city: 'Takoradi', address: 'Beach Road, Takoradi', terms: 30, limit: 2000000, since: '2025-01-10' },
      { id: 'CUS-006', name: 'Walk-in customer', type: 'Walk-in', contact: '—', phone: '', city: '', address: '', terms: 0, limit: 0, since: '2022-01-01' },
      { id: 'CUS-007', name: 'Ama Mensah Provisions', type: 'Repeat buyer', contact: 'Ama Mensah', phone: '+233 55 210 8834', city: 'Tema', address: 'Community 4, Tema', terms: 0, limit: 0, since: '2025-05-22' },
    ];
    const users = [
      ['u1', 'Kofi Asante', 'admin', ['ALL']], ['u2', 'Abena Owusu', 'owner', ['ALL']], ['u3', 'Yaw Boateng', 'ops', ['ALL']], ['u4', 'Efua Mensah', 'wm', ['TMA', 'TKD']],
      ['u5', 'Kwame Darko', 'sk', ['TMA']], ['u6', 'Akosua Frimpong', 'proc', ['ALL']], ['u7', 'Nana Adjei', 'sales', ['TMA', 'KSI']], ['u8', 'Kojo Appiah', 'dispatch', ['TMA']],
      ['u9', 'Samuel Tetteh', 'driver', ['TMA', 'TKD']], ['u10', 'Esi Quaye', 'acct', ['ALL']], ['u11', 'Daniel Ofori', 'auditor', ['ALL']], ['u12', 'Ama Serwaa', 'wm', ['KSI', 'TML']],
      ['u13', 'Yaa Asantewaa', 'sk', ['KSI']], ['u14', 'Peter Nartey', 'sales', ['TKD'], 'Suspended'],
    ].map(([id, name, role, wh, status]) => ({ id, name, role, wh, status: status || 'Active', email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@demo-soapflow.test', last: status ? '2026-08-30 17:12' : addDays(TODAY, -ri(0, 2)) + ' 0' + ri(7, 9) + ':' + pad(ri(0, 59), 2) }));

    const pos = [
      { id: 'PO-2026-0139', supplier: 'SUP-004', wh: 'TKD', date: '2026-10-02', expected: '2026-10-09', status: 'Approved', lines: [L('SUN-HRB-120', 100)], discPct: 0, taxPct: 0, by: 'u6', approvedBy: 'u2' },
      { id: 'PO-2026-0141', supplier: 'SUP-001', wh: 'TMA', date: '2026-10-10', expected: '2026-10-21', status: 'Approved', lines: [L('VEL-BTH-100', 300, 20800), L('VEL-BTH-200', 120, 37600), L('VEL-LAV-100', 80)], discPct: 2, taxPct: 0, by: 'u6', approvedBy: 'u2' },
      { id: 'PO-2026-0142', supplier: 'SUP-002', wh: 'KSI', date: '2026-10-14', expected: '2026-10-22', status: 'Approved', lines: [L('BRW-LDY-250', 400, 43500), L('BRW-LDY-500', 150, 80000)], discPct: 0, taxPct: 0, by: 'u6', approvedBy: 'u2' },
      { id: 'PO-2026-0143', supplier: 'SUP-003', wh: 'TMA', date: '2026-10-20', expected: '2026-10-30', status: 'Pending Approval', lines: [L('PUR-MPS-150', 200), L('PUR-ANT-125', 150)], discPct: 0, taxPct: 0, by: 'u6' },
      { id: 'PO-2026-0144', supplier: 'SUP-001', wh: 'TKD', date: '2026-10-21', expected: '2026-11-04', status: 'Draft', lines: [L('VEL-BTH-100', 120, 20800)], discPct: 2, taxPct: 0, by: 'u6' },
    ];
    const RL = (sku, expC, cntC, acc, rej, dmg, cost4, b) => { const u = bpc(sku); const e = { sku, expected: expC * u, counted: cntC * u, accepted: acc * u, rejected: rej * u, damaged: dmg * u, cost4: cost4 || pm[sku].cost4 }; if (b) Object.assign(e, b); return e; };
    const receipts = [
      { id: 'GRN-2026-0380', po: '', supplier: 'SUP-003', wh: 'TMA', truck: 'GR-7731-19', driver: 'Moses K.', dn: 'PC-DN-1182', arrival: '2026-10-05 09:20', status: 'Rejected', by: 'u5', rejectedBy: 'u4', reason: 'Delivery not covered by an approved purchase order — returned on truck.', lines: [RL('PUR-MPS-150', 60, 60, 0, 60, 0)] },
      { id: 'GRN-2026-0385', po: 'PO-2026-0139', supplier: 'SUP-004', wh: 'TKD', truck: 'WR-3317-21', driver: 'Isaac M.', dn: 'SN-DN-5521', arrival: '2026-10-09 10:40', status: 'Posted', by: 'u4', postedBy: 'u4', postedAt: '2026-10-09 15:10', lines: [RL('SUN-HRB-120', 100, 100, 100, 0, 0, 0, { batch: 'SU120-2609A', mfg: '2026-09-12', exp: '2027-09-11' })] },
      { id: 'GRN-2026-0388', po: 'PO-2026-0141', supplier: 'SUP-001', wh: 'TMA', truck: 'GT-4821-23', driver: 'Ebo T.', dn: 'CSM-DN-77120', arrival: '2026-10-16 07:55', status: 'Posted', by: 'u5', postedBy: 'u4', postedAt: '2026-10-16 13:30', notes: '2 cartons crushed on pallet 4.', lines: [RL('VEL-BTH-100', 200, 200, 198, 0, 2, 20800, { batch: 'VE100-2608B', mfg: '2026-08-14', exp: '2028-02-13' }), RL('VEL-BTH-200', 80, 80, 80, 0, 0, 37600, { batch: 'VE200-2608B', mfg: '2026-08-20', exp: '2028-02-19' })] },
      { id: 'GRN-2026-0391', po: 'PO-2026-0142', supplier: 'SUP-002', wh: 'KSI', truck: 'AS-2290-22', driver: 'Kwabena O.', dn: 'BWI-DN-30981', arrival: TODAY + ' 08:15', status: 'Counting', by: 'u13', lines: [RL('BRW-LDY-250', 400, 0, 0, 0, 0, 43500), RL('BRW-LDY-500', 150, 0, 0, 0, 0, 80000)] },
      { id: 'GRN-2026-0392', po: 'PO-2026-0141', supplier: 'SUP-001', wh: 'TMA', truck: 'GT-5507-24', driver: 'Ebo T.', dn: 'CSM-DN-77164', arrival: TODAY + ' 07:40', status: 'Pending Approval', by: 'u5', notes: '5 cartons short on 100 g Original. 4 cartons Lavender rejected — wrong label print.', lines: [RL('VEL-BTH-100', 100, 95, 93, 0, 2, 20800, { batch: 'VE100-2609C', mfg: '2026-09-18', exp: '2028-03-17' }), RL('VEL-BTH-200', 40, 40, 40, 0, 0, 37600, { batch: 'VE200-2609C', mfg: '2026-09-22', exp: '2028-03-21' }), RL('VEL-LAV-100', 80, 80, 76, 4, 0, 22500, { batch: 'VL100-2609A', mfg: '2026-09-25', exp: '2028-03-24' })] },
    ];
    const TL = (sku, ctn, o) => Object.assign({ sku, req: ctn * bpc(sku), appr: 0, disp: 0, recv: 0, damaged: 0, cost4: 0 }, o || {});
    const transfers = [
      { id: 'TRF-2026-0055', from: 'TKD', to: 'TMA', status: 'Received', date: '2026-10-12', by: 'u4', approvedBy: 'u4', dispatchedAt: '2026-10-13 09:00', receivedAt: '2026-10-14 11:20', vehicle: 'GT-1182-20', lines: [TL('SUN-HRB-120', 20, { appr: 2000, disp: 2000, recv: 2000, cost4: 35800 })] },
      { id: 'TRF-2026-0056', from: 'KSI', to: 'TML', status: 'Disputed', date: '2026-10-15', by: 'u12', approvedBy: 'u12', dispatchedAt: '2026-10-16 06:30', receivedAt: '2026-10-18 14:05', vehicle: 'AS-8812-21', note: '2 cartons short on arrival; seal intact. Investigation open.', lines: [TL('BRW-LDY-250', 60, { appr: 2400, disp: 2400, recv: 2320, cost4: 43900 })] },
      { id: 'TRF-2026-0057', from: 'TMA', to: 'TML', status: 'In Transit', date: '2026-10-19', by: 'u4', approvedBy: 'u4', dispatchedAt: '2026-10-21 05:45', vehicle: 'GT-9921-22', lines: [TL('VEL-BTH-100', 40, { appr: 9600, disp: 9600, cost4: 21000 }), TL('BRW-LDY-250', 60, { appr: 2400, disp: 2400, cost4: 44000 })] },
      { id: 'TRF-2026-0058', from: 'TMA', to: 'KSI', status: 'Requested', date: '2026-10-21', by: 'u12', lines: [TL('PUR-MPS-150', 30), TL('VEL-LAV-100', 20)] },
      { id: 'TRF-2026-0059', from: 'KSI', to: 'TKD', status: 'Draft', date: TODAY, by: 'u12', lines: [TL('BRW-LDY-500', 20)] },
      { id: 'TRF-2026-0060', from: 'TMA', to: 'TKD', status: 'Approved', date: '2026-10-21', by: 'u4', approvedBy: 'u4', lines: [TL('PUR-ANT-125', 15, { appr: 2160 })] },
    ];
    balances['TML|VEL-BTH-100'].inTransit += 9600; balances['TML|BRW-LDY-250'].inTransit += 2400;
    const SL = (sku, ctn, o) => Object.assign({ sku, qty: ctn * bpc(sku), price: pm[sku].price, discPct: 0, fulfilled: 0, reserved: 0, returned: 0 }, o || {});
    const salesOrders = [
      { id: 'SO-2026-1198', customer: 'CUS-001', wh: 'TMA', date: '2026-10-15', method: 'Delivery', terms: 'Credit', status: 'Delivered', by: 'u7', address: 'Makola Market Block C, Accra', lines: [SL('VEL-BTH-100', 30, { fulfilled: 7200 }), SL('BRW-LDY-250', 40, { fulfilled: 1600 })] },
      { id: 'SO-2026-1199', customer: 'CUS-007', wh: 'TMA', date: '2026-10-16', method: 'Collection', terms: 'Cash', status: 'Cancelled', by: 'u7', cancelReason: 'Customer changed order', lines: [SL('VEL-BTH-200', 5)] },
      { id: 'SO-2026-1200', customer: 'CUS-002', wh: 'TMA', date: '2026-10-17', method: 'Delivery', terms: 'Credit', status: 'Partially Fulfilled', by: 'u7', address: 'Community 9, Tema', lines: [SL('PUR-MPS-150', 20, { fulfilled: 1152 }), SL('VEL-BTH-200', 10, { fulfilled: 720 })] },
      { id: 'SO-2026-1201', customer: 'CUS-001', wh: 'TMA', date: '2026-10-21', method: 'Delivery', terms: 'Credit', status: 'Confirmed', by: 'u7', address: 'Makola Market Block C, Accra', lines: [SL('VEL-BTH-100', 50), SL('VEL-BTH-200', 20), SL('BRW-LDY-500', 15, { discPct: 2 })] },
      { id: 'SO-2026-1202', customer: 'CUS-002', wh: 'TMA', date: '2026-10-21', method: 'Collection', terms: 'Credit', status: 'Ready for Collection', by: 'u7', lines: [SL('BRW-LDY-250', 25), SL('PUR-ANT-125', 10)] },
      { id: 'SO-2026-1203', customer: 'CUS-003', wh: 'KSI', date: '2026-10-20', method: 'Collection', terms: 'Cash', status: 'Completed', by: 'u7', lines: [SL('VEL-BTH-100', 8, { fulfilled: 1920 }), SL('SUN-HRB-120', 4, { fulfilled: 400 })] },
      { id: 'SO-2026-1204', customer: 'CUS-004', wh: 'TML', date: '2026-10-22', method: 'Delivery', terms: 'Credit', status: 'Pending Approval', approvalReason: 'Exceeds customer credit limit', by: 'u7', address: 'Central Market Road, Tamale', lines: [SL('VEL-BTH-100', 6), SL('BRW-LDY-250', 40), SL('VEL-BTH-200', 10)] },
      { id: 'SO-2026-1205', customer: 'CUS-005', wh: 'TKD', date: '2026-10-21', method: 'Delivery', terms: 'Credit', status: 'Dispatched', by: 'u14', address: 'Beach Road, Takoradi', lines: [SL('SUN-HRB-120', 10, { fulfilled: 1000 }), SL('PUR-ANT-125', 2, { fulfilled: 288 })] },
      { id: 'SO-2026-1206', customer: 'CUS-006', walkin: 'Kwesi Badu · 024 555 1290', wh: 'TMA', date: TODAY, method: 'Collection', terms: 'Cash', status: 'Draft', by: 'u7', lines: [SL('VEL-BTH-100', 1)] },
      { id: 'SO-2026-1207', customer: 'CUS-007', wh: 'TMA', date: TODAY, method: 'Collection', terms: 'Cash', status: 'Confirmed', by: 'u7', lines: [SL('VEL-LAV-100', 4), SL('SUN-HRB-120', 2)] },
    ];
    salesOrders.forEach(so => { if (['Confirmed', 'Ready for Collection', 'Ready for Dispatch', 'Partially Fulfilled'].includes(so.status)) so.lines.forEach(l => { const b = balances[so.wh + '|' + l.sku]; const want = l.qty - l.fulfilled; const r = Math.max(0, Math.min(want, b.sellable - b.reserved)); b.reserved += r; l.reserved = r; }); });
    const DL = (sku, ordered, o) => Object.assign({ sku, ordered, picked: 0, verified: 0, dispatched: 0, delivered: 0 }, o || {});
    const dispatches = [
      { id: 'DSP-2026-0731', so: 'SO-2026-1198', wh: 'TMA', method: 'Delivery', status: 'Delivered', driver: 'u9', vehicle: 'GT-3340-22', date: '2026-10-16', dispatchedAt: '2026-10-16 08:10', deliveredAt: '2026-10-16 15:20', recipient: 'Joseph Ankrah', pod: 'POD-0731', deducted: true, by: 'u8', lines: [DL('VEL-BTH-100', 7200, { picked: 7200, verified: 7200, dispatched: 7200, delivered: 7200 }), DL('BRW-LDY-250', 1600, { picked: 1600, verified: 1600, dispatched: 1600, delivered: 1600 })] },
      { id: 'DSP-2026-0733', so: 'SO-2026-1200', wh: 'TMA', method: 'Delivery', status: 'Partially delivered', driver: 'u9', vehicle: 'GT-3340-22', date: '2026-10-18', dispatchedAt: '2026-10-18 09:00', deliveredAt: '2026-10-18 12:40', recipient: 'Linda Ofosu', pod: 'POD-0733', outcomeNote: '1 carton 150 g refused — damaged outer carton; returned to quarantine.', deducted: true, by: 'u8', lines: [DL('PUR-MPS-150', 1248, { picked: 1248, verified: 1248, dispatched: 1248, delivered: 1152 }), DL('VEL-BTH-200', 720, { picked: 720, verified: 720, dispatched: 720, delivered: 720 })] },
      { id: 'DSP-2026-0735', so: 'SO-2026-1203', wh: 'KSI', method: 'Collection', status: 'Completed', date: '2026-10-20', dispatchedAt: '2026-10-20 11:05', collector: 'Kofi Mensah (owner)', collectorId: 'GHA-7123-449', deducted: true, by: 'u13', lines: [DL('VEL-BTH-100', 1920, { picked: 1920, verified: 1920, dispatched: 1920 }), DL('SUN-HRB-120', 400, { picked: 400, verified: 400, dispatched: 400 })] },
      { id: 'DSP-2026-0736', so: 'SO-2026-1205', wh: 'TKD', method: 'Delivery', status: 'Out for delivery', driver: 'u9', vehicle: 'WR-1102-23', date: '2026-10-22', dispatchedAt: TODAY + ' 07:30', deducted: true, by: 'u4', lines: [DL('SUN-HRB-120', 1000, { picked: 1000, verified: 1000, dispatched: 1000 }), DL('PUR-ANT-125', 288, { picked: 288, verified: 288, dispatched: 288 })] },
      { id: 'DSP-2026-0737', so: 'SO-2026-1202', wh: 'TMA', method: 'Collection', status: 'Verified', date: TODAY, by: 'u8', lines: [DL('BRW-LDY-250', 1000, { picked: 1000, verified: 1000 }), DL('PUR-ANT-125', 1440, { picked: 1440, verified: 1440 })] },
    ];
    balances['TMA|PUR-MPS-150'].quarantined += 96;
    const lineTotal = l => l.qty * l.price - Math.round(l.qty * l.price * l.discPct / 100);
    const invFromSO = (id, soId, date, due, paid, frac) => { const so = salesOrders.find(s => s.id === soId); const lines = so.lines.map(l => ({ sku: l.sku, qty: l.fulfilled, price: l.price, discPct: l.discPct })); const total = lines.reduce((a, l) => a + l.qty * l.price - Math.round(l.qty * l.price * l.discPct / 100), 0); return { id, so: soId, customer: so.customer, wh: so.wh, date, due, lines, total, paid: paid === 'all' ? total : paid, credited: 0 }; };
    const invoices = [
      { id: 'INV-2026-0598', so: '', customer: 'CUS-004', wh: 'TML', date: '2026-09-10', due: '2026-10-10', lines: [], total: 1840000, paid: 1840000, credited: 0 },
      { id: 'INV-2026-0602', so: '', customer: 'CUS-001', wh: 'TMA', date: '2026-09-18', due: '2026-10-18', lines: [], total: 2635000, paid: 1000000, credited: 0 },
      { id: 'INV-2026-0605', so: '', customer: 'CUS-002', wh: 'TMA', date: '2026-09-28', due: '2026-10-12', lines: [], total: 892000, paid: 0, credited: 0 },
      { id: 'INV-2026-0607', so: '', customer: 'CUS-005', wh: 'TKD', date: '2026-10-03', due: '2026-11-02', lines: [], total: 129600, paid: 0, credited: 129600, note: 'Fully credited — CN-2026-0021 (goods returned damaged).' },
      invFromSO('INV-2026-0609', 'SO-2026-1200', '2026-10-18', '2026-11-01', 0),
      invFromSO('INV-2026-0611', 'SO-2026-1198', '2026-10-16', '2026-11-15', 1500000),
      invFromSO('INV-2026-0612', 'SO-2026-1203', '2026-10-20', '2026-10-20', 'all'),
      invFromSO('INV-2026-0613', 'SO-2026-1205', TODAY, '2026-11-21', 0),
    ];
    dispatches.forEach(d => { const inv = invoices.find(i => i.so === d.so); if (inv) { inv.dsp = d.id; d.invoice = inv.id; } });
    const payments = [
      { id: 'PAY-2026-0441', customer: 'CUS-004', date: '2026-10-08', amount: 1840000, method: 'Bank transfer', extRef: 'GCB-TRX-88213', by: 'u10', alloc: [{ inv: 'INV-2026-0598', amount: 1840000 }], status: 'Verified', verifiedBy: 'u10' },
      { id: 'PAY-2026-0446', customer: 'CUS-001', date: '2026-10-11', amount: 1000000, method: 'Mobile money', extRef: 'MM-5521093', by: 'u10', alloc: [{ inv: 'INV-2026-0602', amount: 1000000 }], status: 'Verified', verifiedBy: 'u10' },
      { id: 'PAY-2026-0449', customer: 'CUS-003', date: '2026-10-20', amount: invoices[6].total, method: 'Cash', extRef: '', by: 'u13', alloc: [{ inv: 'INV-2026-0612', amount: invoices[6].total }], status: 'Verified', verifiedBy: 'u10' },
      { id: 'PAY-2026-0452', customer: 'CUS-001', date: '2026-10-21', amount: 1500000, method: 'Bank transfer', extRef: 'CAL-449120', by: 'u10', alloc: [{ inv: 'INV-2026-0611', amount: 1500000 }], status: 'Recorded', notes: 'Awaiting bank statement confirmation.' },
    ];
    const creditNotes = [{ id: 'CN-2026-0021', inv: 'INV-2026-0607', customer: 'CUS-005', date: '2026-10-07', amount: 129600, reason: 'Goods returned damaged', by: 'u10' }];
    const SIL = (sku, ctn, cost4) => ({ sku, qty: ctn * bpc(sku), cost4 });
    const sinvTotal = ls => ls.reduce((a, l) => a + Math.round(l.qty * l.cost4 / 100), 0);
    const supplierInvoices = [
      { id: 'SN-INV-2210', supplier: 'SUP-004', po: 'PO-2026-0139', grn: 'GRN-2026-0385', date: '2026-10-09', due: '2026-10-23', lines: [SIL('SUN-HRB-120', 100, 36000)] },
      { id: 'CSM-INV-90412', supplier: 'SUP-001', po: 'PO-2026-0141', grn: 'GRN-2026-0388', date: '2026-10-17', due: '2026-11-16', lines: [SIL('VEL-BTH-100', 200, 20800), SIL('VEL-BTH-200', 80, 37600)] },
      { id: 'BWI-INV-3301', supplier: 'SUP-002', po: 'PO-2026-0142', grn: '', date: '2026-10-20', due: '2026-12-04', lines: [SIL('BRW-LDY-250', 400, 43500), SIL('BRW-LDY-500', 150, 80000)] },
    ].map(s => Object.assign(s, { total: sinvTotal(s.lines), paid: 0 }));
    supplierInvoices[0].paid = supplierInvoices[0].total; supplierInvoices[1].paid = 5000000;
    const supplierPayments = [
      { id: 'SPAY-2026-0120', supplier: 'SUP-004', date: '2026-10-15', amount: supplierInvoices[0].total, method: 'Bank transfer', ref: 'GCB-OUT-22018', alloc: [{ inv: 'SN-INV-2210', amount: supplierInvoices[0].total }], by: 'u10' },
      { id: 'SPAY-2026-0123', supplier: 'SUP-001', date: '2026-10-20', amount: 5000000, method: 'Bank transfer', ref: 'GCB-OUT-22107', alloc: [{ inv: 'CSM-INV-90412', amount: 5000000 }], by: 'u10' },
    ];
    const E = (id, date, category, wh, amount, method, ref, description, status, by, approvedBy) => ({ id, date, category, wh, amount, method, ref, description, status, by, approvedBy, evidence: status !== 'Rejected' ? 'receipt-' + id.slice(-4) + '.pdf' : '' });
    const expenses = [
      E('EXP-2026-0301', '2026-10-01', 'Utilities', 'TMA', 482000, 'Bank transfer', 'ECG-0925', 'Electricity — September', 'Approved', 'u10', 'u2'),
      E('EXP-2026-0302', '2026-10-03', 'Transportation', 'TMA', 215000, 'Mobile money', 'MM-7713201', 'Fuel — delivery van GT-3340-22', 'Approved', 'u8', 'u10'),
      E('EXP-2026-0303', '2026-10-05', 'Loading & unloading', 'KSI', 96000, 'Cash', 'PCV-0441', 'Casual labour — truck offload', 'Approved', 'u13', 'u10'),
      E('EXP-2026-0304', '2026-10-08', 'Warehouse maintenance', 'TKD', 340000, 'Bank transfer', 'INV-RF-118', 'Roof repair — Store 2', 'Approved', 'u4', 'u2'),
      E('EXP-2026-0305', '2026-10-10', 'Security', 'TMA', 650000, 'Bank transfer', 'SEC-OCT', 'Security services — October', 'Approved', 'u10', 'u2'),
      E('EXP-2026-0306', '2026-10-12', 'Transportation', 'TML', 128000, 'Cash', 'PCV-0452', 'Truck hire — Kumasi to Tamale top-up', 'Approved', 'u12', 'u10'),
      E('EXP-2026-0307', '2026-10-14', 'Utilities', 'KSI', 177000, 'Mobile money', 'MM-7713877', 'Water & electricity', 'Approved', 'u10', 'u10'),
      E('EXP-2026-0308', '2026-10-16', 'Loading & unloading', 'TMA', 84000, 'Cash', 'PCV-0460', 'Offload GRN-2026-0388', 'Approved', 'u5', 'u10'),
      E('EXP-2026-0309', '2026-10-18', 'Other', 'TMA', 42000, 'Cash', 'PCV-0466', 'Pallet wrap and labels', 'Rejected', 'u5', 'u10'),
      E('EXP-2026-0310', '2026-10-20', 'Transportation', 'TKD', 236000, 'Mobile money', 'MM-7714402', 'Fuel — WR-1102-23', 'Approved', 'u4', 'u10'),
      E('EXP-2026-0311', TODAY, 'Loading & unloading', 'KSI', 120000, 'Cash', 'PCV-0471', 'Offload GRN-2026-0391 (Brightwash)', 'Pending Approval', 'u13'),
      E('EXP-2026-0312', TODAY, 'Warehouse maintenance', 'TMA', 275000, 'Bank transfer', 'FL-2210', 'Forklift service', 'Pending Approval', 'u4'),
    ];
    const adjustments = [
      { id: 'ADJ-2026-0029', wh: 'TKD', sku: 'PUR-ANT-125', qty: -24, type: 'Damage', reason: 'Water damage — leaking roof Store 2', status: 'Rejected', by: 'u4', at: '2026-10-08 10:12', approver: 'u3', decidedAt: '2026-10-08 16:40', note: 'Recount required — quantity not verified.' },
      { id: 'ADJ-2026-0030', wh: 'KSI', sku: 'BRW-LDY-250', qty: -8, type: 'Damage', reason: 'Torn wrappers found during picking', status: 'Posted', by: 'u13', at: '2026-10-14 09:30', approver: 'u12', decidedAt: '2026-10-14 11:02', cost4: 43900 },
      { id: 'ADJ-2026-0031', wh: 'TMA', sku: 'VEL-BTH-100', qty: -36, type: 'Damage', reason: 'Crushed packs found at Bay B after forklift incident', status: 'Pending Approval', by: 'u5', at: TODAY + ' 09:05' },
      { id: 'ADJ-2026-0032', wh: 'TMA', sku: 'SUN-HRB-120', qty: 20, type: 'Count variance', reason: 'Surplus found — mis-shelved return from TRF-2026-0055', status: 'Pending Approval', by: 'u5', at: '2026-10-18 17:20', count: 'CNT-2026-0011' },
    ];
    const counts = [
      { id: 'CNT-2026-0011', wh: 'TMA', location: 'Bay C', status: 'Pending Approval', blind: true, created: '2026-10-18 14:00', by: 'u5', lines: [{ sku: 'SUN-HRB-120', expected: balances['TMA|SUN-HRB-120'].sellable, counted: balances['TMA|SUN-HRB-120'].sellable + 20, history: [], reason: 'Surplus found — mis-shelved return' }, { sku: 'BRW-LDY-500', expected: balances['TMA|BRW-LDY-500'].sellable, counted: balances['TMA|BRW-LDY-500'].sellable, history: [] }] },
      { id: 'CNT-2026-0012', wh: 'TMA', location: 'Bay A', status: 'Counting', blind: true, created: TODAY + ' 07:30', by: 'u5', lines: ['VEL-BTH-100', 'VEL-BTH-200', 'VEL-LAV-100'].map(sku => ({ sku, expected: balances['TMA|' + sku].sellable, counted: null, history: [] })) },
    ];
    // movements
    const movements = []; let mv = 5000;
    const M = (ts, type, wh, sku, qty, bucket, ref, user) => movements.push({ id: 'MOV-' + (mv++), ts, type, wh, sku, qty, bucket, cost4: balances[wh + '|' + sku].avg, ref, user });
    M('2026-10-09 15:10', 'Goods receipt', 'TKD', 'SUN-HRB-120', 10000, 'sellable', 'GRN-2026-0385', 'u4');
    M('2026-10-13 09:00', 'Transfer out', 'TKD', 'SUN-HRB-120', -2000, 'sellable', 'TRF-2026-0055', 'u4');
    M('2026-10-14 11:20', 'Transfer in', 'TMA', 'SUN-HRB-120', 2000, 'sellable', 'TRF-2026-0055', 'u5');
    M('2026-10-14 11:02', 'Adjustment', 'KSI', 'BRW-LDY-250', -8, 'sellable', 'ADJ-2026-0030', 'u12');
    M('2026-10-14 11:02', 'Adjustment', 'KSI', 'BRW-LDY-250', 8, 'damaged', 'ADJ-2026-0030', 'u12');
    M('2026-10-16 08:10', 'Sales dispatch', 'TMA', 'VEL-BTH-100', -7200, 'sellable', 'DSP-2026-0731', 'u8');
    M('2026-10-16 08:10', 'Sales dispatch', 'TMA', 'BRW-LDY-250', -1600, 'sellable', 'DSP-2026-0731', 'u8');
    M('2026-10-16 06:30', 'Transfer out', 'KSI', 'BRW-LDY-250', -2400, 'sellable', 'TRF-2026-0056', 'u12');
    M('2026-10-16 13:30', 'Goods receipt', 'TMA', 'VEL-BTH-100', 47520, 'sellable', 'GRN-2026-0388', 'u4');
    M('2026-10-16 13:30', 'Receipt — damaged', 'TMA', 'VEL-BTH-100', 480, 'damaged', 'GRN-2026-0388', 'u4');
    M('2026-10-16 13:30', 'Goods receipt', 'TMA', 'VEL-BTH-200', 5760, 'sellable', 'GRN-2026-0388', 'u4');
    M('2026-10-18 09:00', 'Sales dispatch', 'TMA', 'PUR-MPS-150', -1248, 'sellable', 'DSP-2026-0733', 'u8');
    M('2026-10-18 09:00', 'Sales dispatch', 'TMA', 'VEL-BTH-200', -720, 'sellable', 'DSP-2026-0733', 'u8');
    M('2026-10-18 12:40', 'Delivery return', 'TMA', 'PUR-MPS-150', 96, 'quarantined', 'DSP-2026-0733', 'u9');
    M('2026-10-18 14:05', 'Transfer in', 'TML', 'BRW-LDY-250', 2320, 'sellable', 'TRF-2026-0056', 'u12');
    M('2026-10-20 11:05', 'Sales dispatch', 'KSI', 'VEL-BTH-100', -1920, 'sellable', 'DSP-2026-0735', 'u13');
    M('2026-10-20 11:05', 'Sales dispatch', 'KSI', 'SUN-HRB-120', -400, 'sellable', 'DSP-2026-0735', 'u13');
    M('2026-10-21 05:45', 'Transfer out', 'TMA', 'VEL-BTH-100', -9600, 'sellable', 'TRF-2026-0057', 'u8');
    M('2026-10-21 05:45', 'Transfer out', 'TMA', 'BRW-LDY-250', -2400, 'sellable', 'TRF-2026-0057', 'u8');
    M('2026-10-21 05:45', 'In transit', 'TML', 'VEL-BTH-100', 9600, 'in-transit', 'TRF-2026-0057', 'u8');
    M('2026-10-21 05:45', 'In transit', 'TML', 'BRW-LDY-250', 2400, 'in-transit', 'TRF-2026-0057', 'u8');
    M(TODAY + ' 07:30', 'Sales dispatch', 'TKD', 'SUN-HRB-120', -1000, 'sellable', 'DSP-2026-0736', 'u4');
    M(TODAY + ' 07:30', 'Sales dispatch', 'TKD', 'PUR-ANT-125', -288, 'sellable', 'DSP-2026-0736', 'u4');
    movements.sort((a, b) => a.ts < b.ts ? 1 : -1);
    const costLog = [
      { ts: '2026-10-16 13:30', wh: 'TMA', sku: 'VEL-BTH-100', ref: 'GRN-2026-0388', q0: 21400, old: 21180, qtyIn: 47520, cost4: 20800, newAvg: 20918, user: 'u4' },
      { ts: '2026-10-16 13:30', wh: 'TMA', sku: 'VEL-BTH-200', ref: 'GRN-2026-0388', q0: 4400, old: 38240, qtyIn: 5760, cost4: 37600, newAvg: 37877, user: 'u4' },
      { ts: '2026-10-14 11:20', wh: 'TMA', sku: 'SUN-HRB-120', ref: 'TRF-2026-0055', q0: 3400, old: 36120, qtyIn: 2000, cost4: 35800, newAvg: 36001, user: 'u5' },
      { ts: '2026-10-09 15:10', wh: 'TKD', sku: 'SUN-HRB-120', ref: 'GRN-2026-0385', q0: 1200, old: 35500, qtyIn: 10000, cost4: 36000, newAvg: 35946, user: 'u4' },
    ];
    const series = {};
    for (let d = -119; d <= 0; d++) {
      const date = addDays(TODAY, d); const dow = new Date(date + 'T00:00:00Z').getUTCDay(); const f = dow === 0 ? 0.15 : dow === 6 ? 0.6 : 1;
      series[date] = {};
      WH.forEach((w, i) => { const sc = [1, 0.62, 0.45, 0.3][i]; const rev = d === 0 ? Math.round(ri(4000, 9000) * sc) * 100 : Math.round(ri(16000, 40000) * sc * f * (1 + (d + 119) / 500)) * 100; const cogs = Math.round(rev * ri(70, 76) / 100); series[date][w] = { rev, cogs, rcv: d === 0 ? 0 : (rnd() < 0.16 ? Math.round(ri(3000, 12000) * sc) : 0), dsp: Math.round(rev / 100 / 4.4) }; });
    }
    const audit = [
      ['2026-10-22 09:05', 'u5', 'Requested stock adjustment', 'ADJ-2026-0031', 'TMA · VEL-BTH-100 · −36 bars · Damage'],
      ['2026-10-22 08:40', 'u5', 'Submitted receipt for approval', 'GRN-2026-0392', '3 lines · discrepancies: short 5 ctn, rejected 4 ctn, damaged 2 ctn'],
      ['2026-10-22 08:15', 'u13', 'Recorded truck arrival', 'GRN-2026-0391', 'AS-2290-22 · BWI-DN-30981'],
      ['2026-10-22 07:30', 'u4', 'Dispatched sales order', 'DSP-2026-0736', 'SO-2026-1205 · stock deducted once'],
      ['2026-10-21 16:02', 'u10', 'Recorded customer payment', 'PAY-2026-0452', 'GHS 15,000.00 · Bank transfer · pending verification'],
      ['2026-10-21 05:45', 'u8', 'Dispatched transfer', 'TRF-2026-0057', 'TMA → TML · 2 lines · in transit'],
      ['2026-10-20 11:05', 'u13', 'Completed collection', 'DSP-2026-0735', 'SO-2026-1203 · collector verified'],
      ['2026-10-18 14:05', 'u12', 'Received transfer with discrepancy', 'TRF-2026-0056', 'Short 80 bars · disputed'],
      ['2026-10-16 13:30', 'u4', 'Posted goods receipt', 'GRN-2026-0388', 'Avg cost recalculated for 2 SKUs'],
      ['2026-10-14 11:02', 'u12', 'Approved stock adjustment', 'ADJ-2026-0030', 'Requested by Yaa Asantewaa'],
      ['2026-10-08 16:40', 'u3', 'Rejected stock adjustment', 'ADJ-2026-0029', 'Recount required'],
    ].map(([ts, user, action, ref, detail], i) => ({ id: 'AUD-' + (900 - i), ts, user, action, ref, detail }));
    return {
      v: 1, currentUser: 'u1', warehouse: 'ALL', route: { name: 'dashboard' }, warehouses, brands, products, balances, batches, suppliers, customers, users, pos, receipts, transfers, salesOrders, dispatches, invoices, payments, creditNotes, supplierInvoices, supplierPayments, expenses, adjustments, counts, movements, costLog, series, audit,
      settings: { expiryWarnDays: 60, blindCountDefault: true, allowNegative: false, maxDiscountPct: 5, creditCheck: true, paymentMethods: ['Cash', 'Bank transfer', 'Mobile money', 'Cheque'], expenseCategories: ['Transportation', 'Loading & unloading', 'Warehouse maintenance', 'Utilities', 'Security', 'Fuel', 'Other'], currency: 'GHS', company: 'Demo Soap Distributors Ltd' },
      seq: { GRN: 392, TRF: 60, PO: 144, SO: 1207, DSP: 737, INV: 613, PAY: 452, CN: 21, SPAY: 123, EXP: 312, ADJ: 32, CNT: 12, MOV: mv, AUD: 900 },
    };
  }

  let st;
  try { const raw = localStorage.getItem(KEY); st = raw ? JSON.parse(raw) : null; } catch (e) { st = null; }
  if (!st || st.v !== 1) st = seedState();
  const ui = { toasts: [], confirm: null, loading: false };
  const listeners = new Set();
  const hooks = { onNavigate: null };
  let version = 0;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } };
  const emit = () => { version++; save(); listeners.forEach(f => f()); };

  // ---------- lookups & formatting
  const prod = sku => st.products.find(p => p.sku === sku) || { sku, name: sku, cartonPacks: 1, packBars: 1, price: 0, cost4: 0 };
  const bpc = sku => { const p = prod(sku); return p.cartonPacks * p.packBars; };
  const wh = id => st.warehouses.find(w => w.id === id) || { id, name: id };
  const cust = id => st.customers.find(c => c.id === id) || { id, name: id };
  const sup = id => st.suppliers.find(s => s.id === id) || { id, name: id };
  const user = id => st.users.find(u => u.id === (id || st.currentUser)) || { id, name: id || '—', role: 'auditor', wh: [] };
  const uname = id => id ? user(id).name : '—';
  const role = () => ROLES[user().role];
  const can = p => { const r = role(); return !r.readonly && r.perms.includes(p); };
  const canView = p => role().perms.includes(p);
  const allowedWh = () => { const u = user(); return u.wh.includes('ALL') ? WH.slice() : u.wh.slice(); };
  const hasAllWh = () => user().wh.includes('ALL') || user().wh.length > 1;
  const scope = () => st.warehouse === 'ALL' ? allowedWh() : [st.warehouse];
  const inScope = w => scope().includes(w);
  const commas = n => { const s = String(Math.abs(n)); return (n < 0 ? '−' : '') + s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  const money = m => { m = Math.round(m || 0); const neg = m < 0; m = Math.abs(m); return (neg ? '−' : '') + 'GHS ' + commas(Math.floor(m / 100)) + '.' + pad(m % 100, 2); };
  const moneyShort = m => { const a = Math.abs(m) / 100; const s = a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e3 ? (a / 1e3).toFixed(1) + 'K' : a.toFixed(0); return (m < 0 ? '−' : '') + 'GHS ' + s; };
  const cost = c4 => 'GHS ' + Math.floor(c4 / 10000) + '.' + pad(c4 % 10000, 4);
  const valueOf = (qty, c4) => Math.round(qty * c4 / 100);
  const qty = (sku, bars) => { if (bars == null) return '—'; const p = prod(sku); const neg = bars < 0; let b = Math.abs(bars); const c = Math.floor(b / bpc(sku)); b -= c * bpc(sku); const k = Math.floor(b / p.packBars); b -= k * p.packBars; const parts = []; if (c) parts.push(c + ' ctn'); if (k) parts.push(k + ' pk'); if (b || !parts.length) parts.push(b + (b === 1 ? ' bar' : ' bars')); return (neg ? '−' : '') + parts.join(' '); };
  const toBars = (sku, n, unit) => { const p = prod(sku); n = Math.floor(Number(n) || 0); return unit === 'ctn' ? n * bpc(sku) : unit === 'pk' ? n * p.packBars : n; };
  const fmtDate = iso => { if (!iso) return '—'; const [d, t] = iso.split(' '); const dt = new Date(d + 'T00:00:00Z'); const s = dt.getUTCDate() + ' ' + 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[dt.getUTCMonth()] + (d.slice(0, 4) !== TODAY.slice(0, 4) ? ' ' + d.slice(0, 4) : ''); return t ? s + ', ' + t : s; };
  const TONES = { green: ['#e3f3ea', '#146c3a'], blue: ['#e6eefc', '#1d4fbf'], amber: ['#fcf1dc', '#8a4b00'], red: ['#fde8e7', '#b3261e'], gray: ['#eceff3', '#46505e'], violet: ['#efeafc', '#5b3cb0'] };
  const STATUS_TONE = { Posted: 'green', Received: 'green', Completed: 'green', Delivered: 'green', Paid: 'green', Verified: 'green', Active: 'green', OK: 'green', 'Fully received': 'green', Approved: 'blue', Confirmed: 'blue', 'In Transit': 'violet', Dispatched: 'violet', 'Out for delivery': 'violet', Arrived: 'blue', Counting: 'blue', Picking: 'blue', 'Ready for Collection': 'blue', 'Ready for Dispatch': 'blue', Assigned: 'blue', 'Pending Approval': 'amber', Requested: 'amber', 'Partially Received': 'amber', 'Partially Fulfilled': 'amber', 'Partially Paid': 'amber', Recorded: 'amber', Low: 'amber', 'Partially received': 'amber', 'Near expiry': 'amber', 'Partially delivered': 'amber', 'Pending pick': 'gray', Unpaid: 'gray', Rejected: 'red', Disputed: 'red', Overdue: 'red', Failed: 'red', 'Out of stock': 'red', Expired: 'red', Suspended: 'red', Mismatch: 'red', Draft: 'gray', Cancelled: 'gray', Credited: 'gray', Discontinued: 'gray', Reversed: 'gray', 'Not received': 'gray', Inactive: 'gray', Matched: 'green', Quarantined: 'amber', Sellable: 'green' };
  const badge = s => { const t = TONES[STATUS_TONE[s] || 'gray']; return { bg: t[0], fg: t[1] }; };

  // ---------- engine helpers
  const nextRef = p => { st.seq[p] = (st.seq[p] || 0) + 1; return p + '-2026-' + pad(st.seq[p]); };
  const bal = (w, sku) => { const k = w + '|' + sku; if (!st.balances[k]) st.balances[k] = { wh: w, sku, sellable: 0, reserved: 0, damaged: 0, quarantined: 0, inTransit: 0, avg: prod(sku).cost4, last: TODAY }; return st.balances[k]; };
  const move = (type, w, sku, q, bucket, c4, ref) => { const b = bal(w, sku); b.last = TODAY; st.movements.unshift({ id: 'MOV-' + (st.seq.MOV++), ts: clock(), type, wh: w, sku, qty: q, bucket, cost4: c4 != null ? c4 : b.avg, ref, user: st.currentUser, after: b.sellable }); };
  const log = (action, ref, detail) => st.audit.unshift({ id: 'AUD-' + (++st.seq.AUD), ts: clock(), user: st.currentUser, action, ref, detail });
  const wavg = (b, qIn, c4, ref) => { const q0 = b.sellable; const old = b.avg; const n = q0 + qIn > 0 ? Math.round((q0 * old + qIn * c4) / (q0 + qIn)) : c4; st.costLog.unshift({ ts: clock(), wh: b.wh, sku: b.sku, ref, q0, old, qtyIn: qIn, cost4: c4, newAvg: n, user: st.currentUser }); b.avg = n; };
  const expiredSellable = (w, sku) => st.batches.filter(x => x.wh === w && x.sku === sku && x.bucket === 'sellable' && x.exp < TODAY).reduce((a, x) => a + x.qty, 0);
  const avail = (w, sku) => { const b = bal(w, sku); return Math.max(0, b.sellable - b.reserved - expiredSellable(w, sku)); };
  const consume = (w, sku, q) => { if (!prod(sku).batch) return []; const list = st.batches.filter(x => x.wh === w && x.sku === sku && x.bucket === 'sellable' && x.qty > 0 && x.exp >= TODAY).sort((a, b) => a.exp < b.exp ? -1 : 1); let left = q; const used = []; for (const x of list) { if (left <= 0) break; const t = Math.min(x.qty, left); x.qty -= t; left -= t; used.push({ batch: x.batch, mfg: x.mfg, exp: x.exp, qty: t }); } return used; };
  const addBatch = (w, sku, batch, mfg, exp, q, bucket) => { bucket = bucket || 'sellable'; if (!prod(sku).batch || q <= 0 || !batch) return; const x = st.batches.find(y => y.wh === w && y.sku === sku && y.batch === batch && y.bucket === bucket); if (x) x.qty += q; else st.batches.push({ id: 'B' + Date.now() + Math.floor(Math.random() * 1000), wh: w, sku, batch, mfg: mfg || '', exp: exp || '', qty: q, bucket }); };
  const day = (w) => { if (!st.series[TODAY]) st.series[TODAY] = {}; if (!st.series[TODAY][w]) st.series[TODAY][w] = { rev: 0, cogs: 0, rcv: 0, dsp: 0 }; return st.series[TODAY][w]; };
  const ok = (msg, ref, extra) => Object.assign({ ok: true, msg, ref }, extra || {});
  const fail = msg => ({ ok: false, error: msg });
  const deny = what => fail(`Not permitted for ${role().name}. ${what ? what + ' ' : ''}(In production the API returns 403 and logs the attempt.)`);
  const whDeny = w => !allowedWh().includes(w) ? fail(`You don't have access to ${wh(w).name}. Warehouse access is enforced by the backend.`) : null;

  const invStatus = i => { const bal = i.total - i.paid - i.credited; if (i.credited >= i.total && i.total > 0) return 'Credited'; if (bal <= 0) return 'Paid'; if (i.due < TODAY) return 'Overdue'; if (i.paid > 0) return 'Partially Paid'; return 'Unpaid'; };
  const invBal = i => i.total - i.paid - i.credited;
  const custBalance = id => st.invoices.filter(i => i.customer === id).reduce((a, i) => a + invBal(i), 0);
  const soTotal = so => so.lines.reduce((a, l) => a + l.qty * l.price - Math.round(l.qty * l.price * l.discPct / 100), 0);
  const poTotals = po => { const sub = po.lines.reduce((a, l) => a + valueOf(l.qty, l.cost4), 0); const disc = Math.round(sub * po.discPct / 100); const tax = Math.round((sub - disc) * po.taxPct / 100); return { sub, disc, tax, total: sub - disc + tax }; };
  const poReceived = (poId, sku) => st.receipts.filter(r => r.po === poId && r.status === 'Posted').reduce((a, r) => a + r.lines.filter(l => l.sku === sku).reduce((x, l) => x + l.accepted + l.damaged, 0), 0);
  const poInvoiced = (poId, sku) => st.supplierInvoices.filter(s => s.po === poId).reduce((a, s) => a + s.lines.filter(l => l.sku === sku).reduce((x, l) => x + l.qty, 0), 0);
  const poDelivery = po => { if (['Draft', 'Pending Approval', 'Rejected'].includes(po.status)) return 'Not received'; const r = po.lines.map(l => poReceived(po.id, l.sku)); if (r.every(x => x === 0)) return 'Not received'; return po.lines.every((l, i) => r[i] >= l.qty) ? 'Fully received' : 'Partially received'; };
  const sinvMatch = s => { const issues = []; s.lines.forEach(l => { const rec = poReceived(s.po, l.sku); if (l.qty > rec) issues.push(`${l.sku}: invoiced ${qty(l.sku, l.qty)}, received ${qty(l.sku, rec)}`); }); return issues; };

  // ---------- actions
  const A = {};
  A.setUser = id => { st.currentUser = id; st.warehouse = user().wh.includes('ALL') ? 'ALL' : (user().wh.length > 1 ? 'ALL' : user().wh[0]); log('Switched demo role', id, ROLES[user().role].name); emit(); };
  A.setWarehouse = w => { st.warehouse = w; emit(); };
  A.nav = (name, params, opts) => { st.route = Object.assign({ name }, params || {}); ui.loading = true; emit(); if (hooks.onNavigate && !(opts && opts.silent)) hooks.onNavigate(st.route); clearTimeout(A._lt); A._lt = setTimeout(() => { ui.loading = false; emit(); }, 280); };
  A.toast = (kind, title, msg, ref) => { const id = Date.now() + Math.random(); ui.toasts.push({ id, kind, title, msg: msg || '', ref: ref || '' }); emit(); setTimeout(() => { ui.toasts = ui.toasts.filter(t => t.id !== id); emit(); }, kind === 'error' ? 7000 : 4500); };
  A.dismissToast = id => { ui.toasts = ui.toasts.filter(t => t.id !== id); emit(); };
  A.confirm = cfg => { ui.confirm = cfg; emit(); };
  A.closeConfirm = () => { ui.confirm = null; emit(); };
  A.result = (r, title) => { if (r.ok) A.toast('success', title || 'Done', r.msg, r.ref); else A.toast('error', 'Action blocked', r.error); return r; };
  A.reset = () => { st = seedState(); save(); emit(); };

  A.productSave = (p, isNew) => {
    if (!can('cat.edit')) return deny();
    const errs = {};
    if (!p.sku || !/^[A-Z0-9-]{4,}$/.test(p.sku)) errs.sku = 'Use 4+ characters: capitals, digits and hyphens.';
    if (isNew && st.products.some(x => x.sku === p.sku)) errs.sku = 'SKU already exists.';
    if (!p.name) errs.name = 'Product name is required.';
    if (!p.brand) errs.brand = 'Select a brand.';
    if (!p.category) errs.category = 'Category is required.';
    if (!(p.cartonPacks > 0)) errs.cartonPacks = 'Must be at least 1.';
    if (!(p.packBars > 0)) errs.packBars = 'Must be at least 1.';
    if (!(p.cost4 > 0)) errs.cost4 = 'Enter a purchase cost.';
    if (!(p.price > 0)) errs.price = 'Enter a selling price.';
    if (p.price > 0 && p.cost4 > 0 && p.price * 100 < p.cost4) errs.price = 'Selling price is below purchase cost.';
    if (Object.keys(errs).length) return { ok: false, error: 'Please fix the highlighted fields.', errs };
    if (isNew) { st.products.push(Object.assign({ baseUnit: 'bar', expiryWarn: 60, priceHistory: [{ date: TODAY, price: p.price, by: user().name }] }, p)); log('Created product', p.sku, p.name); }
    else { const x = prod(p.sku); if (x.price !== p.price) x.priceHistory = (x.priceHistory || []).concat([{ date: TODAY, price: p.price, by: user().name }]); Object.assign(x, p); log('Updated product', p.sku, 'Catalogue fields updated'); }
    emit(); return ok(isNew ? 'Product created.' : 'Product updated.', p.sku);
  };

  A.receiptSave = (d, submit) => {
    if (!can('rcv.create')) return deny();
    const wd = whDeny(d.wh); if (wd) return wd;
    if (!d.supplier || !d.wh || !d.truck || !d.dn) return fail('Supplier, warehouse, truck registration and delivery note are required.');
    if (!d.lines.length) return fail('Add at least one product line.');
    if (submit) {
      for (const l of d.lines) {
        if (l.accepted + l.rejected + l.damaged !== l.counted) return fail(`${l.sku}: accepted + rejected + damaged must equal the counted quantity.`);
        if (prod(l.sku).batch && l.accepted > 0 && (!l.batch || !l.exp)) return fail(`${l.sku} is batch-tracked — batch number and expiry date are required.`);
      }
    }
    let g = d.id && st.receipts.find(r => r.id === d.id);
    if (g && ['Posted', 'Rejected'].includes(g.status)) return fail(`${g.id} is ${g.status.toLowerCase()} and can no longer be edited.`);
    if (!g) { g = { id: nextRef('GRN'), by: st.currentUser }; st.receipts.unshift(g); }
    Object.assign(g, d, { id: g.id, status: submit ? 'Pending Approval' : (d.status || 'Arrived') });
    log(submit ? 'Submitted receipt for approval' : 'Saved receipt', g.id, `${d.lines.length} lines · ${wh(d.wh).name}`);
    emit(); return ok(submit ? 'Submitted for warehouse manager approval. Stock is not updated until posted.' : 'Receipt saved. Stock is not updated until posted.', g.id, { id: g.id });
  };
  A.receiptPost = id => {
    const g = st.receipts.find(r => r.id === id);
    if (!can('rcv.approve')) return deny('Posting requires warehouse manager approval.');
    const wd = whDeny(g.wh); if (wd) return wd;
    if (g.status === 'Posted') return fail(`${g.id} was already posted on ${fmtDate(g.postedAt)}. Duplicate posting blocked — stock unchanged.`);
    if (g.status !== 'Pending Approval') return fail('Only receipts pending approval can be posted.');
    let acc = 0;
    g.lines.forEach(l => { const b = bal(g.wh, l.sku); if (l.accepted > 0) { wavg(b, l.accepted, l.cost4, g.id); b.sellable += l.accepted; addBatch(g.wh, l.sku, l.batch, l.mfg, l.exp, l.accepted); move('Goods receipt', g.wh, l.sku, l.accepted, 'sellable', l.cost4, g.id); acc += l.accepted; } if (l.damaged > 0) { b.damaged += l.damaged; move('Receipt — damaged', g.wh, l.sku, l.damaged, 'damaged', l.cost4, g.id); } });
    day(g.wh).rcv += acc; g.status = 'Posted'; g.postedBy = st.currentUser; g.postedAt = clock();
    log('Posted goods receipt', g.id, `${g.lines.length} lines · weighted-average cost recalculated`);
    emit(); return ok('Accepted quantities added to sellable stock. Damaged goods held separately; rejected goods excluded.', g.id);
  };
  A.receiptStatus = (id, status) => { const g = st.receipts.find(r => r.id === id); if (!can('rcv.create')) return deny(); g.status = status; log('Receipt status → ' + status, id, ''); emit(); return ok('Status updated to ' + status + '.', id); };
  A.receiptReject = (id, reason) => { const g = st.receipts.find(r => r.id === id); if (!can('rcv.approve')) return deny(); if (g.status === 'Posted') return fail('Posted receipts cannot be rejected. Use an authorised reversal.'); g.status = 'Rejected'; g.rejectedBy = st.currentUser; g.reason = reason; log('Rejected goods receipt', id, reason); emit(); return ok('Receipt rejected. No stock was changed.', id); };

  A.transferSave = (d, submit) => {
    if (!can('trf.create')) return deny();
    if (!d.from || !d.to || d.from === d.to) return fail('Choose different source and destination warehouses.');
    if (!d.lines.length || d.lines.some(l => !(l.req > 0))) return fail('Add at least one product with a quantity above zero.');
    const t = { id: nextRef('TRF'), from: d.from, to: d.to, status: submit ? 'Requested' : 'Draft', date: TODAY, by: st.currentUser, note: d.note || '', lines: d.lines.map(l => ({ sku: l.sku, req: l.req, appr: 0, disp: 0, recv: 0, damaged: 0, cost4: 0 })) };
    st.transfers.unshift(t); log(submit ? 'Requested transfer' : 'Saved transfer draft', t.id, `${wh(t.from).name} → ${wh(t.to).name}`); emit();
    return ok(submit ? 'Transfer requested — awaiting approval.' : 'Draft saved.', t.id, { id: t.id });
  };
  A.transferAct = (id, action, data) => {
    const t = st.transfers.find(x => x.id === id);
    if (action === 'submit') { if (!can('trf.create')) return deny(); t.status = 'Requested'; log('Requested transfer', id, ''); emit(); return ok('Transfer requested.', id); }
    if (action === 'approve') { if (!can('trf.approve')) return deny(); const wd = whDeny(t.from); if (wd) return wd; t.lines.forEach((l, i) => { l.appr = data && data[i] != null ? data[i] : l.req; }); t.status = 'Approved'; t.approvedBy = st.currentUser; log('Approved transfer', id, ''); emit(); return ok('Transfer approved. Stock moves when dispatched.', id); }
    if (action === 'reject') { if (!can('trf.approve')) return deny(); t.status = 'Cancelled'; t.note = (data || 'Rejected'); log('Rejected transfer', id, data); emit(); return ok('Transfer rejected.', id); }
    if (action === 'dispatch') {
      if (!can('trf.dispatch')) return deny(); const wd = whDeny(t.from); if (wd) return wd;
      if (t.status !== 'Approved') return fail(t.status === 'In Transit' ? 'Already dispatched — duplicate dispatch blocked.' : 'Transfer must be approved first.');
      for (const l of t.lines) if (avail(t.from, l.sku) < l.appr) return fail(`Insufficient available stock for ${l.sku} at ${wh(t.from).name}: ${qty(l.sku, avail(t.from, l.sku))} available. Negative stock is not allowed.`);
      t.lines.forEach(l => { const s = bal(t.from, l.sku); l.cost4 = s.avg; s.sellable -= l.appr; l.batches = consume(t.from, l.sku, l.appr); l.disp = l.appr; bal(t.to, l.sku).inTransit += l.appr; move('Transfer out', t.from, l.sku, -l.appr, 'sellable', l.cost4, id); move('In transit', t.to, l.sku, l.appr, 'in-transit', l.cost4, id); });
      t.status = 'In Transit'; t.dispatchedAt = clock(); t.vehicle = (data && data.vehicle) || t.vehicle || ''; t.dispatchedBy = st.currentUser;
      log('Dispatched transfer', id, `${wh(t.from).name} → ${wh(t.to).name}`); emit(); return ok(`Source stock reduced; quantities now in transit to ${wh(t.to).name}.`, id);
    }
    if (action === 'receive') {
      if (!can('trf.receive')) return deny(); const wd = whDeny(t.to); if (wd) return wd;
      if (!['In Transit', 'Partially Received'].includes(t.status)) return fail('Nothing in transit to receive.');
      const { lines, mode } = data; let disc = false, pend = false;
      for (let i = 0; i < t.lines.length; i++) { const l = t.lines[i], r = lines[i]; const out = l.disp - l.recv; if (r.recv > out) return fail(`${l.sku}: received exceeds quantity in transit (${qty(l.sku, out)}).`); if (r.damaged > r.recv) return fail(`${l.sku}: damaged cannot exceed received.`); }
      t.lines.forEach((l, i) => { const r = lines[i]; const out = l.disp - l.recv; const d = bal(t.to, l.sku); const accepted = r.recv - r.damaged; if (r.recv > 0) { d.inTransit -= r.recv; if (accepted > 0) { wavg(d, accepted, l.cost4, id); d.sellable += accepted; (l.batches || []).forEach(bt => addBatch(t.to, l.sku, bt.batch, bt.mfg, bt.exp, Math.min(bt.qty, accepted))); move('Transfer in', t.to, l.sku, accepted, 'sellable', l.cost4, id); } if (r.damaged > 0) { d.damaged += r.damaged; move('Transfer in — damaged', t.to, l.sku, r.damaged, 'damaged', l.cost4, id); disc = true; } } l.recv += r.recv; l.damaged += r.damaged; const short = out - r.recv; if (short > 0) { if (mode === 'shortage') { d.inTransit -= short; move('Transit loss', t.to, l.sku, -short, 'in-transit', l.cost4, id); l.short = (l.short || 0) + short; disc = true; } else pend = true; } });
      t.status = pend ? 'Partially Received' : disc ? 'Disputed' : 'Received'; t.receivedAt = clock(); t.receivedBy = st.currentUser;
      log('Received transfer', id, t.status); emit(); return ok(t.status === 'Received' ? 'Destination stock increased by accepted quantities.' : t.status === 'Disputed' ? 'Received with discrepancies — transfer marked Disputed for review.' : 'Partial receipt recorded; remainder still in transit.', id);
    }
    if (action === 'resolve') { if (!can('trf.approve')) return deny(); t.status = 'Received'; t.resolution = data; log('Resolved transfer dispute', id, data); emit(); return ok('Dispute resolved; shortage written off as transit loss.', id); }
  };

  A.poSave = (d, submit) => {
    if (!can('po.create')) return deny();
    if (!d.supplier || !d.wh || !d.expected) return fail('Supplier, destination warehouse and expected date are required.');
    if (!d.lines.length || d.lines.some(l => !(l.qty > 0) || !(l.cost4 > 0))) return fail('Each line needs a quantity and agreed unit cost.');
    const po = { id: nextRef('PO'), supplier: d.supplier, wh: d.wh, date: TODAY, expected: d.expected, status: submit ? 'Pending Approval' : 'Draft', lines: d.lines, discPct: Number(d.discPct) || 0, taxPct: Number(d.taxPct) || 0, by: st.currentUser, notes: d.notes || '' };
    st.pos.unshift(po); log(submit ? 'Submitted purchase order' : 'Saved PO draft', po.id, money(poTotals(po).total)); emit();
    return ok('Purchase order ' + (submit ? 'submitted for approval' : 'saved') + '. Purchase orders never change stock — only posted receipts do.', po.id, { id: po.id });
  };
  A.poAct = (id, action, reason) => { const po = st.pos.find(p => p.id === id); if (action === 'submit') { if (!can('po.create')) return deny(); po.status = 'Pending Approval'; } else { if (!can('po.approve')) return deny(); po.status = action === 'approve' ? 'Approved' : 'Rejected'; po.approvedBy = st.currentUser; if (reason) po.reason = reason; } log('PO ' + po.status.toLowerCase(), id, reason || ''); emit(); return ok('Purchase order ' + po.status.toLowerCase() + '.', id); };

  const reserve = so => { for (const l of so.lines) { const need = l.qty - l.fulfilled - l.reserved; if (need > 0 && avail(so.wh, l.sku) < need) return `Only ${qty(l.sku, avail(so.wh, l.sku))} of ${prod(l.sku).name} is available at ${wh(so.wh).name}. Reservation would over-allocate stock.`; } so.lines.forEach(l => { const need = l.qty - l.fulfilled - l.reserved; if (need > 0) { bal(so.wh, l.sku).reserved += need; l.reserved += need; } }); return null; };
  const release = so => so.lines.forEach(l => { if (l.reserved > 0) { const b = bal(so.wh, l.sku); b.reserved = Math.max(0, b.reserved - l.reserved); l.reserved = 0; } });
  A.soSave = (d, confirm) => {
    if (!can('so.create')) return deny();
    const wd = whDeny(d.wh); if (wd) return wd;
    if (!d.customer) return fail('Select a customer or register a walk-in.');
    if (d.customer === 'CUS-006' && !d.walkin) return fail('Enter the walk-in customer name and phone.');
    if (!d.lines.length || d.lines.some(l => !(l.qty > 0))) return fail('Add at least one product line with a quantity.');
    if (d.method === 'Delivery' && !d.address) return fail('Delivery address is required for delivery orders.');
    if (d.terms === 'Credit' && cust(d.customer).limit === 0) return fail(`${cust(d.customer).name} has no credit facility. Use cash terms.`);
    const so = { id: nextRef('SO'), customer: d.customer, walkin: d.walkin || '', wh: d.wh, date: TODAY, method: d.method, terms: d.terms, status: 'Draft', by: st.currentUser, address: d.address || '', notes: d.notes || '', lines: d.lines.map(l => ({ sku: l.sku, qty: l.qty, price: prod(l.sku).price, discPct: Number(l.discPct) || 0, fulfilled: 0, reserved: 0, returned: 0 })) };
    let msg = 'Draft saved. No stock reserved.';
    if (confirm) {
      const reasons = []; const maxD = Math.max(...so.lines.map(l => l.discPct));
      if (maxD > st.settings.maxDiscountPct && !can('so.approve')) reasons.push(`discount ${maxD}% exceeds ${st.settings.maxDiscountPct}% limit`);
      if (so.terms === 'Credit' && st.settings.creditCheck && custBalance(so.customer) + soTotal(so) > cust(so.customer).limit) reasons.push('exceeds customer credit limit');
      if (reasons.length) { so.status = 'Pending Approval'; so.approvalReason = reasons.join('; '); msg = 'Order needs approval: ' + so.approvalReason + '. Stock is reserved once approved.'; }
      else { const e = reserve(so); if (e) { st.seq.SO--; return fail(e); } so.status = 'Confirmed'; msg = 'Order confirmed and available stock reserved. Physical stock is unchanged until dispatch.'; }
    }
    st.salesOrders.unshift(so); log('Created sales order', so.id, so.status + ' · ' + money(soTotal(so))); emit(); return ok(msg, so.id, { id: so.id });
  };
  A.soAct = (id, action, reason) => {
    const so = st.salesOrders.find(s => s.id === id);
    if (action === 'confirm') { if (!can('so.create')) return deny(); const e = reserve(so); if (e) return fail(e); so.status = 'Confirmed'; log('Confirmed sales order', id, 'Stock reserved'); emit(); return ok('Order confirmed; stock reserved.', id); }
    if (action === 'approve') { if (!can('so.approve')) return deny(); const e = reserve(so); if (e) return fail(e); so.status = 'Confirmed'; so.approvedBy = st.currentUser; log('Approved sales order', id, so.approvalReason || ''); emit(); return ok('Approved, confirmed and stock reserved.', id); }
    if (action === 'reject') { if (!can('so.approve')) return deny(); so.status = 'Cancelled'; so.cancelReason = reason; log('Rejected sales order', id, reason); emit(); return ok('Order rejected.', id); }
    if (action === 'cancel') { if (!can('so.create') && !can('so.approve')) return deny(); if (['Dispatched', 'Delivered', 'Completed', 'Cancelled'].includes(so.status)) return fail('This order can no longer be cancelled. Use a return or credit note.'); release(so); so.status = 'Cancelled'; so.cancelReason = reason; st.dispatches.filter(d => d.so === id && !d.deducted).forEach(d => d.status = 'Cancelled'); log('Cancelled sales order', id, reason); emit(); return ok('Order cancelled. Reservations released back to available stock.', id); }
  };

  A.dispatchStart = soId => {
    if (!can('dsp.process')) return deny(); const so = st.salesOrders.find(s => s.id === soId); const wd = whDeny(so.wh); if (wd) return wd;
    if (st.dispatches.some(d => d.so === soId && !d.deducted && d.status !== 'Cancelled')) return fail('A pick list is already open for this order.');
    const lines = so.lines.filter(l => l.qty - l.fulfilled > 0).map(l => ({ sku: l.sku, ordered: l.qty - l.fulfilled, picked: 0, verified: 0, dispatched: 0, delivered: 0 }));
    const d = { id: nextRef('DSP'), so: soId, wh: so.wh, method: so.method, status: 'Picking', date: TODAY, by: st.currentUser, lines };
    st.dispatches.unshift(d); log('Started picking', d.id, soId); emit(); return ok('Pick list created.', d.id, { id: d.id });
  };
  A.dispatchVerify = (id, lines) => {
    if (!can('dsp.process')) return deny(); const d = st.dispatches.find(x => x.id === id); const so = st.salesOrders.find(s => s.id === d.so);
    for (let i = 0; i < d.lines.length; i++) { const l = d.lines[i], r = lines[i]; if (r.picked > l.ordered) return fail(`${l.sku}: picked exceeds ordered quantity — over-dispatch prevented.`); if (r.verified > r.picked) return fail(`${l.sku}: verified cannot exceed picked.`); const sl = so.lines.find(x => x.sku === l.sku); if (r.verified > sl.reserved + avail(d.wh, l.sku)) return fail(`${l.sku}: not enough stock reserved or available.`); }
    if (lines.every(r => r.verified === 0)) return fail('Verify at least one line before continuing.');
    d.lines.forEach((l, i) => { l.picked = lines[i].picked; l.verified = lines[i].verified; });
    d.status = 'Verified'; so.status = d.method === 'Collection' ? 'Ready for Collection' : 'Ready for Dispatch'; log('Verified pick', id, d.so); emit(); return ok('Pick verified. Order is ' + so.status.toLowerCase() + '.', id);
  };
  const deduct = (d) => {
    const so = st.salesOrders.find(s => s.id === d.so); let cogs = 0;
    for (const l of d.lines) { const q = l.handed != null ? l.handed : l.verified; const b = bal(d.wh, l.sku); const sl = so.lines.find(x => x.sku === l.sku); if (q > b.sellable) return `${l.sku}: only ${qty(l.sku, b.sellable)} sellable — negative stock prevented.`; if (q > sl.reserved + avail(d.wh, l.sku)) return `${l.sku}: quantity not reserved or available.`; }
    const invLines = [];
    d.lines.forEach(l => { const q = l.handed != null ? l.handed : l.verified; if (!q) return; const b = bal(d.wh, l.sku); const sl = so.lines.find(x => x.sku === l.sku); const fromRes = Math.min(sl.reserved, q); b.reserved -= fromRes; sl.reserved -= fromRes; b.sellable -= q; l.batches = consume(d.wh, l.sku, q); l.dispatched = q; l.cost4 = b.avg; cogs += valueOf(q, b.avg); sl.fulfilled += q; move('Sales dispatch', d.wh, l.sku, -q, 'sellable', b.avg, d.id); invLines.push({ sku: l.sku, qty: q, price: sl.price, discPct: sl.discPct }); });
    d.deducted = true; d.dispatchedAt = clock();
    const total = invLines.reduce((a, l) => a + l.qty * l.price - Math.round(l.qty * l.price * l.discPct / 100), 0);
    const c = cust(so.customer);
    const inv = { id: nextRef('INV'), so: so.id, dsp: d.id, customer: so.customer, wh: so.wh, date: TODAY, due: addDays(TODAY, so.terms === 'Cash' ? 0 : c.terms), lines: invLines, total, paid: 0, credited: 0, cogs };
    st.invoices.unshift(inv); d.invoice = inv.id; d.cogs = cogs; const dy = day(d.wh); dy.rev += total; dy.cogs += cogs; dy.dsp += invLines.reduce((a, l) => a + l.qty, 0);
    const allDone = so.lines.every(l => l.fulfilled >= l.qty);
    so.status = allDone ? (d.method === 'Collection' ? 'Completed' : 'Dispatched') : 'Partially Fulfilled';
    if (so.terms === 'Cash' && d.method === 'Collection') { const p = { id: nextRef('PAY'), customer: so.customer, date: TODAY, amount: total, method: 'Cash', extRef: '', by: st.currentUser, alloc: [{ inv: inv.id, amount: total }], status: 'Recorded', notes: 'Cash collected at handover — pending finance verification.' }; st.payments.unshift(p); inv.paid = total; }
    return null;
  };
  A.dispatchHandover = (id, data) => {
    if (!can('dsp.process')) return deny(); const d = st.dispatches.find(x => x.id === id);
    if (d.deducted) return fail(`${id} has already been dispatched. Stock is deducted exactly once — duplicate blocked.`);
    if (!data.collector) return fail('Record the customer or authorised collector name.');
    for (let i = 0; i < d.lines.length; i++) if (data.handed[i] > d.lines[i].verified) return fail(`${d.lines[i].sku}: handed over exceeds verified quantity.`);
    d.lines.forEach((l, i) => l.handed = data.handed[i]);
    const e = deduct(d); if (e) return fail(e);
    d.status = 'Completed'; d.collector = data.collector; d.collectorId = data.collectorId || ''; log('Completed collection', id, d.so + ' · ' + data.collector); emit();
    return ok('Stock deducted, invoice ' + d.invoice + ' raised. Collection note ready to print.', id);
  };
  A.dispatchAssign = (id, driver, vehicle) => { if (!can('dsp.process')) return deny(); const d = st.dispatches.find(x => x.id === id); if (!driver) return fail('Select a delivery officer.'); d.driver = driver; d.vehicle = vehicle; d.status = 'Assigned'; log('Assigned delivery officer', id, uname(driver)); emit(); return ok('Assigned to ' + uname(driver) + '.', id); };
  A.dispatchOut = id => { if (!can('dsp.process')) return deny(); const d = st.dispatches.find(x => x.id === id); if (d.deducted) return fail('Already dispatched — duplicate blocked.'); const e = deduct(d); if (e) return fail(e); d.status = 'Out for delivery'; log('Dispatched from warehouse', id, d.so); emit(); return ok('Left warehouse. Stock deducted once; invoice ' + d.invoice + ' raised.', id); };
  A.dispatchDeliver = (id, data) => {
    if (!can('dsp.deliver') && !can('dsp.process')) return deny(); const d = st.dispatches.find(x => x.id === id); const so = st.salesOrders.find(s => s.id === d.so);
    if (d.status !== 'Out for delivery') return fail('This delivery is not out for delivery.');
    if (data.outcome !== 'Failed' && !data.recipient) return fail('Recipient name is required.');
    let credit = 0;
    d.lines.forEach((l, i) => { const del = data.outcome === 'Delivered' ? l.dispatched : data.outcome === 'Failed' ? 0 : Math.min(l.dispatched, data.delivered[i] || 0); l.delivered = del; const ret = l.dispatched - del; if (ret > 0) { bal(d.wh, l.sku).quarantined += ret; move('Delivery return', d.wh, l.sku, ret, 'quarantined', l.cost4, id); const sl = so.lines.find(x => x.sku === l.sku); sl.returned += ret; sl.fulfilled -= ret; credit += ret * sl.price - Math.round(ret * sl.price * sl.discPct / 100); } });
    d.status = data.outcome === 'Delivered' ? 'Delivered' : data.outcome === 'Failed' ? 'Failed' : 'Partially delivered';
    d.recipient = data.recipient || ''; d.deliveredAt = clock(); d.pod = data.pod || ''; d.outcomeNote = data.note || '';
    if (credit > 0) { const inv = st.invoices.find(i => i.id === d.invoice); const cn = { id: nextRef('CN'), inv: inv.id, customer: inv.customer, date: TODAY, amount: credit, reason: 'Returned on delivery ' + id, by: st.currentUser }; st.creditNotes.unshift(cn); inv.credited += credit; day(d.wh).rev -= credit; }
    so.status = d.status === 'Delivered' && so.lines.every(l => l.fulfilled >= l.qty) ? 'Delivered' : 'Partially Fulfilled';
    log('Recorded delivery outcome', id, d.status + (credit ? ' · credit ' + money(credit) : '')); emit();
    return ok(d.status === 'Delivered' ? 'Delivery confirmed.' : 'Returned goods moved to quarantine for inspection; credit note raised automatically.', id);
  };

  A.paymentRecord = d => {
    if (!can('fin.record')) return deny();
    const errs = {};
    if (!d.customer) errs.customer = 'Select a customer.';
    if (!(d.amount > 0)) errs.amount = 'Enter an amount greater than zero.';
    if (!d.method) errs.method = 'Select a method.';
    if (d.method !== 'Cash' && !d.extRef) errs.extRef = 'External reference is required for non-cash payments.';
    if (d.extRef && st.payments.some(p => p.extRef && p.extRef.toLowerCase() === d.extRef.toLowerCase() && p.status !== 'Reversed')) errs.extRef = 'This reference is already recorded (' + st.payments.find(p => p.extRef.toLowerCase() === d.extRef.toLowerCase()).id + '). Duplicate payments are blocked.';
    const allocSum = d.alloc.reduce((a, x) => a + x.amount, 0);
    if (allocSum > d.amount) errs.alloc = 'Allocated total exceeds the payment amount.';
    d.alloc.forEach(x => { const i = st.invoices.find(v => v.id === x.inv); if (x.amount > invBal(i)) errs.alloc = `Allocation to ${i.id} exceeds its balance (${money(invBal(i))}).`; });
    if (Object.keys(errs).length) return { ok: false, error: 'Please fix the highlighted fields.', errs };
    const p = { id: nextRef('PAY'), customer: d.customer, date: d.date || TODAY, amount: d.amount, method: d.method, extRef: d.extRef || '', by: st.currentUser, alloc: d.alloc.filter(x => x.amount > 0), status: 'Recorded', notes: d.notes || '', evidence: d.evidence || '', unallocated: d.amount - allocSum };
    p.alloc.forEach(x => { st.invoices.find(v => v.id === x.inv).paid += x.amount; });
    st.payments.unshift(p); log('Recorded customer payment', p.id, money(p.amount) + ' · ' + p.method + ' · ' + p.alloc.length + ' invoice(s)'); emit();
    return ok('Payment recorded — status Recorded until verified against bank/MoMo statements.', p.id, { id: p.id });
  };
  A.paymentAct = (id, action, reason) => { const p = st.payments.find(x => x.id === id); if (!can('fin.verify')) return deny(); if (action === 'verify') { if (p.status !== 'Recorded') return fail('Only recorded payments can be verified.'); p.status = 'Verified'; p.verifiedBy = st.currentUser; log('Verified payment', id, 'Matched to statement'); } else { if (p.status === 'Reversed') return fail('Already reversed.'); p.alloc.forEach(x => { st.invoices.find(v => v.id === x.inv).paid -= x.amount; }); p.status = 'Reversed'; p.reversal = reason; log('Reversed payment', id, reason); } emit(); return ok(action === 'verify' ? 'Payment verified.' : 'Payment reversed; invoice balances restored. Original record retained.', id); };
  A.creditNote = (invId, amount, reason) => { if (!can('fin.verify')) return deny(); const inv = st.invoices.find(i => i.id === invId); if (!(amount > 0) || amount > invBal(inv)) return fail('Credit amount must be between 0 and the invoice balance.'); if (!reason) return fail('A reason is required.'); const cn = { id: nextRef('CN'), inv: invId, customer: inv.customer, date: TODAY, amount, reason, by: st.currentUser }; st.creditNotes.unshift(cn); inv.credited += amount; day(inv.wh).rev -= amount; log('Issued credit note', cn.id, invId + ' · ' + money(amount)); emit(); return ok('Credit note issued.', cn.id); };
  A.supplierPayment = d => { if (!can('fin.record')) return deny(); if (!d.supplier || !(d.amount > 0) || !d.ref) return fail('Supplier, amount and payment reference are required.'); if (st.supplierPayments.some(p => p.ref.toLowerCase() === d.ref.toLowerCase())) return fail('Duplicate payment reference.'); const s = st.supplierInvoices.filter(i => i.supplier === d.supplier && i.total > i.paid).sort((a, b) => a.due < b.due ? -1 : 1); let left = d.amount; const alloc = []; s.forEach(i => { if (left <= 0) return; const t = Math.min(left, i.total - i.paid); i.paid += t; left -= t; alloc.push({ inv: i.id, amount: t }); }); const p = { id: nextRef('SPAY'), supplier: d.supplier, date: TODAY, amount: d.amount, method: d.method, ref: d.ref, alloc, by: st.currentUser }; st.supplierPayments.unshift(p); log('Recorded supplier payment', p.id, money(d.amount)); emit(); return ok('Supplier payment recorded and allocated oldest-first.', p.id); };

  A.expenseSave = d => { if (!can('exp.create')) return deny(); const errs = {}; if (!d.date) errs.date = 'Required.'; if (!d.category) errs.category = 'Select a category.'; if (!(d.amount > 0)) errs.amount = 'Enter an amount.'; if (!d.description) errs.description = 'Describe the expense.'; if (!d.wh) errs.wh = 'Select a warehouse.'; if (Object.keys(errs).length) return { ok: false, error: 'Please fix the highlighted fields.', errs }; const e = Object.assign({ id: nextRef('EXP'), status: 'Pending Approval', by: st.currentUser }, d); st.expenses.unshift(e); log('Recorded expense', e.id, money(e.amount) + ' · ' + e.category); emit(); return ok('Expense submitted for approval.', e.id); };
  A.expenseAct = (id, action, reason) => { if (!can('exp.approve')) return deny(); const e = st.expenses.find(x => x.id === id); if (e.by === st.currentUser) return fail('You recorded this expense — another approver must approve it (segregation of duties).'); e.status = action === 'approve' ? 'Approved' : 'Rejected'; e.approvedBy = st.currentUser; e.note = reason || ''; log('Expense ' + e.status.toLowerCase(), id, reason || ''); emit(); return ok('Expense ' + e.status.toLowerCase() + '.', id); };

  A.adjRequest = d => {
    if (!can('inv.adjust.request')) return deny(); const wd = whDeny(d.wh); if (wd) return wd;
    if (!d.sku || !d.qty) return fail('Select a product and enter a non-zero quantity.');
    if (!d.reason || d.reason.length < 8) return fail('A clear reason (8+ characters) is required for every adjustment.');
    if (d.qty < 0 && -d.qty > avail(d.wh, d.sku)) return fail(`Adjustment would make available stock negative (${qty(d.sku, avail(d.wh, d.sku))} available).`);
    const a = { id: nextRef('ADJ'), wh: d.wh, sku: d.sku, qty: d.qty, type: d.type, reason: d.reason, status: 'Pending Approval', by: st.currentUser, at: clock(), count: d.count || '' };
    st.adjustments.unshift(a); log('Requested stock adjustment', a.id, `${d.wh} · ${d.sku} · ${d.qty > 0 ? '+' : ''}${d.qty} bars · ${d.type}`); emit();
    return ok('Submitted to the warehouse manager. Stock is unchanged until approved and posted.', a.id);
  };
  A.adjAct = (id, action, note) => {
    const a = st.adjustments.find(x => x.id === id);
    if (!can('inv.adjust.approve')) return deny('Stock adjustments require warehouse manager approval.'); const wd = whDeny(a.wh); if (wd) return wd;
    if (a.status !== 'Pending Approval') return fail('Already ' + a.status.toLowerCase() + ' — duplicate action blocked.');
    if (a.by === st.currentUser) return fail('You requested this adjustment. A different manager must approve it.');
    if (action === 'reject') { a.status = 'Rejected'; a.approver = st.currentUser; a.decidedAt = clock(); a.note = note || ''; log('Rejected stock adjustment', id, note); }
    else {
      const b = bal(a.wh, a.sku); if (b.sellable + a.qty < 0) return fail('Posting would create negative sellable stock.');
      b.sellable += a.qty; a.cost4 = b.avg; if (a.qty < 0) consume(a.wh, a.sku, -a.qty); else { const nb = st.batches.filter(x => x.wh === a.wh && x.sku === a.sku && x.bucket === 'sellable').sort((x, y) => x.exp < y.exp ? 1 : -1)[0]; if (nb) nb.qty += a.qty; }
      move('Adjustment', a.wh, a.sku, a.qty, 'sellable', b.avg, id);
      if (a.type === 'Damage' && a.qty < 0) { b.damaged += -a.qty; move('Adjustment', a.wh, a.sku, -a.qty, 'damaged', b.avg, id); }
      a.status = 'Posted'; a.approver = st.currentUser; a.decidedAt = clock(); a.note = note || '';
      log('Approved & posted stock adjustment', id, `${a.qty > 0 ? '+' : ''}${a.qty} bars · value ${money(valueOf(a.qty, b.avg))}`);
    }
    if (a.count) { const c = st.counts.find(x => x.id === a.count); if (c && !st.adjustments.some(x => x.count === c.id && x.status === 'Pending Approval')) c.status = 'Completed'; }
    emit(); return ok(action === 'reject' ? 'Adjustment rejected. Original request retained in history.' : 'Adjustment posted. Stock and valuation updated at current weighted-average cost.', id);
  };
  A.countCreate = d => { if (!can('inv.count')) return deny(); const wd = whDeny(d.wh); if (wd) return wd; if (!d.skus.length) return fail('Select at least one product to count.'); const c = { id: nextRef('CNT'), wh: d.wh, location: d.location, status: 'Counting', blind: d.blind, created: clock(), by: st.currentUser, lines: d.skus.map(sku => ({ sku, expected: bal(d.wh, sku).sellable, counted: null, history: [] })) }; st.counts.unshift(c); log('Started count session', c.id, wh(d.wh).name + ' · ' + d.location); emit(); return ok('Count session started. Expected quantities snapshotted.', c.id, { id: c.id }); };
  A.countSet = (id, i, counted, reason) => { const c = st.counts.find(x => x.id === id); const l = c.lines[i]; if (counted !== undefined) l.counted = counted; if (reason !== undefined) l.reason = reason; save(); listeners.forEach(f => f()); };
  A.countRecount = (id, i) => { const c = st.counts.find(x => x.id === id); const l = c.lines[i]; if (l.counted != null) l.history.push({ counted: l.counted, by: st.currentUser, ts: clock() }); l.counted = null; l.recount = true; log('Requested recount', id, l.sku); emit(); return ok('Recount requested. First count preserved in history.', id); };
  A.countSubmit = id => {
    if (!can('inv.count')) return deny(); const c = st.counts.find(x => x.id === id);
    if (c.lines.some(l => l.counted == null)) return fail('Enter a counted quantity for every line.');
    const vars = c.lines.filter(l => l.counted !== l.expected);
    if (vars.some(l => !l.reason)) return fail('A reason is required for every line with a variance.');
    vars.forEach(l => { const a = { id: nextRef('ADJ'), wh: c.wh, sku: l.sku, qty: l.counted - l.expected, type: 'Count variance', reason: l.reason, status: 'Pending Approval', by: st.currentUser, at: clock(), count: c.id }; st.adjustments.unshift(a); l.adj = a.id; });
    c.status = vars.length ? 'Pending Approval' : 'Completed'; c.submittedAt = clock(); log('Submitted count', id, vars.length + ' variance(s)'); emit();
    return ok(vars.length ? `${vars.length} variance(s) sent for manager approval as adjustment requests.` : 'No variances — count completed.', id);
  };
  A.userSave = (id, patch) => { if (!can('usr.manage')) return deny(); const u = st.users.find(x => x.id === id); if (patch.wh && !patch.wh.length) return fail('Assign at least one warehouse.'); if (id === st.currentUser && patch.status === 'Suspended') return fail('You cannot suspend your own account.'); Object.assign(u, patch); log('Updated user', u.name, JSON.stringify(patch).replace(/["{}]/g, '')); emit(); return ok('User updated. Changes apply at next sign-in (enforced by backend).', u.name); };
  A.userCreate = d => { if (!can('usr.manage')) return deny(); if (!d.name || !d.email || !d.role) return fail('Name, email and role are required.'); if (st.users.some(u => u.email === d.email)) return fail('Email already in use.'); const u = { id: 'u' + (st.users.length + 1 + Math.floor(Math.random() * 1000)), name: d.name, email: d.email, role: d.role, wh: d.wh.length ? d.wh : ['TMA'], status: 'Invited', last: '—' }; st.users.push(u); log('Invited user', u.name, ROLES[u.role].name); emit(); return ok('Invitation queued (simulated).', u.name); };
  A.settingsSave = patch => { if (!can('set.manage')) return deny(); Object.assign(st.settings, patch); log('Updated settings', 'SETTINGS', Object.keys(patch).join(', ')); emit(); return ok('Settings saved.', 'SETTINGS'); };

  // ---------- derived views
  const D = {};
  D.stockRows = (opts) => { opts = opts || {}; const sc = opts.whs || scope(); const rows = []; st.products.forEach(p => { if (opts.consolidated) { const r = { sku: p.sku, wh: 'ALL', sellable: 0, reserved: 0, damaged: 0, quarantined: 0, inTransit: 0, value: 0, last: '' }; sc.forEach(w => { const b = bal(w, p.sku); r.sellable += b.sellable; r.reserved += b.reserved; r.damaged += b.damaged; r.quarantined += b.quarantined; r.inTransit += b.inTransit; r.value += valueOf(b.sellable, b.avg); if (b.last > r.last) r.last = b.last; }); r.avg = r.sellable ? Math.round(r.value * 100 / r.sellable) : p.cost4; r.min = p.min * sc.length; rows.push(r); } else sc.forEach(w => { const b = bal(w, p.sku); rows.push({ sku: p.sku, wh: w, sellable: b.sellable, reserved: b.reserved, damaged: b.damaged, quarantined: b.quarantined, inTransit: b.inTransit, value: valueOf(b.sellable, b.avg), avg: b.avg, last: b.last, min: p.min }); }); }); rows.forEach(r => { r.physical = r.sellable + r.damaged + r.quarantined; r.available = Math.max(0, r.sellable - r.reserved - (r.wh === 'ALL' ? sc.reduce((a, w) => a + expiredSellable(w, r.sku), 0) : expiredSellable(r.wh, r.sku))); const p = prod(r.sku); r.reorder = p.status === 'Discontinued' ? 'Discontinued' : r.available === 0 ? 'Out of stock' : r.available <= r.min ? 'Low' : 'OK'; }); return rows; };
  D.lowStock = () => D.stockRows().filter(r => ['Low', 'Out of stock'].includes(r.reorder));
  D.expiring = () => st.batches.filter(b => b.qty > 0 && inScope(b.wh) && b.exp).map(b => Object.assign({}, b, { days: diffDays(b.exp, TODAY) })).filter(b => b.days <= st.settings.expiryWarnDays).sort((a, b) => a.days - b.days);
  D.approvals = () => { const out = []; const add = (perm, type, ref, title, sub, route, w) => { if (can(perm) && (!w || inScope(w))) out.push({ type, ref, title, sub, route, wh: w }); };
    st.receipts.filter(r => r.status === 'Pending Approval').forEach(r => add('rcv.approve', 'Goods receipt', r.id, 'Post receipt from ' + sup(r.supplier).name, wh(r.wh).name + ' · submitted by ' + uname(r.by), { name: 'receiving', id: r.id }, r.wh));
    st.adjustments.filter(a => a.status === 'Pending Approval').forEach(a => add('inv.adjust.approve', 'Stock adjustment', a.id, `${a.qty > 0 ? '+' : ''}${qty(a.sku, a.qty)} ${prod(a.sku).name}`, wh(a.wh).name + ' · requested by ' + uname(a.by), { name: 'stockcontrol', tab: 'adjustments', id: a.id }, a.wh));
    st.transfers.filter(t => t.status === 'Requested').forEach(t => add('trf.approve', 'Transfer', t.id, `${wh(t.from).name} → ${wh(t.to).name}`, t.lines.length + ' lines · requested by ' + uname(t.by), { name: 'transfers', id: t.id }, t.from));
    st.pos.filter(p => p.status === 'Pending Approval').forEach(p => add('po.approve', 'Purchase order', p.id, sup(p.supplier).name, money(poTotals(p).total), { name: 'purchase-orders', id: p.id }));
    st.salesOrders.filter(s => s.status === 'Pending Approval').forEach(s => add('so.approve', 'Sales order', s.id, cust(s.customer).name, s.approvalReason || '', { name: 'sales-orders', id: s.id }, s.wh));
    st.expenses.filter(e => e.status === 'Pending Approval').forEach(e => add('exp.approve', 'Expense', e.id, e.description, money(e.amount) + ' · ' + e.category, { name: 'expenses', id: e.id }, e.wh));
    st.payments.filter(p => p.status === 'Recorded').forEach(p => add('fin.verify', 'Payment', p.id, 'Verify ' + money(p.amount) + ' from ' + cust(p.customer).name, p.method + (p.extRef ? ' · ' + p.extRef : ''), { name: 'finance', tab: 'payments', id: p.id }));
    return out; };
  D.exceptions = () => { const out = []; st.receipts.filter(r => inScope(r.wh) && diffDays(TODAY, r.arrival.slice(0, 10)) <= 10 && r.status !== 'Rejected').forEach(r => { const s = r.lines.reduce((a, l) => a + Math.max(0, l.expected - l.counted), 0), d = r.lines.reduce((a, l) => a + l.damaged + l.rejected, 0); if (r.lines.some(l => l.counted > 0) && (s || d)) out.push({ kind: 'Receiving', ref: r.id, text: `${sup(r.supplier).name}: ${s ? 'short ' + s.toLocaleString() + ' bars' : ''}${s && d ? ', ' : ''}${d ? d.toLocaleString() + ' bars damaged/rejected' : ''}`, route: { name: 'receiving', id: r.id } }); });
    st.transfers.filter(t => t.status === 'Disputed' && (inScope(t.from) || inScope(t.to))).forEach(t => out.push({ kind: 'Transfer', ref: t.id, text: t.note || 'Quantity discrepancy on receipt', route: { name: 'transfers', id: t.id } }));
    st.dispatches.filter(d => ['Failed', 'Partially delivered'].includes(d.status) && inScope(d.wh)).forEach(d => out.push({ kind: 'Delivery', ref: d.id, text: d.status + ' — ' + (d.outcomeNote || cust(st.salesOrders.find(s => s.id === d.so).customer).name), route: { name: 'dispatch', id: d.id } }));
    st.supplierInvoices.forEach(s => { const m = sinvMatch(s); if (m.length) out.push({ kind: 'Invoice match', ref: s.id, text: m[0], route: { name: 'finance', tab: 'supplier' } }); });
    return out; };
  D.period = (days, whs) => { whs = whs || scope(); const r = { rev: 0, cogs: 0, rcv: 0, dsp: 0, daily: [] }; for (let d = -(days - 1); d <= 0; d++) { const k = addDays(TODAY, d); const s = st.series[k] || {}; const row = { date: k, rev: 0, cogs: 0, rcv: 0, dsp: 0 }; whs.forEach(w => { const x = s[w]; if (x) { row.rev += x.rev; row.cogs += x.cogs; row.rcv += x.rcv; row.dsp += x.dsp; } }); r.daily.push(row); r.rev += row.rev; r.cogs += row.cogs; r.rcv += row.rcv; r.dsp += row.dsp; } r.gp = r.rev - r.cogs; r.margin = r.rev ? Math.round(r.gp * 1000 / r.rev) / 10 : 0; return r; };
  D.search = q => { q = (q || '').trim().toLowerCase(); if (q.length < 2) return []; const out = []; const push = (type, ref, label, sub, route) => { if (out.length < 12) out.push({ type, ref, label, sub, route }); };
    st.products.forEach(p => { if ((p.sku + ' ' + p.name + ' ' + p.brand).toLowerCase().includes(q)) push('Product', p.sku, p.name, p.brand + ' · ' + p.size, { name: 'catalogue', id: p.sku }); });
    st.salesOrders.forEach(s => { if ((s.id + ' ' + cust(s.customer).name).toLowerCase().includes(q)) push('Sales order', s.id, cust(s.customer).name, s.status, { name: 'sales-orders', id: s.id }); });
    st.pos.forEach(p => { if ((p.id + ' ' + sup(p.supplier).name).toLowerCase().includes(q)) push('Purchase order', p.id, sup(p.supplier).name, p.status, { name: 'purchase-orders', id: p.id }); });
    st.receipts.forEach(r => { if ((r.id + ' ' + r.truck + ' ' + r.dn).toLowerCase().includes(q)) push('Receipt', r.id, sup(r.supplier).name, r.truck + ' · ' + r.status, { name: 'receiving', id: r.id }); });
    st.transfers.forEach(t => { if (t.id.toLowerCase().includes(q)) push('Transfer', t.id, wh(t.from).name + ' → ' + wh(t.to).name, t.status, { name: 'transfers', id: t.id }); });
    st.invoices.forEach(i => { if (i.id.toLowerCase().includes(q)) push('Invoice', i.id, cust(i.customer).name, invStatus(i), { name: 'finance', id: i.id }); });
    st.customers.forEach(c => { if (c.name.toLowerCase().includes(q)) push('Customer', c.id, c.name, c.type, { name: 'customers', id: c.id }); });
    st.dispatches.forEach(d => { if (d.id.toLowerCase().includes(q)) push('Dispatch', d.id, d.so, d.status, { name: 'dispatch', id: d.id }); });
    return out; };
  D.paginate = (rows, page, size) => { const pages = Math.max(1, Math.ceil(rows.length / size)); const p = Math.min(Math.max(1, page), pages); return { rows: rows.slice((p - 1) * size, p * size), page: p, pages, total: rows.length, label: rows.length ? `${(p - 1) * size + 1}–${Math.min(p * size, rows.length)} of ${rows.length}` : '0 results', hasPrev: p > 1, hasNext: p < pages }; };
  D.sort = (rows, key, dir) => key ? rows.slice().sort((a, b) => { const x = a[key], y = b[key]; const c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y)); return dir === 'desc' ? -c : c; }) : rows;
  D.csv = (name, cols, rows) => { const esc = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; const txt = [cols.map(esc).join(',')].concat(rows.map(r => r.map(esc).join(','))).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv' })); a.download = name + '.csv'; document.body.appendChild(a); a.click(); a.remove(); A.toast('success', 'Export ready', `${name}.csv · ${rows.length} rows (demonstration data)`); };

  return Object.assign({
    get s() { return st; }, get version() { return version; }, hooks, ui, TODAY, ROLES, PERMS, PERM_LABELS, WH, STATUS_TONE, subscribe: f => { listeners.add(f); return () => listeners.delete(f); }, emit,
    prod, bpc, wh, cust, sup, user, uname, role, can, canView, allowedWh, hasAllWh, scope, inScope, money, moneyShort, cost, valueOf, qty, toBars, fmtDate, badge, tones: TONES, commas, addDays, diffDays,
    bal, avail, invStatus, invBal, custBalance, soTotal, poTotals, poReceived, poInvoiced, poDelivery, sinvMatch, expiredSellable,
  }, A, D);
}
