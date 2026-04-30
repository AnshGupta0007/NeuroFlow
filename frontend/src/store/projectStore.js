import { create } from 'zustand';
import { projectsAPI, tasksAPI, membersAPI } from '../services/api';
import toast from 'react-hot-toast';

const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  tasks: [],
  members: [],
  dependencies: [],
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const res = await projectsAPI.getAll();
      set({ projects: res.data || [] });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProject: async (id) => {
    set({ isLoading: true });
    try {
      const [projectRes, tasksRes, membersRes, depsRes] = await Promise.all([
        projectsAPI.get(id),
        tasksAPI.getAll(id),
        membersAPI.getAll(id),
        tasksAPI.getDependencies(id)
      ]);
      set({
        currentProject: projectRes.data,
        tasks: tasksRes.data || [],
        members: membersRes.data || [],
        dependencies: depsRes.data || []
      });
    } finally {
      set({ isLoading: false });
    }
  },

  createProject: async (data) => {
    const res = await projectsAPI.create(data);
    const project = res.data;
    set(state => ({ projects: [...state.projects, project] }));
    toast.success('Project created!');
    return project;
  },

  updateProject: async (id, data) => {
    const res = await projectsAPI.update(id, data);
    const updated = res.data;
    set(state => ({
      projects: state.projects.map(p => p.id === id ? updated : p),
      currentProject: state.currentProject?.id === id ? { ...state.currentProject, ...updated } : state.currentProject
    }));
    toast.success('Project updated');
    return updated;
  },

  deleteProject: async (id) => {
    await projectsAPI.delete(id);
    set(state => ({
      projects: state.projects.filter(p => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject
    }));
    toast.success('Project deleted');
  },

  createTask: async (projectId, data) => {
    const res = await tasksAPI.create(projectId, data);
    const task = res.data;
    set(state => ({ tasks: [task, ...state.tasks] }));
    toast.success('Task created');
    return task;
  },

  updateTask: async (projectId, taskId, data) => {
    const res = await tasksAPI.update(projectId, taskId, data);
    const updated = res.data;
    set(state => ({
      tasks: state.tasks.map(t => t.id === taskId ? updated : t)
    }));
    return updated;
  },

  deleteTask: async (projectId, taskId) => {
    await tasksAPI.delete(projectId, taskId);
    set(state => ({ tasks: state.tasks.filter(t => t.id !== taskId) }));
    toast.success('Task deleted');
  },

  moveTask: async (projectId, taskId, newStatus) => {
    const res = await tasksAPI.update(projectId, taskId, { status: newStatus });
    const updated = res.data;
    set(state => ({
      tasks: state.tasks.map(t => t.id === taskId ? updated : t)
    }));
    return updated;
  },

  addDependency: async (projectId, taskId, dependsOnTaskId) => {
    const res = await tasksAPI.addDependency(projectId, taskId, {
      depends_on_task_id: dependsOnTaskId,
      project_id: projectId
    });
    const { tasks } = get();
    const pick = (t) => t ? { id: t.id, title: t.title, status: t.status, priority: t.priority } : null;
    const enriched = {
      ...res.data,
      task: pick(tasks.find(t => t.id === taskId)),
      depends_on: pick(tasks.find(t => t.id === dependsOnTaskId))
    };
    set(state => ({ dependencies: [...state.dependencies, enriched] }));
    toast.success('Dependency added');
  },

  removeDependency: async (projectId, taskId, dependsOnTaskId) => {
    await tasksAPI.removeDependency(projectId, taskId, dependsOnTaskId);
    set(state => ({
      dependencies: state.dependencies.filter(
        d => !(d.task_id === taskId && d.depends_on_task_id === dependsOnTaskId)
      )
    }));
    toast.success('Dependency removed');
  },

  addMember: async (projectId, data) => {
    const res = await membersAPI.add(projectId, data);
    set(state => ({ members: [...state.members, res.data] }));
    toast.success('Member added');
  },

  removeMember: async (projectId, memberId) => {
    await membersAPI.remove(projectId, memberId);
    set(state => ({ members: state.members.filter(m => m.user_id !== memberId) }));
    toast.success('Member removed');
  }
}));

export default useProjectStore;
