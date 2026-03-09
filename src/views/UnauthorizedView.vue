<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { ROUTE_NAMES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ShieldX, LogOut, Loader2, Mail } from "lucide-vue-next";
import ModeToggle from "@/components/ModeToggle.vue";

const router = useRouter();
const authStore = useAuthStore();
const isLoggingOut = ref(false);

const userInitials = () => {
  const name = authStore.user?.name || authStore.user?.email || "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const handleLogout = async () => {
  try {
    isLoggingOut.value = true;
    await authStore.logout();
    router.replace({ name: ROUTE_NAMES.LOGIN });
  } catch {
    router.replace({ name: ROUTE_NAMES.LOGIN });
  } finally {
    isLoggingOut.value = false;
  }
};
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-background text-foreground px-4 transition-colors"
  >
    <!-- Mode Toggle -->
    <div class="absolute top-4 right-4">
      <ModeToggle />
    </div>

    <div class="mx-auto w-full max-w-md space-y-6">
      <!-- Icon & Title -->
      <div class="text-center space-y-4">
        <div class="flex justify-center">
          <div
            class="rounded-full bg-destructive/10 p-4 ring-1 ring-destructive/20"
          >
            <ShieldX class="h-10 w-10 text-destructive" />
          </div>
        </div>
        <div class="space-y-2">
          <h1 class="text-2xl font-bold tracking-tight">
            ไม่มีสิทธิ์เข้าใช้งาน
          </h1>
        </div>
      </div>

      <!-- User Info Card -->
      <Card v-if="authStore.user">
        <CardHeader class="">
          <CardTitle class="text-base">ข้อมูลบัญชีที่เข้าสู่ระบบ</CardTitle>
          <CardDescription>บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent class="">
          <div class="flex items-center gap-4">
            <Avatar class="h-12 w-12">
              <AvatarFallback
                class="bg-muted text-muted-foreground font-semibold"
              >
                {{ userInitials() }}
              </AvatarFallback>
            </Avatar>
            <div class="flex-1 min-w-0 space-y-1">
              <p class="font-medium truncate">
                {{ authStore.user.name || "ไม่ระบุชื่อ" }}
              </p>
              <div
                class="flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <Mail class="h-3.5 w-3.5 shrink-0" />
                <span class="truncate">{{ authStore.user.email }}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Logout Button -->
      <Button
        class="w-full gap-2"
        variant="destructive"
        size="lg"
        :disabled="isLoggingOut"
        @click="handleLogout"
      >
        <Loader2 v-if="isLoggingOut" class="h-4 w-4 animate-spin" />
        <LogOut v-else class="h-4 w-4" />
        ออกจากระบบ
      </Button>
    </div>
  </div>
</template>
