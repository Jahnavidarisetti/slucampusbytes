const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseDefaultUserId = process.env.SUPABASE_DEFAULT_USER_ID || null;
const supabaseDefaultUserEmail =
  process.env.SUPABASE_DEFAULT_USER_EMAIL || "anonymous@localhost";
const supabaseDefaultUserPassword =
  process.env.SUPABASE_DEFAULT_USER_PASSWORD || "TempPass123!";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env"
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

let defaultUserId = supabaseDefaultUserId;

async function ensureDefaultUserId() {
  if (defaultUserId) return defaultUserId;

  const email = supabaseDefaultUserEmail;
  const password = supabaseDefaultUserPassword;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
      query: email,
    });

    if (listError) {
      throw listError;
    }

    const existingUser = listData?.users?.[0];

    if (!existingUser) {
      throw error;
    }

    defaultUserId = existingUser.id;
    return defaultUserId;
  }

  defaultUserId = data?.user?.id;

  if (!defaultUserId) {
    throw new Error("Unable to resolve default Supabase user ID.");
  }

  return defaultUserId;
}

module.exports = { supabase, ensureDefaultUserId };
