import { createMemo, createSignal, onMount, Show } from "solid-js"
import { useSync } from "@tui/context/sync"
import { map, pipe, sortBy } from "remeda"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import { useSDK } from "../context/sdk"
import { DialogPrompt } from "../ui/dialog-prompt"
import { Link } from "../ui/link"
import { useTheme } from "../context/theme"
import { TextAttributes, TextareaRenderable } from "@opentui/core"
import type { ProviderAuthAuthorization } from "@opencode-ai/sdk/v2"
import { DialogModel } from "./dialog-model"
import { useKeyboard } from "@opentui/solid"
import { Clipboard } from "@tui/util/clipboard"
import { useToast } from "../ui/toast"
import { useLocal } from "@tui/context/local"

const PROVIDER_PRIORITY: Record<string, number> = {
  opencode: 0,
  anthropic: 1,
  "github-copilot": 2,
  openai: 3,
  google: 4,
}

export function createDialogProviderOptions() {
  const sync = useSync()
  const dialog = useDialog()
  const sdk = useSDK()
  const local = useLocal()
  const connected = createMemo(() => new Set(sync.data.provider_next.connected ?? []))
  const recentProviders = createMemo(() => local.provider?.recent?.() ?? [])

  const options = createMemo(() => {
    const recents = recentProviders()
    const providers = sync.data.provider_next.all ?? []

    const allProviders = pipe(
      providers,
      sortBy((x) => PROVIDER_PRIORITY[x.id] ?? 99),
      map((provider) => {
        const isConnected = connected().has(provider.id)
        const isRecent = recents.includes(provider.id)
        return {
          title: provider.name,
          value: provider.id,
          description: {
            opencode: "(Recommended)",
            anthropic: "(Claude Max or API key)",
            openai: "(ChatGPT Plus/Pro or API key)",
          }[provider.id],
          category: isRecent ? "Recent" : (provider.id in PROVIDER_PRIORITY ? "Popular" : "Other"),
          footer: isConnected ? "Connected" : undefined,
          async onSelect() {
            local.provider?.addRecent?.(provider.id)
            const methods = sync.data.provider_auth[provider.id] ?? [
              {
                type: "api",
                label: "API key",
              },
            ]
            let index: number | null = 0
            if (methods.length > 1) {
              index = await new Promise<number | null>((resolve) => {
                dialog.replace(
                  () => (
                    <DialogSelect
                      title="Select auth method"
                      options={methods.map((x, index) => ({
                        title: x.label,
                        value: index,
                      }))}
                      onSelect={(option) => resolve(option.value)}
                    />
                  ),
                  () => resolve(null),
                )
              })
            }
            if (index == null) return
            const method = methods[index]
            if (method.type === "oauth") {
              const result = await sdk.client.provider.oauth.authorize({
                providerID: provider.id,
                method: index,
              })
              if (result.data?.method === "code") {
                dialog.replace(() => (
                  <CodeMethod
                    providerID={provider.id}
                    title={method.label}
                    index={index}
                    authorization={result.data!}
                  />
                ))
              }
              if (result.data?.method === "auto") {
                dialog.replace(() => (
                  <AutoMethod
                    providerID={provider.id}
                    title={method.label}
                    index={index}
                    authorization={result.data!}
                  />
                ))
              }
            }
            if (method.type === "api") {
              return dialog.replace(() => <ApiMethod providerID={provider.id} title={method.label} />)
            }
          },
        }
      }),
    )

    // Sort to ensure Recent category appears first
    return allProviders.sort((a, b) => {
      if (a.category === "Recent" && b.category !== "Recent") return -1
      if (a.category !== "Recent" && b.category === "Recent") return 1
      return 0
    })
  })
  return options
}

export function DialogProvider() {
  const options = createDialogProviderOptions()
  return <DialogSelect title="Connect a provider" options={options()} />
}

