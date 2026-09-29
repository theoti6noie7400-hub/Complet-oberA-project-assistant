import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { openDatabase } from "./db.ts";

if (process.env.EXTERNAL_DEMO_MODE !== "1" || !process.env.DATABASE_URL ||
  new URL(process.env.DATABASE_URL).pathname !== "/obera_beta_demo" ||
  !process.env.PRIVATE_DOCUMENT_ROOT)
  throw new Error("Seed requires the fictional obera_beta_demo database and private document directory");

const demoOrganizations = {
  clientA: "a1000000-0000-4000-8000-000000000001",
  clientB: "a1000000-0000-4000-8000-000000000002",
  resellerA: "b1000000-0000-4000-8000-000000000001",
  resellerB: "b1000000-0000-4000-8000-000000000002"
} as const;

const db = openDatabase();
try {
  const organizations = [
    [demoOrganizations.clientA, "client", "CLIENT DEMO ALPHA", "DEMO-CL-001"],
    [demoOrganizations.clientB, "client", "CLIENT DEMO BETA", "DEMO-CL-002"],
    [demoOrganizations.resellerA, "reseller", "REVENDEUR DEMO ALPHA", "DEMO-RV-001"],
    [demoOrganizations.resellerB, "reseller", "REVENDEUR DEMO BETA", "DEMO-RV-002"]
  ];
  for (const [id, kind, name, ref] of organizations)
    await db.query(`INSERT INTO organizations (id, kind, name, external_reference)
      VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`, [id, kind, name, ref]);

  const identities = [
    ["c1000000-0000-4000-8000-000000000001", "DEMO-CLIENT-A", "client", demoOrganizations.clientA],
    ["c1000000-0000-4000-8000-000000000002", "DEMO-CLIENT-B", "client", demoOrganizations.clientB],
    ["c1000000-0000-4000-8000-000000000003", "DEMO-CLIENT-A2", "client", demoOrganizations.clientA],
    ["d1000000-0000-4000-8000-000000000001", "DEMO-RESELLER-A", "reseller", demoOrganizations.resellerA],
    ["d1000000-0000-4000-8000-000000000002", "DEMO-RESELLER-B", "reseller", demoOrganizations.resellerB]
  ];
  for (const [id, identifier, role, org] of identities) {
    await db.query(`INSERT INTO users (id, identity_issuer, identity_subject, role)
      VALUES ($1,'urn:obera:beta:external',$2,$3) ON CONFLICT (identity_issuer, identity_subject) DO NOTHING`,
    [id, identifier, role]);
    const user = await db.query(`SELECT id FROM users WHERE identity_issuer='urn:obera:beta:external'
      AND identity_subject=$1 AND role=$2`, [identifier, role]);
    if (user.rows.length !== 1) throw new Error("Fictional account collision");
    await db.query(`INSERT INTO user_organizations (user_id, organization_id)
      VALUES ($1,$2) ON CONFLICT DO NOTHING`, [user.rows[0].id, org]);
  }
  const devices = [
    ["e1000000-0000-4000-8000-000000000001", demoOrganizations.clientA, "IC 12", "DEMO-SN-A-001"],
    ["e1000000-0000-4000-8000-000000000002", demoOrganizations.clientA, "DUSTOMAT 4-24", "DEMO-SN-A-002"],
    ["e1000000-0000-4000-8000-000000000003", demoOrganizations.clientB, "ePUR 100", "DEMO-SN-B-001"],
    ["e1000000-0000-4000-8000-000000000004", demoOrganizations.clientB, "IC 22", "DEMO-SN-B-002"]
  ];
  for (const [id, org, model, serial] of devices)
    await db.query(`INSERT INTO devices (id,client_organization_id,model,serial)
      VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`, [id, org, model, serial]);

  const requests = [
    ["f1000000-0000-4000-8000-000000000001", "client", demoOrganizations.clientA, identities[0][0], "sav", devices[0][0], "DEMO SAV ALPHA", "PROBLEME FICTIF ALPHA"],
    ["f1000000-0000-4000-8000-000000000002", "client", demoOrganizations.clientB, identities[1][0], "consumables", null, "DEMO CONSOMMABLE BETA", "FILTRE FICTIF BETA"],
    ["f1000000-0000-4000-8000-000000000003", "reseller", demoOrganizations.resellerA, identities[3][0], "general", null, "DEMO QUESTION REVENDEUR ALPHA", "QUESTION FICTIVE ALPHA"],
    ["f1000000-0000-4000-8000-000000000004", "reseller", demoOrganizations.resellerB, identities[4][0], "consumables", null, "DEMO CONSOMMABLE REVENDEUR BETA", "CARTOUCHE FICTIVE BETA"]
  ];
  for (const [id,kind,org,user,type,device,subject,message] of requests)
    await db.query(`INSERT INTO portal_requests
      (id,kind,organization_id,created_by,request_type,device_id,subject,message)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
    [id,kind,org,user,type,device,subject,message]);

  const documents = [
    ["a2000000-0000-4000-8000-000000000001", demoOrganizations.clientA, "client", "client-a/DEMO-document.txt", "DOCUMENT CLIENT DEMO ALPHA"],
    ["a2000000-0000-4000-8000-000000000002", demoOrganizations.clientB, "client", "client-b/DEMO-document.txt", "DOCUMENT CLIENT DEMO BETA"],
    ["b2000000-0000-4000-8000-000000000001", demoOrganizations.resellerA, "reseller", "reseller-a/DEMO-document.txt", "DOCUMENT REVENDEUR DEMO ALPHA"],
    ["b2000000-0000-4000-8000-000000000002", demoOrganizations.resellerB, "reseller", "reseller-b/DEMO-document.txt", "DOCUMENT REVENDEUR DEMO BETA"],
    ["a2000000-0000-4000-8000-000000000003", demoOrganizations.clientA, "internal", "internal/DEMO-private.txt", "NOTE INTERNE DEMO"]
  ];
  for (const [id,org,audience,key,title] of documents) {
    await db.query(`INSERT INTO documents (id,organization_id,audience,storage_key,title,mime_type)
      VALUES ($1,$2,$3,$4,$5,'text/plain') ON CONFLICT (id) DO NOTHING`,
    [id,org,audience,key,title]);
    const file = join(process.env.PRIVATE_DOCUMENT_ROOT, key);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, `${title}\nCONTENU 100 % FICTIF — RECETTE OBERA\n`);
  }
  process.stdout.write("External DEMO organizations, accounts, devices, requests and documents seeded\n");
} finally { await db.end(); }
