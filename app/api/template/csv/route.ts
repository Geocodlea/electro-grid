import { NextResponse } from 'next/server';
import { generateCsvTemplate } from '@/lib/csv-parser';

export async function GET() {
  const csvContent = generateCsvTemplate();

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="electrogrid_sablon_retea.csv"',
    },
  });
}
