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

export function CompaniesTable() {
  const [value, loading, error] = useCollection(collection(db, 'companies'));

  return (
    <div>
      <h1 className="text-2xl font-bold">Companies</h1>
      {error && <p className="text-red-500">{error.message}</p>}
      {loading && <p>Loading...</p>}
      {value && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {value.docs.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>{doc.data().name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
