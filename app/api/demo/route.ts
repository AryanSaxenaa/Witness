import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(): Promise<NextResponse> {
  try {
    const demoPath = join(process.cwd(), 'data', 'demo-testimony.txt')
    const text = await readFile(demoPath, 'utf-8')
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: 'Demo testimony not found' }, { status: 404 })
  }
}
