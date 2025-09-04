/** @vitest-environment node */
import { initializeTestEnvironment, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import fs from 'node:fs';

let testEnv: any;
const run = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;

run('Firestore security rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-project',
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('allows authenticated read to documents', async () => {
    const adminDb = testEnv.authenticatedContext('admin', { role: 'super-admin' }).firestore();
    await setDoc(doc(adminDb, 'documents/doc1'), { foo: 'bar' });

    const userDb = testEnv.authenticatedContext('user1').firestore();
    await assertSucceeds(getDoc(doc(userDb, 'documents/doc1')));
  });

  it('allows admin writes to documents', async () => {
    const adminDb = testEnv.authenticatedContext('admin', { role: 'super-admin' }).firestore();
    await assertSucceeds(setDoc(doc(adminDb, 'documents/doc3'), { foo: 'bar' }));
  });

  it('allows user reading own profile', async () => {
    const adminDb = testEnv.authenticatedContext('admin', { role: 'super-admin' }).firestore();
    await setDoc(doc(adminDb, 'users/user3'), { name: 'Bob' });

    const user3Db = testEnv.authenticatedContext('user3').firestore();
    await assertSucceeds(getDoc(doc(user3Db, 'users/user3')));
  });
});
