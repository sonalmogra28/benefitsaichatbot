// app/api/super-admin/companies/route.ts
import { NextResponse } from 'next/server';
import { getContainer } from '@/lib/azure/cosmos-db';


export async function POST(request: Request) {
  const { name } = await request.json();

  try {
    const docRef = await addDoc(collection(db, 'companies'), {
      name,
    });
    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 },
    );
  }
}
