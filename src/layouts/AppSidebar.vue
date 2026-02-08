<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { env } from "@/lib/env";
import { ROUTE_NAMES } from "@/lib/constants";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Home,
  Settings,
  User,
  ChevronsUpDown,
  LogOut,
  Database,
  ChevronRight,
  HardDrive,
  Users,
} from "lucide-vue-next";

import { getImgInitials } from "@/lib/helpers";

interface MenuChild {
  id: string;
  label: string;
  icon: any;
  routeName: string;
  showCondition?: () => boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  routeName: string | null;
  children: MenuChild[] | null;
}

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const menuConfig: {
  main: MenuItem[];
  settings: MenuItem[];
} = {
  main: [
    {
      id: "home",
      label: "หน้าหลัก",
      icon: Home,
      routeName: ROUTE_NAMES.HOME,
      children: null,
    },
    {
      id: "manage-database",
      label: "จัดการฐานข้อมูล",
      icon: Database,
      routeName: ROUTE_NAMES.MANAGE_DATABASE,
      children: null,
    },
    {
      id: "dataset",
      label: "ชุดข้อมูล",
      icon: HardDrive,
      routeName: ROUTE_NAMES.DATASET,
      children: null,
    },
    {
      id: "user",
      label: "จัดการผู้ใช้งาน",
      icon: Users,
      routeName: ROUTE_NAMES.USERS,
      children: null,
    },

    // ตัวอย่างการใช้ children - uncomment เมื่อต้องการใช้
    // {
    //   id: "example-with-children",
    //   label: "ตัวอย่างเมนูย่อย",
    //   icon: Settings,
    //   routeName: null,
    //   children: [
    //     {
    //       id: "child-1",
    //       label: "เมนูย่อย 1",
    //       icon: User,
    //       routeName: "Child1Route"
    //     },
    //     {
    //       id: "child-2",
    //       label: "เมนูย่อย 2",
    //       icon: Database,
    //       routeName: "Child2Route",
    //       showCondition: () => true // optional condition
    //     }
    //   ]
    // },
  ],
  settings: [
    {
      id: "settings",
      label: "ตั้งค่าระบบ",
      icon: Settings,
      routeName: ROUTE_NAMES.SETTINGS,
      children: null,
    },
    {
      id: "profile",
      label: "โปรไฟล์",
      icon: User,
      routeName: ROUTE_NAMES.PROFILE,
      children: null,
    },
  ],
};

const collapsibleStates = ref<Record<string, boolean>>({});
const initializeCollapsibleStates = () => {
  const states: Record<string, boolean> = {};
  menuConfig.main.forEach((item: MenuItem) => {
    if (
      item.children &&
      Array.isArray(item.children) &&
      item.children.length > 0
    ) {
      const hasActiveChild = item.children.some(
        (child: MenuChild) =>
          route.name === child.routeName ||
          route.name?.toString().startsWith(child.routeName || "")
      );
      states[item.id] = hasActiveChild;
    }
  });

  return states;
};

collapsibleStates.value = initializeCollapsibleStates();

const toggleCollapsible = (itemId: string) => {
  collapsibleStates.value[itemId] = !collapsibleStates.value[itemId];
};

const mockAuth = {
  getUserDisplayName: authStore.user?.name || "ผู้ใช้ระบบ",
  user: { email: authStore.user?.email || "" },
  isLoading: authStore.loading,
};

const isActiveRoute = (routeName: string | null) => {
  if (!routeName) return false;
  return (
    route.name === routeName || route.name?.toString().startsWith(routeName)
  );
};

const isActiveMenuItem = (menuItem: MenuItem) => {
  if (
    menuItem.children &&
    Array.isArray(menuItem.children) &&
    menuItem.children.length > 0
  ) {
    return menuItem.children.some((child: MenuChild) =>
      isActiveRoute(child.routeName)
    );
  }
  return isActiveRoute(menuItem.routeName);
};

const handleLogout = async () => {
  await authStore.logout();
};
</script>

