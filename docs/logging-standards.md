# BlueMetal Pro Backend — Logging Standards

## Table of Contents

1. [Logger Setup and Imports](#1-logger-setup-and-imports)
2. [Error Logging Pattern](#2-error-logging-pattern)
3. [Mutation Audit Trail Pattern](#3-mutation-audit-trail-pattern)
4. [Request Context](#4-request-context)
5. [Log Levels Guide](#5-log-levels-guide)
6. [Anti-Patterns — What NOT To Do](#6-anti-patterns--what-not-to-do)
7. [Copy-Paste Code Examples](#7-copy-paste-code-examples)
8. [logAction Event Name Conventions](#8-logaction-event-name-conventions)

---

## 1. Logger Setup and Imports

The logger lives at `backend/src/utils/logger.ts`. It exports two things:

- `logger` — the pino instance, used for all structured log output.
- `logAction(event, detail, level?)` — thin wrapper for mutation audit trail entries. Defaults to `'info'` level.

Always import both from the shared module. Never instantiate a new pino logger inline.

```typescript
import { logger, logAction } from '../utils/logger';
```

Do not import pino directly in route or service files.

---

## 2. Error Logging Pattern

Every `catch` block must pass a context object as the **first argument** and a plain-English description string as the **second argument**. This is how pino serialises the error correctly (via its built-in `err` serializer) while keeping the message human-readable in log viewers.

```
logger.error({ err, ...contextFields }, 'Human-readable description of what failed')
```

Rules:
- Always pass the raw caught value as `err` inside the context object. Do not pass it as the message.
- Always include the identity of the actor (`email` or `userId`) and the entity being acted on (`crusher_id`, entity id).
- The message string must describe the operation that failed, not just say `'error'` or repeat the route name.

---

## 3. Mutation Audit Trail Pattern

Any operation that creates, updates, or deletes a persistent record must call `logAction` after the DB write succeeds. Call it after the awaited DB call returns, not before.

```
logAction(event, detail, level?)
```

- `event` — dot-separated string in `entity.action` format (see Section 8).
- `detail` — object containing all fields needed to reconstruct what changed: actor identity, entity id, and the new field values (for updates, include the changed fields).
- `level` — optional, defaults to `'info'`. Use `'warn'` for reversals or access revocations.

Do not call `logAction` for read-only operations. Those belong in `logger.debug` or `logger.info`.

---

## 4. Request Context

Every log line that is associated with an HTTP request must include the following fields wherever they are available. Never omit them in error logs.

| Field | Source | Notes |
|---|---|---|
| `crusher_id` | `req.user!.crusher_id` or `req.body.crusher_id` | Always include when the operation is scoped to a crusher |
| `userId` | `req.user!.id` | The authenticated user's database id |
| `email` | `req.user!.email` | The authenticated user's email |
| `entity id` | route param or body field | e.g. `cameraId`, `saleId`, `crusherId` |

For unauthenticated routes (e.g. `POST /login`, `POST /logout`), include whatever is available from the request body: `email`, `ip` (`req.ip`).

---

## 5. Log Levels Guide

| Level | When to use |
|---|---|
| `debug` | Entry points for complex multi-step handlers; internal state useful for diagnosing latency or partial failures in development. Not emitted in production by default. |
| `info` | Successful completion of a meaningful operation. Used inside `logAction` for creates, updates, and deletes. Also used for operational milestones like server start, DB connection established. |
| `warn` | Expected but notable failure states: permission denied, resource not found, external service degraded (e.g. MediaMTX offline), revocation of access. Also use for background job failures that are recoverable. |
| `error` | Unexpected failures that return a 4xx/5xx to the client, or internal errors that indicate a bug or infrastructure problem. Always include the caught error object as `err` in the context. |

Do not use `logger.fatal` in route handlers. Reserve it for process-level startup failures.

---

## 6. Anti-Patterns — What NOT To Do

These anti-patterns were identified across 74 critical-severity and 22 high-severity issues in a codebase audit. All have been fixed, but the patterns must not be reintroduced.

### 6.1 Missing try/catch around async DB calls

Every `await query(...)` or `await queryOne(...)` must be inside a try/catch. An unhandled rejection in an Express async handler does not automatically return a 500 — it either hangs the client or crashes the process.

**Wrong:**
```typescript
const rows = await query('SELECT * FROM cameras WHERE crusher_id = $1', [cid]);
res.json(rows);
```

**Right:**
```typescript
try {
  const rows = await query('SELECT * FROM cameras WHERE crusher_id = $1', [cid]);
  res.json(rows);
} catch (err) {
  logger.error({ err, crusher_id: cid }, 'Failed to list cameras');
  res.status(500).json({ error: 'Failed to list cameras' });
}
```

Affected routes in the audit included: all routes in `cameras.ts`, `config.ts`, `crushers.ts`, `auth.ts` `POST /logout`.

### 6.2 Error logged without context

`logger.error(err, 'message')` is incorrect. Passing the error as the first argument makes pino treat it as a merge object, but the `err` serializer only fires when the key is named `err`. More importantly it loses all request context.

**Wrong:**
```typescript
logger.error(err, 'Login error');
```

**Right:**
```typescript
logger.error({ err, email: req.body.email, ip: req.ip }, 'Login error');
```

### 6.3 logAction fired before the operation completes

If `logAction` is called before the awaited DB write and subsequent steps succeed, the audit trail records a success that may never have happened.

**Wrong:**
```typescript
logAction('camera.created', { by: req.user!.email });
const cam = await queryOne(INSERT_CAMERA, [...]);
```

**Right:**
```typescript
const cam = await queryOne(INSERT_CAMERA, [...]);
logAction('camera.created', { cameraId: cam.id, by: req.user!.email });
```

### 6.4 logAction detail missing entity id or changed fields

An audit entry for an update that lists only the actor's email but none of the changed field values is not useful for compliance or debugging.

**Wrong:**
```typescript
logAction('camera.updated', { by: req.user!.email });
```

**Right:**
```typescript
logAction('camera.updated', { cameraId: req.params.id, by: req.user!.email, name, rtsp_url, is_active });
```

### 6.5 logAction detail missing crusher_id when entity is crusher-scoped

If crusher names are not globally unique across tenants, an audit entry that references only the name is ambiguous.

**Wrong:**
```typescript
logAction('crusher.selected', { name: access.name, role: access.role });
```

**Right:**
```typescript
logAction('crusher.selected', { crusher_id: access.id, name: access.name, role: access.role });
```

### 6.6 Silent catch blocks

`catch (_) {}` swallows errors entirely. Use at minimum `logger.warn`.

**Wrong:**
```typescript
} catch (_) {}
```

**Right:**
```typescript
} catch (err) {
  logger.warn({ err }, 'session cleanup failed');
}
```

### 6.7 Silent 500 responses with no log

Returning `res.status(500)` without a preceding `logger.error` call means the error is invisible in logs.

**Wrong:**
```typescript
if (!resolved_tenant_id) {
  return res.status(500).json({ error: 'Could not resolve tenant' });
}
```

**Right:**
```typescript
if (!resolved_tenant_id) {
  logger.error({ userId: req.user?.id, crusher_id }, 'Unable to resolve tenant_id for crusher');
  return res.status(500).json({ error: 'Could not resolve tenant' });
}
```

### 6.8 No entry-point log for complex multi-step handlers

Handlers that run multiple DB queries and/or external HTTP calls should emit a `logger.debug` at entry so that partial failures can be located in log timelines.

**Wrong:** — handler body starts immediately with the first `await`.

**Right:**
```typescript
logger.debug({ userId: req.user?.id, crusher_id }, 'select-crusher: start');
```

---

## 7. Copy-Paste Code Examples

### 7.1 Catch block (generic)

```typescript
} catch (err) {
  logger.error(
    { err, crusher_id: req.user!.crusher_id, userId: req.user!.id, email: req.user!.email },
    'Failed to <describe operation>'
  );
  return res.status(500).json({ error: 'Failed to <describe operation>' });
}
```

### 7.2 Create mutation

```typescript
router.post('/', async (req, res) => {
  const { name, ...fields } = req.body;
  const crusher_id = req.user!.crusher_id;

  logger.debug({ crusher_id, by: req.user!.email }, 'entity.create: start');

  try {
    const record = await queryOne(
      'INSERT INTO entities (name, crusher_id, ...) VALUES ($1, $2, ...) RETURNING *',
      [name, crusher_id, ...]
    );

    logAction('entity.created', {
      entityId: record.id,
      crusher_id,
      by: req.user!.email,
      name,
      ...fields,
    });

    return res.status(201).json(record);
  } catch (err) {
    logger.error({ err, crusher_id, by: req.user!.email, name }, 'Failed to create entity');
    return res.status(500).json({ error: 'Failed to create entity' });
  }
});
```

### 7.3 Update mutation

```typescript
router.put('/:id', async (req, res) => {
  const entityId = req.params.id;
  const crusher_id = req.user!.crusher_id;
  const { name, is_active, ...changedFields } = req.body;

  logger.debug({ crusher_id, entityId, by: req.user!.email }, 'entity.update: start');

  try {
    const record = await queryOne(
      'UPDATE entities SET name=$1, is_active=$2, ... WHERE id=$3 AND crusher_id=$4 RETURNING *',
      [name, is_active, entityId, crusher_id]
    );

    if (!record) {
      return res.status(404).json({ error: 'Not found' });
    }

    logAction('entity.updated', {
      entityId,
      crusher_id,
      by: req.user!.email,
      name,
      is_active,
      ...changedFields,
    });

    return res.json(record);
  } catch (err) {
    logger.error({ err, crusher_id, entityId, by: req.user!.email }, 'Failed to update entity');
    return res.status(500).json({ error: 'Failed to update entity' });
  }
});
```

### 7.4 Delete mutation

```typescript
router.delete('/:id', async (req, res) => {
  const entityId = req.params.id;
  const crusher_id = req.user!.crusher_id;

  logger.debug({ crusher_id, entityId, by: req.user!.email }, 'entity.delete: start');

  try {
    await query(
      'DELETE FROM entities WHERE id=$1 AND crusher_id=$2',
      [entityId, crusher_id]
    );

    logAction('entity.deleted', {
      entityId,
      crusher_id,
      by: req.user!.email,
    });

    return res.status(204).send();
  } catch (err) {
    logger.error({ err, crusher_id, entityId, by: req.user!.email }, 'Failed to delete entity');
    return res.status(500).json({ error: 'Failed to delete entity' });
  }
});
```

### 7.5 Transaction with rollback

```typescript
router.post('/complex-operation', async (req, res) => {
  const crusher_id = req.user!.crusher_id;
  const client = await pool.connect();

  logger.debug({ crusher_id, by: req.user!.email }, 'complex-operation: start');

  try {
    await client.query('BEGIN');

    const record = await client.query(
      'INSERT INTO entities (...) VALUES (...) RETURNING *',
      [...]
    );
    const entityId = record.rows[0].id;

    await client.query(
      'UPDATE related_table SET ... WHERE entity_id=$1',
      [entityId]
    );

    await client.query('COMMIT');

    logAction('entity.created', {
      entityId,
      crusher_id,
      by: req.user!.email,
    });

    return res.status(201).json(record.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, crusher_id, by: req.user!.email }, 'Failed complex-operation, transaction rolled back');
    return res.status(500).json({ error: 'Failed to complete operation' });
  } finally {
    client.release();
  }
});
```

---

## 8. logAction Event Name Conventions

Event names use the format `entity.action`. Both parts are lowercase, singular noun for entity, past-tense verb for action. Use a period (`.`) separator. No spaces, no hyphens.

### Auth / Session

| Event | When |
|---|---|
| `user.login` | Successful password authentication |
| `user.logout` | Explicit logout |
| `user.login_failed` | Failed password attempt (use `warn` level) |
| `user.password_changed` | Password change succeeded |
| `tenant.selected` | User selects a tenant in a multi-tenant session |
| `crusher.selected` | User selects an active crusher for the session |

### User Management

| Event | When |
|---|---|
| `user.created` | New user account created |
| `user.updated` | User profile or role changed |
| `user.deactivated` | User account disabled |
| `user.access_granted` | User given access to a crusher |
| `user.access_revoked` | User access to a crusher removed (use `warn` level) |

### Crusher / Config

| Event | When |
|---|---|
| `crusher.created` | New crusher registered |
| `crusher.updated` | Crusher record updated |
| `crusher_config.updated` | Crusher operational config (GST, address, etc.) saved |

### Cameras

| Event | When |
|---|---|
| `camera.created` | Camera record inserted and registered with MediaMTX |
| `camera.updated` | Camera name, URL, or active state changed |
| `camera.deleted` | Camera removed |

### Sales / Production

| Event | When |
|---|---|
| `sale.created` | Sale entry recorded |
| `sale.updated` | Sale entry modified |
| `sale.deleted` | Sale entry removed |
| `production.created` | Production entry recorded |
| `production.updated` | Production entry modified |
| `production.deleted` | Production entry removed |

### Royalty / Permits

| Event | When |
|---|---|
| `royalty_challan.created` | Challan recorded |
| `royalty_challan.updated` | Challan modified |
| `royalty_challan.deleted` | Challan removed |
| `permit.created` | Permit recorded |
| `permit.updated` | Permit modified |
| `permit.deleted` | Permit removed |

### Expenses / Payroll

| Event | When |
|---|---|
| `expense.created` | Expense entry recorded |
| `expense.updated` | Expense entry modified |
| `expense.deleted` | Expense entry removed |
| `payroll.created` | Payroll record created |
| `payroll.updated` | Payroll record modified |

When adding a new entity type, follow the same pattern. Document the new events in this table before merging.
