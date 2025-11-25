<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { ROUTE_NAMES } from "@/lib/constants";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Home,
  Settings,
  Users,
  User,
  Database,
  HardDrive,
  FileText,
  Cylinder,
  FileKey,
} from "lucide-vue-next";
import AppSidebar from "@/layouts/AppSidebar.vue";
import ModeToggle from "@/components/ModeToggle.vue";

const route = useRoute();

const breadcrumbConfig = {
  Home: { label: "หน้าหลัก", icon: Home },
  Settings: { label: "ตั้งค่าระบบ", icon: Settings },
  Profile: { label: "โปรไฟล์", icon: User },
  ManageDatabase: { label: "จัดการฐานข้อมูล", icon: Database },
  ManageDatabaseWithID: { label: "รายละเอียดฐานข้อมูล", icon: Cylinder },
  Dataset: { label: "Dataset", icon: HardDrive },
  DatasetVersion: { label: "Dataset Version", icon: FileText },
  DatasetVersionServing: { label: "View Data", icon: Database },
  Users: { label: "จัดการผู้ใช้งาน", icon: Users },
  UserDetail: { label: "รายละเอียดผู้ใช้งาน", icon: User },
  Roles: { label: "จัดการบทบาท", icon: FileKey },
};

const currentBreadcrumbs = computed(() => {
  const routeName = route.name?.toString();
  const breadcrumbs: Array<{
    label: string;
    icon: any;
    to: any;
    isLast: boolean;
  }> = [
    {
      label: breadcrumbConfig.Home.label,
      icon: breadcrumbConfig.Home.icon,
      to: { name: ROUTE_NAMES.HOME },
      isLast: false,
    },
  ];

  if (!routeName || routeName === ROUTE_NAMES.HOME) {
    if (breadcrumbs[0]) {
      breadcrumbs[0].isLast = true;
    }
    return breadcrumbs;
  }

  if (routeName === ROUTE_NAMES.SETTINGS) {
    breadcrumbs.push({
      label: breadcrumbConfig.Settings.label,
      icon: breadcrumbConfig.Settings.icon,
      to: { name: ROUTE_NAMES.SETTINGS },
      isLast: true,
    });
  } else if (routeName === ROUTE_NAMES.PROFILE) {
    breadcrumbs.push({
      label: breadcrumbConfig.Profile.label,
      icon: breadcrumbConfig.Profile.icon,
      to: { name: ROUTE_NAMES.PROFILE },
      isLast: true,
    });
  } else if (routeName === ROUTE_NAMES.MANAGE_DATABASE) {
    breadcrumbs.push({
      label: breadcrumbConfig.ManageDatabase.label,
      icon: breadcrumbConfig.ManageDatabase.icon,
      to: { name: ROUTE_NAMES.MANAGE_DATABASE },
      isLast: true,
    });
  } else if (routeName === ROUTE_NAMES.USERS) {
    breadcrumbs.push({
      label: breadcrumbConfig.Users.label,
      icon: breadcrumbConfig.Users.icon,
      to: { name: ROUTE_NAMES.USERS },
      isLast: true,
    });
  } else if (
    routeName === ROUTE_NAMES.DATASET ||
    routeName === ROUTE_NAMES.DATASET_CREATE ||
    routeName === ROUTE_NAMES.DATASET_EDIT
  ) {
    breadcrumbs.push({
      label: breadcrumbConfig.Dataset.label,
      icon: breadcrumbConfig.Dataset.icon,
      to: { name: ROUTE_NAMES.DATASET },
      isLast: true,
    });
  } else if (routeName === ROUTE_NAMES.DATASET_VERSION) {
    // Dataset -> DatasetVersion (ใช้ ID จาก params)
    breadcrumbs.push({
      label: breadcrumbConfig.Dataset.label,
      icon: breadcrumbConfig.Dataset.icon,
      to: { name: ROUTE_NAMES.DATASET },
      isLast: false,
    });
    breadcrumbs.push({
      label:
        (route.params.id as string) || breadcrumbConfig.DatasetVersion.label,
      icon: breadcrumbConfig.DatasetVersion.icon,
      to: null,
      isLast: true,
    });
  } else if (routeName === ROUTE_NAMES.DATASET_VERSION_CREATE) {
    // Dataset -> DatasetVersion -> Create
    breadcrumbs.push({
      label: breadcrumbConfig.Dataset.label,
      icon: breadcrumbConfig.Dataset.icon,
      to: { name: ROUTE_NAMES.DATASET },
      isLast: false,
    });
    breadcrumbs.push({
      label:
        (route.params.id as string) || breadcrumbConfig.DatasetVersion.label,
      icon: breadcrumbConfig.DatasetVersion.icon,
      to: {
        name: ROUTE_NAMES.DATASET_VERSION,
        params: { id: route.params.id },
      },
      isLast: false,
    });
    breadcrumbs.push({
      label: "สร้าง Version",
      icon: null,
      to: null,
      isLast: true,
    });
  } else if (routeName === ROUTE_NAMES.DATASET_VERSION_SERVING) {
    // Dataset -> DatasetVersion -> View Data
    breadcrumbs.push({
      label: breadcrumbConfig.Dataset.label,
      icon: breadcrumbConfig.Dataset.icon,
      to: { name: ROUTE_NAMES.DATASET },
      isLast: false,
    });
    breadcrumbs.push({
      label:
        (route.params.id as string) || breadcrumbConfig.DatasetVersion.label,
      icon: breadcrumbConfig.DatasetVersion.icon,
      to: {
        name: ROUTE_NAMES.DATASET_VERSION,
        params: { id: route.params.id },
      },
      isLast: false,
    });
    breadcrumbs.push({
      label: `${route.params.version} - ${breadcrumbConfig.DatasetVersionServing.label}`,
      icon: breadcrumbConfig.DatasetVersionServing.icon,
      to: null,
      isLast: true,
    });
  } else if (routeName === ROUTE_NAMES.MANAGE_DATABASE_WITH_ID) {
    breadcrumbs.push({
      label: breadcrumbConfig.ManageDatabase.label,
      icon: breadcrumbConfig.ManageDatabase.icon,
      to: { name: ROUTE_NAMES.MANAGE_DATABASE },
      isLast: false,
    });
    breadcrumbs.push({
      label: breadcrumbConfig.ManageDatabaseWithID.label,
      icon: breadcrumbConfig.ManageDatabaseWithID.icon,
      to: { name: ROUTE_NAMES.MANAGE_DATABASE_WITH_ID, params: route.params },
      isLast: true,
    });
  } else if (routeName === ROUTE_NAMES.ROLES) {
    breadcrumbs.push({
      label: breadcrumbConfig.Users.label,
      icon: breadcrumbConfig.Users.icon,
      to: { name: ROUTE_NAMES.USERS },
      isLast: false,
    });
    breadcrumbs.push({
      label: breadcrumbConfig.Roles.label,
      icon: breadcrumbConfig.Roles.icon,
      to: { name: ROUTE_NAMES.ROLES, params: route.params },
      isLast: true,
    });
  } else if (routeName === ROUTE_NAMES.USER_DETAIL) {
    breadcrumbs.push({
      label: breadcrumbConfig.Users.label,
      icon: breadcrumbConfig.Users.icon,
      to: { name: ROUTE_NAMES.USERS },
      isLast: false,
    });
    breadcrumbs.push({
      label: breadcrumbConfig.UserDetail.label,
      icon: breadcrumbConfig.UserDetail.icon,
      to: { name: ROUTE_NAMES.USER_DETAIL },
      isLast: true,
    });
  } else {
    breadcrumbs.push({
      label: routeName,
      icon: null,
      to: null,
      isLast: true,
    });
  }
  return breadcrumbs;
});

