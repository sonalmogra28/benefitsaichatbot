// lib/firestore.ts
import { getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

export { db };
