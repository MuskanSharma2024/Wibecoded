const fetch = require('node-fetch');

async function run() {
  try {
    console.log('--- TICK 1 ---');
    const t1 = await fetch('http://localhost:3000/api/agent/tick', {
      method: 'POST',
      headers: { 'x-tick-secret': 'super_secret_tick_key' }
    }).then(r => r.json());
    console.log(t1);

    console.log('\n--- TICK 2 ---');
    const t2 = await fetch('http://localhost:3000/api/agent/tick', {
      method: 'POST',
      headers: { 'x-tick-secret': 'super_secret_tick_key' }
    }).then(r => r.json());
    console.log(t2);

    console.log('\n--- TICK 3 ---');
    const t3 = await fetch('http://localhost:3000/api/agent/tick', {
      method: 'POST',
      headers: { 'x-tick-secret': 'super_secret_tick_key' }
    }).then(r => r.json());
    console.log(t3);

    console.log('\n--- INIT NEW AGENT (Empty State) ---');
    const init = await fetch('http://localhost:3000/api/agent/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona: { name: 'Vera', domain: 'AI Security' } })
    }).then(r => r.json());
    console.log('New Agent ID:', init.agentId);

    console.log('\n--- CHECKING HOMEPAGE HTML ---');
    const html = await fetch('http://localhost:3000/').then(r => r.text());
    if (html.includes('No logs found. Awaiting next cycle.')) {
      console.log('SUCCESS: Empty state rendered correctly in HTML.');
    } else {
      console.log('FAILURE: Empty state not found.');
    }

  } catch (err) {
    console.error(err);
  }
}
run();
