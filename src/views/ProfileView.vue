<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import MainLayout from "@/layouts/MainLayout.vue";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  ShieldCheck,
  KeyRound,
  BadgeCheck,
  FileKey,
} from "lucide-vue-next";
import { getImgInitials } from "@/lib/helpers";

const authStore = useAuthStore();
const user = computed(() => authStore.user);

const initials = computed(() => getImgInitials(user.value?.name || "U"));
</script>

<template>
  <MainLayout>
    <div class="flex-1 space-y-6 p-6">
      <!-- Header -->
      <div>
        <h1 class="text-3xl font-bold tracking-tight">โปรไฟล์</h1>
        <p class="text-muted-foreground mt-2">ข้อมูลบัญชีผู้ใช้งานของคุณ</p>
      </div>

      <!-- Profile Card -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-4">
            <Avatar class="h-16 w-16 text-xl">
              <AvatarFallback>{{ initials }}</AvatarFallback>
            </Avatar>
            <div class="space-y-1">
              <CardTitle class="text-2xl">{{ user?.name || "-" }}</CardTitle>
              <CardDescription class="flex items-center gap-2">
                <Mail class="h-4 w-4" />
                {{ user?.email || "-" }}
                <Badge
                  v-if="user?.email_verified"
                  variant="secondary"
                  class="gap-1"
                >
                  <BadgeCheck class="h-3 w-3" />
                  ยืนยันแล้ว
                </Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div class="grid gap-6 md:grid-cols-2">
        <!-- Personal Info -->
        <Card>
          <CardHeader>
            <div class="flex items-center gap-2">
              <User class="h-5 w-5 text-primary" />
              <CardTitle class="text-lg">ข้อมูลส่วนตัว</CardTitle>
            </div>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid grid-cols-[120px_1fr] gap-2 text-sm">
              <span class="text-muted-foreground">ชื่อ-นามสกุล</span>
              <span class="font-medium">{{ user?.name || "-" }}</span>
            </div>
            <Separator />
            <div class="grid grid-cols-[120px_1fr] gap-2 text-sm">
              <span class="text-muted-foreground">ชื่อ</span>
              <span class="font-medium">{{ user?.given_name || "-" }}</span>
            </div>
            <Separator />
            <div class="grid grid-cols-[120px_1fr] gap-2 text-sm">
              <span class="text-muted-foreground">นามสกุล</span>
              <span class="font-medium">{{ user?.family_name || "-" }}</span>
            </div>
            <Separator />
            <div class="grid grid-cols-[120px_1fr] gap-2 text-sm">
              <span class="text-muted-foreground">อีเมล</span>
              <span class="font-medium">{{ user?.email || "-" }}</span>
            </div>
            <Separator />
            <div class="grid grid-cols-[120px_1fr] gap-2 text-sm">
              <span class="text-muted-foreground">User ID</span>
              <span class="font-mono text-xs text-muted-foreground">{{
                user?.id || "-"
              }}</span>
            </div>
          </CardContent>
        </Card>

        <!-- Roles -->
        <Card>
          <CardHeader>
            <div class="flex items-center gap-2">
              <ShieldCheck class="h-5 w-5 text-primary" />
              <CardTitle class="text-lg">บทบาท</CardTitle>
            </div>
            <CardDescription>
              บทบาทที่ถูกกำหนดให้กับบัญชีของคุณ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              v-if="user?.roles && user.roles.length > 0"
              class="flex flex-wrap gap-2"
            >
              <Badge
                v-for="role in user.roles"
                :key="role"
                variant="outline"
                class="gap-1.5 px-3 py-1.5"
              >
                <FileKey class="h-3.5 w-3.5" />
                {{ role }}
              </Badge>
            </div>
            <p v-else class="text-sm text-muted-foreground">
              ยังไม่มีบทบาทที่กำหนด
            </p>
          </CardContent>
        </Card>

        <!-- Permissions -->
        <Card class="md:col-span-2">
          <CardHeader>
            <div class="flex items-center gap-2">
              <KeyRound class="h-5 w-5 text-primary" />
              <CardTitle class="text-lg">สิทธิ์การเข้าถึง</CardTitle>
            </div>
            <CardDescription>
              ทรัพยากรที่คุณมีสิทธิ์เข้าถึงในระบบ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              v-if="user?.permissions && user.permissions.length > 0"
              class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div
                v-for="perm in user.permissions"
                :key="perm.resource_id"
                class="flex items-center gap-3 rounded-lg border p-3"
              >
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10"
                >
                  <KeyRound class="h-4 w-4 text-primary" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">
                    {{ perm.resource_name }}
                  </p>
                  <p class="truncate text-xs text-muted-foreground font-mono">
                    {{ perm.resource_id }}
                  </p>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-muted-foreground">
              ยังไม่มีสิทธิ์การเข้าถึงที่กำหนด
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  </MainLayout>
</template>
