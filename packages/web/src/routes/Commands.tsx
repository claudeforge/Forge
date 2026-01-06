/**
 * Commands page - FORGE plugin command reference
 */

import { useState } from "react";
import {
  Terminal,
  FileText,
  ListTodo,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  GitBranch,
  Link2,
  HelpCircle,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Zap,
  RefreshCw,
  Upload,
  MessageSquare,
} from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { cn } from "../lib/utils";

// Command definitions
interface CommandDef {
  name: string;
  description: string;
  icon: React.ElementType;
  args?: string;
  examples: string[];
  details: string;
  category: "workflow" | "control" | "checkpoint" | "sync" | "info";
}

const commands: CommandDef[] = [
  // Workflow Commands
  {
    name: "/forge:forge-spec",
    description: "Create a new specification from feature description",
    icon: FileText,
    args: '"Feature description"',
    examples: [
      '/forge:forge-spec "Add user authentication with JWT"',
      '/forge:forge-spec "Implement dashboard with real-time updates"',
    ],
    details: `Creates a formal specification document in .forge/specs/.

The specification includes:
- Requirements analysis
- Acceptance criteria
- Technical considerations
- Clarifying questions

After creation, review and approve the spec before planning.`,
    category: "workflow",
  },
  {
    name: "/forge:forge-plan",
    description: "Create implementation plan from specification",
    icon: ListTodo,
    args: "SPEC_ID",
    examples: [
      "/forge:forge-plan spec-001",
      "/forge:forge-plan spec-003 --detailed",
    ],
    details: `Creates a detailed implementation plan with:
- Architecture decisions
- Task breakdown with dependencies
- File change estimates
- Success criteria per task

Tasks are created in .forge/tasks/ with proper dependency ordering.`,
    category: "workflow",
  },
  {
    name: "/forge:forge-queue",
    description: "Queue tasks for execution",
    icon: Layers,
    args: "--plan PLAN_ID | --task TASK_ID",
    examples: [
      "/forge:forge-queue --plan plan-001",
      "/forge:forge-queue --task t001 t002 t003",
      "/forge:forge-queue --plan plan-001 --skip t005",
    ],
    details: `Queues tasks for autonomous execution. Options:
- --plan: Queue all tasks from a plan (respects dependencies)
- --task: Queue specific tasks by ID
- --skip: Skip specific tasks
- --priority: Set execution priority

Tasks are queued in dependency order.`,
    category: "workflow",
  },
  {
    name: "/forge:forge",
    description: "Start autonomous task execution",
    icon: Zap,
    args: "[TASK_NAME] [options]",
    examples: [
      "/forge:forge",
      '/forge:forge "Fix login bug"',
      "/forge:forge --criteria test-pass lint-clean",
      "/forge:forge --max-iter 20",
    ],
    details: `Starts the FORGE autonomous loop. Options:
- Direct task: Provide task description inline
- From queue: Run next queued task
- --criteria: Specify success criteria
- --max-iter: Maximum iterations (default: 25)
- --checkpoint-every: Auto-checkpoint interval`,
    category: "workflow",
  },
  {
    name: "/forge:forge-adopt",
    description: "Formalize WebUI-created tasks into spec workflow",
    icon: Upload,
    args: "TASK_ID... [--create-spec]",
    examples: [
      "/forge:forge-adopt t001 --create-spec",
      "/forge:forge-adopt t001 t002 t003 --create-spec",
      "/forge:forge-adopt t005 --spec spec-001",
    ],
    details: `Adopts tasks created via WebUI into proper spec/plan structure.

WebUI tasks lack:
- Clarification and requirement analysis
- Architectural decisions
- Proper dependency mapping
- Success criteria definition

This command formalizes them with full specification.`,
    category: "workflow",
  },
  {
    name: "/forge:forge-request",
    description: "Process pending requests from WebUI",
    icon: MessageSquare,
    args: "[--all]",
    examples: ["/forge:forge-request", "/forge:forge-request --all"],
    details: `Processes spec/plan/adopt requests created from WebUI.

Request types:
- spec: Create new specification
- plan: Create plan for existing spec
- adopt: Formalize WebUI tasks
- clarify: Request clarification

Enables WebUI → Claude Code workflow.`,
    category: "workflow",
  },
  {
    name: "/forge:forge-batch",
    description: "Run all queued tasks until queue is empty (batch mode)",
    icon: Layers,
    args: "",
    examples: ["/forge:forge-batch"],
    details: `Runs in BATCH MODE - processes ALL tasks in the queue continuously.

Key behaviors:
- NO confirmation needed: Works autonomously
- AUTO-ADVANCE: Stop hook automatically claims next task
- CONTINUOUS: Keeps working until queue is empty
- NO interaction: Makes reasonable decisions autonomously

When a task completes, the stop hook claims the next task and blocks exit with the new task prompt.`,
    category: "workflow",
  },

  // Control Commands
  {
    name: "/forge:forge-pause",
    description: "Pause the current FORGE loop",
    icon: Pause,
    args: "",
    examples: ["/forge:forge-pause"],
    details: `Pauses execution after current iteration completes.

Use when you need to:
- Review progress manually
- Make manual code changes
- Intervene in the process

Resume with /forge:forge-resume.`,
    category: "control",
  },
  {
    name: "/forge:forge-resume",
    description: "Resume a paused FORGE loop",
    icon: Play,
    args: "",
    examples: ["/forge:forge-resume", "/forge:forge-resume --from-checkpoint"],
    details: `Resumes a paused FORGE task.

Options:
- Default: Continue from current state
- --from-checkpoint: Resume from last checkpoint

State is preserved across pause/resume.`,
    category: "control",
  },
  {
    name: "/forge:forge-abort",
    description: "Abort the current FORGE loop",
    icon: XCircle,
    args: "",
    examples: ["/forge:forge-abort", "/forge:forge-abort --save-progress"],
    details: `Stops execution immediately.

Options:
- Default: Abort and mark task as aborted
- --save-progress: Save current state before aborting

Use when task is stuck or going in wrong direction.`,
    category: "control",
  },
  {
    name: "/forge:forge-done",
    description: "Mark current task as complete manually",
    icon: CheckCircle,
    args: "",
    examples: ["/forge:forge-done"],
    details: `Explicitly signal task completion when criteria checks might not capture your success.

This will:
1. Mark the current task as completed
2. Sync completion status to Control Center
3. Auto-advance to the next queued task (if any)

Use when all requirements are met and verified.`,
    category: "control",
  },

  // Checkpoint Commands
  {
    name: "/forge:forge-checkpoint",
    description: "Create a manual checkpoint",
    icon: GitBranch,
    args: '[--name "checkpoint name"]',
    examples: [
      "/forge:forge-checkpoint",
      '/forge:forge-checkpoint --name "before-refactor"',
    ],
    details: `Creates a git stash checkpoint of current state.

Checkpoints capture:
- All file changes
- Current iteration metrics
- Criteria evaluation state

Use before risky operations. Auto-checkpoints also created based on config.`,
    category: "checkpoint",
  },
  {
    name: "/forge:forge-rollback",
    description: "Rollback to a previous checkpoint",
    icon: RotateCcw,
    args: "[CHECKPOINT_ID]",
    examples: [
      "/forge:forge-rollback",
      "/forge:forge-rollback checkpoint-3",
      "/forge:forge-rollback --list",
    ],
    details: `Restores code state from a checkpoint.

Options:
- Default: Rollback to most recent checkpoint
- CHECKPOINT_ID: Rollback to specific checkpoint
- --list: Show available checkpoints

Iteration counter resets to checkpoint iteration.`,
    category: "checkpoint",
  },

  // Sync Commands
  {
    name: "/forge:forge-register",
    description: "Register project with Control Center",
    icon: Link2,
    args: "[PROJECT_NAME] [--url URL]",
    examples: [
      "/forge:forge-register",
      '/forge:forge-register "My Project"',
      "/forge:forge-register --url http://localhost:3344",
    ],
    details: `Registers project for centralized management.

Auto-detects Control Center at http://127.0.0.1:3344.

Enables:
- Real-time task monitoring
- Centralized queue management
- Token usage analytics
- Spec/Plan/Task synchronization`,
    category: "sync",
  },
  {
    name: "/forge:forge-link",
    description: "Link to existing Control Center project",
    icon: RefreshCw,
    args: "PROJECT_ID",
    examples: [
      "/forge:forge-link proj-001",
      "/forge:forge-link proj-001 --url http://remote:3344",
    ],
    details: `Links current directory to an existing Control Center project.

Use when:
- Cloning a repo with existing FORGE setup
- Reconnecting after project move
- Linking multiple workspaces to same project`,
    category: "sync",
  },
  {
    name: "/forge:forge-sync",
    description: "Sync project state with Control Center",
    icon: RefreshCw,
    args: "[full|push|pull|pending]",
    examples: [
      "/forge:forge-sync",
      "/forge:forge-sync push",
      "/forge:forge-sync pull",
    ],
    details: `Synchronize local project state with Control Center.

Modes:
- full (default): Bidirectional sync
- push: Send local state to server
- pull: Fetch latest from server
- pending: Process queued updates only

Use when tasks show wrong status or are stuck as "running".`,
    category: "sync",
  },

  // Info Commands
  {
    name: "/forge:forge-status",
    description: "Show current FORGE status",
    icon: Clock,
    args: "",
    examples: ["/forge:forge-status"],
    details: `Shows comprehensive status:

- Active task info (if running)
- Current iteration and progress
- Criteria evaluation status
- Specifications overview
- Plans overview
- Task queue summary
- Control Center connection`,
    category: "info",
  },
  {
    name: "/forge:forge-history",
    description: "Show iteration history for current task",
    icon: CheckCircle,
    args: "",
    examples: ["/forge:forge-history", "/forge:forge-history --task t001"],
    details: `Displays iteration history:

| # | Outcome | Duration | Summary |
|---|---------|----------|---------|
| 1 | progress | 45s | Created structure |
| 2 | stuck | 32s | Tests failing |
| 3 | progress | 28s | Fixed tests |

Includes total tokens and duration.`,
    category: "info",
  },
  {
    name: "/forge:forge-tasks",
    description: "List tasks and their status",
    icon: ListTodo,
    args: "[--spec SPEC_ID] [--status STATUS]",
    examples: [
      "/forge:forge-tasks",
      "/forge:forge-tasks --spec spec-001",
      "/forge:forge-tasks --status pending",
    ],
    details: `Lists tasks with filtering options:

- --spec: Filter by specification
- --status: Filter by status (pending/queued/running/completed/failed)
- --plan: Filter by plan

Shows task ID, title, status, and dependencies.`,
    category: "info",
  },
  {
    name: "/forge:forge-help",
    description: "Show FORGE help and command reference",
    icon: HelpCircle,
    args: "[COMMAND]",
    examples: ["/forge:forge-help", "/forge:forge-help forge-spec"],
    details: `Shows help for FORGE commands.

Without arguments: Lists all commands
With command name: Shows detailed help for that command

Also accessible via this Control Center page!`,
    category: "info",
  },
];

