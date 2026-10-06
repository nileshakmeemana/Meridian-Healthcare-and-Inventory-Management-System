// ============================================================
// MERIDIAN — Business Intelligence & Data Mining algorithms
//
// 1. Demand forecasting   — least-squares linear regression on monthly
//                           consumption → next-month demand, days to stock-out
// 2. Market-basket mining — Apriori (k = 2) association rules on prescriptions
//                           → support, confidence, lift for co-prescribed medicines
// 3. ABC inventory analysis — Pareto classification by revenue contribution
// ============================================================
const mongoose = require('mongoose');
const { DAY_MS } = require('../database/functions');

const M = (name) => mongoose.model(name);
const monthKey = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

function lastNMonths(n, now = new Date()) {
  const keys = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    keys.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  }
  return keys;
}

/** Ordinary least squares: y = a + b·x for x = 0..n-1 */
function linearRegression(ys) {
  const n = ys.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
  const xMean = (n - 1) / 2;
  const yMean = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0; let den = 0;
  ys.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) ** 2; });
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  const ssTot = ys.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const ssRes = ys.reduce((s, y, x) => s + (y - (intercept + slope * x)) ** 2, 0);
  return { slope, intercept, r2: ssTot === 0 ? 1 : 1 - ssRes / ssTot };
}

/* ------------------------------------------------------------------ */
/* 1. DEMAND FORECAST                                                  */
/* ------------------------------------------------------------------ */
async function demandForecast({ months = 6, limit = 15 } = {}) {
  const keys = lastNMonths(months);
  const since = new Date(`${keys[0]}-01T00:00:00Z`);

  const rows = await M('Sale').aggregate([
    { $match: { saleDate: { $gte: since } } },
    { $unwind: '$items' },
    { $group: {
        _id: { medicine: '$items.medicine', month: { $dateToString: { date: '$saleDate', format: '%Y-%m' } } },
        units: { $sum: '$items.quantity' },
    } },
  ]);

  const series = new Map();
  rows.forEach(({ _id, units }) => {
    const id = String(_id.medicine);
    if (!series.has(id)) series.set(id, Object.fromEntries(keys.map((k) => [k, 0])));
    if (series.get(id)[_id.month] !== undefined) series.get(id)[_id.month] = units;
  });

  const medicines = await M('Medicine').find({ _id: { $in: [...series.keys()] } })
    .select('name category stockQuantity reorderLevel unit').lean();

  const results = medicines.map((m) => {
    const history = keys.map((k) => series.get(String(m._id))[k]);
    const { slope, intercept, r2 } = linearRegression(history);
    const forecast = Math.max(0, Math.round(intercept + slope * history.length));
    const dailyDemand = forecast / 30;
    const daysToStockout = dailyDemand > 0 ? Math.floor(m.stockQuantity / dailyDemand) : null;
    const safetyStock = Math.ceil(dailyDemand * 7);           // one week of cover
    const suggestedOrder = Math.max(0, forecast + safetyStock - m.stockQuantity);
    return {
      medicineId: m._id, medicineName: m.name, category: m.category, unit: m.unit,
      stockQuantity: m.stockQuantity, history, months: keys,
      forecastNextMonth: forecast, trend: slope > 0.5 ? 'Rising' : slope < -0.5 ? 'Falling' : 'Stable',
      slope: +slope.toFixed(2), confidence: +Math.max(0, r2).toFixed(2),
      daysToStockout, suggestedOrder,
      risk: daysToStockout === null ? 'None' : daysToStockout <= 14 ? 'High' : daysToStockout <= 30 ? 'Medium' : 'Low',
    };
  });

  const riskOrder = { High: 0, Medium: 1, Low: 2, None: 3 };
  return results
    .sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk] || (a.daysToStockout ?? 1e9) - (b.daysToStockout ?? 1e9))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* 2. MARKET-BASKET ANALYSIS (Apriori, itemsets of size 2)             */
