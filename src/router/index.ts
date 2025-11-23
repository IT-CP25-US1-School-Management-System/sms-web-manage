import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { ROUTE_NAMES } from "@/lib/constants";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: ROUTE_NAMES.LOGIN,
      component: () => import("@/views/LoginView.vue"),
      meta: { requiresGuest: true },
    },
    {
      path: "/",
      name: ROUTE_NAMES.HOME,
      component: () => import("@/views/HomeView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/setting",
      name: ROUTE_NAMES.SETTINGS,
      component: () => import("@/views/SettingsView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/profile",
      name: ROUTE_NAMES.PROFILE,
      component: () => import("@/views/ProfileView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/manage-database",
      name: ROUTE_NAMES.MANAGE_DATABASE,
      component: () => import("@/views/introspection/ManageDatabaseView.vue"),
      meta: { requiresAuth: true },
      children: [
        {
          path: "/manage-database/create",
          name: ROUTE_NAMES.MANAGE_DATABASE_CREATE,
          component: () => import("@/views/introspection/ManageDatabaseCrate.vue"),
          meta: { requiresAuth: true },
        },
          {
          path: "/manage-database/:id/edit",
          name: ROUTE_NAMES.MANAGE_DATABASE_UPDATE,
          component: () => import("@/views/introspection/ManageDatabaseUpdate.vue"),
          meta: { requiresAuth: true },
        },
      ],
    },
    {
      path: "/manage-database/:sourceId",
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
      path: "/:pathMatch(.*)*",
      redirect: { name: ROUTE_NAMES.HOME },
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
          next({ name: ROUTE_NAMES.HOME });
          return;
        }
      } catch (error) {
        console.log("Session check failed on login page:", error);
      }
    } else {
      next({ name: ROUTE_NAMES.HOME });
      return;
    }

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
  }

  next();
});

export default router;
