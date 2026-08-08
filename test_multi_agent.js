const fs = require('fs');
const fetch = require('node-fetch');

const envPath = '.env.local';
let tickSecret = 'super_secret_tick_key';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'TICK_SECRET') {
        tickSecret = val;
      }
    }
  });
}

async function test() {
  console.log("Starting multi-agent tick verification...");

  // 1. Initialize Agent A
  console.log("Initializing Agent A (Vera-A in AI Security)...");
  const initARes = await fetch('http://localhost:3000/api/agent/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona: { name: 'Vera-A', domain: 'AI Security' } })
  }).then(r => r.json());
  console.log("Agent A ID:", initARes.agentId);

  // 2. Initialize Agent B
  console.log("Initializing Agent B (Vera-B in Web Security)...");
  const initBRes = await fetch('http://localhost:3000/api/agent/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona: { name: 'Vera-B', domain: 'Web Security' } })
  }).then(r => r.json());
  console.log("Agent B ID:", initBRes.agentId);

  // 3. Trigger tick
  console.log("Triggering Tick with secret:", tickSecret);
  const tickRes = await fetch('http://localhost:3000/api/agent/tick', {
    method: 'POST',
    headers: { 'x-tick-secret': tickSecret }
  }).then(r => r.json());
  console.log("Tick response:", tickRes);

  // 4. Fetch Agent A Feed
  console.log("Fetching Feed for Agent A...");
  const feedA = await fetch(`http://localhost:3000/api/agent/feed?agentId=${initARes.agentId}`).then(r => r.json());
  console.log(`Agent A Feed post count: ${feedA.posts?.length || 0}`);

  // 5. Fetch Agent B Feed
  console.log("Fetching Feed for Agent B...");
  const feedB = await fetch(`http://localhost:3000/api/agent/feed?agentId=${initBRes.agentId}`).then(r => r.json());
  console.log(`Agent B Feed post count: ${feedB.posts?.length || 0}`);

  if (feedA.posts && feedB.posts) {
    const hasAOverlap = feedA.posts.some(postA => feedB.posts.some(postB => postA.id === postB.id));
    console.log("SUCCESS: Feeds are completely isolated:", !hasAOverlap);
  } else {
    console.log("Failed to retrieve valid feeds for both agents.");
  }
}

test().catch(console.error);
