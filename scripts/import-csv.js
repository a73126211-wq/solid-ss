#!/usr/bin/env node
/**
 * SOLID - سوليد  |  CSV Import Script
 * Reads solid_menu.csv and imports into Supabase menu_items table.
 * Run ONCE after the database schema is applied.
 *
 * Usage:
 *   node scripts/import-csv.js
 *
 * Prerequisites:
 *   - Database schema applied (see supabase/INSTRUCTIONS.sql)
 *   - .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 *     (or use the service_role key via .env.local SUPABASE_SERVICE_ROLE_KEY)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  for (const line of env.split('\n')) {
    const [key, ...val] = line.split('=');
    if (key && val) process.env[key.trim()] = val.join('=').trim();
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Missing env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Use service_role if available (needed for bulk insert bypassing RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CSV_PATH = path.join(__dirname, '..', 'solid_menu.csv');

// Parse CSV (simple parser for this specific format)
function parseCSV(content) {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  // Skip markdown table header rows
  const dataLines = lines.filter(
    (l) => !l.startsWith('| alkal') && !l.startsWith('| ---')
  );

  const items = [];
  for (const line of dataLines) {
    const cells = line
      .replace(/^\|\|\|$/g, '')
      .split('|')
      .map((c) => c.trim());

    if (cells.length >= 5) {
      items.push({
        category: cells[0],
        name: cells[1],
        price: cells[2],
        description: cells[3],
        doublePrice: cells[4] || '',
      });
    }
  }
  return items;
}

async function main() {
  console.log('SOLID Menu CSV Import');
  console.log('='.repeat(40));

  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV file not found:', CSV_PATH);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const parsed = parseCSV(csvContent);

  console.log(`Found ${parsed.length} items in CSV`);

  // Validate
  const invalid = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    const errors = [];

    if (!item.category) errors.push('missing category');
    if (!item.name) errors.push('missing name');
    if (!item.price || isNaN(parseFloat(item.price))) {
      if (item.price) {
        errors.push('invalid price');
      }
    }

    if (errors.length > 0) {
      invalid.push({ row: i + 1, reason: errors.join(', '), name: item.name });
    }
  }

  if (invalid.length > 0) {
    console.log('\nInvalid rows:');
    for (const inv of invalid) {
      console.log(`   Row ${inv.row}: ${inv.name} - ${inv.reason}`);
    }
  }

  // Generate item_code from category + name
  function generateCode(category, name) {
    const catPrefix = category
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 3)
      .toUpperCase();
    const namePart = name
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 8)
      .toUpperCase();
    return `${catPrefix}-${namePart}`;
  }

  // Transform to menu_items format
  const menuItems = parsed.map((item) => {
    const priceStr = item.price || '0';
    const price = parseFloat(priceStr) || 0;

    return {
      item_code: generateCode(item.category, item.name),
      name: item.name,
      category: item.category,
      description: item.description || '',
      price: price,
      available: true,
      featured: false,
      image_url: '',
    };
  });

  // Check for duplicate codes
  const codeCounts = new Map();
  for (const item of menuItems) {
    codeCounts.set(item.item_code, (codeCounts.get(item.item_code) || 0) + 1);
  }

  const dupes = [];
  for (const [code, count] of codeCounts) {
    if (count > 1) dupes.push(code);
  }

  if (dupes.length > 0) {
    console.log('\nDuplicate codes (will be made unique):');
    for (const code of dupes) {
      console.log(`   ${code} (${codeCounts.get(code)} occurrences)`);
    }

    const codeUsed = new Map();
    for (const item of menuItems) {
      const base = item.item_code;
      const used = codeUsed.get(base) || 0;
      codeUsed.set(base, used + 1);
      if (used > 0) {
        item.item_code = `${base}-${used + 1}`;
      }
    }
  }

  console.log(`\n${menuItems.length} items ready for import`);

  // Check if items already exist (prevent double import)
  const { data: existing, error: fetchError } = await supabase
    .from('menu_items')
    .select('id, item_code')
    .limit(1);

  if (fetchError) {
    console.error('Cannot connect to database:', fetchError.message);
    console.log('\nPlease run the SQL migration first:');
    console.log('   Open https://aogtvkfhehaztdurvunf.supabase.co/editor');
    console.log('   Paste supabase/INSTRUCTIONS.sql and run');
    process.exit(1);
  }

  const existingCount = existing?.length || 0;

  if (existingCount > 0) {
    console.log(`\nTable already has ${existingCount} items.`);
    console.log('  Import will SKIP existing item_codes (no duplicates created).');
  }

  // Import in batches
  const BATCH_SIZE = 50;
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < menuItems.length; i += BATCH_SIZE) {
    const batch = menuItems.slice(i, i + BATCH_SIZE);

    const codes = batch.map((item) => item.item_code);
    const { data: existingCodes } = await supabase
      .from('menu_items')
      .select('item_code')
      .in('item_code', codes);

    const existingSet = new Set(existingCodes?.map((e) => e.item_code) || []);

    const toInsert = batch.filter((item) => !existingSet.has(item.item_code));
    const toSkip = batch.filter((item) => existingSet.has(item.item_code));

    skipped += toSkip.length;

    if (toInsert.length === 0) continue;

    const { error: insertError } = await supabase
      .from('menu_items')
      .insert(toInsert);

    if (insertError) {
      console.error(`   Batch ${i / BATCH_SIZE + 1} error:`, insertError.message);
      errors++;
    } else {
      imported += toInsert.length;
    }

    console.log(
      `   Progress: ${Math.min(i + BATCH_SIZE, menuItems.length)}/${menuItems.length} ` +
        `(imported: ${imported}, skipped: ${skipped})`
    );
  }

  console.log('\n' + '='.repeat(40));
  console.log('IMPORT SUMMARY');
  console.log('='.repeat(40));
  console.log(`   Total items in CSV:  ${parsed.length}`);
  console.log(`   Imported:            ${imported}`);
  console.log(`   Skipped (existing):  ${skipped}`);
  console.log(`   Errors:              ${errors}`);

  if (errors > 0) {
    console.log('\nImport completed with errors.');
    process.exit(1);
  }

  const { count: finalCount } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true });

  console.log(`\nFinal menu_items count: ${finalCount || 0}`);
  console.log('\nIMPORT COMPLETE');
  console.log('\nNext steps:');
  console.log('   1. Generate/upload images for menu items');
  console.log('   2. Create admin account via SQL:');
  console.log("      UPDATE public.profiles SET role='Admin', active=true");
  console.log("      WHERE email='your-admin@example.com';");
  console.log('   3. Start the app: cd solid-app && npm run dev');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
