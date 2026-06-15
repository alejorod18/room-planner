import { get, set, del, keys } from 'idb-keyval';
import type { Furniture, RulerLine, CalibrationLine } from '../hooks/useEditorState';

export interface ProjectState {
  id: string;
  name: string;
  imageBase64: string | null;
  pixelsPerMeter: number | null;
  furnitures: Furniture[];
  rulerLines: RulerLine[];
  calibrationLines: CalibrationLine[];
  updatedAt: number;
}

const STORAGE_PREFIX = 'planfixer_proj_';

export const saveProject = async (name: string, state: Omit<ProjectState, 'id' | 'name' | 'updatedAt'>): Promise<string> => {
  const id = Date.now().toString();
  const project: ProjectState = {
    ...state,
    id,
    name,
    updatedAt: Date.now()
  };
  await set(STORAGE_PREFIX + id, project);
  return id;
};

export const updateProject = async (id: string, name: string, state: Omit<ProjectState, 'id' | 'name' | 'updatedAt'>): Promise<void> => {
  const project: ProjectState = {
    ...state,
    id,
    name,
    updatedAt: Date.now()
  };
  await set(STORAGE_PREFIX + id, project);
};

export const getProjectsList = async (): Promise<Pick<ProjectState, 'id' | 'name' | 'updatedAt'>[]> => {
  const allKeys = await keys();
  const projectKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(STORAGE_PREFIX));
  
  const projects = await Promise.all(
    projectKeys.map(async (key) => {
      const proj = await get<ProjectState>(key as string);
      return {
        id: proj!.id,
        name: proj!.name,
        updatedAt: proj!.updatedAt
      };
    })
  );
  
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const loadProject = async (id: string): Promise<ProjectState | undefined> => {
  return await get<ProjectState>(STORAGE_PREFIX + id);
};

export const deleteProject = async (id: string): Promise<void> => {
  await del(STORAGE_PREFIX + id);
};
