import { GluegunCommand } from 'gluegun'
import { cancel, confirm, intro, log, outro } from '@clack/prompts'
import type { GFEConfig, GFEProject, GFEProjectPaths } from '../types'

const command: GluegunCommand = {
  commandPath: ['gfe', 'init'],
  description: 'Init the GFE cli configuration file',
  name: 'init',
  run: async (toolbox) => {
    const { filesystem, meta, print, gfe } = toolbox
    // Get repositories
    try {
      const whoami = meta.src ? meta.src.replace('/src', '') : undefined
      if (!whoami) {
        throw new Error(
          'Could not determine the root directory of the repository.'
        )
      }
      intro("Let's initialize the GFE cli configuration file (.gfe.json):")
      if (filesystem.exists(`${whoami}/.gfe.json`)) {
        log.warning(
          `A GFE configuration file already exists at ${print.colors.warning(
            `${whoami}/.gfe.json`
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
      const projects: GFEProject[] = await gfe.getProjects()
      const userRepositoryProjects: GFEProjectPaths =
        await gfe.collectUserRepositoryProjects(projects)
      if (Object.keys(userRepositoryProjects).length > 0) {
        const gfeConfig: GFEConfig = {
          projects: userRepositoryProjects,
        }
        filesystem.write(`${whoami}/.gfe.json`, gfeConfig, { jsonIndent: 2 })
        log.success('Found some matching projects:')
        const tableData: [string, string][] = Object.entries(
          userRepositoryProjects
        ).map(([name, path]) => [name, path])
        print.table([['Name', 'Path'], ...tableData], {
          format: 'lean',
        })
      } else {
        log.info(
          'No supported projects found.\nYou can add them later by editing the .gfe.json file, or by re-running the initialization process.'
        )
      }
      outro(`Initialization complete!`)
    } catch (error) {
      log.error(
        `Error initializing GFE cli: ${print.colors.error(error.message)}`
      )
    }
  },
}

module.exports = command
