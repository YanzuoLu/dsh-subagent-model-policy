/**
 * Subagent model-selection policy for DeepSeek Harness sessions that dsh
 * itself leaves without one.
 *
 * dsh records the subagent model allow-list (`subagent-model-selection-settings`)
 * only into a fresh, unseeded top-level session when its first agent is
 * created. Sessions that predate the setting, resumed or migrated sessions and
 * seeded top-level sessions such as side chats keep no policy, so their
 * subagents may only use the parent's model. This plugin appends the same
 * `subagent/model-selection-policy` event, from the same settings, to those
 * top-level sessions when their agent is created. Sessions that already carry
 * a policy are never changed, and subagent sessions keep inheriting from
 * their parent through dsh.
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

/**
 * @param {import('@deepseek-ai/dsh-session').Session} session - session of a newly created agent.
 * @returns {boolean} whether dsh records the policy itself: a fresh, unseeded top-level session.
 */
function recordedByDsh(session) {
  return session.firstLiveSeq === 0 && !session.header.isSeeded
}

export async function apply(ctx) {
  const policyReady = ctx.sessionProjections.register(policyProjection)

  ctx.on('agent/created', async ({ agent }) => {
    const session = agent.session
    if (session.header.origin === 'subagent' || recordedByDsh(session)) return
    const policy = await policyReady
    ctx.fiber.assertActive()
    if (policy.stateOf(session) !== null) return
    // The settings service reads the volatile allow-list, so GUI edits apply without a restart.
    const settings = ctx.get('subagentModelSelection')?.current()
    if (settings?.enabled !== true) return
    session.append('subagent/model-selection-policy', { allowedModels: settings.allowedModels })
  })
  await policyReady
}
