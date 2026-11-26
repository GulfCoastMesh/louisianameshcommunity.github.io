const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {contains, matchesAt, configure, whenMatches} = require('../docs/assets/javascripts/region-core.js');
const policy = require('../docs/regions.json').policy;
const polygon = {type: 'Polygon', coordinates: [[[0,0],[10,0],[10,10],[0,10],[0,0]], [[3,3],[7,3],[7,7],[3,7],[3,3]]]};
const region = (id, options = {}) => ({id, name: id, status: 'official_local', optional: false, geometry: 'shape', ...options});
const political = id => region(id, {status: 'political_boundaries', visible: false});
const data = {policy, geometries: {shape: polygon}, regions: [region('us-msy')]};
const extraCodes = result => result.extras.flatMap(extra => extra.codes);

// Lists from the Gulf Coast Mesh region scope sheet (Nov 2026).
const LA = ['us', 'us-la', 'us-gc', 'us-southeast', 'us-south'];
const MS = ['us', 'us-southeast', 'us-south', 'us-gc', 'us-ms'];
const AL = ['us', 'us-gc', 'us-southeast', 'us-south', 'us-al', 'us-al-mob', 'us-al-fhp', 'us-al-guf',
  'us-al-dhn', 'us-ms', 'us-fl', 'us-fl-nw'];
const FL = ['us', 'us-southeast', 'us-south', 'us-east', 'us-gc', 'us-fl', 'us-fl-nw'];
const RETIRED = ['us-la-msy-mm', 'gc-la-msy-mm', 'us-la-lft-mm', 'gc-la-lft-mm', 'us-la-lc-mm',
  'us-la-mlu-mm', 'us-ms-gpt-mm', 'gc-fl-pns-mm', 'us-ms-ne', 'us-ms-ne-mm'];

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
  const result = configure(data, matchesAt(data, 20, 20));
  assert.equal(result.state, 'unsupported');
  assert.deepEqual([result.groups, result.extras, result.meshmapper], [[], [], []]);
});
test('broad hidden and API MeshMapper matches included, unapproved/optional scopes excluded', () => {
  const matches = [region('us-msy'), political('us'), political('gc'), political('us-la'),
    region('proposal', {status:'proposed'}), region('extrapolated', {status:'extrapolated_external'}),
    region('unknown', {status:'unknown'}), region('optional', {optional:true}), region('other-mm'), region('us-msy')];
  const result = configure(data, matches);
  assert.deepEqual(result.allowed, ['other-mm','us','us-gc','us-la','us-la-msy','us-south','us-southeast']);
  assert.deepEqual(result.meshmapper, ['other-mm', 'us-la-msy']);
  assert.equal(result.commands.at(-1), 'region save');
  assert.equal(result.commands.some(c => c.includes('denyf') || c.includes('remove')), false);
  assert.equal(result.commands.some(c => /default|home|radio/.test(c)), false);
  assert.deepEqual(configure(data, matches.slice().reverse()).commands, result.commands);
});
test('all local mappings use exact policy codes', () => {
  for (const area of policy.areas) {
    const result = configure(data, [region(area.id)]);
    for (const code of area.codes || [area.id]) assert.ok(result.allowed.includes(code), area.id + ' ' + code);
    if (area.louisiana) for (const code of policy.louisianaCodes) assert.ok(result.allowed.includes(code), code);
    assert.equal(result.verification.length, result.allowed.length);
  }
});
test('overlap combines current local codes, without retired MeshMapper codes', () => {
  const matches = [region('us-msy'), region('us-ms-gpt')];
  const result = configure(data, matches);
  assert.equal(result.state, 'ready');
  for (const code of ['us-la-msy', 'us-ms-gpt', 'us-ms-pb', 'us-ms']) {
    assert.ok(result.allowed.includes(code), code);
  }
  assert.ok(!result.allowed.includes('us-la-msy-mm'));
  assert.ok(!result.allowed.includes('us-ms-gpt-mm'));
  const selected = configure(data, matches, ['us-ms-gpt']);
  assert.ok(!selected.allowed.includes('us-la-msy'));
  assert.ok(!selected.allowed.includes('us-la-msy-mm'));
  assert.throws(() => configure(data, matches, ['unknown']), /known local area/);
});
test('outside local mappings, all approved codes work without an invented MeshMapper code', () => {
  const result = configure(data, [region('us'), region('us-ga'), region('us-ga-atl')]);
  assert.equal(result.state, 'ready');
  assert.deepEqual(result.areas, []);
  assert.deepEqual(result.groups, []);
  assert.deepEqual(result.allowed, ['us','us-ga','us-ga-atl']);
  assert.deepEqual(result.meshmapper, []);
  assert.ok(result.commands.every(command => !command.includes('denyf')));
  assert.equal(configure(data, [region('proposal', {status:'proposed'})]).state, 'unsupported');
});
test('API MeshMapper codes beyond local mappings are allowed', () => {
  const result = configure(data, [region('us-tn-x'), region('us-tn-x-mm')]);
  assert.equal(result.state,'ready');
  assert.deepEqual(result.allowed,['us-tn-x','us-tn-x-mm']);
  assert.deepEqual(result.meshmapper,['us-tn-x-mm']);
  assert.deepEqual(result.commands,['region def us-tn-x', 'region def us-tn-x-mm', 'region save']);
});
test('each region gets its own definition command, followed by one save', () => {
  assert.deepEqual(configure(data, [region('us')]).commands, ['region def us', 'region save']);
  const matches = Array.from({length:20}, (_, i) => region(`region-${String(i).padStart(2,'0')}-${'x'.repeat(21)}`));
  const result = configure(data, matches);
  assert.deepEqual(result.commands.slice(0,-1), result.allowed.map(code => `region def ${code}`));
  for (const line of result.commands) assert.ok(line.length <= 159);
  assert.equal(result.commands.at(-1),'region save');
  assert.equal(result.commands.filter(line => line === 'region save').length,1);
});
test('unsafe API code cannot become a command', () => {
  assert.throws(() => configure(data, [region('us-msy'), region('bad\nregion save')]), /Invalid region code/);
});

