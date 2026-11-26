import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/modules/auth/password.js';
const phone = process.env.OWNER_PHONE;
const name = process.env.OWNER_NAME?.trim();
const password = process.env.OWNER_PASSWORD;
if (!/^\+91[6-9]\d{9}$/.test(phone ?? '') || !name || name.length > 120) throw new Error('Set valid OWNER_PHONE and OWNER_NAME');
const passwordHash = await hashPassword(password);
const db = new PrismaClient();
try {
  const owner = await db.user.create({data:{phone,name,passwordHash,role:'OWNER'},select:{id:true}});
  console.log('Created owner:',owner.id);
} finally { await db.$disconnect(); }
