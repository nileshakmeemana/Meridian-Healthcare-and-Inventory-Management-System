// inspect_notifications.js
const db = require("../config/database");

(async () => {
  try {
    const res = await db.query(
      "SELECT notification_id, user_id, title, message, type, is_read, created_at FROM notifications ORDER BY created_at DESC FETCH FIRST 200 ROWS ONLY",
    );
    console.log("NOTIFICATIONS_COUNT:", res.rows.length);
    for (const r of res.rows) {
      console.log(r);
    }
    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err.message || err);
    process.exit(1);
  }
})();
