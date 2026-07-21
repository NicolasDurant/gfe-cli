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
  monorepo: GFERepositoryMonorepo
  ssh: string
  targetBranch: string
  type: GFERepositoryType
  url: string
}
export type GFEProject = {
  alias: string
  command: string
  name: string
  repository: GFERepository
}
export type GFEProjectPaths = Record<string, string>
// #endregion

// #region Factorial
export type FactorialLocationType =
  | 'business_trip'
  | 'office'
  | 'work_from_home'
export type FactorialShiftType = 'break' | 'work'
export type FactorialPagedResponse<T> = {
  data: T[]
  meta?: Record<string, unknown>
}
export type FactorialCredential = {
  company_id: string
  id: string
  email?: string
  employee_id?: string
  full_name?: string
  login_email?: string
}
export type FactorialEmployee = {
  id: string
  email?: string
  first_name: string
  full_name: string
  last_name: string
  login_email?: string
}
export type FactorialShift = {
  id: number | string
  clock_in: string | null
  clock_out: string | null
  date: string
  employee_id: number | string
  location_type: FactorialLocationType | null
  workable?: boolean
}
// #endregion
