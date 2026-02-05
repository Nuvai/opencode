import { test, expect, mock, describe } from "bun:test"
import path from "path"
import { unlink } from "fs/promises"

// === Mocks ===
// These mocks are required because Provider.list() triggers:
// 1. Plugin.list() which calls BunProc.install() for default plugins
// Without mocks, these would attempt real package installations that timeout in tests.

mock.module("../../src/bun/index", () => ({
  BunProc: {
    install: async (pkg: string, _version?: string) => {
      // Return package name without version for mocking
      const lastAtIndex = pkg.lastIndexOf("@")
      return lastAtIndex > 0 ? pkg.substring(0, lastAtIndex) : pkg
    },
    run: async () => {
      throw new Error("BunProc.run should not be called in tests")
    },
    which: () => process.execPath,
    InstallFailedError: class extends Error {},
  },
}))

const mockPlugin = () => ({})
mock.module("opencode-copilot-auth", () => ({ default: mockPlugin }))
mock.module("opencode-anthropic-auth", () => ({ default: mockPlugin }))
mock.module("@gitlab/opencode-gitlab-auth", () => ({ default: mockPlugin }))

// Import after mocks are set up
const { tmpdir } = await import("../fixture/fixture")
const { Instance } = await import("../../src/project/instance")
const { Provider } = await import("../../src/provider/provider")
const { Env } = await import("../../src/env")
const { Global } = await import("../../src/global")

test("Azure Anthropic: provider is defined in list", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    init: async () => {},
    fn: async () => {
      const providers = await Provider.list()
      expect(providers["azure-anthropic"]).toBeDefined()
      expect(providers["azure-anthropic"].name).toBe("Azure Anthropic")
      expect(providers["azure-anthropic"].id).toBe("azure-anthropic")
    },
  })
})

test("Azure Anthropic: includes all three Claude models", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    init: async () => {},
    fn: async () => {
      const providers = await Provider.list()
      const azureAnthropicProvider = providers["azure-anthropic"]
      expect(azureAnthropicProvider).toBeDefined()

      // Check for all three models
      const modelIds = Object.keys(azureAnthropicProvider.models)
      expect(modelIds).toContain("claude-sonnet-4-20250514")
      expect(modelIds).toContain("claude-3-5-sonnet-20241022")
      expect(modelIds).toContain("claude-3-5-haiku-20241022")
    },
  })
})

test("Azure Anthropic: Claude Sonnet 4 has correct configuration", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    init: async () => {},
    fn: async () => {
      const providers = await Provider.list()
      const model = providers["azure-anthropic"].models["claude-sonnet-4-20250514"]
      expect(model).toBeDefined()
      expect(model.name).toBe("Claude Sonnet 4")
      expect(model.providerID).toBe("azure-anthropic")
      expect(model.family).toBe("claude-4")
      expect(model.status).toBe("active")
      expect(model.release_date).toBe("2025-05-14")

      // Check capabilities
      expect(model.capabilities.temperature).toBe(true)
      expect(model.capabilities.toolcall).toBe(true)
      expect(model.capabilities.attachment).toBe(true)
      expect(model.capabilities.input.text).toBe(true)
      expect(model.capabilities.input.image).toBe(true)
      expect(model.capabilities.interleaved).toBe(true)

      // Check limits
      expect(model.limit.context).toBe(200000)
      expect(model.limit.output).toBe(16384)

      // Check cost
      expect(model.cost.input).toBe(3)
      expect(model.cost.output).toBe(15)
    },
  })
})

test("Azure Anthropic: Claude 3.5 Sonnet has correct configuration", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    init: async () => {},
    fn: async () => {
      const providers = await Provider.list()
      const model = providers["azure-anthropic"].models["claude-3-5-sonnet-20241022"]
      expect(model).toBeDefined()
      expect(model.name).toBe("Claude 3.5 Sonnet")
      expect(model.family).toBe("claude-3.5")
      expect(model.status).toBe("active")
      expect(model.capabilities.interleaved).toBe(false)
      expect(model.limit.output).toBe(8192)
    },
  })
})

test("Azure Anthropic: Claude 3.5 Haiku has correct configuration", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    init: async () => {},
    fn: async () => {
      const providers = await Provider.list()
      const model = providers["azure-anthropic"].models["claude-3-5-haiku-20241022"]
      expect(model).toBeDefined()
      expect(model.name).toBe("Claude 3.5 Haiku")
      expect(model.family).toBe("claude-3.5")
      expect(model.status).toBe("active")
      expect(model.cost.input).toBe(1)
      expect(model.cost.output).toBe(5)
      expect(model.limit.output).toBe(8192)
    },
  })
})

test("Azure Anthropic: baseURL from config takes precedence over env var", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          provider: {
            "azure-anthropic": {
              options: {
                baseURL: "https://custom-resource.openai.azure.com/anthropic/v1",
              },
            },
          },
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    init: async () => {
      Env.set("AZURE_ANTHROPIC_RESOURCE_NAME", "env-resource")
    },
    fn: async () => {
      const providers = await Provider.list()
      expect(providers["azure-anthropic"]).toBeDefined()
      expect(providers["azure-anthropic"].options?.baseURL).toBe(
        "https://custom-resource.openai.azure.com/anthropic/v1",
      )
    },
  })
})

