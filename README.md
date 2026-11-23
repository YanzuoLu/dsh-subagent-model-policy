# dsh-subagent-model-policy

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) plugin that lets subagents run on every model dsh knows, so nobody keeps a list of allowed models by hand.

## Behavior

When an agent is created for a top-level session that has no subagent model-selection policy yet, the plugin records one. The policy allows every model that each registered LLM provider advertises at that moment. A provider whose model list fails to load is left out. If no provider lists a model, the plugin records nothing and dsh's own behavior applies.

The `enabled` switch in `subagent-model-selection-settings` turns the plugin on or off. The `allowedModels` list in the same settings is ignored.

A session keeps the first policy it records. A session that already has a policy keeps it, including one dsh recorded from the settings list. Models added later reach sessions that record their policy afterwards. Subagent sessions inherit their parent's policy through dsh.

| Session | Result |
| --- | --- |
| Top-level session without a policy (fresh, older, resumed, migrated, seeded) | Every registered model recorded when its agent is created |
| Session that already has a policy | Unchanged |
| Subagent session | Unchanged. dsh copies the parent's policy |
| Model selection disabled in the settings | Nothing recorded |

An already open session without a policy receives one the next time its agent is created, for example after dsh restarts or the session is reopened.

## Install

```sh
dsh plugin --profile <profile> add github:YanzuoLu/dsh-subagent-model-policy
```

Then add `dsh-subagent-model-policy` to `dsh.profile.bundles` in the profile's `package.json` if the command did not. The plugin has no configuration. Turn model selection on in `subagent-model-selection-settings`, from the settings page or the profile's `cordis.patch.yml`. Keep at least one entry in `allowedModels`, because dsh rejects an empty list while model selection is enabled.

## Compatibility

Needs dsh `^0.2.2-rc.2`. It relies on the `agent/created` event, the `llm` service's `listProviders()` and `listModels()`, and three parts of `@deepseek-ai/dsh-tool-subagent`. These are the `subagentModelSelection` settings service, its `current()` reader, and the `subagentModelSelectionPolicy` projection (state version 1). The plugin registers its `agent/created` listener with `prepend`, so it runs before dsh's own listener, which would otherwise record the settings list first. A dsh release that changes these needs a matching update here.

## License

MIT
