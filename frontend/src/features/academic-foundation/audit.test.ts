const assert = {
  equal: (a: unknown, b: unknown) => { if (a !== b) throw Error(`Mismatch: ${String(a)} !== ${String(b)}`); },
  deepEqual: (a: unknown, b: unknown) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw Error('Mismatch'); },
  ok: (a: unknown) => { if (!a) throw Error('Expected true'); },
  throws: (fn: () => unknown) => { let threw = false; try { fn(); } catch { threw = true; } if (!threw) throw Error('Expected rejection'); },
  rejects: async (fn: () => Promise<unknown>, check: (e: unknown) => boolean) => {
    let error: unknown;
    try { await fn(); } catch (e) { error = e; }
    if (!check(error)) throw Error('Expected denial');
  }
};

import { createAcademicClient, AcademicApiError } from './api.js';
import { auditLedgerEntry, auditLedgerPage } from './audit.js';

export const auditCases: readonly (readonly [string, () => Promise<void>])[] = [
  ['audit ledger sends query parameters and canonical cursor via uncached GET', async () => {
    let called = false;
    const client = createAcademicClient(async (url, init) => {
      called = true;
      assert.equal(url, '/academic/audit-ledger?after=5400&entity_type=enrollment');
      assert.equal(init?.method, 'GET');
      assert.equal(init?.cache, 'no-store');
      assert.equal(init?.credentials, 'same-origin');
      assert.equal(init?.body, undefined);
      return new Response(JSON.stringify({
        data: {
          items: [{
            id: '5401',
            entity_type: 'enrollment',
            event_type: 'created',
            target_id: '920',
            actor_id: '1',
            actor_name: 'Director General',
            previous_state: null,
            new_state: 'active',
            effective_on: '2026-03-01',
            operation_key: '5401',
            correlation_id: 'c0a80101000000000000000000000001',
            recorded_at: '2026-03-01 08:30:00.000000'
          }],
          next_after: null
        }
      }));
    }, () => { throw Error('Read must not request CSRF'); });

    const page = await client.auditLedger(auditLedgerPage, '5400', 'enrollment');
    assert.ok(called);
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0]!.id, '5401');
    assert.equal(page.items[0]!.actor_name, 'Director General');
    assert.equal(page.items[0]!.operation_key, '5401');
    assert.equal(page.next_after, null);
  }],

  ['audit ledger decoder rejects extra or missing fields', async () => {
    const valid = {
      id: '10',
      entity_type: 'period',
      event_type: 'activated',
      target_id: '1',
      actor_id: '2',
      actor_name: 'Subdirectora',
      previous_state: 'planned',
      new_state: 'active',
      effective_on: '2026-03-15',
      operation_key: '10',
      correlation_id: 'c0a80101000000000000000000000002',
      recorded_at: '2026-03-15 09:00:00'
    };

    const decoded = auditLedgerEntry(valid);
    assert.equal(decoded.id, '10');
    assert.equal(decoded.previous_state, 'planned');
    assert.equal(decoded.new_state, 'active');

    // Missing required field
    const missing = { ...valid } as Record<string, unknown>;
    delete missing.actor_name;
    assert.throws(() => auditLedgerEntry(missing));

    // Injected unauthorized property
    const injected = { ...valid, password_hash: 'secret' };
    assert.throws(() => auditLedgerEntry(injected));
  }],

  ['audit ledger preserves 403 forbidden denial without fabricated content', async () => {
    const client = createAcademicClient(
      async () => new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 }),
      () => ''
    );
    await assert.rejects(
      () => client.auditLedger(auditLedgerPage),
      e => e instanceof AcademicApiError && e.status === 403
    );
  }]
];
