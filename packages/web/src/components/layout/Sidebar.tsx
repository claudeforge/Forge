/**
 * Sidebar navigation
 */

import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ListTodo,
  Layers,
  FolderOpen,
  BarChart3,
  Flame,
} from "lucide-react";
import { cn } from "../../lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tasks", href: "/tasks", icon: ListTodo },
  { name: "Queue", href: "/queue", icon: Layers },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2 px-4 border-b border-gray-700">
        <Flame className="h-8 w-8 text-forge-500" />
        <span className="text-xl font-bold text-white">FORGE</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-forge-500/20 text-forge-400"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">FORGE Control Center v0.1.0</p>
      </div>
    </aside>
  );
}
