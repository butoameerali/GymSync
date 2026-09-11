import DailyCheckIn from '../models/DailyCheckIn.js';

export const submitCheckIn = async (req, res) => {
  try {
    const { mood, energyLevel, painNote, sleepHours, lastSessionRPE } = req.body;
    
    // YYYY-MM-DD
    const date = new Date().toISOString().split('T')[0];

    const checkIn = await DailyCheckIn.findOneAndUpdate(
      { userId: req.user._id, date },
      { $set: { mood, energyLevel, painNote, sleepHours, lastSessionRPE } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ message: 'Daily check-in saved', checkIn });
  } catch (error) {
    console.error('Error in submitCheckIn:', error);
    res.status(500).json({ message: 'Failed to submit check-in' });
  }
};

export const getCheckIns = async (req, res) => {
  try {
    const checkIns = await DailyCheckIn.find({ userId: req.user._id }).sort({ date: -1 }).limit(7);
    res.json(checkIns);
  } catch (error) {
    console.error('Error in getCheckIns:', error);
    res.status(500).json({ message: 'Failed to fetch check-ins' });
  }
};