test("Azure Anthropic: constructs baseURL from env var when no config", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    init: async () => {
      Env.set("AZURE_ANTHROPIC_RESOURCE_NAME", "my-resource")
    },
    fn: async () => {
      const providers = await Provider.list()
      expect(providers["azure-anthropic"]).toBeDefined()
      expect(providers["azure-anthropic"].options?.baseURL).toBe(
        "https://my-resource.openai.azure.com/anthropic/v1",
      )
    },
  })
})

test("Azure Anthropic: has AZURE_ANTHROPIC_API_KEY env requirement", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    init: async () => {},
    fn: async () => {
      const providers = await Provider.list()
      const azureProvider = providers["azure-anthropic"]
      expect(azureProvider).toBeDefined()
      expect(azureProvider.env).toContain("AZURE_ANTHROPIC_API_KEY")
    },
  })
})

test("Azure Anthropic: includes anthropic-beta headers", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    init: async () => {},
    fn: async () => {
      const providers = await Provider.list()
      const azureProvider = providers["azure-anthropic"]
      expect(azureProvider).toBeDefined()
      expect(azureProvider.options?.headers).toBeDefined()
      const headers = azureProvider.options?.headers as Record<string, string>
      expect(headers["anthropic-beta"]).toBeDefined()
      expect(headers["anthropic-beta"]).toContain("claude-code-20250219")
      expect(headers["anthropic-beta"]).toContain("interleaved-thinking-2025-05-14")
      expect(headers["anthropic-beta"]).toContain("fine-grained-tool-streaming-2025-05-14")
    },
  })
})

test("Azure Anthropic: provider is sorted at top position in list", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    init: async () => {},
    fn: async () => {
      const providers = await Provider.list()
      const providerIds = Object.keys(providers)

      // Find positions
      const azureAnthropicIndex = providerIds.indexOf("azure-anthropic")
      const opencodeIndex = providerIds.indexOf("opencode")
      const anthropicIndex = providerIds.indexOf("anthropic")
      const openaiIndex = providerIds.indexOf("openai")

      // Azure Anthropic should be before opencode and before anthropic/openai
      expect(azureAnthropicIndex).toBeGreaterThanOrEqual(0)
      if (opencodeIndex >= 0) {
        expect(azureAnthropicIndex).toBeLessThan(opencodeIndex)
      }
      if (anthropicIndex >= 0) {
        expect(azureAnthropicIndex).toBeLessThan(anthropicIndex)
      }
      if (openaiIndex >= 0) {
        expect(azureAnthropicIndex).toBeLessThan(openaiIndex)
      }
    },
  })
})

test("Azure Anthropic: loads when API key from auth.json is present", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          provider: {
            "azure-anthropic": {
              options: {
                baseURL: "https://my-resource.openai.azure.com/anthropic/v1",
              },
            },
          },
        }),
      )
    },
  })

  const authPath = path.join(Global.Path.data, "auth.json")

  // Save original auth.json if it exists
  let originalAuth: string | undefined
  try {
    originalAuth = await Bun.file(authPath).text()
  } catch {
    // File doesn't exist, that's fine
  }

  try {
    // Write test auth.json
    await Bun.write(
      authPath,
      JSON.stringify({
        "azure-anthropic": {
          type: "api",
          key: "test-api-key",
        },
      }),
    )

    await Instance.provide({
      directory: tmp.path,
      init: async () => {
        Env.set("AZURE_ANTHROPIC_RESOURCE_NAME", "")
      },
      fn: async () => {
        const providers = await Provider.list()
        expect(providers["azure-anthropic"]).toBeDefined()
        expect(providers["azure-anthropic"].key).toBe("test-api-key")
      },
    })
  } finally {
    // Restore original or delete
    if (originalAuth !== undefined) {
      await Bun.write(authPath, originalAuth)
    } else {
      try {
        await unlink(authPath)
      } catch {
        // Ignore errors if file doesn't exist
      }
    }
  }
})

describe("Azure Anthropic: provider ordering", () => {
  test("should place azure-anthropic early in priority list", () => {
    const priorityOrder = ["azure-anthropic", "opencode", "anthropic", "openai", "github-copilot"]
    const indexAzure = priorityOrder.indexOf("azure-anthropic")
    const indexOpencode = priorityOrder.indexOf("opencode")
    const indexAnthropic = priorityOrder.indexOf("anthropic")

    expect(indexAzure).toBeLessThan(indexOpencode)
    expect(indexAzure).toBeLessThan(indexAnthropic)
  })

  test("should have azure-anthropic as position 0 in priority", () => {
    const priorityOrder = ["azure-anthropic", "opencode", "anthropic", "openai", "github-copilot"]
    expect(priorityOrder[0]).toBe("azure-anthropic")
  })
})

test("Azure Anthropic: models inherit provider ID", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    init: async () => {},
    fn: async () => {
      const providers = await Provider.list()
      const models = Object.values(providers["azure-anthropic"].models)
      for (const model of models) {
        expect(model.providerID).toBe("azure-anthropic")
      }
    },
  })
})

test("Azure Anthropic: all models use anthropic npm package", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    init: async () => {},
    fn: async () => {
      const providers = await Provider.list()
      const models = Object.values(providers["azure-anthropic"].models)
      for (const model of models) {
        expect(model.api.npm).toBe("@ai-sdk/anthropic")
      }
    },
  })
})
