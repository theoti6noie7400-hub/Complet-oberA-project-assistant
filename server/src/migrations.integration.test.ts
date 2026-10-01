import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import pg from "pg";
import { applyMigrations, migrationFiles } from "./migrations.ts";

const integration = process.env.EXTERNAL_TEST_DATABASE_URL ? test : test.skip;
const tables = ["organizations", "users", "user_organizations", "sessions", "devices",
  "sav_cases", "contracts", "contract_devices", "portal_requests", "documents", "audit_events"] as const;

async function withDisposableDatabase(run: (pool: pg.Pool) => Promise<void>) {
  const url = new URL(process.env.EXTERNAL_TEST_DATABASE_URL!);
  assert.equal(url.pathname, "/obera_beta_demo");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Only a local temporary PostgreSQL service is allowed");
  const name = `obera_lot5_${randomUUID().replaceAll("-", "")}`;
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = new pg.Pool({ connectionString: adminUrl.toString() });
  let pool: pg.Pool | undefined;
  try {
    await admin.query(`CREATE DATABASE ${name}`);
    url.pathname = `/${name}`;
    pool = new pg.Pool({ connectionString: url.toString() });
    await run(pool);
  } finally {
    await pool?.end();
    try {
      // Do not kill a connection that pg.Pool is still closing: FORCE can emit
      // an asynchronous client error after the assertions have all passed.
      let remaining = 0;
      for (let attempt = 0; attempt < 30; attempt++) {
        remaining = (await admin.query(`SELECT count(*)::int AS n FROM pg_stat_activity
          WHERE datname = $1`, [name])).rows[0].n as number;
        if (remaining === 0) break;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      assert.equal(remaining, 0, `Connections remain open to disposable database ${name}`);
      await admin.query(`DROP DATABASE IF EXISTS ${name}`);
    }
    finally { await admin.end(); }
  }
}

async function migrate(pool: pg.Pool, through?: string) {
  const client = await pool.connect();
  try { return await applyMigrations(client, through); }
  finally { client.release(); }
}

async function checksums(pool: pg.Pool, expected: string[]) {
  const result = await pool.query("SELECT name, checksum, applied_at FROM schema_migrations ORDER BY name");
  assert.deepEqual(result.rows.map(row => row.name), expected);
  for (const row of result.rows) {
    const content = await readFile(new URL(`../migrations/${row.name}`, import.meta.url));
    assert.equal(row.checksum, createHash("sha256").update(content).digest("hex"), row.name);
  }
  return result.rows;
}

async function snapshot(pool: pg.Pool) {
  const rows: Record<string, unknown[]> = {};
  for (const table of tables) {
    // Strip only the new nullable column; all published pre-006 values must match.
    const result = await pool.query(`SELECT to_jsonb(t) - 'diagnostic_context' AS row
      FROM ${table} t ORDER BY (to_jsonb(t) - 'diagnostic_context')::text`);
    rows[table] = result.rows.map(item => item.row);
  }
  return rows;
}

integration("PostgreSQL: empty 001–008, checksums and idempotent second run", async () => {
  await withDisposableDatabase(async pool => {
    const files = await migrationFiles();
    assert.equal(files.length, 8);
    assert.deepEqual(files.map(name => name.slice(0, 3)), ["001", "002", "003", "004", "005", "006", "007", "008"]);
    assert.deepEqual(await migrate(pool), files);
    const first = await checksums(pool, files);
    assert.deepEqual(await migrate(pool), []);
    assert.deepEqual(await checksums(pool, files), first);
    console.log(`EMPTY MIGRATIONS ${files.join(", ")}; second run applied 0`);
  });
});

integration("PostgreSQL: populated 001–005 retains history through 006–008", async () => {
  await withDisposableDatabase(async pool => {
    const files = await migrationFiles();
    assert.deepEqual(await migrate(pool, files[4]), files.slice(0, 5));
    const ids = {
      clientA: randomUUID(), clientB: randomUUID(), reseller: randomUUID(), resellerB: randomUUID(),
      manager: randomUUID(), clientUser: randomUUID(), clientBUser: randomUUID(),
      resellerUser: randomUUID(), resellerBUser: randomUUID(),
      deviceA: randomUUID(), deviceA2: randomUUID(), deviceB: randomUUID(),
      savRequest: randomUUID(), consumables: randomUUID(),
      resellerRequest: randomUUID(), resellerBRequest: randomUUID(),
      caseId: randomUUID(), contractId: randomUUID()
    };
    for (const [id, kind, name] of [[ids.clientA, "client", "CLIENT DEMO ALPHA"],
      [ids.clientB, "client", "CLIENT DEMO BETA"], [ids.reseller, "reseller", "REVENDEUR DEMO ALPHA"],
      [ids.resellerB, "reseller", "REVENDEUR DEMO BETA"]])
      await pool.query("INSERT INTO organizations(id,kind,name) VALUES ($1,$2,$3)", [id, kind, name]);
    for (const [id, role] of [[ids.manager, "sav_manager"], [ids.clientUser, "client"],
      [ids.clientBUser, "client"], [ids.resellerUser, "reseller"], [ids.resellerBUser, "reseller"]])
      await pool.query(`INSERT INTO users(id,identity_issuer,identity_subject,role)
        VALUES ($1,'urn:obera:demo',$2,$3)`, [id, `DEMO-${id}`, role]);
    for (const [user, org] of [[ids.clientUser, ids.clientA], [ids.clientBUser, ids.clientB],
      [ids.resellerUser, ids.reseller], [ids.resellerBUser, ids.resellerB]])
      await pool.query("INSERT INTO user_organizations(user_id,organization_id) VALUES ($1,$2)", [user, org]);
    await pool.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ('DEMO-TOKEN-HASH',$1,now() + interval '1 hour')", [ids.manager]);
    for (const [id, org, serial] of [[ids.deviceA, ids.clientA, "DEMO-SN-A-1"],
      [ids.deviceA2, ids.clientA, "DEMO-SN-A-2"], [ids.deviceB, ids.clientB, "DEMO-SN-B-1"]])
      await pool.query("INSERT INTO devices(id,client_organization_id,model,serial) VALUES ($1,$2,'IC 12',$3)", [id, org, serial]);
    await pool.query(`INSERT INTO sav_cases(id,display_reference,client_organization_id,device_id,
      sav_reference,model,site,problem,cause,sav_action,sav_type,created_by)
      VALUES ($1,'DEMO-SAV-OLD',$2,$3,'DEMO-SAV-OLD','IC 12','DEMO SITE',
      'DEMO PROBLEM','DEMO CAUSE','DEMO ACTION','technique',$4)`,
    [ids.caseId, ids.clientA, ids.deviceA, ids.manager]);
    await pool.query(`INSERT INTO contracts(id,client_organization_id,reference,site_address,
      site_city,site_country,frequency_months,start_date,end_date)
      VALUES ($1,$2,'DEMO-CTR-OLD','DEMO ADDRESS','DEMO CITY','DEMO COUNTRY',12,'2026-01-01','2027-01-01')`,
    [ids.contractId, ids.clientA]);
    await pool.query("INSERT INTO contract_devices(contract_id,model,quantity) VALUES ($1,'IC 12',2)", [ids.contractId]);
    for (const [id, kind, org, author, type, device] of [
      [ids.savRequest, "client", ids.clientA, ids.clientUser, "sav", ids.deviceA],
      [ids.consumables, "client", ids.clientB, ids.clientBUser, "consumables", null],
      [ids.resellerRequest, "reseller", ids.reseller, ids.resellerUser, "general", null],
      [ids.resellerBRequest, "reseller", ids.resellerB, ids.resellerBUser, "consumables", null]
    ]) await pool.query(`INSERT INTO portal_requests(id,kind,organization_id,created_by,
      request_type,device_id,subject,message) VALUES ($1,$2,$3,$4,$5,$6,'DEMO OLD','DEMO TEXT')`,
    [id, kind, org, author, type, device]);
    for (const [org, audience, key] of [[ids.clientA, "client", "DEMO-CLIENT-DOCUMENT"],
      [ids.reseller, "reseller", "DEMO-ARCHIVED-DOCUMENT-A"],
      [ids.resellerB, "reseller", "DEMO-ARCHIVED-DOCUMENT-B"]])
      await pool.query("INSERT INTO documents(id,organization_id,audience,storage_key,title) VALUES ($1,$2,$3,$4,'DEMO DOC')",
      [randomUUID(), org, audience, key]);
    await pool.query(`INSERT INTO audit_events(actor_user_id,action,resource_kind,resource_id)
      VALUES ($1,'create','portal_request',$2)`, [ids.clientUser, ids.savRequest]);

    const before = await snapshot(pool);
    const firstChecksums = await checksums(pool, files.slice(0, 5));
    assert.deepEqual(await migrate(pool), files.slice(5));
    const after = await snapshot(pool);
    assert.deepEqual(after, before, "All historical rows and values survive both migrations");
    assert.deepEqual((await checksums(pool, files)).slice(0, 5), firstChecksums);
    for (const id of [ids.savRequest, ids.consumables, ids.resellerRequest, ids.resellerBRequest]) {
      const row = await pool.query("SELECT diagnostic_context FROM portal_requests WHERE id=$1", [id]);
      assert.equal(row.rows.length, 1);
      assert.equal(row.rows[0].diagnostic_context, null);
    }
    assert.equal((await pool.query("SELECT kind FROM portal_requests WHERE id=$1", [ids.resellerRequest])).rows[0].kind, "reseller");
    assert.equal((await pool.query("SELECT kind FROM portal_requests WHERE id=$1", [ids.resellerBRequest])).rows[0].kind, "reseller");
    console.log("POPULATED COUNTS BEFORE/AFTER", JSON.stringify(Object.fromEntries(
      tables.map(table => [table, [before[table].length, after[table].length]]))));

    for (const deviceIds of [[], [ids.deviceA], [ids.deviceA, ids.deviceA2]]) {
      const request = randomUUID();
      await pool.query(`INSERT INTO portal_requests(id,kind,organization_id,created_by,request_type,subject,message)
        VALUES ($1,'client',$2,$3,'maintenance_quote','DEMO QUOTE','DEMO INFORMATION')`,
      [request, ids.clientA, ids.clientUser]);
      for (const device of deviceIds)
        await pool.query("INSERT INTO portal_request_devices(request_id,organization_id,device_id) VALUES ($1,$2,$3)",
        [request, ids.clientA, device]);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM portal_request_devices WHERE request_id=$1", [request])).rows[0].n,
        deviceIds.length);
      await assert.rejects(pool.query("INSERT INTO portal_request_devices(request_id,organization_id,device_id) VALUES ($1,$2,$3)",
        [request, ids.clientA, ids.deviceB]), { code: "23503" });
      await assert.rejects(pool.query("UPDATE portal_requests SET diagnostic_context='{}'::jsonb WHERE id=$1", [request]),
        { code: "23514" });
    }
    for (const id of [ids.consumables, ids.resellerRequest, ids.resellerBRequest])
      await assert.rejects(pool.query("UPDATE portal_requests SET diagnostic_context='{}'::jsonb WHERE id=$1", [id]),
        { code: "23514" });
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM sav_cases")).rows[0].n, before.sav_cases.length);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM contracts")).rows[0].n, before.contracts.length);
    assert.deepEqual(await migrate(pool), []);
    await checksums(pool, files);
  });
});
