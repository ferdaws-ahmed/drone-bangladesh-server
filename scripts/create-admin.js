/* One-off admin user creation utility
 * Usage (from /server folder):
 *   node scripts/create-admin.js "admin@dronebangladesh.com" "your-secure-password" ["Admin Name"]
 * Safe: requires CLI execution (never exposed as API).
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDB } = require('../src/config/db');

const args = process.argv.slice(2);
const email = (args[0] || '').trim().toLowerCase();
const password = args[1] || '';
const name = args[2] || 'Admin';

if (!email || !password) {
  console.error('❌ Usage: node scripts/create-admin.js <email> <password> [name]');
  process.exit(1);
}
if (password.length < 8) {
  console.error('❌ Password must be at least 8 characters.');
  process.exit(1);
}

(async () => {
  try {
    const db = await getDB();
    const existing = await db.collection('users').findOne({ email });
    if (existing) {
      if (existing.role === 'admin') {
        console.log(`ℹ️  Admin "${email}" already exists.`);
      } else {
        const r = await db.collection('users').updateOne({ email }, { $set: { role: 'admin', updatedAt: new Date() } });
        console.log(`✅ User ${email} promoted to admin. (matched=${r.matchedCount})`);
      }
      process.exit(0);
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.collection('users').insertOne({
      name,
      email,
      password: hashed,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ Admin created: ${email}  (${name})`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err.message || err);
    process.exit(1);
  }
})();
