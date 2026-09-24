const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {contains, matchesAt, configure} = require('../docs/assets/javascripts/region-core.js');
const policy = require('../scripts/region-policy.json');
const polygon = {type: 'Polygon', coordinates: [[[0,0],[10,0],[10,10],[0,10],[0,0]], [[3,3],[7,3],[7,7],[3,7],[3,3]]]};
const region = (id, options = {}) => ({id, name: id, status: 'official_local', optional: false, geometry: 'shape', ...options});
const data = {policy, geometries: {shape: polygon}, regions: [region('us-msy')]};

test('polygon interior, exterior, hole, and boundaries', () => {
  assert.equal(contains([1,1], polygon), true);
  assert.equal(contains([11,1], polygon), false);
  assert.equal(contains([5,5], polygon), false);
  assert.equal(contains([0,5], polygon), true);
  assert.equal(contains([3,5], polygon), true);
  assert.equal(contains([0,0], polygon), true);
});
test('multi polygons and geometry collections', () => {
  assert.equal(contains([1,1], {type: 'MultiPolygon', coordinates: [polygon.coordinates]}), true);
  assert.equal(contains([11,1], {type: 'GeometryCollection', geometries: [polygon]}), false);
});
test('unwrapped antimeridian polygons match equivalent longitudes', () => {
  const alaska = {type:'Polygon', coordinates:[[[-190,50],[-170,50],[-170,60],[-190,60],[-190,50]]]};
  assert.equal(contains([175,55], alaska), true);
  assert.equal(contains([-175,55], alaska), true);
  assert.equal(contains([0,55], alaska), false);
});
test('invalid coordinates rejected and out-of-area point unsupported', () => {
  assert.throws(() => matchesAt(data, 0, NaN));
  assert.throws(() => matchesAt(data, 181, 0));
  assert.equal(configure(data, matchesAt(data, 20, 20)).state, 'unsupported');
});
test('broad hidden and API MeshMapper matches included, unapproved/optional scopes excluded', () => {
  const matches = [region('us-msy'), region('us', {status:'political_boundaries', visible:false}),
    region('gc', {status:'political_boundaries'}), region('us-la', {status:'political_boundaries'}),
    region('proposal', {status:'proposed'}), region('extrapolated', {status:'extrapolated_external'}),
    region('unknown', {status:'unknown'}), region('optional', {optional:true}), region('other-mm'), region('us-msy')];
  const result = configure(data, matches);
  assert.deepEqual(result.allowed, ['gc','gc-la-msy-mm','other-mm','us','us-la','us-msy']);
  assert.equal(result.commands.at(-1), 'region save');
  assert.equal(result.commands.some(c => c.includes('denyf') || c.includes('remove')), false);
  assert.equal(result.commands.some(c => /default|home|radio/.test(c)), false);
  assert.deepEqual(configure(data, matches.slice().reverse()).commands, result.commands);
});
test('all four local mappings use exact policy codes', () => {
  for (const area of policy.areas) {
    const result = configure(data, [region(area.id)]);
    assert.ok(result.allowed.includes(area.meshmapper));
    assert.equal(result.verification.length, 2);
  }
});
test('overlap requires a choice and only one MeshMapper area is allowed', () => {
  const matches = [region('us-msy'), region('us-gpt')];
  assert.equal(configure(data, matches).state, 'choose');
  assert.equal(configure(data, matches, 'us-lft').state, 'choose');
  const result = configure(data, matches, 'us-gpt');
  assert.ok(result.allowed.includes('us-msy'));
  assert.ok(result.allowed.includes('us-gpt'));
  assert.ok(result.allowed.includes('us-ms-gpt-mm'));
  assert.ok(!result.allowed.includes('gc-la-msy-mm'));
});
test('outside the four mappings, all approved codes work without an invented MeshMapper code', () => {
  const result = configure(data, [region('us'), region('us-ga'), region('us-ga-atl')]);
  assert.equal(result.state, 'ready');
  assert.equal(result.area, null);
  assert.deepEqual(result.allowed, ['us','us-ga','us-ga-atl']);
  assert.ok(result.commands.every(command => !command.includes('denyf')));
  assert.equal(configure(data, [region('proposal', {status:'proposed'})]).state, 'unsupported');
});
test('API MeshMapper codes beyond the four areas are allowed', () => {
  const result = configure(data, [region('us-ms-ne'), region('us-ms-ne-mm')]);
  assert.equal(result.state,'ready');
  assert.deepEqual(result.allowed,['us-ms-ne','us-ms-ne-mm']);
  assert.deepEqual(result.commands,['region def us-ms-ne|* us-ms-ne-mm', 'region save']);
});
test('single region and long lists produce flat, complete definitions within the CLI buffer', () => {
  assert.deepEqual(configure(data, [region('us')]).commands, ['region def us', 'region save']);
  const matches = Array.from({length:20}, (_, i) => region(`region-${String(i).padStart(2,'0')}-${'x'.repeat(21)}`));
  const result = configure(data, matches);
  const definitions = result.commands.slice(0,-1);
  assert.ok(definitions.length > 1);
  const decoded = [];
  for (const line of definitions) {
    assert.ok(line.length <= 159);
    assert.ok(line.startsWith('region def '));
    const tokens = line.slice('region def '.length).split(' ');
    tokens.forEach((token, i) => {
      if(i < tokens.length - 1) assert.ok(token.endsWith('|*'));
      decoded.push(token.replace(/\|\*$/, ''));
    });
  }
  assert.deepEqual(decoded,result.allowed);
  assert.equal(result.commands.at(-1),'region save');
  assert.equal(result.commands.filter(line => line === 'region save').length,1);
});
test('unsafe API code cannot become a command', () => {
  assert.throws(() => configure(data, [region('us-msy'), region('bad\nregion save')]), /Invalid region code/);
});

const snapshotPath = 'docs/assets/data/regions.json';
test('live snapshot resolves local and wider city centers', {skip: !fs.existsSync(snapshotPath)}, () => {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath));
  for (const [code, lon, lat] of [['us-pns',-87.2169,30.4213], ['us-lft',-92.0198,30.2241],
      ['us-msy',-90.0715,29.9511], ['us-gpt',-89.0928,30.3674], ['us-ga-atl',-84.3880,33.7490],
      ['us-ms-ne-mm',-88.7034,34.2576]]) {
    const matches = matchesAt(snapshot, lon, lat);
    assert.ok(matches.some(r => r.id === code), code);
    const result = configure(snapshot, matches, code);
    assert.equal(result.state, 'ready');
    assert.ok(result.allowed.includes('us'));
  }
});
