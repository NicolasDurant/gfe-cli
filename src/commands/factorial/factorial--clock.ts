import { GluegunToolbox } from 'gluegun'
import { intro, log, outro } from '@clack/prompts'

async function run(toolbox: GluegunToolbox): Promise<void> {
  const { factorial, gfe } = toolbox

  try {
    const config = gfe.loadConfig()
    // #region Toggle clock
    intro('Factorial clock')
    const employeeId = await factorial.resolveEmployeeId(config)
    const shift = await factorial.toggleClock(config, employeeId)
    // #endregion
    // #region Report result
    if (shift.clock_out) {
      log.success(`Clocked out at ${shift.clock_out}`)
    } else if (shift.clock_in) {
      log.success(`Clocked in at ${shift.clock_in}`)
    } else {
      log.success('Shift updated.')
    }
    // #endregion
    outro('Done')
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred.'
    log.error(message)
    process.exitCode = 1
  }
}

const command = {
  name: 'factorial--clock',
  hidden: true,
  description: 'Toggle your Factorial attendance shift (clock in/out now)',
  run,
}

export default command