// Scroll detection for header styling
const isScrolled = ref(false);

const handleScroll = () => {
  isScrolled.value = window.scrollY > 0;
};

onMounted(() => {
  window.addEventListener("scroll", handleScroll);
  handleScroll(); // Check initial scroll position
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<template>
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <!-- Header -->
      <!-- Header -->
      <header
        :class="[
          'sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 transition-all duration-300',
          isScrolled
            ? 'mx-0 mt-0 rounded-none shadow-md'
            : 'rounded-t-lg shadow-sm',
        ]"
      >
        <SidebarTrigger class="-ml-1" />
        <div class="flex flex-1 items-center justify-between">
          <div class="flex items-center gap-2">
            <!-- Breadcrumb Navigation -->
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem
                  v-for="(crumb, index) in currentBreadcrumbs"
                  :key="index"
                >
                  <BreadcrumbLink v-if="crumb.to && !crumb.isLast" as-child>
                    <RouterLink :to="crumb.to" class="flex items-center">
                      <component
                        :is="crumb.icon"
                        class="size-4 mr-2"
                        v-if="crumb.icon"
                      />
                      {{ crumb.label }}
                    </RouterLink>
                  </BreadcrumbLink>
                  <BreadcrumbPage
                    v-else
                    class="flex items-center font-semibold"
                  >
                    <component
                      :is="crumb.icon"
                      class="size-4 mr-2"
                      v-if="crumb.icon"
                    />
                    {{ crumb.label }}
                  </BreadcrumbPage>
                  <BreadcrumbSeparator v-if="!crumb.isLast" />
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div class="flex items-center gap-4">
            <ModeToggle />
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 p-6">
        <slot />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
