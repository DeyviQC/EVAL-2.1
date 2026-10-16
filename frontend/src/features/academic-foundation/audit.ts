import { exact, text, decimalId, operationKey, date, ContractError } from './contracts.js';

export function auditLedgerEntry(value: unknown) {
  const row = exact(value, [
    'id', 'entity_type', 'event_type', 'target_id', 'actor_id', 'actor_name',
    'previous_state', 'new_state', 'effective_on', 'operation_key', 'correlation_id', 'recorded_at'
  ], ['metadata']);

  return {
    id: decimalId(row.id),
    entity_type: text(row.entity_type),
    event_type: text(row.event_type),
    target_id: decimalId(row.target_id),
    actor_id: decimalId(row.actor_id),
    actor_name: text(row.actor_name),
    previous_state: row.previous_state === null ? null : text(row.previous_state),
    new_state: row.new_state === null ? null : text(row.new_state),
    effective_on: date(row.effective_on),
    operation_key: operationKey(row.operation_key),
    correlation_id: text(row.correlation_id),
    recorded_at: text(row.recorded_at),
    metadata: row.metadata ?? null,
  };
}

export type AuditLedgerEntry = ReturnType<typeof auditLedgerEntry>;

export function auditLedgerPage(value: unknown) {
  const row = exact(value, ['items', 'next_after']);
  if (!Array.isArray(row.items)) throw new ContractError();
  return {
    items: row.items.map(auditLedgerEntry),
    next_after: row.next_after === null ? null : decimalId(row.next_after),
  };
}

export type AuditLedgerPage = ReturnType<typeof auditLedgerPage>;
