import { GluegunCommand } from 'gluegun'
import { intro, log, outro } from '@clack/prompts'

const command: GluegunCommand = {
  commandPath: ['gfe', 'doctor'],
  name: 'doctor',
  run: async (toolbox) => {
    const { version } = toolbox
    intro('🩺 The GFE doctor is checking your system...')
    // #region Check versions
    try {
      await version.compareAll([
        { name: 'composer', version: '>=18.0.0' },
        { name: 'docker', version: '20 - 22' },
        { name: 'node', version: '>=18.0.0' },
      ])
    } catch (error) {
      log.error(`Error checking versions: ${error.message}`)
    }
    // #endregion
    outro('The doctor is slightly tired, but he is happy to help you! 😴')
  },
}

module.exports = command
