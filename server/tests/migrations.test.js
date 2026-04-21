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

test('organization followers migration creates mapping table with constraints and indexes', () => {
  const sql = readMigration('20260416120000_create_organization_followers.sql');

  assert.match(sql, /create table if not exists public\.organization_followers/i);
  assert.match(sql, /user_id uuid not null references public\.profiles\(id\) on delete cascade/i);
  assert.match(sql, /organization_id uuid not null/i);
  assert.match(sql, /primary key \(user_id, organization_id\)/i);
  assert.match(sql, /create index if not exists organization_followers_organization_id_idx/i);
  assert.match(sql, /create index if not exists organization_followers_user_id_idx/i);
  assert.match(sql, /enable row level security/i);
});

test('organizations migration creates parent table and remaps follower relationships', () => {
  const sql = readMigration('20260421110000_create_organizations_table.sql');

  assert.match(sql, /create table if not exists public\.organizations/i);
  assert.match(sql, /profile_id uuid not null unique references public\.profiles\(id\) on delete cascade/i);
  assert.match(sql, /username text not null unique/i);
  assert.match(sql, /name text not null/i);
  assert.match(sql, /insert into public\.organizations/i);
  assert.match(sql, /create table if not exists public\.organization_followers_v2/i);
  assert.match(sql, /references public\.organizations\(id\) on delete cascade/i);
  assert.match(sql, /join public\.organizations organizations/i);
  assert.match(sql, /rename to organization_followers/i);
  assert.match(sql, /create policy "Organizations are viewable by everyone"/i);
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
