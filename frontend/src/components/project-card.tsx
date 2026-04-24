"use client";

import Link from "next/link";
import { ExternalLink, GitBranch } from "lucide-react";
import type { ProjectCard } from "@/lib/types";
import { STATUS_LABELS, STATUS_COLORS, PROJECT_TYPE_LABELS, PROJECT_TYPE_COLORS } from "@/lib/types";

interface Props {
  project: ProjectCard;
}

export function ProjectCardComponent({ project }: Props) {
  const progress = Math.round(project.overall_progress);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="border border-border rounded-lg p-5 bg-surface hover:bg-surface-hover transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-lg text-foreground group-hover:text-accent transition-colors line-clamp-1">
            {project.title}
          </h3>
          {project.project_type && project.project_type !== "general" && (
            <span
              className={`inline-block text-[10px] px-1.5 py-0.5 rounded-md mt-0.5 ${
                PROJECT_TYPE_COLORS[project.project_type] || "bg-border text-foreground-muted"
              }`}
            >
              {PROJECT_TYPE_LABELS[project.project_type] || project.project_type}
            </span>
          )}
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ml-2 flex-shrink-0 ${
            STATUS_COLORS[project.status] || "bg-border text-foreground-muted"
          }`}
        >
          {STATUS_LABELS[project.status] || project.status}
        </span>
      </div>

      {project.tech_stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.tech_stack.slice(0, 5).map((tech) => (
            <span
              key={tech}
              className="text-xs bg-surface-hover text-foreground-secondary px-2 py-0.5 rounded-md border border-border-subtle"
            >
              {tech}
            </span>
          ))}
          {project.tech_stack.length > 5 && (
            <span className="text-xs text-foreground-muted">
              +{project.tech_stack.length - 5}
            </span>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground-muted">Прогресс</span>
          <span className="font-medium text-foreground">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden border border-border-subtle">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {project.repository_url && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-foreground-muted">
          <GitBranch className="w-3.5 h-3.5" />
          <span className="truncate">{project.repository_url}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </div>
      )}
    </Link>
  );
}
