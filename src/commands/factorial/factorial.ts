import { GluegunCommand } from 'gluegun'
import { intro, log, outro, select, text } from '@clack/prompts'
import { parse } from '../../../node_modules/@bomb.sh/args/dist/index.js'
import type { FactorialLocationType, FactorialShiftType } from '../../types'
import clockCommand from './factorial--clock'

function formatLocalDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`
}

function parseLocalDate(input: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim())
  if (!match) {
    throw new Error('Use YYYY-MM-DD format.')
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new Error('Invalid date.')
  }
  return parsed
}

const command: GluegunCommand = {
  commandPath: ['gfe', 'factorial'],
  description:
    'Manually track break/working time or toggle clock in/out in Factorial',
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
      const today = formatLocalDate(new Date())
      const trackingDate = await text({
        message: 'Date to track (YYYY-MM-DD):',
        initialValue: today,
        validate: (value) => {
          if (!value?.trim()) {
            return 'Date is required.'
          }
          try {
            parseLocalDate(value)
            return undefined
          } catch (error) {
            return error instanceof Error ? error.message : 'Invalid date.'
          }
        },
      })
      if (typeof trackingDate !== 'string') {
        log.error('Tracking canceled.')
        process.exitCode = 1
        return
      }
      const trackingDateReference = parseLocalDate(trackingDate)
      const start = await text({
        message: 'Start time (HH or HH:mm or ISO timestamp):',
        validate: (value) => {
          if (!value?.trim()) {
            return 'Start time is required.'
          }
          try {
            factorial.parseDateTime(value, new Date(trackingDateReference))
            return undefined
          } catch (error) {
            return error instanceof Error
              ? error.message
              : 'Invalid start time.'
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
        message: 'End time (HH or HH:mm or ISO timestamp):',
        validate: (value) => {
          if (!value?.trim()) {
            return 'End time is required.'
          }
          try {
            const clockIn = factorial.parseDateTime(
              start,
              new Date(trackingDateReference)
            )
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
            { value: 'work_from_home', label: 'Work from home' },
            { value: 'office', label: 'Office' },
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
      const parsedStart = factorial.parseDateTime(
        start,
        new Date(trackingDateReference)
      )
      const parsedEnd = factorial.parseDateTime(end, new Date(parsedStart))
      const employeeId = await factorial.resolveEmployeeId(config)
      const shift = await factorial.trackShift(config, employeeId, {
        type: shiftType as FactorialShiftType,
        start: parsedStart,
        end: parsedEnd,
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
