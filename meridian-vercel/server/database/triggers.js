// ============================================================
// MERIDIAN — Triggers (MongoDB edition)
// Oracle PL/SQL TRIGGER  →  Mongoose document / query middleware
//
// Each function below attaches hooks to a schema BEFORE the model
// is compiled. Hooks look other models up lazily with
// mongoose.model(...) so there are no circular imports.
//
//  trg_low_stock_alert          Medicine  post findOneAndUpdate
//  trg_stock_history_log        Medicine  post findOneAndUpdate
//  trg_appointment_notification Appointment post save (insert only)
//  trg_supply_update_stock      SupplyOrder post findOneAndUpdate (→ Delivered)
//  trg_supply_total_cost        SupplyOrder pre validate (BEFORE INSERT)
//  trg_*_updated_at             replaced by { timestamps: true }
//  trg_audit_log                auditPlugin (Medicine, User, Appointment)
// ============================================================
const mongoose = require('mongoose');

const M = (name) => mongoose.model(name);
const sessionOf = (query) => query.getOptions().session || null;
const wantsNew = (opts) => opts.new === true || opts.returnDocument === 'after';

async function notifyRole(role, payload, session) {
  const users = await M('User').find({ role, isActive: true }).select('_id').session(session).lean();
  if (!users.length) return;
  await M('Notification').insertMany(
    users.map((u) => ({ user: u._id, ...payload })),
    { session }
  );
}

/* ------------------------------------------------------------------ */
/* MEDICINE: trg_stock_history_log + trg_low_stock_alert               */
/* ------------------------------------------------------------------ */
function medicineTriggers(schema) {
  schema.pre('findOneAndUpdate', async function stashOldStock() {
    const update = this.getUpdate() || {};
    const touchesStock =
      update.stockQuantity !== undefined ||
      update.$set?.stockQuantity !== undefined ||
      update.$inc?.stockQuantity !== undefined;
    if (!touchesStock) return;
    this._oldMedicine = await this.model.findOne(this.getQuery()).session(sessionOf(this)).lean();
  });

  schema.post('findOneAndUpdate', async function afterStockChange(doc) {
    const old = this._oldMedicine;
    if (!old || !doc) return;
    const opts = this.getOptions();
    const session = sessionOf(this);
    const after = wantsNew(opts) ? doc : await this.model.findById(old._id).session(session).lean();
    const diff = after.stockQuantity - old.stockQuantity;
    if (diff === 0) return;

    // trg_stock_history_log — complete audit trail of every stock movement
    await M('StockHistory').create(
      [{
        medicine: after._id,
        changedBy: opts.actor || null,
        changeType: opts.changeType || (diff > 0 ? 'Add' : 'Remove'),
        quantityBefore: old.stockQuantity,
        quantityChange: diff,
        quantityAfter: after.stockQuantity,
        reason: opts.reason || 'Auto-logged by trigger',
      }],
      { session }
    );

    // trg_low_stock_alert — fires only when stock CROSSES the reorder level
    const crossedLow = after.stockQuantity <= after.reorderLevel && old.stockQuantity > old.reorderLevel;
    if (crossedLow) {
      await notifyRole('pharmacist', {
        title: 'Low stock alert',
        message: `${after.name} is down to ${after.stockQuantity} units (reorder level ${after.reorderLevel}).`,
        type: 'Stock',
        link: '/dashboard/medicines?status=Low',
      }, session);
      await M('AuditLog').create(
        [{ action: 'LOW_STOCK_ALERT', collectionName: 'medicines', recordId: after._id,
           newValue: { medicine: after.name, stock: after.stockQuantity, reorder: after.reorderLevel } }],
        { session }
      );
    }
  });
}