<template>
  <Sidebar variant="inset">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" as-child>
            <div class="flex items-center gap-2">
              <div
                class="flex aspect-square h-10 items-center justify-center rounded-lg bg-background"
              >
                <!-- <img src="/" alt="Logo" class="h-9" /> -->
              </div>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">{{ env.APP_NAME }}</span>
                <span class="truncate text-xs">v{{ env.APP_VERSION }}</span>
              </div>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>เมนูหลัก</SidebarGroupLabel>
        <SidebarMenu>
          <template v-for="menuItem in menuConfig.main" :key="menuItem.id">
            <SidebarMenuItem
              v-if="
                !menuItem.children ||
                !Array.isArray(menuItem.children) ||
                menuItem.children.length === 0
              "
            >
              <SidebarMenuButton
                :is-active="isActiveRoute(menuItem.routeName)"
                as-child
                v-if="menuItem.routeName"
              >
                <RouterLink :to="{ name: menuItem.routeName }">
                  <component :is="menuItem.icon" class="size-4" />
                  <span>{{ menuItem.label }}</span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <template v-else>
              <SidebarMenuItem>
                <SidebarMenuButton
                  :is-active="isActiveMenuItem(menuItem)"
                  @click="toggleCollapsible(menuItem.id)"
                >
                  <component :is="menuItem.icon" class="size-4" />
                  <span>{{ menuItem.label }}</span>
                  <ChevronRight
                    class="ml-auto transition-transform duration-200"
                    :class="{ 'rotate-90': collapsibleStates[menuItem.id] }"
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>

              <template v-if="collapsibleStates[menuItem.id]">
                <SidebarMenuSub>
                  <SidebarMenuSubItem
                    v-for="child in menuItem.children"
                    :key="child.id"
                    v-show="!child.showCondition || child.showCondition()"
                  >
                    <SidebarMenuSubButton
                      :is-active="isActiveRoute(child.routeName)"
                      as-child
                    >
                      <RouterLink :to="{ name: child.routeName }">
                        <component :is="child.icon" class="size-4" />
                        <span>{{ child.label }}</span>
                      </RouterLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </template>
            </template>
          </template>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>การตั้งค่า</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem
            v-for="menuItem in menuConfig.settings"
            :key="menuItem.id"
          >
            <SidebarMenuButton
              :is-active="isActiveRoute(menuItem.routeName)"
              as-child
              v-if="menuItem.routeName"
            >
              <RouterLink :to="{ name: menuItem.routeName }">
                <component :is="menuItem.icon" class="size-4" />
                <span>{{ menuItem.label }}</span>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton
                size="lg"
                class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar class="h-8 w-8">
                  <AvatarFallback>
                    {{ getImgInitials(mockAuth.getUserDisplayName) }}
                  </AvatarFallback>
                </Avatar>
                <div class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-semibold">
                    {{ mockAuth.getUserDisplayName || "ผู้ใช้" }}
                  </span>
                  <span class="truncate text-xs">
                    {{ mockAuth.user?.email || "ไม่มีอีเมล" }}
                  </span>
                </div>
                <ChevronsUpDown class="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              class="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side="bottom"
              align="end"
              :sideOffset="4"
            >
              <DropdownMenuLabel class="p-0 font-normal">
                <div
                  class="flex items-center gap-2 px-1 py-1.5 text-left text-sm"
                >
                  <Avatar class="h-8 w-8">
                    <AvatarFallback>
                      {{ getImgInitials(mockAuth.getUserDisplayName) }}
                    </AvatarFallback>
                  </Avatar>
                  <div class="grid flex-1 text-left text-sm leading-tight">
                    <span class="truncate font-semibold">
                      {{ mockAuth.getUserDisplayName || "ผู้ใช้" }}
                    </span>
                    <span class="truncate text-xs">
                      {{ mockAuth.user?.email || "ไม่มีอีเมล" }}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  @click="router.push({ name: ROUTE_NAMES.PROFILE })"
                >
                  <User class="mr-2 h-4 w-4" />
                  โปรไฟล์
                </DropdownMenuItem>
                <DropdownMenuItem
                  @click="router.push({ name: ROUTE_NAMES.SETTINGS })"
                >
                  <Settings class="mr-2 h-4 w-4" />
                  ตั้งค่า
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                @click="handleLogout"
                :disabled="mockAuth.isLoading"
              >
                <LogOut class="mr-2 h-4 w-4" />
                <span v-if="mockAuth.isLoading">กำลังออกจากระบบ...</span>
                <span v-else>ออกจากระบบ</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>
