import { GluegunCommand } from 'gluegun'
import {
  cancel,
  confirm,
  intro,
  log,
  outro,
  password,
  text,
} from '@clack/prompts'
import type { GFEConfig, GFEProject, GFEProjectPaths } from '../types'

const command: GluegunCommand = {
  commandPath: ['gfe', 'init'],
  description: 'Init the GFE cli configuration file',
  name: 'init',
  run: async (toolbox) => {
    const { filesystem, print, gfe } = toolbox
    try {
      const packageRoot = gfe.getPackageRoot()
      intro("🛠️ Let's initialize the GFE cli configuration file (.gfe.json):")
      // #region Check for existing configuration file
      if (filesystem.exists(`${packageRoot}/.gfe.json`)) {
        log.warning(
          `A GFE configuration file already exists at ${print.colors.warning(
            `${packageRoot}/.gfe.json`
          )}.`
        )
        const hasConfirmedOverwrite = await confirm({
          message:
            'Do you want to continue? (This will overwrite the existing file)',
        })
        if (!hasConfirmedOverwrite) {
          cancel('Initialization canceled by user.')
          return
        }
      }
      // #endregion
      const gfeConfig: GFEConfig = { projects: {} }
      // #region Collect user repository projects
      const projects: GFEProject[] = await gfe.getProjects()
      const userRepositoryProjects: GFEProjectPaths =
        await gfe.collectUserRepositoryProjects(projects)
      // #endregion
      // #region Write configuration file
      if (Object.keys(userRepositoryProjects).length > 0) {
        log.success('Found some matching projects:')
        const tableData: [string, string][] = Object.entries(
          userRepositoryProjects
        ).map(([name, path]) => [name, path])
        print.table([['Name', 'Path'], ...tableData], {
          format: 'lean',
        })
        gfeConfig.projects = userRepositoryProjects
      } else {
        log.info(
          'No supported projects found.\nYou can add them later by editing the .gfe.json file, or by re-running the initialization process.'
        )
      }
      // #region Ask if the user wants to add Factorial configuration
      const wantsFactorialConfig = await confirm({
        message: 'Do you want to add Factorial?',
      })
      if (wantsFactorialConfig) {
        const apiKey = await password({
          message: 'Enter your Factorial API key:',
          validate: (value) => {
            if (!value || value.trim() === '') {
              return 'API key cannot be empty.'
            }
            return undefined
          },
        })
        const apiBaseUrl = await text({
          message: 'Enter your Factorial API base URL:',
          initialValue: 'https://api.factorialhr.com',
          validate: (value) => {
            if (!value || value.trim() === '') {
              return 'API base URL cannot be empty.'
            }
            return undefined
          },
        })
        const email = await text({
          message: 'Enter your Factorial work email:',
          validate: (value) => {
            if (!value || value.trim() === '') {
              return 'Work email cannot be empty.'
            }
            return undefined
          },
        })
        gfeConfig.factorial = {
          apiKey: String(apiKey),
          apiBaseUrl: String(apiBaseUrl),
          email: String(email),
        }
      }
      filesystem.write(`${packageRoot}/.gfe.json`, gfeConfig, { jsonIndent: 2 })
      // #endregion
      outro(`Initialization complete!`)
    } catch (error) {
      log.error(
        `Error initializing GFE cli: ${print.colors.error(error.message)}`
      )
    }
  },
}

module.exports = command
