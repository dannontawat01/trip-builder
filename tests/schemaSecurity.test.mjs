import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');

test('public landmark proposals default to pending and cannot self-approve', () => {
  assert.match(schema, /status text DEFAULT 'pending'/);
  assert.match(schema, /ALTER TABLE public\.landmarks ALTER COLUMN status SET DEFAULT 'pending'/);
  assert.match(schema, /DROP POLICY IF EXISTS "Allow public inserts" ON public\.landmarks/);
  assert.match(schema, /FOR INSERT WITH CHECK \(status = 'pending'\)/);
  assert.doesNotMatch(schema, /FOR INSERT WITH CHECK \(true\)/);
});

test('room quotas are serialized before counting and inserting', () => {
  const create = schema.slice(schema.indexOf('FUNCTION public.tb_create_room'), schema.indexOf('FUNCTION public.tb_join_room'));
  const join = schema.slice(schema.indexOf('FUNCTION public.tb_join_room'), schema.indexOf('FUNCTION public.tb_get_room'));
  assert.ok(create.indexOf('pg_advisory_xact_lock') < create.indexOf('count(*)'));
  assert.ok(create.includes('pg_advisory_xact_lock'));
  assert.ok(join.indexOf('FOR UPDATE') < join.indexOf('count(*)'));
  assert.ok(join.includes('FOR UPDATE'));
});