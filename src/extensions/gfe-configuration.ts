import { GluegunToolbox } from 'gluegun'
import { path, select } from '@clack/prompts'
import type { GFEProject, GFEProjectPaths } from '../types'

module.exports = (toolbox: GluegunToolbox) => {
  /**
   * Fetches the list of GFE projects from the `src/projects` directory.
   * @returns  A promise that resolves to an array of GFEProject objects.
   */
  async function getProjects(): Promise<GFEProject[]> {
    const { filesystem, meta } = toolbox
    const projectsPath = `${meta.src}/projects`
    const projectFiles = filesystem.list(projectsPath)
    if (!projectFiles || projectFiles.length === 0) {
      return []
    }
    const projects = projectFiles
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const projectData = filesystem.read(`${projectsPath}/${file}`, 'json')
        return projectData
      })
    return projects
  }

  /**
   * Collects the paths of user repositories that match the given GFE projects.
   * @param projects An array of GFEProject objects to match against.
   * @returns A promise that resolves to a GFEProjectPaths object mapping project names to their paths.
   */
  async function collectUserRepositoryProjects(
    projects: GFEProject[] = []
  ): Promise<GFEProjectPaths> {
    const { filesystem } = toolbox
    const repositoriesPath = await path({
      message: 'Where is your installation path of GFE repositories?',
      root: filesystem.homedir(),
      directory: true,
    })
    if (typeof repositoriesPath !== 'string') {
      throw new Error('Invalid path provided.')
    }
    const repositoriesPathTree = filesystem.inspectTree(repositoriesPath)
    const repositoryDirectories = (repositoriesPathTree.children || []).filter(
      (child) => child.type === 'dir'
    )
    const repositoryNames = repositoryDirectories.map((child) => child.name)
    const matchedProjects = projects.filter((project) =>
      repositoryNames.includes(project.name)
    )
    const userProjectPaths = matchedProjects.reduce<GFEProjectPaths>(
      (projectPaths, project) => {
        projectPaths[project.name] = `${repositoriesPath}/${project.name}`
        return projectPaths
      },
      {}
    )
    if (
      !repositoriesPathTree.children ||
      repositoriesPathTree.children.length === 0 ||
      repositoryDirectories.length === 0 ||
      Object.keys(userProjectPaths).length === 0
    ) {
      const noGFERepositoriesPrompt = await select({
        message:
          "The folder doesn't contain any GFE repositories.\nDo you want to select another path or continue (you simply don't have any GFE repositories, that are supported by our cli yet)?",
        options: [
          {
            value: 'continue',
            label: 'Continue',
            hint: 'Continue without selecting a path',
          },
          {
            value: 'reselect',
            label: 'Reselect',
            hint: 'Reselect a different path',
          },
          {
            value: 'abort',
            label: 'Abort',
            hint: 'Cancel the initialization process',
          },
        ],
      })
      if (noGFERepositoriesPrompt === 'abort') {
        throw new Error('Initialization canceled by user.')
      } else if (noGFERepositoriesPrompt === 'reselect') {
        return collectUserRepositoryProjects(projects)
      } else {
        return {}
      }
    } else {
      return userProjectPaths
    }
  }

  toolbox.gfe = { getProjects, collectUserRepositoryProjects }
}
