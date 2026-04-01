const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function readMigration(fileName) {
  return fs.readFileSync(path.join(migrationsDir, fileName), 'utf8');
}

test('profile fields migration adds username, full_name, avatar_url', () => {
  const sql = readMigration('20260328120000_add_profile_fields.sql');

  assert.match(sql, /add column if not exists username/i);
  assert.match(sql, /add column if not exists full_name/i);
  assert.match(sql, /add column if not exists avatar_url/i);
});

test('avatars bucket migration creates bucket and policies', () => {
  const sql = readMigration('20260328233155_create_avatars_bucket.sql');

  assert.match(sql, /insert into storage\.buckets/i);
  assert.match(sql, /create policy "Avatar images are publicly readable"/i);
  assert.match(sql, /create policy "Users can upload their avatar"/i);
  assert.match(sql, /create policy "Users can update their avatar"/i);
});

test('profiles + posts migration includes profile trigger', () => {
  const sql = readMigration('20260314212633_profiles_posts_rls.sql');

  assert.match(sql, /create table if not exists public\.profiles/i);
  assert.match(sql, /create table if not exists public\.posts/i);
  assert.match(sql, /create trigger on_auth_user_created/i);
  assert.match(sql, /handle_new_user/i);
});

async function run() {
  let failures = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`PASS ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`PASS ${tests.length} tests`);
}

run();
