import { GluegunCommand } from 'gluegun'

const command: GluegunCommand = {
  commandPath: ['gfe', 'doctor'],
  name: 'doctor',
  run: async (toolbox) => {
    toolbox.print.info(toolbox.print.colors.error('Welcome to the GFE CLI!'))
  },
}

module.exports = command