test('rules match on any, all and none', () => {
  const present = new Set(['a', 'b']);
  assert.equal(whenMatches({any: ['a', 'z']}, present), true);
  assert.equal(whenMatches({any: ['z']}, present), false);
  assert.equal(whenMatches({all: ['a', 'b']}, present), true);
  assert.equal(whenMatches({all: ['a', 'z']}, present), false);
  assert.equal(whenMatches({any: ['a'], none: ['b']}, present), false);
  assert.equal(whenMatches({any: ['a'], none: ['z']}, present), true);
  // A rule must name at least one region it needs; "none" alone would match everywhere.
  for (const when of [undefined, null, {}, {none: ['z']}, {any: [], all: []}]) {
    assert.equal(whenMatches(when, present), false, JSON.stringify(when));
  }
});
test('policy rules are well formed and the Louisiana lists agree', () => {
  const code = /^[a-z0-9][a-z0-9-]{0,30}$/;
  for (const rule of [...policy.groups, ...policy.extras]) {
    const label = rule.name || rule.note;
    assert.ok(typeof label === 'string' && label.trim(), JSON.stringify(rule));
    assert.ok((rule.when.any || []).length || (rule.when.all || []).length, label);
    assert.ok(rule.codes.length && rule.codes.every(c => code.test(c)), label);
  }
  assert.ok(policy.meshmapperCodes.every(c => code.test(c)));
  // The app still reads louisianaCodes; keep it equal to the sheet's Louisiana list.
  const louisiana = policy.groups.find(group => group.name === 'Louisiana');
  assert.deepEqual([...policy.louisianaCodes].sort(), [...louisiana.codes].sort());
  assert.deepEqual([...louisiana.codes].sort(), [...LA].sort());
  for (const area of policy.areas) assert.equal(area.meshmapper, undefined, area.id);
});
test('groups add the sheet lists and never remove broader codes', () => {
  const alabama = configure(data, [political('us-al'), region('us-al-guf')]);
  assert.deepEqual(alabama.groups.map(group => group.name), ['Alabama Gulf Coast']);
  assert.deepEqual(alabama.allowed, [...AL].sort());
  const emerald = configure(data, [region('us-pns'), region('us-fl-nw'), political('us-fl'), region('us-other')]);
  assert.deepEqual(emerald.groups.map(group => group.name), ['Emerald Coast']);
  assert.deepEqual(emerald.allowed, [...new Set([...FL, 'us-pns', 'us-other'])].sort());
  assert.deepEqual(emerald.meshmapper, ['us-fl-nw']);
});
test('the MSY corridor in Mississippi adds the GPT and Pine Belt codes', () => {
  const result = configure(data, [region('us-msy'), political('us-ms')]);
  assert.deepEqual(result.groups.map(group => group.name), ['Mississippi', 'MSY corridor in Mississippi']);
  assert.deepEqual(result.allowed, [...new Set([...MS, 'us-la', 'us-la-msy', 'us-ms-gpt', 'us-ms-pb'])].sort());
  assert.deepEqual(result.meshmapper, ['us-la-msy', 'us-ms-gpt']);
  // New Orleans and Baton Rouge hints stay on the Louisiana side.
  assert.deepEqual(result.extras, []);
});
test('an unchosen local area does not trigger rules', () => {
  const matches = [region('us-msy'), political('us-ms')];
  const result = configure(data, matches, ['us-ms-gpt']);
  assert.ok(!result.groups.some(group => group.name === 'MSY corridor in Mississippi'));
  assert.ok(!result.allowed.includes('us-la-msy'));
  assert.ok(result.allowed.includes('us-ms-pb'));
});
test('extras list only codes that are not already allowed', () => {
  const orleans = configure(data, [region('us-msy'), political('us-la')]);
  assert.deepEqual(extraCodes(orleans), ['us-la-gno', 'us-la-btr', 'us-la-sja']);
  assert.deepEqual(orleans.extras[0].commands, ['region def us-la-gno']);
  assert.ok(orleans.extras.every(extra => !orleans.commands.includes(extra.commands[0])));
  const monroe = configure(data, [political('us'), political('us-la')]);
  assert.deepEqual(monroe.allowed, [...LA].sort());
  assert.deepEqual(extraCodes(monroe), ['us-la-mlu']);
  const picayune = configure(data, [political('us-ms'), region('us-ms-gpt')]);
  assert.deepEqual(extraCodes(picayune), ['us-la', 'us-la-msy']);
  // In the Alabama group us-ms is already allowed, so the Florida height note drops it.
  const border = configure(data, [region('us-al-guf'), region('us-pns'), region('us-fl-nw')]);
  assert.ok(border.allowed.includes('us-ms'));
  assert.ok(!extraCodes(border).includes('us-ms'));
  assert.ok(extraCodes(border).includes('us-ga'));
  assert.throws(() => configure({...data, policy: {...policy, extras: [{codes: ['bad code'], note: 'x',
    when: {any: ['us-la']}}]}}, [political('us-la')]), /Invalid region code/);
});
test('retired MeshMapper codes and the old North Mississippi code canonicalize', () => {
  const cases = {
    'us-la-msy-mm': 'us-la-msy', 'gc-la-msy-mm': 'us-la-msy', 'us-la-lft-mm': 'us-la-lft',
    'gc-la-lft-mm': 'us-la-lft', 'us-la-lc-mm': 'us-la-lc', 'us-ms-gpt-mm': 'us-ms-gpt',
    'us-ms-ne': 'us-ms-n', 'us-ms-ne-mm': 'us-ms-n',
  };
  for (const [legacy, code] of Object.entries(cases)) {
    const result = configure(data, [region(legacy)]);
    assert.equal(result.state, 'ready', legacy);
    assert.ok(result.allowed.includes(code), legacy);
    assert.ok(!result.allowed.some(c => RETIRED.includes(c)), legacy);
  }
  assert.deepEqual(configure(data, [region('us-ms-ne'), region('us-ms-ne-mm')]).meshmapper, ['us-ms-n']);
});

