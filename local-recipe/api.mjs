import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveDiagnosticPath } from "../src/lib/diagnosticContext.ts";
import { fingerprintDiagnosticGraph } from "../server/src/diagnostic-fingerprint.ts";
import { localNotice, LOCAL_NOTICE_ROOT, LOCAL_NOTICE_SOURCES } from "./notices.mjs";
import { checkPrivatePin } from "./private-clients.mjs";

// This module is loaded only by the explicit local launcher. It is never
// registered with the Fastify/PostgreSQL backend or a normal Vite build.
const alpha = "a1000000-0000-4000-8000-000000000001";
const beta = "a1000000-0000-4000-8000-000000000002";
const demoDevices = [
  { id: "e1000000-0000-4000-8000-000000000001", organizationId: alpha,
    model: "IC 22", serial: "DEMO-SN-A-001" },
  { id: "e1000000-0000-4000-8000-000000000002", organizationId: alpha,
    model: "DUSTOMAT 4-24", serial: "DEMO-SN-A-002" },
  { id: "e1000000-0000-4000-8000-000000000003", organizationId: beta,
    model: "IC 22", serial: "DEMO-SN-B-001" }
];
const demoAccounts = new Map([
  ["DEMO-CLIENT-A", { pin: "1234", role: "client", organizationId: alpha, organizationName: "CLIENT DEMO ALPHA" }],
  ["DEMO-CLIENT-B", { pin: "1234", role: "client", organizationId: beta, organizationName: "CLIENT DEMO BETA" }],
  ["DEMO-STAFF", { pin: "1789", role: "global_admin" }],
  ["DEMO-SAV-MANAGER", { pin: "1789", role: "sav_manager" }],
  ["DEMO-SAV-TECH", { pin: "1789", role: "sav_technician" }]
]);
const staffRoles = new Set(["global_admin", "sav_manager", "sav_technician"]);
const managementRoles = new Set(["global_admin", "sav_manager"]);
const cookieName = "obera_local_recipe_session";
const empty = () => ({ requests: [], audit: [] });

function send(res, status, data, headers = {}) {
  res.writeHead(status, { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff", ...headers });
  res.end(JSON.stringify(data));
}
async function body(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 20000) throw new Error("too_large");
  }
  return JSON.parse(raw || "{}");
}
const publicRequest = item => ({ id: item.id, request_type: item.request_type,
  device_id: item.device_id, device_ids: item.device_ids, subject: item.subject,
  message: item.message, public_status: item.public_status, created_at: item.created_at });
const internalRequest = (item, devices) => {
  const device = devices.find(entry => entry.id === item.device_id);
  return { ...publicRequest(item), kind: "client", organization_name: item.organization_name,
    author_identifier: item.author_identifier, device_model: device?.model ?? null,
    device_serial: device?.serial ?? null,
    maintenance_devices: item.device_ids.map(id => devices.find(entry => entry.id === id))
      .filter(Boolean).map(({ model, serial }) => ({ model, serial })),
    linked_sav_case_id: null, linked_sav_reference: null, diagnostic_context: item.diagnostic_context };
};

