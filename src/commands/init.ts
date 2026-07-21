import { GluegunCommand } from 'gluegun'
import {
  cancel,
  confirm,
  intro,
  isCancel,
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
    const userCanceledMessage = 'Initialization canceled by user.'
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
        if (isCancel(hasConfirmedOverwrite) || !hasConfirmedOverwrite) {
          cancel(userCanceledMessage)
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
      if (isCancel(wantsFactorialConfig)) {
        cancel(userCanceledMessage)
        return
      }
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
        if (isCancel(apiKey)) {
          cancel(userCanceledMessage)
          return
        }
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
        if (isCancel(apiBaseUrl)) {
          cancel(userCanceledMessage)
          return
        }
        const email = await text({
          message: 'Enter your Factorial work email:',
          validate: (value) => {
            if (!value || value.trim() === '') {
              return 'Work email cannot be empty.'
            }
            return undefined
          },
        })
        if (isCancel(email)) {
          cancel(userCanceledMessage)
          return
        }
        gfeConfig.factorial = {
          apiKey,
          apiBaseUrl,
          email,
        }
      }
      filesystem.write(`${packageRoot}/.gfe.json`, gfeConfig, { jsonIndent: 2 })
      // #endregion
      outro(`Initialization complete!`)
    } catch (error) {
      if (error?.message === userCanceledMessage) {
        cancel(userCanceledMessage)
        return
      }
      log.error(
        `Error initializing GFE cli: ${print.colors.error(error.message)}`
      )
    }
  },
}

module.exports = command