const snapshotPath = 'docs/regions.json';
test('live snapshot resolves local and wider city centers', {skip: !fs.existsSync(snapshotPath)}, () => {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath));
  const canonical = id => snapshot.policy.aliases[id] || id;
  for (const [code, lon, lat] of [['us-pns',-87.2169,30.4213], ['us-la-lft',-92.0198,30.2241],
      ['us-la-msy',-90.0715,29.9511], ['us-ms-gpt',-89.0928,30.3674], ['us-ga-atl',-84.3880,33.7490],
      ['us-ms-n',-88.7034,34.2576]]) {
    const matches = matchesAt(snapshot, lon, lat);
    assert.ok(matches.some(r => canonical(r.id) === code), code);
    const result = configure(snapshot, matches);
    assert.equal(result.state, 'ready');
    assert.ok(result.allowed.includes('us'));
    assert.ok(result.allowed.includes(code), code);
    assert.ok(!result.allowed.some(c => RETIRED.includes(c)), code);
  }
});
test('live snapshot gives the Gulf Coast Mesh sheet lists', {skip: !fs.existsSync(snapshotPath)}, () => {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath));
  // [place, lon, lat, sheet codes, codes the map may list as extras instead, MeshMapper code]
  const places = [
    ['New Orleans', -90.0715, 29.9511, [...LA, 'us-la-msy'], ['us-la-gno', 'us-la-btr', 'us-la-sja'], 'us-la-msy'],
    ['Baton Rouge', -91.1871, 30.4515, [...LA, 'us-la-msy'], ['us-la-btr'], 'us-la-msy'],
    ['Lafayette', -92.0198, 30.2241, [...LA, 'us-la-lft'], [], null],
    ['Lake Charles', -93.2174, 30.2266, [...LA, 'us-la-lc'], [], null],
    ['Monroe', -92.1193, 32.5093, LA, ['us-la-mlu'], null],
    ['Hattiesburg', -89.2903, 31.3271, [...MS, 'us-la', 'us-la-msy', 'us-ms-gpt', 'us-ms-pb'], [], 'us-ms-gpt'],
    ['Picayune', -89.6795, 30.5255, [...MS, 'us-ms-gpt', 'us-ms-pb'], ['us-la', 'us-la-msy'], 'us-ms-gpt'],
    ['Gulfport', -89.0928, 30.3674, [...MS, 'us-ms-gpt', 'us-ms-pb'], [], 'us-ms-gpt'],
    ['Biloxi', -88.8853, 30.3960, [...MS, 'us-ms-gpt', 'us-ms-pb'], [], 'us-ms-gpt'],
    ['Jackson', -90.1848, 32.2988, [...MS, 'us-ms-jan'], [], null],
    ['Tupelo', -88.7034, 34.2576, [...MS, 'us-ms-n'], [], 'us-ms-n'],
    ['Mobile', -88.0399, 30.6954, AL, [], null],
    ['Gulf Shores', -87.7008, 30.2460, AL, [], null],
    ['Dothan', -85.3905, 31.2232, AL, [], null],
    ['Pensacola', -87.2169, 30.4213, [...FL, 'us-pns'], ['us-npa', 'us-nse', 'us-al', 'us-ga'], 'us-fl-nw'],
    ['Fort Walton Beach', -86.6188, 30.4058, [...FL, 'us-vps'], ['us-al', 'us-ga'], 'us-fl-nw'],
    ['Panama City', -85.6602, 30.1588, [...FL, 'us-ecp'], ['us-pam'], 'us-fl-nw'],
    ['Port St. Joe', -85.3030, 29.8119, [...FL, 'us-ecp', 'us-fl-gulf'], [], 'us-fl-nw'],
  ];
  for (const [place, lon, lat, codes, optional, meshmapper] of places) {
    const result = configure(snapshot, matchesAt(snapshot, lon, lat));
    assert.equal(result.state, 'ready', place);
    for (const code of codes) assert.ok(result.allowed.includes(code), `${place}: ${code}`);
    for (const code of optional) {
      assert.ok(result.allowed.includes(code) || extraCodes(result).includes(code), `${place}: ${code}`);
    }
    assert.ok(!result.allowed.some(c => RETIRED.includes(c)), place);
    if (!codes.includes('us-east')) assert.ok(!result.allowed.includes('us-east'), place);
    if (meshmapper) assert.ok(result.meshmapper.includes(meshmapper), place);
  }
});

test('Louisiana manual choices match the supplied reference exactly', () => {
  const cases = {
    'us-la-msy': ['us-la-msy'],
    'us-la-gno': ['us-la-msy', 'us-la-gno'],
    'us-la-btr': ['us-la-msy', 'us-la-btr'],
    'us-la-lft': ['us-la-lft'],
    'us-la-lc': ['us-la-lc'],
    'us-la-mlu': ['us-la-mlu'],
    'us-la-sja': ['us-la-sja'],
  };
  for (const [id, extra] of Object.entries(cases)) {
    const result = configure(data, [], [id]);
    assert.equal(result.state, 'ready');
    assert.deepEqual(result.allowed, [...LA, ...extra].sort(), id);
  }
});
test('manual boundaries combine areas and deduplicate inherited scopes', () => {
  const result = configure(data, [], ['us-la-msy', 'us-la-gno', 'us-la-lft', 'us-la-sja']);
  assert.ok(!result.allowed.some(c => RETIRED.includes(c)));
  assert.ok(result.allowed.includes('us-la-lft'));
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
