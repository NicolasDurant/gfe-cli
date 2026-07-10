import { GluegunCommand } from 'gluegun'
import { box, intro, log, outro } from '@clack/prompts'

const command: GluegunCommand = {
  name: 'gfe',
  run: async (toolbox) => {
    const { meta, print } = toolbox
    intro(print.colors.warning('GFE cli'))
    box(
      `${meta.packageJSON().description} \n` +
        `Version: v${meta.version()} \n` +
        `Path: ${meta.src} \n`,
      '',
      {
        contentAlign: 'left',
        titleAlign: 'left',
        width: 'auto',
        rounded: true,
        formatBorder: (border) => print.colors.warning(border),
      }
    )
    log.warn('Use `gfe --help` to see all available commands')
    outro('Made with ❤️ by Nicolas Durant')
  },
}

module.exports = command
