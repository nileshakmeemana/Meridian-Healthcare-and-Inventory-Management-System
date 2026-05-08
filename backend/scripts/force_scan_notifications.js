const db = require("../config/database");
const medCtrl = require("../controllers/medicine.controller");

(async () => {
  try {
    const res = await db.query(
      `SELECT medicine_id FROM medicines WHERE stock_quantity <= reorder_level OR (expiry_date IS NOT NULL AND expiry_date <= SYSDATE + 30)`,
    );
    console.log("Found", res.rows.length, "medicines to check");
    for (const r of res.rows) {
      const id = r.MEDICINE_ID;
      console.log("Checking medicine", id);
      try {
        if (typeof medCtrl.notifyLowStockIfNeeded === "function")
          await medCtrl.notifyLowStockIfNeeded(id);
        if (typeof medCtrl.notifyExpiryIfNeeded === "function")
          await medCtrl.notifyExpiryIfNeeded(id);
      } catch (e) {
        console.error("Error for med", id, e.message || e);
      }
    }
    console.log("Done");
    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err.message || err);
    process.exit(1);
  }
})();
