<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  User,
  Key,
  ClockPlus,
  ClockArrowUp,
  Mail,
  BadgeCheck,
  LayoutList,
} from "lucide-vue-next";
import { ROUTE_NAMES } from "@/lib/constants";
import type { Users } from "@/types/users";

const router = useRouter();
const isLoadingUser = ref(false);
const user = ref<Users | null>(null);

onMounted(() => {
  // รับข้อมูล user จาก router state
  const routeState = history.state as { user?: Users };
  if (routeState?.user) {
    user.value = routeState.user;
    isLoadingUser.value = false;
  } else {
    // ถ้าไม่มี state (เช่น refresh หน้า) ให้กลับไปหน้าหลัก
    goBack();
  }
});

const goBack = () => {
  router.push({ name: ROUTE_NAMES.USERS });
};
</script>

<template>
  <div class="flex-1 space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <Button
        variant="ghost"
        size="sm"
        @click="goBack"
        class="flex items-center gap-2 cursor-pointer"
      >
        <ArrowLeft class="h-4 w-4" />
        ย้อนกลับ
      </Button>
    </div>

    <!-- user Detail Section -->
    <Card>
      <CardHeader>
        <div class="flex items-start justify-between">
          <div class="space-y-1">
            <CardTitle class="flex items-center gap-2">
              <User class="h-5 w-5" />
              <Skeleton v-if="isLoadingUser" class="h-8 w-64" />
              <span v-else>{{ user?.first_name }} {{ user?.last_name }}</span>
            </CardTitle>
            <CardDescription>
              <Skeleton v-if="isLoadingUser" class="h-4 w-96" />
              <span v-else>
                <div class="flex flex-col gab-1">
                  <p>ชื่อ : {{ user?.first_name || "-" }}</p>
                  <p>นามสกุล : {{ user?.last_name || "-" }}</p>
                </div>
              </span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          v-if="isLoadingUser"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Skeleton v-for="i in 4" :key="i" class="h-16 w-full" />
        </div>
        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <!-- keycloak -->
          <div class="space-y-1">
            <div class="text-sm text-muted-foreground flex items-center gap-1">
              <Key class="h-3 w-3" />
              รหัสผู้ใช้
            </div>
            <div class="text-sm font-medium">
              {{ user?.keycloak_id || "-" }}
            </div>
          </div>

          <!-- email -->
          <div class="space-y-1">
            <div class="text-sm text-muted-foreground flex items-center gap-1">
              <Mail class="h-3 w-3" />
              อีเมล
            </div>
            <Badge variant="secondary" class="capitalize">
              {{ user?.email }}
            </Badge>
          </div>

          <!-- email_verified -->
          <div class="space-y-1">
            <div class="text-sm text-muted-foreground flex items-center gap-1">
              <BadgeCheck class="h-3 w-3" />
              ยืนยันอีเมล
            </div>
            <Badge variant="secondary" class="capitalize">
              {{ user?.email_verified }}
            </Badge>
          </div>
          <!-- created_at -->
          <div class="space-y-1">
            <div class="text-sm text-muted-foreground flex items-center gap-1">
              <ClockPlus class="h-3 w-3" />
              สร้างเมื่อ
            </div>
            <Badge variant="secondary" class="capitalize">
              {{ user?.created_at }}
            </Badge>
          </div>

          <!-- updated_at -->
          <div class="space-y-1">
            <div class="text-sm text-muted-foreground flex items-center gap-1">
              <ClockArrowUp class="h-3 w-3" />
              แก้ไขเมื่อ
            </div>
            <Badge variant="secondary" class="capitalize">
              {{ user?.updated_at }}
            </Badge>
          </div>
          <!-- Roles -->
          <div class="space-y-1 md:col-span-2">
            <div class="text-sm text-muted-foreground flex items-center gap-1">
              <LayoutList class="h-3 w-3" />
              บทบาท
            </div>
            <div
              class="flex flex-wrap gap-1"
              v-if="user?.roles && user.roles.length > 0"
            >
              <Badge
                v-for="role in user.roles"
                :key="role.id"
                variant="secondary"
                class="text-xs"
              >
                {{ role.name }}
              </Badge>
            </div>
            <span v-else class="text-sm text-muted-foreground">-</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
