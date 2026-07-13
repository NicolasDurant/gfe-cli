import { GluegunToolbox } from 'gluegun'
import * as semver from 'semver'
import { log, progress } from '@clack/prompts'
interface Tool {
  command: string
  name: string
}
const tools: Tool[] = [
  { command: 'composer -v', name: 'composer' },
  { command: 'docker -v', name: 'docker' },
  { command: 'node -v', name: 'node' },
]

module.exports = (toolbox: GluegunToolbox) => {
  /**
   * Compares the installed version of a tool with the required version.
   * @param name The name of the tool to compare.
   * @param version The required version of the tool.
   * @returns A promise that resolves to a string message indicating the comparison result.
   */
  async function compare(name: string, version: string): Promise<string> {
    const tool = tools.find((t) => t.name === name)
    // TODO: remove obviously
    await new Promise((resolve) => setTimeout(resolve, 1000))
    if (!tool) {
      throw new Error(`Tool ${name} is not supported.`)
    }
    const { command } = tool
    let versionInstalled
    try {
      versionInstalled = await toolbox.system.run(command)
    } catch (error) {}
    const versionInstalledCoerced = semver.coerce(versionInstalled)?.version
    if (!semver.valid(versionInstalledCoerced)) {
      throw new Error(
        `${name} is not installed or the version could not be determined.`
      )
    }
    if (!semver.satisfies(versionInstalledCoerced, version)) {
      throw new Error(
        `${name} version ${versionInstalledCoerced} does not satisfy the required version ${version}.`
      )
    }
    return `${name} version ${versionInstalledCoerced} satisfies the required version ${version}.`
  }

  /**
   * Compares the installed versions of multiple tools with their required versions.
   * @param tools An array of objects containing the name and required version of each tool to compare.
   * @returns A promise that resolves when all comparisons are complete, logging the results to the console.
   */
  async function compareAll(
    tools: { name: string; version: string }[]
  ): Promise<void> {
    const results: { type: 'success' | 'error'; message: string }[] = []
    const progressBar = progress()
    progressBar.start('Checking required tools and versions...')
    const steps = 100 / tools.length
    let i = 0
    for (const tool of tools) {
      i++
      progressBar.advance(
        steps,
        `(${i}/${tools.length}) Checking ${tool.name}...`
      )
      try {
        const successMessage = await compare(tool.name, tool.version)
        results.push({ type: 'success', message: `✅ ${successMessage}` })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error occurred.'
        results.push({
          type: 'error',
          message: `❌ Error checking ${tool.name} version: ${message}`,
        })
      }
    }
    progressBar.stop('Compared all versions.')

    for (const result of results) {
      if (result.type === 'error') {
        log.error(result.message)
      } else {
        log.success(result.message)
      }
    }
  }
  toolbox.version = { compare, compareAll }
}
