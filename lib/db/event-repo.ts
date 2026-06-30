import type Database from "better-sqlite3";

export interface AnalysisEvent {
  id: number;
  sessionId: string;
  seq: number;
  eventType: string;
  payload: string; // JSON string
  createdAt: number;
}

export class EventRepo {
  constructor(private db: Database.Database) {}

  insert(
    sessionId: string,
    seq: number,
    eventType: string,
    payload: Record<string, unknown>,
  ): void {
    const stmt = this.db.prepare(
      `INSERT INTO analysis_events (session_id, seq, event_type, payload, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    stmt.run(sessionId, seq, eventType, JSON.stringify(payload), Date.now());
  }

  getBySession(sessionId: string): AnalysisEvent[] {
    const rows = this.db
      .prepare(
        `SELECT id, session_id, seq, event_type, payload, created_at
         FROM analysis_events
         WHERE session_id = ?
         ORDER BY seq ASC`,
      )
      .all(sessionId) as any[];

    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      seq: row.seq,
      eventType: row.event_type,
      payload: row.payload,
      createdAt: row.created_at,
    }));
  }
}
