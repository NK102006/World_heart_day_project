const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function syncDB() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  const db = client.db('World_heart_day_project');

  const hashedSuperadminPass = await bcrypt.hash('superadmin123', 10);
  const hashedAdminPass = await bcrypt.hash('Admin@123', 10);
  const hashedUserPass = await bcrypt.hash('User@123', 10);

  // 1. SuperAdmin: Name: 'superadmin'
  await db.collection('superadmins').updateOne(
    { name: 'superadmin' },
    { $set: { name: 'superadmin', password: hashedSuperadminPass } },
    { upsert: true }
  );

  // 2. Admin: Name: 'Admin'
  await db.collection('admins').updateOne(
    { name: 'Admin' },
    { $set: { name: 'Admin', password: hashedAdminPass } },
    { upsert: true }
  );

  // 3. User: Employee ID: 'EMP1001'
  await db.collection('user').updateOne(
    { employeeId: 'EMP1001' },
    { $set: { employeeId: 'EMP1001', password: hashedUserPass } },
    { upsert: true }
  );

  console.log('✅ Database credentials synced:');
  console.log('Superadmin -> Name: superadmin | Password: superadmin123');
  console.log('Admin      -> Name: Admin      | Password: Admin@123');
  console.log('User       -> Employee ID: EMP1001 | Password: User@123');

  await client.close();
}

syncDB().catch(console.error);