/* ------------------------------------------------------------------ */
/* APPOINTMENT: trg_appointment_notification                           */
/* ------------------------------------------------------------------ */
function appointmentTriggers(schema) {
  schema.pre('save', function markNew() {
    this.$locals.wasNew = this.isNew;
  });

  schema.post('save', async function notifyOnBooking(doc) {
    if (!doc.$locals.wasNew) return;
    const session = doc.$session();
    const [patient, doctor] = await Promise.all([
      M('Patient').findById(doc.patient).session(session).lean(),
      M('Doctor').findById(doc.doctor).session(session).lean(),
    ]);
    if (!patient || !doctor) return;
    const day = doc.appointmentDate.toISOString().slice(0, 10);
    await M('Notification').insertMany([
      { user: patient.user, type: 'Appointment', title: 'Appointment confirmed',
        message: `Your appointment with Dr. ${doctor.firstName} ${doctor.lastName} is on ${day} at ${doc.appointmentTime}.`,
        link: '/dashboard/appointments' },
      { user: doctor.user, type: 'Appointment', title: 'New appointment',
        message: `${patient.firstName} ${patient.lastName} booked ${day} at ${doc.appointmentTime}.`,
        link: '/dashboard/appointments' },
    ], { session });
  });
}

/* ------------------------------------------------------------------ */
/* SUPPLY ORDER: trg_supply_total_cost + trg_supply_update_stock        */
/* ------------------------------------------------------------------ */
function supplyOrderTriggers(schema) {
  // BEFORE INSERT/UPDATE — derive total cost
  schema.pre('validate', function computeTotal() {
    if (this.unitCost != null && this.quantity != null) {
      this.totalCost = Math.round(this.quantity * this.unitCost * 100) / 100;
    }
  });

  schema.pre('findOneAndUpdate', async function stashOldOrder() {
    this._oldOrder = await this.model.findOne(this.getQuery()).session(sessionOf(this)).lean();
  });

  schema.post('findOneAndUpdate', async function addStockOnDelivery(doc) {
    const old = this._oldOrder;
    if (!old || !doc) return;
    const session = sessionOf(this);
    const after = wantsNew(this.getOptions()) ? doc : await this.model.findById(old._id).session(session).lean();
    if (!(after.status === 'Delivered' && old.status !== 'Delivered')) return;

    const set = after.expiryDate ? { expiryDate: after.expiryDate } : {};
    if (after.batchNumber) set.batchNumber = after.batchNumber;

    // Cascades into the Medicine triggers above (history + low-stock check)
    await M('Medicine').findOneAndUpdate(
      { _id: after.medicine },
      { $inc: { stockQuantity: after.quantity }, $set: set },
      { new: true, session, actor: this.getOptions().actor, changeType: 'Supply',
        reason: `Supply order ${String(after._id).slice(-6).toUpperCase()} delivered` }
    );

    if (after.request) {
      await M('MedicineRequest').updateOne({ _id: after.request }, { $set: { status: 'Fulfilled' } }, { session });
    }
    const supplier = await M('Supplier').findById(after.supplier).session(session).lean();
    if (supplier) {
      await M('Notification').create([{
        user: supplier.user, type: 'Success', title: 'Delivery received',
        message: `The hospital confirmed receipt of ${after.quantity} units.`, link: '/dashboard/supply-orders',
      }], { session });
    }
  });
}

/* ------------------------------------------------------------------ */
/* Generic audit trail (trg_audit_log)                                 */
/* ------------------------------------------------------------------ */
function auditPlugin(schema, { collectionName }) {
  schema.pre('save', function flag() { this.$locals.wasNewForAudit = this.isNew; });
  schema.post('save', async function writeAudit(doc) {
    await M('AuditLog').create([{
      user: doc.$locals.auditActor || null,
      action: doc.$locals.wasNewForAudit ? 'INSERT' : 'UPDATE',
      collectionName, recordId: doc._id,
    }], { session: doc.$session() });
  });
  schema.post('findOneAndDelete', async function auditDelete(doc) {
    if (!doc) return;
    await M('AuditLog').create([{
      user: this.getOptions().actor || null, action: 'DELETE', collectionName, recordId: doc._id,
    }]);
  });
}

module.exports = { medicineTriggers, appointmentTriggers, supplyOrderTriggers, auditPlugin, notifyRole };
