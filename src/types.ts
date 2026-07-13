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
export type GFEConfig = {
  factorial?: {
    apiKey: string
    apiBaseUrl: string
  }
  projects: GFEProjectPaths
}
