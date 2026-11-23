/**
 * Offers every model registered with DeepSeek Harness to subagents.
 *
 * When an agent is created for a top-level session that has no
 * `subagent/model-selection-policy` yet, and model selection is enabled in
 * `subagent-model-selection-settings`, this plugin records a policy that
 * allows every model each registered LLM provider advertises at that moment.
 * The settings' `allowedModels` list is not used. A provider whose model list
 * fails to load is left out, and a session for which no provider lists a model
 * is left to dsh. Sessions that already carry a policy keep it, and subagent
 * sessions inherit their parent's policy through dsh.
 *
 * @module dsh-subagent-model-policy
 */

import { z } from 'zod'

export const name = 'subagent-model-policy'
export const inject = ['sessionProjections']

/**
 * The policy projection owned by `@deepseek-ai/dsh-tool-subagent`, which does
 * not export it. The registry shares one key across consumers that declare the
 * same state version, so this reads the same state dsh records.
 */
const policyProjection = {
  key: 'subagentModelSelectionPolicy',
  stateVersion: 1,
  stateSchema: z.array(z.object({ provider: z.string().min(1), model: z.string().min(1) }).strict()).min(1).nullable(),
  init: () => null,
  apply: (policy, event) => policy !== null || event.type !== 'subagent/model-selection-policy'
    ? policy
    : event.data.allowedModels,
}

export async function apply(ctx) {
  const policyReady = ctx.sessionProjections.register(policyProjection)

  // Prepended so this policy is recorded before dsh's own listener records the settings list, as the first policy wins.
  ctx.on('agent/created', async ({ agent }) => {
    const session = agent.session
    if (session.header.origin === 'subagent') return
    const policy = await policyReady
    ctx.fiber.assertActive()
    if (policy.stateOf(session) !== null) return
    const settings = ctx.get('subagentModelSelection')?.current()
    if (settings?.enabled !== true) return
    const llm = ctx.get('llm')
    const listings = await Promise.allSettled((llm?.listProviders() ?? []).map(async provider =>
      (await llm.listModels(provider.id)).map(model => ({ provider: provider.id, model: model.id }))))
    ctx.fiber.assertActive()
    const allowedModels = listings.flatMap(listing => listing.status === 'fulfilled' ? listing.value : [])
    if (allowedModels.length > 0) session.append('subagent/model-selection-policy', { allowedModels })
  }, { prepend: true })
  await policyReady
}
