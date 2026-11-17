import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pc, spell, simplify, transpose } from '../src/theory/notes.js';

test('pc', () => { assert.equal(pc('C'),0); assert.equal(pc('Db'),1); assert.equal(pc('B#'),0); assert.equal(pc('Cb'),11); assert.equal(pc('F##'),7); assert.throws(() => pc('H')); });
test('spell', () => { assert.equal(spell('C',11),'Cb'); assert.equal(spell('F',7),'F##'); assert.equal(spell('B',10),'Bb'); });
test('simplify only double accidentals', () => { assert.equal(simplify('Bbb',true),'A'); assert.equal(simplify('F##',false),'G'); assert.equal(simplify('Cb',true),'Cb'); });
test('transpose', () => { assert.equal(transpose('A',3,false),'C'); assert.equal(transpose('C',10,true),'Bb'); });
