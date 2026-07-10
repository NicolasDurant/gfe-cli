import { GluegunCommand } from 'gluegun'
import { box, intro, outro } from '@clack/prompts'

const command: GluegunCommand = {
  name: 'gfe',
  run: async (toolbox) => {
    const { print } = toolbox
    intro(print.colors.warning('GFE CLI'))
    box(
      `
      `,
      '',
      {
        contentAlign: 'left',
        titleAlign: 'left',
        width: 'auto',
        rounded: true,
        formatBorder: (border) => print.colors.warning(border),
      }
    )
    outro()
  },
}

module.exports = command
