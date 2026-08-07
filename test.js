const { exec } = require('child_process');

const server = exec('npm run dev');
let agentId;

setTimeout(async () => {
  try {
    console.log('--- Calling INIT ---');
    const initRes = await fetch('http://localhost:3000/api/agent/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona: { name: 'Vera', domain: 'AI Security' } })
    });
    const initData = await initRes.json();
    console.log(initData);
    agentId = initData.agentId;

    if (!agentId) throw new Error('No agent ID returned');

    console.log('\n--- Calling TICK ---');
    const tickRes = await fetch('http://localhost:3000/api/agent/tick', {
      method: 'POST',
      headers: { 'x-tick-secret': 'super_secret_tick_key' }
    });
    const tickData = await tickRes.json();
    console.log(tickData);

    console.log('\n--- Calling FEED ---');
    const feedRes = await fetch(`http://localhost:3000/api/agent/feed?agentId=${agentId}`);
    const feedData = await feedRes.json();
    console.log(JSON.stringify(feedData, null, 2));

  } catch (err) {
    console.error('Error during tests:', err);
  } finally {
    server.kill();
    process.exit(0);
  }
}, 5000); // give server 5 seconds to start
