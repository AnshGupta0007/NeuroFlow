// Directed acyclic graph algorithms for task dependencies

function buildAdjacencyList(tasks, dependencies) {
  const graph = {};
  const inDegree = {};

  for (const task of tasks) {
    graph[task.id] = [];
    inDegree[task.id] = 0;
  }

  for (const dep of dependencies) {
    // dep.task_id depends on dep.depends_on_task_id
    // meaning depends_on must complete before task_id can start
    if (graph[dep.depends_on_task_id]) {
      graph[dep.depends_on_task_id].push(dep.task_id);
    }
    if (inDegree[dep.task_id] !== undefined) {
      inDegree[dep.task_id]++;
    }
  }

  return { graph, inDegree };
}

function topologicalSort(tasks, dependencies) {
  const { graph, inDegree } = buildAdjacencyList(tasks, dependencies);
  const queue = Object.keys(inDegree).filter(id => inDegree[id] === 0);
  const sorted = [];

  while (queue.length > 0) {
    const node = queue.shift();
    sorted.push(node);
    for (const neighbor of (graph[node] || [])) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  const hasCycle = sorted.length !== tasks.length;
  return { sorted, hasCycle };
}

function calculateCriticalPath(tasks, dependencies) {
  const taskMap = Object.fromEntries(tasks.map(t => [t.id, t]));
  const { graph, inDegree: rawInDegree } = buildAdjacencyList(tasks, dependencies);
  const inDegree = { ...rawInDegree };

  // earliest finish time per task
  const earliestStart = {};
  const earliestFinish = {};
  const queue = Object.keys(inDegree).filter(id => inDegree[id] === 0);

  for (const id of Object.keys(taskMap)) {
    earliestStart[id] = 0;
  }

  const order = [];
  const tempInDegree = { ...inDegree };
  const tempQueue = [...queue];

  while (tempQueue.length) {
    const node = tempQueue.shift();
    order.push(node);
    const effort = taskMap[node]?.effort_estimate || 1;
    earliestFinish[node] = (earliestStart[node] || 0) + effort;

    for (const neighbor of (graph[node] || [])) {
      earliestStart[neighbor] = Math.max(
        earliestStart[neighbor] || 0,
        earliestFinish[node]
      );
      tempInDegree[neighbor]--;
      if (tempInDegree[neighbor] === 0) tempQueue.push(neighbor);
    }
  }

  // Total project duration = max finish time
  const totalDuration = Math.max(...Object.values(earliestFinish), 0);

  // Find critical path: tasks where earliestFinish[task] contributes to total duration
  const latestFinish = {};
  const latestStart = {};
  for (const id of Object.keys(taskMap)) {
    latestFinish[id] = totalDuration;
  }

  // Backward pass
  for (let i = order.length - 1; i >= 0; i--) {
    const node = order[i];
    const effort = taskMap[node]?.effort_estimate || 1;
    latestStart[node] = latestFinish[node] - effort;

    // Update predecessors
    for (const dep of dependencies) {
      if (dep.task_id === node) {
        const pred = dep.depends_on_task_id;
        latestFinish[pred] = Math.min(latestFinish[pred] || totalDuration, latestStart[node]);
      }
    }
  }

  const criticalPath = order.filter(id => {
    const effort = taskMap[id]?.effort_estimate || 1;
    const slack = (latestFinish[id] || 0) - (earliestFinish[id] || 0);
    return slack === 0;
  });

  return { totalDuration, criticalPath, earliestStart, earliestFinish, latestStart, latestFinish };
}

function detectBlockedTasks(tasks, dependencies) {
  const blocked = [];
  const blockedTaskIds = new Set(
    dependencies
      .filter(d => {
        const dep = tasks.find(t => t.id === d.depends_on_task_id);
        return dep && dep.status !== 'done';
      })
      .map(d => d.task_id)
  );

  for (const task of tasks) {
    if (blockedTaskIds.has(task.id) && task.status !== 'done') {
      const blockingTasks = dependencies
        .filter(d => d.task_id === task.id)
        .map(d => {
          const blocker = tasks.find(t => t.id === d.depends_on_task_id);
          return blocker && blocker.status !== 'done' ? blocker : null;
        })
        .filter(Boolean);
      blocked.push({ task, blockedBy: blockingTasks });
    }
  }
  return blocked;
}

module.exports = { topologicalSort, calculateCriticalPath, detectBlockedTasks, buildAdjacencyList };
