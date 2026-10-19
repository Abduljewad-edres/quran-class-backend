const mongoose = require('mongoose');

const salaryRecordSchema = new mongoose.Schema({
  teacherId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  salaryMonth:    { type: Date, required: true },  // stored as first day of month
  activeStudents: { type: Number, default: 0 },
  ratePerStudent: { type: Number, required: true },
  totalSalary:    { type: Number, required: true },
  midMonthRule:   { type: String, enum: ['full_month','prorate','count_at_start','count_at_end'], default: 'count_at_end' },
  status:         { type: String, enum: ['pending','paid','cancelled'], default: 'pending' },
  notes:          { type: String },
  generatedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentDate:    { type: Date },
  amountPaid:     { type: Number },
  paymentMethod:  { type: String },
  referenceNo:    { type: String },
  paidBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// One salary record per teacher per month
salaryRecordSchema.index({ teacherId: 1, salaryMonth: 1 }, { unique: true });

module.exports = mongoose.model('SalaryRecord', salaryRecordSchema);
