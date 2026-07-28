const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/gymsync').then(async () => {
  const gyms = await mongoose.connection.db.collection('gyms').find({}, {projection: {name: 1, ownerName: 1, owner: 1}}).toArray();
  const users = await mongoose.connection.db.collection('users').find({}, {projection: {name: 1, role: 1, email: 1}}).toArray();
  
  const fs = require('fs');
  fs.writeFileSync('db_dump.json', JSON.stringify({gyms, users}, null, 2));
  console.log('Database dumped to db_dump.json');
  await mongoose.disconnect();
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
