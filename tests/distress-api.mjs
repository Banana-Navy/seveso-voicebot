import assert from 'node:assert/strict';

const endpoint = 'https://blzyifrmpqrrvurtfgrn.supabase.co/functions/v1/analyze_vocal_distress';
const apikey = 'sb_publishable_TYjzQqPTjHbcRp8Tht8tHg_lPMBuaBI';

async function analyze(transcript, audio = {}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey,
      origin: 'https://banana-navy.github.io',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ transcript, audio })
  });
  assert.equal(response.status, 200);
  return await response.json();
}

const choking = await analyze('Je m étouffe et je n arrive plus à respirer', {
  vad_peak: 0.9,
  input_volume_peak: 0.5
});
assert.equal(choking.level, 'emergency');
assert.equal(choking.should_interrupt_demo, true);
assert.deepEqual(choking.reason_codes, ['CHOKING', 'RESPIRATORY_DISTRESS']);
assert.equal(choking.acoustic_support, true);

const unconscious = await analyze('Elle vient de perdre connaissance');
assert.equal(unconscious.level, 'emergency');
assert.deepEqual(unconscious.reason_codes, ['LOSS_OF_CONSCIOUSNESS']);

const ordinary = await analyze('Je vois un nuage toxique au-dessus de l’usine');
assert.equal(ordinary.level, 'none');
assert.equal(ordinary.should_interrupt_demo, false);

const english = await analyze('Hello, can you help me in English?');
assert.equal(english.detected_language, 'en');

const dutch = await analyze('Hallo, help mij alsjeblieft');
assert.equal(dutch.detected_language, 'nl');

const rejected = await fetch(endpoint, {
  method: 'POST',
  headers: {
    apikey,
    origin: 'https://unauthorized.example',
    'content-type': 'application/json'
  },
  body: JSON.stringify({ transcript: 'test' })
});
assert.equal(rejected.status, 403);

console.log('Distress API: 6 scénarios validés.');
