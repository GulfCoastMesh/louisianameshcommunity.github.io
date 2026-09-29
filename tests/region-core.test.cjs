const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {contains, matchesAt, configure} = require('../docs/assets/javascripts/region-core.js');
const policy = require('../docs/regions.json').policy;
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
  assert.deepEqual(result.allowed, ['other-mm','us','us-east','us-gc','us-la','us-la-msy','us-la-msy-mm','us-south','us-southeast']);
  assert.equal(result.commands.at(-1), 'region save');
  assert.equal(result.commands.some(c => c.includes('denyf') || c.includes('remove')), false);
  assert.equal(result.commands.some(c => /default|home|radio/.test(c)), false);
  assert.deepEqual(configure(data, matches.slice().reverse()).commands, result.commands);
});
test('all local mappings use exact policy codes', () => {
  for (const area of policy.areas) {
    const result = configure(data, [region(area.id)]);
    if (area.meshmapper) assert.ok(result.allowed.includes(area.meshmapper));
    assert.equal(result.verification.length, result.allowed.length);
  }
});
test('overlap combines both messaging and MeshMapper codes', () => {
  const matches = [region('us-msy'), region('us-ms-gpt')];
  const result = configure(data, matches);
  assert.equal(result.state, 'ready');
  for (const code of ['us-la-msy', 'us-la-msy-mm', 'us-ms-gpt', 'us-ms-gpt-mm']) {
    assert.ok(result.allowed.includes(code), code);
  }
  const selected = configure(data, matches, ['us-ms-gpt']);
  assert.ok(!selected.allowed.includes('us-la-msy'));
  assert.ok(!selected.allowed.includes('us-la-msy-mm'));
  assert.throws(() => configure(data, matches, ['unknown']), /known local area/);
});
test('outside local mappings, all approved codes work without an invented MeshMapper code', () => {
  const result = configure(data, [region('us'), region('us-ga'), region('us-ga-atl')]);
  assert.equal(result.state, 'ready');
  assert.deepEqual(result.areas, []);
  assert.deepEqual(result.allowed, ['us','us-ga','us-ga-atl']);
  assert.ok(result.commands.every(command => !command.includes('denyf')));
  assert.equal(configure(data, [region('proposal', {status:'proposed'})]).state, 'unsupported');
});
test('API MeshMapper codes beyond local mappings are allowed', () => {
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

const snapshotPath = 'docs/regions.json';
test('live snapshot resolves local and wider city centers', {skip: !fs.existsSync(snapshotPath)}, () => {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath));
  for (const [code, lon, lat] of [['us-pns',-87.2169,30.4213], ['us-la-lft',-92.0198,30.2241],
      ['us-la-msy',-90.0715,29.9511], ['us-ms-gpt',-89.0928,30.3674], ['us-ga-atl',-84.3880,33.7490],
      ['us-ms-ne-mm',-88.7034,34.2576]]) {
    const matches = matchesAt(snapshot, lon, lat);
    assert.ok(matches.some(r => r.id === code), code);
    const result = configure(snapshot, matches);
    assert.equal(result.state, 'ready');
    assert.ok(result.allowed.includes('us'));
  }
});

test('Louisiana manual choices match the supplied reference exactly', () => {
  const cases = {
    'us-la-msy': ['us-la-msy', 'us-la-msy-mm'],
    'us-la-gno': ['us-la-msy', 'us-la-gno', 'us-la-msy-mm'],
    'us-la-btr': ['us-la-msy', 'us-la-btr', 'us-la-msy-mm'],
    'us-la-lft': ['us-la-lft', 'gc-la-lft-mm'],
    'us-la-lc': ['us-la-lc', 'us-la-lc-mm'],
    'us-la-mlu': ['us-la-mlu', 'us-la-mlu-mm'],
    'us-la-sja': ['us-la-sja'],
  };
  const common = ['us', 'us-southeast', 'us-south', 'us-east', 'us-gc', 'us-la'];
  for (const [id, extra] of Object.entries(cases)) {
    const result = configure(data, [], [id]);
    assert.equal(result.state, 'ready');
    assert.deepEqual(result.allowed, [...common, ...extra].sort(), id);
  }
});
test('manual boundaries combine areas and deduplicate inherited scopes', () => {
  const result = configure(data, [], ['us-la-msy', 'us-la-gno', 'us-la-lft', 'us-la-sja']);
  assert.ok(result.allowed.includes('us-la-msy-mm'));
  assert.ok(result.allowed.includes('gc-la-lft-mm'));
  assert.ok(result.allowed.includes('us-la-sja'));
  assert.equal(result.allowed.filter(code => code === 'us-la-msy').length, 1);
});
test('legacy aliases are canonical in results and verification', () => {
  for (const [legacy, canonical] of Object.entries(policy.aliases)) {
    const result = configure(data, [region(legacy)], ['us-la-msy', 'us-la-lft', 'us-la-lc', 'us-ms-gpt']);
    assert.ok(result.allowed.includes(canonical));
    assert.ok(!result.allowed.includes(legacy));
    assert.ok(!result.verification.includes('region get ' + legacy));
  }
});
