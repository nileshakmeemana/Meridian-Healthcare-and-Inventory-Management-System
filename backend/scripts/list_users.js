const db = require("../config/database");

(async () => {
  try {
    const res = await db.query(
      "SELECT user_id, username, email, role, is_active FROM users ORDER BY user_id",
    );
    console.log("USERS_COUNT:", res.rows.length);
    for (const r of res.rows) console.log(r);
    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err.message || err);
    process.exit(1);
  }
})();
