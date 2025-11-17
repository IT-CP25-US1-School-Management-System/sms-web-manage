<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/composables/useToast";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2, Key } from "lucide-vue-next";
import { ROUTE_NAMES } from "@/lib/constants";
import ModeToggle from "@/components/ModeToggle.vue";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { showSuccess, showError } = useToast();

const isLoading = ref(false);

/**
 * Handle OAuth2 callback
 */
const handleCallback = async () => {
  const { code, state } = route.query;

  if (code && state) {
    try {
      isLoading.value = true;

      await authStore.handleCallback(String(code), String(state));

      showSuccess("เข้าสู่ระบบสำเร็จ", {
        description: "ยินดีต้อนรับเข้าสู่ระบบ SMs Data Management",
      });

      router.push({ name: ROUTE_NAMES.HOME });
    } catch (error: any) {
      showError("เข้าสู่ระบบไม่สำเร็จ", {
        description: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
      });
    } finally {
      isLoading.value = false;
    }
  }
};

/**
 * Handle login button click
 */
const handleLogin = async () => {
  try {
    isLoading.value = true;
    await authStore.initiateLogin();
  } catch (error: any) {
    showError("ไม่สามารถเริ่มกระบวนการเข้าสู่ระบบได้", {
      description: "เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ",
    });
    isLoading.value = false;
  }
};

onMounted(() => {
  if (route.query.code && route.query.state) {
    handleCallback();
  }
});
</script>

<template>
  <div class="login-container">
    <div class="absolute top-4 right-4">
      <ModeToggle />
    </div>

    <div class="w-full max-w-md space-y-8 p-6">
      <div class="text-center">
        <div
          class="mx-auto h-12 w-12 bg-primary rounded-xl flex items-center justify-center mb-6"
        >
          <Shield class="h-8 w-8 text-primary-foreground" />
        </div>

        <h1
          class="text-3xl font-bold text-foreground transition-colors duration-200"
        >
          {{ env.APP_NAME }}
        </h1>
        <p
          class="mt-2 text-sm text-muted-foreground transition-colors duration-200"
        >
          เข้าสู่ระบบเพื่อจัดการข้อมูล
        </p>

        <Badge variant="outline" class="mt-4 transition-colors duration-200">
          v{{ env.APP_VERSION }}
        </Badge>
      </div>

      <Card class="login-card">
        <CardHeader class="text-center">
          <CardTitle class="text-xl transition-colors duration-200"
            >เข้าสู่ระบบ</CardTitle
          >
          <CardDescription class="transition-colors duration-200">
            ใช้บัญชี Keycloak เพื่อเข้าสู่ระบบ
          </CardDescription>
        </CardHeader>

        <CardContent class="space-y-6">
          <div class="space-y-4">
            <!-- Login Button -->
            <Button
              @click="handleLogin"
              :disabled="isLoading"
              class="w-full h-11 text-base font-medium"
              size="lg"
            >
              <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />

              <Key v-else class="mr-2 h-5 w-5" />

              {{ isLoading ? "กำลังเชื่อมต่อ..." : "เข้าสู่ระบบด้วย Keycloak" }}
            </Button>
          </div>

          <!-- Loading state for callback -->
          <div v-if="route.query.code && isLoading" class="text-center py-4">
            <div class="inline-flex items-center text-sm text-muted-foreground">
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              กำลังดำเนินการเข้าสู่ระบบ...
            </div>
          </div>

          <!-- Error display -->
          <div
            v-if="authStore.error"
            class="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 transition-all duration-300"
          >
            {{ "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง" }}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.5s ease;
  background: linear-gradient(
    135deg,
    hsl(var(--background)) 0%,
    hsl(var(--muted)) 100%
  );
}

:global(.dark) .login-container {
  background: linear-gradient(
    135deg,
    hsl(var(--background)) 0%,
    hsl(var(--card)) 100%
  );
}

.login-card {
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  border: none;
  transition: all 0.5s ease;
  /* Card ใช้สีที่กลมกลืนกับ background */
  background: hsl(var(--card) / 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid hsl(var(--border) / 0.5);
}

:global(.dark) .login-card {
  background: hsl(var(--card) / 0.95);
  border: 1px solid hsl(var(--border) / 0.3);
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5);
}
</style>
