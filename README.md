# dsh-subagent-model-policy

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) plugin that lets subagents choose from your allowed models in every top-level session, not only in sessions created after the setting was turned on.

## Why

dsh's `subagent-model-selection-settings` lists the models a subagent may be started on (`allowedModels`). dsh copies that list into a session as a `subagent/model-selection-policy` event, but only when a fresh, unseeded top-level session creates its first agent. Every other top-level session has no policy, and its subagents may only use the parent's model; `list_subagent_models` and an explicit `provider`/`model` fail with "not allowed for this Session". That includes sessions created before the setting existed, sessions migrated from another agent, and seeded top-level sessions such as side chats.

## Behavior

When an agent is created for a top-level session that has no policy, the plugin appends the same event dsh would have recorded, using the allow-list current at that moment.

| Session | Result |
| --- | --- |
| Fresh, unseeded top-level session | Left to dsh, which records the policy itself |
| Top-level session without a policy (older, resumed, migrated, seeded) | Policy recorded when its agent is created |
| Session that already has a policy | Unchanged. Later settings edits do not affect it, as in dsh |
| Subagent session | Unchanged. dsh copies the parent's policy |
| Model selection disabled in the settings | Nothing recorded |

An already open session receives the policy the next time its agent is created, for example after dsh restarts or the session is reopened.

## Install

```sh
dsh plugin --profile <profile> add github:YanzuoLu/dsh-subagent-model-policy
```

Then add `dsh-subagent-model-policy` to `dsh.profile.bundles` in the profile's `package.json` if the command did not. The plugin has no configuration. Turn model selection on and list the models in `subagent-model-selection-settings`, from the settings page or the profile's `cordis.patch.yml`.

## Compatibility

Needs dsh `^0.2.2-rc.2`. It relies on the `agent/created` event, the `subagentModelSelection` settings service and its `current()` reader, and the `subagentModelSelectionPolicy` projection (state version 1) from `@deepseek-ai/dsh-tool-subagent`. A dsh release that changes these needs a matching update here.

## License

MIT
