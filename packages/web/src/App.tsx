/**
 * Main App component with routing
 */

import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { NotificationProvider } from "./components/notification/NotificationProvider";
import { TaskNotificationListener } from "./components/notification/TaskNotificationListener";
import { Dashboard } from "./routes/Dashboard";
import { Specs } from "./routes/Specs";
import { Tasks } from "./routes/Tasks";
import { Queue } from "./routes/Queue";
import { Projects } from "./routes/Projects";
import { Analytics } from "./routes/Analytics";
import { Commands } from "./routes/Commands";
import { Rules } from "./routes/Rules";

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

// Root route
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// Routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

const specsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/specs",
  component: Specs,
});

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks",
  component: Tasks,
});

const queueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/queue",
  component: Queue,
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: Projects,
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analytics",
  component: Analytics,
});

const commandsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/commands",
  component: Commands,
});

const rulesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rules",
  component: Rules,
});

// Route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  specsRoute,
  tasksRoute,
  queueRoute,
  projectsRoute,
  analyticsRoute,
  commandsRoute,
  rulesRoute,
]);

// Create router
const router = createRouter({ routeTree });

// Type declarations
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <TaskNotificationListener />
        <RouterProvider router={router} />
      </NotificationProvider>
    </QueryClientProvider>
  );
}
