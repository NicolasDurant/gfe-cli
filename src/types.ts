// #region GFE
export type GFEConfig = {
  factorial?: {
    apiKey: string
    apiBaseUrl: string
    email?: string
  }
  projects: GFEProjectPaths
}
export type GFERepositoryType = 'git'
export type GFERepositoryMonorepo = 'both' | 'frontend' | 'backend'
export type GFERepository = {
  type: GFERepositoryType
  url: string
  targetBranch: string
  monorepo: GFERepositoryMonorepo
}
export type GFEProject = {
  name: string
  alias: string
  command: string
  repository: GFERepository
}
export type GFEProjectPaths = Record<string, string>
// #endregion

// #region Factorial
export type FactorialLocationType = 'office' | 'work_from_home' | 'business_trip'
export type FactorialShiftType = 'work' | 'break'
export type FactorialPagedResponse<T> = {
  data: T[]
  meta?: Record<string, unknown>
}
export type FactorialCredential = {
  company_id: string
  id: string
  employee_id?: string
  email?: string
  login_email?: string
  full_name?: string
}
export type FactorialEmployee = {
  id: string
  email?: string
  login_email?: string
  full_name: string
  first_name: string
  last_name: string
}
export type FactorialShift = {
  id: number | string
  employee_id: number | string
  date: string
  clock_in: string | null
  clock_out: string | null
  location_type: FactorialLocationType | null
  workable?: boolean
}
// #endregion