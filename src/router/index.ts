import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { ROUTE_NAMES } from "@/lib/constants";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: ROUTE_NAMES.LOGIN,
      component: () => import("@/views/LoginView.vue"),
      meta: { requiresGuest: true },
    },
    {
      path: "/",
      redirect: "/database",
    },
    {
      path: "/profile",
      name: ROUTE_NAMES.PROFILE,
      component: () => import("@/views/ProfileView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/database",
      name: ROUTE_NAMES.MANAGE_DATABASE,
      component: () => import("@/views/introspection/ManageDatabaseView.vue"),
      meta: { requiresAuth: true },
      children: [
        {
          path: "/database/create",
          name: ROUTE_NAMES.MANAGE_DATABASE_CREATE,
          component: () =>
            import("@/views/introspection/ManageDatabaseCrate.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/database/:id/edit",
          name: ROUTE_NAMES.MANAGE_DATABASE_UPDATE,
          component: () =>
            import("@/views/introspection/ManageDatabaseUpdate.vue"),
          meta: { requiresAuth: true },
        },
      ],
    },
    {
      path: "/database/:sourceId",
      name: ROUTE_NAMES.MANAGE_DATABASE_WITH_ID,
      component: () => import("@/views/introspection/DatabaseDetail.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/dataset",
      name: ROUTE_NAMES.DATASET,
      component: () => import("@/views/dataset/DatasetView.vue"),
      meta: { requiresAuth: true },
      children: [
        {
          path: "create",
          name: ROUTE_NAMES.DATASET_CREATE,
          component: () => import("@/views/dataset/DatasetCreate.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: ":id/edit",
          name: ROUTE_NAMES.DATASET_EDIT,
          component: () => import("@/views/dataset/DatasetEdit.vue"),
          meta: { requiresAuth: true },
        },
      ],
    },
    {
      path: "/dataset/:id/versions",
      name: ROUTE_NAMES.DATASET_VERSION,
      component: () => import("@/views/datasetVersion/DatasetVersionView.vue"),
      meta: { requiresAuth: true },
      children: [
        {
          path: "create",
          name: ROUTE_NAMES.DATASET_VERSION_CREATE,
          component: () =>
            import("@/views/datasetVersion/DatasetVersionCreate.vue"),
          meta: { requiresAuth: true },
        },
      ],
    },
    {
      path: "/dataset/:id/versions/:version/serving",
      name: ROUTE_NAMES.DATASET_VERSION_SERVING,
      component: () => import("@/views/serving/DatasetVersionServingView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/unauthorized",
      name: ROUTE_NAMES.UNAUTHORIZED,
      component: () => import("@/views/UnauthorizedView.vue"),
      meta: { requiresAuth: false },
    },
    {
      path: "/:pathMatch(.*)*",
      name: ROUTE_NAMES.NOT_FOUND,
      component: () => import("@/views/NotFoundView.vue"),
    },
    {
      path: "/users",
      name: ROUTE_NAMES.USERS,
      component: () => import("@/views/users/UsersView.vue"),
      meta: { requiresAuth: true },
      children: [
        {
          path: "assign-roles",
          name: ROUTE_NAMES.USERS_ASSIGN_ROLES,
          component: () => import("@/views/users/AssignRoleModal.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "userdetail",
          name: ROUTE_NAMES.USER_DETAIL,
          component: () => import("@/views/users/UserDetail.vue"),
          meta: { requiresAuth: true },
        },
      ],
    },
    {
      path: "/roles-management",
      name: ROUTE_NAMES.ROLES,
      component: () => import("@/views/roles/RolesView.vue"),
      meta: { requiresAuth: true },
      children: [
        {
          path: "create",
          name: ROUTE_NAMES.ROLES_CREATE,
          component: () => import("@/views/roles/RolesCreate.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "update/:roleId",
          name: ROUTE_NAMES.ROLES_UPDATE,
          component: () => import("@/views/roles/RolesUpdate.vue"),
          meta: { requiresAuth: true },
        },
      ],
    },
    // Document Management Routes
    {
      path: "/documents",
      name: ROUTE_NAMES.DOCUMENTS,
      component: () => import("@/views/documents/DocumentsView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/documents/search",
      name: ROUTE_NAMES.DOCUMENTS_SEARCH,
      component: () => import("@/views/documents/DocumentsSearchView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/documents/resource/:resourceId",
      name: ROUTE_NAMES.DOCUMENTS_DETAIL,
      component: () => import("@/views/documents/DocumentDetail.vue"),
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  if (to.name === ROUTE_NAMES.LOGIN) {
    if (!authStore.isAuthenticated) {
      try {
        await authStore.checkSession();
        if (authStore.isAuthenticated) {
          next({ name: ROUTE_NAMES.MANAGE_DATABASE });
          return;
        }
      } catch (error) {
        console.log("Session check failed on login page:", error);
      }
    } else {
      next({ name: ROUTE_NAMES.MANAGE_DATABASE });
      return;
    }

    next();
    return;
  }

  // Allow unauthorized page without further checks
  if (to.name === ROUTE_NAMES.UNAUTHORIZED) {
    next();
    return;
  }

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      try {
        await authStore.checkSession();
      } catch (error) {
        console.log("Session check failed, redirecting to login:", error);
        next({ name: ROUTE_NAMES.LOGIN });
        return;
      }
    }

    if (!authStore.isAuthenticated) {
      next({ name: ROUTE_NAMES.LOGIN });
      return;
    }

    // Block non-admin users
    if (!authStore.isAdmin) {
      next({ name: ROUTE_NAMES.UNAUTHORIZED });
      return;
    }
  }

  next();
});

export default router;