interface AutoMethodProps {
  index: number
  providerID: string
  title: string
  authorization: ProviderAuthAuthorization
}
function AutoMethod(props: AutoMethodProps) {
  const { theme } = useTheme()
  const sdk = useSDK()
  const dialog = useDialog()
  const sync = useSync()
  const toast = useToast()

  useKeyboard((evt) => {
    if (evt.name === "c" && !evt.ctrl && !evt.meta) {
      const code = props.authorization.instructions.match(/[A-Z0-9]{4}-[A-Z0-9]{4,5}/)?.[0] ?? props.authorization.url
      Clipboard.copy(code)
        .then(() => toast.show({ message: "Copied to clipboard", variant: "info" }))
        .catch(toast.error)
    }
  })

  onMount(async () => {
    const result = await sdk.client.provider.oauth.callback({
      providerID: props.providerID,
      method: props.index,
    })
    if (result.error) {
      dialog.clear()
      return
    }
    await sdk.client.instance.dispose()
    await sync.bootstrap()
    dialog.replace(() => <DialogModel providerID={props.providerID} />)
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} paddingBottom={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {props.title}
        </text>
        <text fg={theme.textMuted}>esc</text>
      </box>
      <box gap={1}>
        <Link href={props.authorization.url} fg={theme.primary} />
        <text fg={theme.textMuted}>{props.authorization.instructions}</text>
      </box>
      <text fg={theme.textMuted}>Waiting for authorization...</text>
      <text fg={theme.text}>
        c <span style={{ fg: theme.textMuted }}>copy</span>
      </text>
    </box>
  )
}

interface CodeMethodProps {
  index: number
  title: string
  providerID: string
  authorization: ProviderAuthAuthorization
}
function CodeMethod(props: CodeMethodProps) {
  const { theme } = useTheme()
  const sdk = useSDK()
  const sync = useSync()
  const dialog = useDialog()
  const [error, setError] = createSignal(false)

  return (
    <DialogPrompt
      title={props.title}
      placeholder="Authorization code"
      onConfirm={async (value) => {
        const { error } = await sdk.client.provider.oauth.callback({
          providerID: props.providerID,
          method: props.index,
          code: value,
        })
        if (!error) {
          await sdk.client.instance.dispose()
          await sync.bootstrap()
          dialog.replace(() => <DialogModel providerID={props.providerID} />)
          return
        }
        setError(true)
      }}
      description={() => (
        <box gap={1}>
          <text fg={theme.textMuted}>{props.authorization.instructions}</text>
          <Link href={props.authorization.url} fg={theme.primary} />
          <Show when={error()}>
            <text fg={theme.error}>Invalid code</text>
          </Show>
        </box>
      )}
    />
  )
}

interface ApiMethodProps {
  providerID: string
  title: string
}
function ApiMethod(props: ApiMethodProps) {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const { theme } = useTheme()

  const isAzure = props.providerID === "azure" || props.providerID === "azure-cognitive-services" || props.providerID === "azure-anthropic"
  const isLitellm = props.providerID === "litellm"

  // Use multi-field dialog for Azure and LiteLLM
  if (isAzure) {
    return <AzureApiMethod providerID={props.providerID} title={props.title} />
  }

  if (isLitellm) {
    return <LitellmApiMethod providerID={props.providerID} title={props.title} />
  }

  return (
    <DialogPrompt
      title={props.title}
      placeholder="API key"
      description={
        props.providerID === "opencode" ? (
          <box gap={1}>
            <text fg={theme.textMuted}>
              OpenCode Zen gives you access to all the best coding models at the cheapest prices with a single API key.
            </text>
            <text fg={theme.text}>
              Go to <span style={{ fg: theme.primary }}>https://opencode.ai/zen</span> to get a key
            </text>
          </box>
        ) : undefined
      }
      onConfirm={async (value) => {
        if (!value) return
        await sdk.client.auth.set({
          providerID: props.providerID,
          auth: {
            type: "api",
            key: value,
          },
        })

        await sdk.client.instance.dispose()
        await sync.bootstrap()
        dialog.replace(() => <DialogModel providerID={props.providerID} />)
      }}
    />
  )
}

interface AzureApiMethodProps {
  providerID: string
  title: string
}
function AzureApiMethod(props: AzureApiMethodProps) {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const { theme } = useTheme()

  let apiKeyInput: TextareaRenderable
  let resourceNameInput: TextareaRenderable
  const [activeField, setActiveField] = createSignal<"apiKey" | "resourceName">("apiKey")

  const handleSubmit = async () => {
    const apiKey = apiKeyInput.plainText
    const resourceName = resourceNameInput.plainText

    if (!apiKey || !resourceName) return

    await sdk.client.auth.set({
      providerID: props.providerID,
      auth: {
        type: "api",
        key: apiKey,
      },
    })

    const baseURL =
      props.providerID === "azure-cognitive-services"
        ? `https://${resourceName}.cognitiveservices.azure.com/openai`
        : props.providerID === "azure-anthropic"
          ? `https://${resourceName}.openai.azure.com/anthropic/v1`
          : `https://${resourceName}.openai.azure.com`

    await sdk.client.global.config.update({
      config: {
        provider: {
          [props.providerID]: {
            options: {
              baseURL,
            },
          },
        },
      },
    })

    await sdk.client.instance.dispose()
    await sync.bootstrap()
    dialog.replace(() => <DialogModel providerID={props.providerID} />)
  }

  useKeyboard((evt) => {
    if (evt.name === "return") {
      handleSubmit()
    }
    if (evt.name === "tab" && !evt.shift) {
      if (activeField() === "apiKey") {
        setActiveField("resourceName")
        resourceNameInput?.focus()
      }
    }
    if (evt.name === "tab" && evt.shift) {
      if (activeField() === "resourceName") {
        setActiveField("apiKey")
        apiKeyInput?.focus()
      }
    }
  })

  onMount(() => {
    dialog.setSize("medium")
    setTimeout(() => {
      if (!apiKeyInput || apiKeyInput.isDestroyed) return
      apiKeyInput.focus()
    }, 1)
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {props.title}
        </text>
        <text fg={theme.textMuted}>esc</text>
      </box>
      <box gap={1}>
        <text fg={theme.textMuted}>
          {props.providerID === "azure-anthropic"
            ? "Find your resource name in the Azure portal under your Azure OpenAI resource (for Anthropic models)."
            : "Find your resource name in the Azure portal under your Azure OpenAI resource."}
        </text>

        <box gap={0}>
          <text fg={activeField() === "apiKey" ? theme.text : theme.textMuted}>API Key</text>
          <textarea
            height={3}
            ref={(val: TextareaRenderable) => (apiKeyInput = val)}
            placeholder="Enter your API key"
            textColor={theme.text}
            focusedTextColor={theme.text}
            cursorColor={theme.text}
          />
        </box>

        <box gap={0}>
          <text fg={activeField() === "resourceName" ? theme.text : theme.textMuted}>Resource Name</text>
          <textarea
            height={3}
            ref={(val: TextareaRenderable) => (resourceNameInput = val)}
            placeholder="my-openai-resource"
            textColor={theme.text}
            focusedTextColor={theme.text}
            cursorColor={theme.text}
          />
        </box>
      </box>
      <box paddingBottom={1} gap={1} flexDirection="row">
        <text fg={theme.text}>
          enter <span style={{ fg: theme.textMuted }}>submit</span>
        </text>
        <text fg={theme.text}>
          tab <span style={{ fg: theme.textMuted }}>next field</span>
        </text>
      </box>
    </box>
  )
}

interface LitellmApiMethodProps {
  providerID: string
  title: string
}
function LitellmApiMethod(props: LitellmApiMethodProps) {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const { theme } = useTheme()

  let apiKeyInput: TextareaRenderable
  let baseUrlInput: TextareaRenderable
  const [activeField, setActiveField] = createSignal<"apiKey" | "baseUrl">("apiKey")

  const handleSubmit = async () => {
    const apiKey = apiKeyInput.plainText
    const baseUrl = baseUrlInput.plainText || "http://localhost:4000"

    if (!apiKey) return

    await sdk.client.auth.set({
      providerID: props.providerID,
      auth: {
        type: "api",
        key: apiKey,
      },
    })

    await sdk.client.global.config.update({
      config: {
        provider: {
          litellm: {
            options: {
              baseURL: `${baseUrl}/v1`,
            },
          },
        },
      },
    })

    await sdk.client.instance.dispose()
    await sync.bootstrap()
    dialog.replace(() => <DialogModel providerID={props.providerID} />)
  }

  useKeyboard((evt) => {
    if (evt.name === "return") {
      handleSubmit()
    }
    if (evt.name === "tab" && !evt.shift) {
      if (activeField() === "apiKey") {
        setActiveField("baseUrl")
        baseUrlInput?.focus()
      }
    }
    if (evt.name === "tab" && evt.shift) {
      if (activeField() === "baseUrl") {
        setActiveField("apiKey")
        apiKeyInput?.focus()
      }
    }
  })

  onMount(() => {
    dialog.setSize("medium")
    setTimeout(() => {
      if (!apiKeyInput || apiKeyInput.isDestroyed) return
      apiKeyInput.focus()
    }, 1)
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {props.title}
        </text>
        <text fg={theme.textMuted}>esc</text>
      </box>
      <box gap={1}>
        <text fg={theme.textMuted}>
          LiteLLM is a proxy that provides a unified API for multiple LLM providers.
        </text>

        <box gap={0}>
          <text fg={activeField() === "apiKey" ? theme.text : theme.textMuted}>API Key</text>
          <textarea
            height={3}
            ref={(val: TextareaRenderable) => (apiKeyInput = val)}
            placeholder="Enter your API key"
            textColor={theme.text}
            focusedTextColor={theme.text}
            cursorColor={theme.text}
          />
        </box>

        <box gap={0}>
          <text fg={activeField() === "baseUrl" ? theme.text : theme.textMuted}>Proxy URL</text>
          <textarea
            height={3}
            ref={(val: TextareaRenderable) => (baseUrlInput = val)}
            placeholder="http://localhost:4000"
            textColor={theme.text}
            focusedTextColor={theme.text}
            cursorColor={theme.text}
          />
        </box>
      </box>
      <box paddingBottom={1} gap={1} flexDirection="row">
        <text fg={theme.text}>
          enter <span style={{ fg: theme.textMuted }}>submit</span>
        </text>
        <text fg={theme.text}>
          tab <span style={{ fg: theme.textMuted }}>next field</span>
        </text>
      </box>
    </box>
  )
}
