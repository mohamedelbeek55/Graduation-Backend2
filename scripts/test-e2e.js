// Simple E2E test against production backend
const BASE = "https://graduation-backend2.vercel.app/api";

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {})
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

async function run() {
  const unique = Date.now();
  const testEmail = `lexa.test.user+${unique}@example.com`;
  const testPassword = "Admin12345";

  console.log("== Health ==");
  console.log(await jsonFetch(`${BASE}/health`));

  console.log("== Register ==");
  const reg = await jsonFetch(`${BASE}/auth/register`, {
    method: "POST",
    body: { fullName: "Test User", email: testEmail, password: testPassword }
  });
  console.log(reg);

  console.log("== Login ==");
  const login = await jsonFetch(`${BASE}/auth/login`, {
    method: "POST",
    body: { email: testEmail, password: testPassword }
  });
  console.log(login);

  const accessToken = login?.data?.accessToken;
  if (!accessToken) {
    console.log("No accessToken, aborting me check");
    return;
  }

  console.log("== Me ==");
  const meRes = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  console.log({
    ok: meRes.ok,
    status: meRes.status,
    data: await meRes.json().catch(() => ({}))
  });

  console.log("== Templates Complaints ==");
  console.log(
    await jsonFetch(`${BASE}/templates/complaints?page=1&limit=1&q=`)
  );
}

run().catch((e) => {
  console.error("E2E error:", e);
  process.exit(1);
});