export function createLocalRecipeApi(dataFile, { noticeRoot = LOCAL_NOTICE_ROOT,
  noticeSources = LOCAL_NOTICE_SOURCES, privateClients = [] } = {}) {
  const sessions = new Map();
  const accounts = new Map(demoAccounts);
  const devices = [...demoDevices];
  for (const client of privateClients) {
    if (accounts.has(client.identifier)) throw new Error("Identifiant de recette déjà utilisé");
    accounts.set(client.identifier, { ...client, role: "client" });
    devices.push(...client.devices);
  }
  const publicDevice = async item => ({ id: item.id, model: item.model, serial: item.serial,
    notice_available: Boolean(await localNotice(noticeRoot, item.model, noticeSources)) });
  let pending = Promise.resolve();
  async function load() {
    try { return JSON.parse(await readFile(dataFile, "utf8")); }
    catch (error) { if (error.code === "ENOENT") return empty(); throw error; }
  }
  async function mutate(action) {
    const result = pending.then(async () => {
      const state = await load();
      const outcome = await action(state);
      if (outcome.changed) {
        await mkdir(dirname(dataFile), { recursive: true });
        const tmp = `${dataFile}.${randomUUID()}.tmp`;
        await writeFile(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
        await rename(tmp, dataFile);
      }
      return outcome;
    });
    pending = result.then(() => {}, () => {});
    return result;
  }
  async function snapshot() { await pending; return load(); }

  return async function localRecipeApi(req, res, next) {
    if (!req.url?.startsWith("/api/")) return next();
    try {
      // The launcher binds only to 127.0.0.1; reject non-loopback requests too.
      if (!(["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)))
        return send(res, 403, { error: "local_only" });
      const path = new URL(req.url, "http://127.0.0.1").pathname;
      const method = req.method;
      if (method === "POST" && req.headers.origin !== `http://${req.headers.host}`)
        return send(res, 403, { error: "origin_denied" });
      const token = (req.headers.cookie ?? "").split(";").map(part => part.trim())
        .find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
      const session = token && sessions.get(token);
      const principal = session && session.expires > Date.now() ? session.account : null;

      if (method === "GET" && path === "/api/local-recipe/info")
        return send(res, 200, { private_data_loaded: privateClients.length > 0 });

      if (method === "POST" && ["/api/client/login", "/api/login"].includes(path)) {
        const input = await body(req);
        const account = accounts.get(input.identifier);
        if (!account || (account.pinHash ? !checkPrivatePin(account, input.pin) : account.pin !== input.pin) ||
            (path === "/api/client/login" ? account.role !== "client" : !staffRoles.has(account.role)))
          return send(res, 401, { error: "invalid_credentials" });
        if (token) sessions.delete(token);
        const fresh = randomBytes(32).toString("hex");
        sessions.set(fresh, { account: { ...account, identifier: input.identifier }, expires: Date.now() + 8 * 60 * 60 * 1000 });
        return send(res, 200, { ok: true }, { "Set-Cookie": `${cookieName}=${fresh}; HttpOnly; SameSite=Lax; Path=/` });
      }
      if (method === "POST" && path === "/api/logout") {
        if (token) sessions.delete(token);
        return send(res, 200, { ok: true }, { "Set-Cookie": `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0` });
      }
      if (method === "POST" && path === "/api/local-recipe/reset") {
        await mutate(state => { Object.assign(state, empty()); return { changed: true }; });
        sessions.clear();
        return send(res, 200, { ok: true }, { "Set-Cookie": `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0` });
      }
      if (method === "GET" && path === "/api/session")
        return principal ? send(res, 200, { role: principal.role,
          organizationIds: principal.organizationId ? [principal.organizationId] : [] }) :
          send(res, 401, { error: "authentication_required" });
      if (!principal) return send(res, 401, { error: "authentication_required" });

      if (path.startsWith("/api/client/")) {
        if (principal.role !== "client") return send(res, 403, { error: "access_denied" });
        const own = devices.filter(item => item.organizationId === principal.organizationId);
        const device = path.match(/^\/api\/client\/devices\/([^/]+)(\/notice)?$/);
        const request = path.match(/^\/api\/client\/requests\/([^/]+)$/);
        if (method === "GET" && path === "/api/client/me")
          return send(res, 200, { organization: { name: principal.organizationName }, role: "client" });
        if (method === "GET" && path === "/api/client/devices")
          return send(res, 200, { devices: await Promise.all(own.map(publicDevice)) });
        if (method === "GET" && device) {
          const found = own.find(item => item.id === device[1]);
          if (!found) return send(res, 404, { error: "not_found" });
          if (device[2]) {
            const pdf = await localNotice(noticeRoot, found.model, noticeSources);
            if (!pdf) return send(res, 404, { error: "not_found" });
            const filename = `notice-${found.model.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
            res.writeHead(200, { "Content-Type": "application/pdf", "Cache-Control": "no-store",
              "Content-Disposition": `attachment; filename="${filename}"`,
              "X-Content-Type-Options": "nosniff" });
            return res.end(pdf);
          }
          return send(res, 200, await publicDevice(found));
        }
        if (method === "GET" && path === "/api/client/documents") return send(res, 200, { documents: [] });
        if (method === "GET" && path === "/api/client/requests") {
          const state = await snapshot();
          return send(res, 200, { requests: state.requests.filter(item => item.organization_id === principal.organizationId)
            .slice(-100).reverse().map(publicRequest) });
        }
        if (method === "GET" && request) {
          const item = (await snapshot()).requests.find(entry => entry.id === request[1] &&
            entry.organization_id === principal.organizationId);
          return item ? send(res, 200, publicRequest(item)) : send(res, 404, { error: "not_found" });
        }
        if (method === "POST" && path === "/api/client/requests") {
          const input = await body(req);
          if (!input || typeof input.submissionKey !== "string" || !/^[a-f\d-]{36}$/i.test(input.submissionKey) ||
              !["sav", "consumables", "maintenance_quote"].includes(input.requestType) ||
              typeof input.subject !== "string" || !input.subject.trim() || input.subject.length > 200 ||
              typeof input.message !== "string" || !input.message.trim() || input.message.length > 5000 ||
              (input.requestType === "sav" && !input.deviceId) ||
              (input.requestType === "maintenance_quote" && input.deviceId) ||
              (input.requestType !== "maintenance_quote" && input.deviceIds !== undefined) ||
              (input.diagnosticContext && input.requestType !== "sav"))
            return send(res, 400, { error: "invalid_request" });
          const selected = input.deviceId ? own.find(item => item.id === input.deviceId) : null;
          if (input.deviceId && !selected) return send(res, 404, { error: "not_found" });
          const ids = input.deviceIds ?? [];
          if (!Array.isArray(ids) || ids.length > 100 || new Set(ids).size !== ids.length ||
              ids.some(id => !own.some(item => item.id === id))) return send(res, 404, { error: "not_found" });
          let diagnostic = null;
          if (input.diagnosticContext) {
            const pathSummary = selected && resolveDiagnosticPath(input.diagnosticContext, selected.model);
            if (!pathSummary || JSON.stringify(input.diagnosticContext).length > 12000)
              return send(res, 400, { error: "invalid_diagnostic_context" });
            diagnostic = { version: 1, graphFingerprintVersion: 2,
              graphFingerprint: fingerprintDiagnosticGraph(), productId: input.diagnosticContext.productId,
              device: { id: selected.id, model: selected.model, serial: selected.serial },
              symptom: pathSummary.symptom, steps: pathSummary.steps, result: "unresolved", comment: input.message };
          }
          const requestHash = createHash("sha256").update(JSON.stringify([input.requestType, input.deviceId ?? null,
            [...ids].sort(), input.subject, input.message, input.diagnosticContext ?? null])).digest("hex");
          const outcome = await mutate(state => {
            const previous = state.requests.find(item => item.organization_id === principal.organizationId &&
              item.author_identifier === principal.identifier && item.submission_key === input.submissionKey);
            if (previous) return { changed: false, item: previous, conflict: previous.request_hash !== requestHash };
            const item = { id: randomUUID(), kind: "client", organization_id: principal.organizationId,
              organization_name: principal.organizationName, author_identifier: principal.identifier,
              submission_key: input.submissionKey, request_hash: requestHash,
              request_type: input.requestType, device_id: input.deviceId ?? null,
              device_ids: [...ids], subject: input.subject, message: input.message, public_status: "received",
              created_at: new Date().toISOString(), diagnostic_context: diagnostic };
            state.requests.push(item);
            return { changed: true, item };
          });
          return outcome.conflict ? send(res, 409, { error: "submission_key_conflict" }) :
            send(res, outcome.changed ? 201 : 200, publicRequest(outcome.item));
        }
        return send(res, 404, { error: "not_found" });
      }

      if (path.startsWith("/api/portal/requests")) {
        if (!staffRoles.has(principal.role)) return send(res, 403, { error: "access_denied" });
        const request = path.match(/^\/api\/portal\/requests\/([^/]+)(?:\/(status|sav-case|compatible-cases))?$/);
        if (method === "GET" && path === "/api/portal/requests") {
          const filter = new URL(req.url, "http://127.0.0.1").searchParams.get("requestType");
          const all = (await snapshot()).requests.filter(item => !filter || filter === item.request_type).reverse();
          return send(res, 200, { requests: all.slice(0, 100).map(item => internalRequest(item, devices)), has_more: all.length > 100,
            can_manage: managementRoles.has(principal.role) });
        }
        if (request) {
          const item = (await snapshot()).requests.find(entry => entry.id === request[1]);
          if (!item) return send(res, 404, { error: "not_found" });
          if (method === "GET" && !request[2]) return send(res, 200, internalRequest(item, devices));
          if (method === "GET" && request[2] === "compatible-cases") return send(res, 200, { cases: [] });
          if (method === "POST" && request[2] === "sav-case")
            return managementRoles.has(principal.role) ? send(res, 404, { error: "no_demo_sav_case" }) :
              send(res, 403, { error: "access_denied" });
          if (method === "POST" && request[2] === "status") {
            if (!managementRoles.has(principal.role)) return send(res, 403, { error: "access_denied" });
            const input = await body(req);
            const outcome = await mutate(state => {
              const current = state.requests.find(entry => entry.id === request[1]);
              if (!current) return { changed: false, status: 404 };
              if (!((current.public_status === "received" && input.status === "in_progress") ||
                  (current.public_status === "in_progress" && input.status === "closed")))
                return { changed: false, status: 409 };
              const previous = current.public_status;
              current.public_status = input.status;
              state.audit.push({ request_id: current.id, actor: principal.identifier,
                action: `status:${previous}:${input.status}`, at: new Date().toISOString() });
              return { changed: true, item: current };
            });
            return outcome.status ? send(res, outcome.status, { error: "invalid_status_transition" }) :
              send(res, 200, { id: outcome.item.id, public_status: outcome.item.public_status });
          }
        }
      }
      // Do not emulate PostgreSQL SAV case persistence or privileged services.
      return send(res, 404, { error: "not_available_in_local_recipe" });
    } catch (error) {
      if (error instanceof SyntaxError || error.message === "too_large")
        return send(res, 400, { error: "invalid_json" });
      console.error("[recette locale]", error);
      return send(res, 500, { error: "local_recipe_error" });
    }
  };
}