/* ------------------------------------------------------------------ */
async function marketBasket({ minSupport = 0.02, minConfidence = 0.2, limit = 12 } = {}) {
  const baskets = (await M('Prescription').find().select('items.medicine').lean())
    .map((p) => [...new Set(p.items.map((i) => String(i.medicine)))])
    .filter((b) => b.length > 0);
  const N = baskets.length;
  if (N === 0) return { transactions: 0, rules: [] };

  // Pass 1 — frequent single items (L1)
  const single = new Map();
  baskets.forEach((b) => b.forEach((id) => single.set(id, (single.get(id) || 0) + 1)));
  const frequent = new Set([...single].filter(([, c]) => c / N >= minSupport).map(([id]) => id));

  // Pass 2 — candidate pairs built only from frequent items (Apriori property)
  const pairs = new Map();
  baskets.forEach((b) => {
    const items = b.filter((id) => frequent.has(id)).sort();
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const key = `${items[i]}|${items[j]}`;
        pairs.set(key, (pairs.get(key) || 0) + 1);
      }
    }
  });

  const rules = [];
  pairs.forEach((count, key) => {
    const support = count / N;
    if (support < minSupport) return;
    const [a, b] = key.split('|');
    [[a, b], [b, a]].forEach(([x, y]) => {
      const confidence = count / single.get(x);
      if (confidence < minConfidence) return;
      const lift = confidence / (single.get(y) / N);
      rules.push({ antecedent: x, consequent: y, count, support, confidence, lift });
    });
  });

  rules.sort((p, q) => q.lift - p.lift || q.confidence - p.confidence);
  const top = rules.slice(0, limit);
  const names = new Map((await M('Medicine').find({ _id: { $in: [...new Set(top.flatMap((r) => [r.antecedent, r.consequent]))] } })
    .select('name').lean()).map((m) => [String(m._id), m.name]));

  return {
    transactions: N,
    rules: top.map((r) => ({
      antecedent: names.get(r.antecedent), consequent: names.get(r.consequent), coOccurrences: r.count,
      support: +(r.support * 100).toFixed(1), confidence: +(r.confidence * 100).toFixed(1), lift: +r.lift.toFixed(2),
    })),
  };
}

/* ------------------------------------------------------------------ */
/* 3. ABC ANALYSIS                                                     */
/* ------------------------------------------------------------------ */
async function abcAnalysis({ days = 180 } = {}) {
  const since = new Date(Date.now() - days * DAY_MS);
  const rows = await M('Sale').aggregate([
    { $match: { saleDate: { $gte: since } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.medicine', revenue: { $sum: '$items.subtotal' }, units: { $sum: '$items.quantity' } } },
    { $sort: { revenue: -1 } },
    { $lookup: { from: 'medicines', localField: '_id', foreignField: '_id', as: 'm' } },
    { $unwind: '$m' },
    { $project: { _id: 0, medicineId: '$_id', medicineName: '$m.name', category: '$m.category', revenue: 1, units: 1 } },
  ]);
  const total = rows.reduce((s, r) => s + r.revenue, 0) || 1;
  let running = 0;
  const items = rows.map((r) => {
    running += r.revenue;
    const cumulativePct = (running / total) * 100;
    const prevPct = ((running - r.revenue) / total) * 100;
    // An item belongs to the class in which its contribution starts
    const abcClass = prevPct < 80 ? 'A' : prevPct < 95 ? 'B' : 'C';
    return { ...r, revenue: +r.revenue.toFixed(2), sharePct: +((r.revenue / total) * 100).toFixed(2), cumulativePct: +cumulativePct.toFixed(2), abcClass };
  });
  const summary = ['A', 'B', 'C'].map((c) => {
    const group = items.filter((i) => i.abcClass === c);
    return { abcClass: c, items: group.length, revenue: +group.reduce((s, i) => s + i.revenue, 0).toFixed(2) };
  });
  return { totalRevenue: +total.toFixed(2), summary, items };
}

module.exports = { demandForecast, marketBasket, abcAnalysis, linearRegression };
