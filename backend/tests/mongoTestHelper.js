import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Returns the isolated test database URI.
 * Refuses to run if MONGO_URI_TEST is missing or matches the production MONGO_URI.
 *
 * @returns {string} The test MongoDB URI
 */
export function getTestMongoUri() {
  const testUri = process.env.MONGO_URI_TEST;
  const prodUri = process.env.MONGO_URI;

  if (!testUri) {
    throw new Error('❌ Test execution refused: MONGO_URI_TEST is not set in environment. Tests must run against a designated test database.');
  }

  if (testUri === prodUri) {
    throw new Error('❌ Test execution refused: MONGO_URI_TEST equals production MONGO_URI. Tests must never run against the production database.');
  }

  return testUri;
}

export default { getTestMongoUri };