// Lucide icon component for Layers (missing from initial import)
import { Layers } from "lucide-react";

// Category labels and colors
const categories = {
  workflow: {
    label: "Workflow",
    description: "Spec → Plan → Queue → Execute",
    color: "text-forge-500 dark:text-forge-400",
    bg: "bg-forge-500/10",
  },
  control: {
    label: "Control",
    description: "Pause, resume, abort execution",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  checkpoint: {
    label: "Checkpoints",
    description: "Save and restore progress",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  sync: {
    label: "Sync",
    description: "Control Center integration",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10",
  },
  info: {
    label: "Info",
    description: "Status and history",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
  },
};

// Command card component
function CommandCard({ command }: { command: CommandDef }) {
  const [expanded, setExpanded] = useState(false);
  const category = categories[command.category];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
        )}
        <div
          className={cn(
            "p-2 rounded-lg flex-shrink-0",
            category.bg
          )}
        >
          <command.icon className={cn("h-5 w-5", category.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <code className="text-forge-500 dark:text-forge-400 font-mono text-sm font-medium">
              {command.name}
            </code>
            {command.args && (
              <code className="text-gray-500 font-mono text-xs">
                {command.args}
              </code>
            )}
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{command.description}</p>
        </div>
        <span
          className={cn(
            "px-2 py-0.5 rounded text-xs font-medium",
            category.bg,
            category.color
          )}
        >
          {category.label}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
          <div className="pt-4 pl-9">
            {/* Examples */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Examples
              </h4>
              <div className="space-y-2">
                {command.examples.map((example, i) => (
                  <div
                    key={i}
                    className="bg-gray-100 dark:bg-gray-900 rounded px-3 py-2 font-mono text-sm text-gray-600 dark:text-gray-300"
                  >
                    {example}
                  </div>
                ))}
              </div>
            </div>

            {/* Details */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Details
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                {command.details}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Commands() {
  const [filter, setFilter] = useState<string | null>(null);

  const filteredCommands = filter
    ? commands.filter((c) => c.category === filter)
    : commands;

  return (
    <Layout title="Commands">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Terminal className="h-8 w-8 text-forge-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FORGE Commands</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Complete reference for Claude Code plugin commands. Use these in Claude Code
            to manage specification-driven development.
          </p>
        </div>

        {/* Quick Start */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Start</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">1. Create a specification:</p>
              <code className="block bg-gray-100 dark:bg-gray-900 rounded px-3 py-2 text-forge-500 dark:text-forge-400 font-mono text-sm">
                /forge:forge-spec "Add user auth"
              </code>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">2. Create implementation plan:</p>
              <code className="block bg-gray-100 dark:bg-gray-900 rounded px-3 py-2 text-forge-500 dark:text-forge-400 font-mono text-sm">
                /forge:forge-plan spec-001
              </code>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">3. Queue tasks:</p>
              <code className="block bg-gray-100 dark:bg-gray-900 rounded px-3 py-2 text-forge-500 dark:text-forge-400 font-mono text-sm">
                /forge:forge-queue --plan plan-001
              </code>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">4. Start execution:</p>
              <code className="block bg-gray-100 dark:bg-gray-900 rounded px-3 py-2 text-forge-500 dark:text-forge-400 font-mono text-sm">
                /forge:forge
              </code>
            </div>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter(null)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              filter === null
                ? "bg-forge-500/20 text-forge-500 dark:text-forge-400"
                : "bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700"
            )}
          >
            All Commands
          </button>
          {Object.entries(categories).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                filter === key
                  ? cn(cat.bg, cat.color)
                  : "bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Commands list */}
        <div className="space-y-3">
          {filteredCommands.map((command) => (
            <CommandCard key={command.name} command={command} />
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Need more help?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Run <code className="text-forge-500 dark:text-forge-400">/forge:forge-help</code> in Claude
                Code for interactive help, or check the{" "}
                <code className="text-gray-600 dark:text-gray-300">.forge/</code> directory for specs,
                plans, and task definitions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
