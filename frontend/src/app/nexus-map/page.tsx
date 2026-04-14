"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api } from "@/lib/api";
import { Network, Loader2 } from "lucide-react";

const NODE_COLORS: Record<string, string> = {
  project: "#6366f1",
  task: "#3b82f6",
  bom: "#f59e0b",
};

const STATUS_COLORS: Record<string, string> = {
  blocked: "#ef4444",
  done: "#22c55e",
  completed: "#22c55e",
  received: "#22c55e",
  ordered: "#f59e0b",
  pending: "#94a3b8",
};

function autoLayout(nodes: Node[]): Node[] {
  const byType: Record<string, Node[]> = { project: [], task: [], bom: [] };
  for (const n of nodes) byType[n.type || "task"]?.push(n);

  let y = 0;
  const result: Node[] = [];
  for (const type of ["project", "task", "bom"]) {
    const items = byType[type] || [];
    items.forEach((n, i) => {
      result.push({
        ...n,
        position: { x: i * 250, y },
        style: {
          background: (n.data as Record<string, unknown>)?.is_blocked
            ? "#ef444420"
            : `${NODE_COLORS[type]}15`,
          border: `1.5px solid ${(n.data as Record<string, unknown>)?.is_blocked ? "#ef4444" : NODE_COLORS[type]}`,
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: 12,
          color: "#e2e8f0",
          minWidth: 150,
        },
      });
    });
    y += 180;
  }
  return result;
}

export default function NexusMapPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Node | null>(null);

  useEffect(() => {
    api.getGraph()
      .then(({ nodes: rawNodes, edges: rawEdges }) => {
        const laid = autoLayout(rawNodes as Node[]);
        setNodes(laid as Node[]);
        setEdges(
          (rawEdges as Edge[]).map((e) => ({
            ...e,
            style: { stroke: "#6366f180", ...(e.style || {}) },
          })) as Edge[]
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelected(node);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="nexus-skeleton h-10 w-64 max-w-full" />
        <div className="nexus-surface nexus-surface--static rounded-xl min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl sm:text-3xl font-bold tracking-tight">
            <Network className="w-7 h-7 sm:w-8 sm:h-8 text-accent shrink-0" />
            <span className="nexus-page-title-bar">NexusMap</span>
          </h1>
          <p className="text-muted mt-2 text-sm sm:text-base">
            Граф зависимостей проектов, задач и деталей
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted sm:justify-end">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: NODE_COLORS.project }} />Проекты
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: NODE_COLORS.task }} />Задачи
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: NODE_COLORS.bom }} />BOM
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500" />Blocked
          </span>
        </div>
      </div>

      <div
        className="nexus-surface nexus-surface--static overflow-hidden rounded-xl"
        style={{ height: "70vh" }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#334155" gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => {
              if ((n.data as Record<string, unknown>)?.is_blocked) return "#ef4444";
              return NODE_COLORS[n.type || "task"] || "#6366f1";
            }}
            style={{ background: "#0f172a" }}
          />
        </ReactFlow>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="nexus-surface nexus-surface--static rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              {(selected.data as Record<string, unknown>)?.label as string}
            </h3>
            <button onClick={() => setSelected(null)} className="text-muted hover:text-foreground text-xs">
              Закрыть
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-muted">Тип:</span>{" "}
              <span className="font-mono">{selected.type}</span>
            </div>
            <div>
              <span className="text-muted">Статус:</span>{" "}
              <span
                className="font-medium"
                style={{ color: STATUS_COLORS[(selected.data as Record<string, unknown>)?.status as string] || "#94a3b8" }}
              >
                {(selected.data as Record<string, unknown>)?.status as string}
              </span>
            </div>
            {String((selected.data as Record<string, unknown>)?.priority || "") !== "" && (
              <div>
                <span className="text-muted">Приоритет:</span>{" "}
                {String((selected.data as Record<string, unknown>)?.priority)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
