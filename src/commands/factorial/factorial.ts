import { GluegunCommand } from 'gluegun'
import { intro, log, outro, select, text } from '@clack/prompts'
import * as path from 'path'
import type { FactorialLocationType, FactorialShiftType } from '../../types'

const { parse } = require(
  path.resolve(__dirname, '../../../node_modules/@bomb.sh/args/dist/index.js')
)
const clockCommand = require('./factorial--clock')

const command: GluegunCommand = {
  commandPath: ['gfe', 'factorial'],
  description: 'Manually track break/working time or toggle clock in/out in Factorial',
  name: 'factorial',
  run: async (toolbox) => {
    // #region Parse arguments
    const args = parse(process.argv.slice(2), {
      boolean: ['clock'],
    }) as { clock?: boolean }
    if (args.clock) {
      return clockCommand.run(toolbox)
    }
    // #endregion
    const { factorial, gfe } = toolbox
    try {
      const config = gfe.loadConfig()
      intro('🕒 Factorial shift tracking')
      // #region Track shift
      const shiftType = await select({
        message: 'What do you want to track?',
        options: [
          { value: 'work', label: 'Working time' },
          { value: 'break', label: 'Break time' },
        ],
      })
      if (shiftType !== 'work' && shiftType !== 'break') {
        log.error('Tracking canceled.')
        process.exitCode = 1
        return
      }
      const start = await text({
        message: 'Start time (HH:mm or ISO timestamp):',
        validate: (value) => {
          if (!value?.trim()) {
            return 'Start time is required.'
          }
          try {
            factorial.parseDateTime(value)
            return undefined
          } catch (error) {
            return error instanceof Error ? error.message : 'Invalid start time.'
          }
        },
      })
      if (typeof start !== 'string') {
        log.error('Tracking canceled.')
        process.exitCode = 1
        return
      }
      // #endregion
      // #region Track break/working time
      const end = await text({
        message: 'End time (HH:mm or ISO timestamp):',
        validate: (value) => {
          if (!value?.trim()) {
            return 'End time is required.'
          }
          try {
            const clockIn = factorial.parseDateTime(start)
            const clockOut = factorial.parseDateTime(value, new Date(clockIn))
            if (new Date(clockOut) <= new Date(clockIn)) {
              return 'End time must be after start time.'
            }
            return undefined
          } catch (error) {
            return error instanceof Error ? error.message : 'Invalid end time.'
          }
        },
      })
      if (typeof end !== 'string') {
        log.error('Tracking canceled.')
        process.exitCode = 1
        return
      }

      let locationType: FactorialLocationType | undefined
      if (shiftType === 'work') {
        const location = await select({
          message: 'Where did you work from?',
          options: [
            { value: 'office', label: 'Office' },
            { value: 'work_from_home', label: 'Work from home' },
            { value: 'business_trip', label: 'Business trip' },
          ],
        })
        if (
          location !== 'office' &&
          location !== 'work_from_home' &&
          location !== 'business_trip'
        ) {
          log.error('Tracking canceled.')
          process.exitCode = 1
          return
        }
        locationType = location
      }
      // #endregion
      // #region Resolve employee ID
      const employeeId = await factorial.resolveEmployeeId(config)
      const shift = await factorial.trackShift(config, employeeId, {
        type: shiftType as FactorialShiftType,
        start,
        end,
        locationType,
      })
      const label = shiftType === 'work' ? 'Working time' : 'Break'
      log.success(
        `${label} tracked from ${shift.clock_in} to ${shift.clock_out}`
      )
      // #endregion
      outro()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred.'
      log.error(message)
      process.exitCode = 1
    }
  },
}

module.exports = command
