'use client';

import { useCollection } from 'react-firebase-hooks/firestore';
import { collection } from 'firebase/firestore';
import { db } from '@/lib/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function UsersTable() {
  const [value, loading, error] = useCollection(collection(db, 'users'));

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      {error && <p className="text-red-500">{error.message}</p>}
      {loading && <p>Loading...</p>}
      {value && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {value.docs.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>{doc.data().email}</TableCell>
                <TableCell>{doc.data().role}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
