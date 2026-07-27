import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  gymId: { type: String, required: true },
  memberId: { type: String, required: true },
  memberName: { type: String, required: true },
  checkInTime: { type: Date, default: Date.now },
  checkOutTime: { type: Date },
  status: { type: String, enum: ['CheckedIn', 'CheckedOut'], default: 'CheckedIn' },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
