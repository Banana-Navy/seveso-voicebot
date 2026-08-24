const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('ELEVENLABS_API_KEY est absent.');

const tools = [
  ['tool_3501kvqrqdv4f29tefgkcwktpdca', 'SEVESO_classify_situation'],
  ['tool_7001kvqrpj51fytsezv5qvjmm68f', 'SEVESO_save_triage'],
  ['tool_9501kvqrpkc9fasbzbyyj37yezb1', 'SEVESO_save_location'],
  ['tool_5701kvqrpkj5eb8spc85ggqpzeka', 'SEVESO_save_symptom'],
  ['tool_7001kvqrpmb9egjbqzhm6b1ty4j1', 'SEVESO_save_assistance'],
  ['tool_3101kvqrpjy1fwdrhtwszxp34a7h', 'SEVESO_update_confinement'],
  ['tool_9701kvqrpmw5fnqsmnrpgcswkesw', 'SEVESO_request_transfer'],
  ['tool_8701kvqrqehhfxzrz8wm46pye5t3', 'SEVESO_log_call_end']
];

async function request(path, options = {}) {
  const response = await fetch(`https://api.elevenlabs.io/v1${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', 'xi-api-key': apiKey, ...options.headers }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${path} refusé (${response.status}) : ${JSON.stringify(result)}`);
  return result;
}

const results = [];
for (const [toolId, expectedName] of tools) {
  const before = await request(`/convai/tools/${toolId}`);
  const beforeUrl = before.tool_config.api_schema?.url ?? null;
  const beforeSchema = JSON.stringify(before.tool_config.api_schema ?? null);

  if (before.tool_config.name !== expectedName) {
    await request(`/convai/tools/${toolId}`, {
      method: 'PATCH',
      body: JSON.stringify({ tool_config: { ...before.tool_config, name: expectedName } })
    });
  }

  const after = await request(`/convai/tools/${toolId}`);
  if (after.tool_config.name !== expectedName) throw new Error(`Nom non appliqué pour ${toolId}.`);
  if ((after.tool_config.api_schema?.url ?? null) !== beforeUrl) throw new Error(`URL modifiée pour ${toolId}.`);
  if (JSON.stringify(after.tool_config.api_schema ?? null) !== beforeSchema) throw new Error(`Schéma modifié pour ${toolId}.`);

  results.push({ tool_id: toolId, name: after.tool_config.name, url: beforeUrl, schema_unchanged: true });
}

console.log(JSON.stringify(results, null, 2));
