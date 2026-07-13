import { GluegunToolbox } from 'gluegun'
import type {
  FactorialCredential,
  FactorialEmployee,
  FactorialLocationType,
  FactorialPagedResponse,
  FactorialShift,
  FactorialShiftType,
  GFEConfig,
} from '../types'

const API_VERSION = '2026-07-01'

/**
 * Formats a date as a local date-time string.
 * @param date The date to format.
 * @returns The formatted date-time string.
 */
function formatLocalDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absoluteOffset = Math.abs(offsetMinutes)
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(absoluteOffset / 60))}:${pad(absoluteOffset % 60)}`
  )
}

/**
 * Parses a date-time string and returns a local date-time string.
 * @param input The date-time string to parse.
 * @param reference The reference date to use for parsing.
 * @returns The parsed date-time string.
 */
function parseDateTime(input: string, reference = new Date()): string {
  const trimmed = input.trim()
  if (/[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const parsed = new Date(trimmed)
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(
        `Could not parse "${input}". Use HH:mm (e.g. 09:30) or a full ISO timestamp.`
      )
    }
    return formatLocalDateTime(parsed)
  }
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed)
  if (timeMatch) {
    const parsed = new Date(reference)
    parsed.setHours(
      Number(timeMatch[1]),
      Number(timeMatch[2]),
      Number(timeMatch[3] ?? 0),
      0
    )
    return formatLocalDateTime(parsed)
  }
  throw new Error(
    `Could not parse "${input}". Use HH:mm (e.g. 09:30) or a full ISO timestamp.`
  )
}

module.exports = (toolbox: GluegunToolbox) => {
  /**
   * Makes a request to the Factorial API.
   * @param config The GFE configuration.
   * @param method The HTTP method to use.
   * @param apiPath The API path to request.
   * @param options The request options.
   * @returns The response from the API.
   */
  async function request<T>(
    config: GFEConfig,
    method: string,
    apiPath: string,
    options?: { body?: unknown; query?: Record<string, string | string[]> }
  ): Promise<T> {
    const base = config.factorial?.apiBaseUrl ?? 'https://api.factorialhr.com'
    const apiKey = config.factorial?.apiKey
    if (!apiKey) {
      throw new Error('Missing factorial.apiKey in .gfe.json')
    }
    let url = `${base}/api/${API_VERSION}${apiPath}`
    if (options?.query) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(options.query)) {
        if (Array.isArray(value)) {
          value.forEach((entry) => params.append(key, entry))
        } else {
          params.append(key, value)
        }
      }
      url += `?${params.toString()}`
    }

    // #region Request
    const response = await fetch(url, {
      method,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Factorial API ${response.status}: ${text}`)
    }
    // #endregion
    return response.json() as Promise<T>
  }

  /**
   * Gets the credentials from the Factorial API.
   * @param config The GFE configuration.
   * @returns The credentials from the Factorial API.
   */
  async function getCredentials(
    config: GFEConfig
  ): Promise<FactorialPagedResponse<FactorialCredential>> {
    return request<FactorialPagedResponse<FactorialCredential>>(
      config,
      'GET',
      '/resources/api_public/credentials'
    )
  }

  /**
   * Gets the employees from the Factorial API.
   * @param config The GFE configuration.
   * @param filters The filters to apply to the employees.
   * @returns The employees from the Factorial API.
   */
  async function getEmployees(
    config: GFEConfig,
    filters: { emails?: string[]; onlyActive?: boolean } = {}
  ): Promise<FactorialPagedResponse<FactorialEmployee>> {
    const query: Record<string, string | string[]> = {}
    if (filters.emails?.length) {
      query['emails[]'] = filters.emails
    }
    if (filters.onlyActive) {
      query.only_active = 'true'
    }
    return request<FactorialPagedResponse<FactorialEmployee>>(
      config,
      'GET',
      '/resources/employees/employees',
      { query }
    )
  }

  /**
   * Resolves the employee ID from the Factorial API.
   * @param config The GFE configuration.
   * @returns The employee ID from the Factorial API.
   */
  async function resolveEmployeeId(config: GFEConfig): Promise<number> {
    const credentials = await getCredentials(config)
    const credential = credentials.data[0]
    if (credential?.employee_id) {
      return Number(credential.employee_id)
    }

    const email =
      config.factorial?.email ??
      credential?.login_email ??
      credential?.email
    if (!email) {
      throw new Error(
        'Could not determine your Factorial employee. Add factorial.email to .gfe.json with your work email.'
      )
    }

    const employees = await getEmployees(config, {
      emails: [email],
      onlyActive: true,
    })
    const employee = employees.data[0]
    if (!employee) {
      throw new Error(`No active Factorial employee found for ${email}.`)
    }

    return Number(employee.id)
  }

  /**
   * Creates a shift in the Factorial API.
   * @param config The GFE configuration.
   * @param employeeId The ID of the employee to create the shift for.
   * @param options The options for the shift.
   * @returns The created shift from the Factorial API.
   */
  async function createShift(
    config: GFEConfig,
    employeeId: number,
    options: {
      clockIn: string
      clockOut: string
      workable: boolean
      locationType?: FactorialLocationType
      observations?: string
    }
  ): Promise<FactorialShift> {
    const date = options.clockIn.slice(0, 10)
    return request<FactorialShift>(config, 'POST', '/resources/attendance/shifts', {
      body: {
        employee_id: String(employeeId),
        date,
        clock_in: options.clockIn,
        clock_out: options.clockOut,
        workable: options.workable,
        location_type: options.locationType,
        observations: options.observations,
        source: 'api',
      },
    })
  }

  /**
   * Tracks a shift in the Factorial API.
   * @param config The GFE configuration.
   * @param employeeId The ID of the employee to track the shift for.
   * @param options The options for the shift.
   * @returns The tracked shift from the Factorial API.
   */
  async function trackShift(
    config: GFEConfig,
    employeeId: number,
    options: {
      type: FactorialShiftType
      start: string
      end: string
      locationType?: FactorialLocationType
      observations?: string
    }
  ): Promise<FactorialShift> {
    const reference = new Date()
    const clockIn = parseDateTime(options.start, reference)
    const clockOut = parseDateTime(options.end, new Date(clockIn))

    if (new Date(clockOut) <= new Date(clockIn)) {
      throw new Error('End time must be after start time.')
    }

    return createShift(config, employeeId, {
      clockIn,
      clockOut,
      workable: options.type === 'work',
      locationType: options.type === 'work' ? options.locationType : undefined,
      observations: options.observations,
    })
  }

  /**
   * Toggles the clock in the Factorial API.
   * @param config The GFE configuration.
   * @param employeeId The ID of the employee to toggle the clock for.
   * @param locationType The location type to toggle the clock for.
   * @returns The toggled clock from the Factorial API.
   */
  async function toggleClock(
    config: GFEConfig,
    employeeId: number,
    locationType: FactorialLocationType = 'office'
  ): Promise<FactorialShift> {
    return request<FactorialShift>(
      config,
      'POST',
      '/resources/attendance/shifts/toggle_clock',
      {
        body: {
          employee_id: employeeId,
          clock_time: formatLocalDateTime(new Date()),
          location_type: locationType,
        },
      }
    )
  }

  toolbox.factorial = {
    createShift,
    getCredentials,
    getEmployees,
    parseDateTime,
    resolveEmployeeId,
    request,
    toggleClock,
    trackShift,
  }
}
