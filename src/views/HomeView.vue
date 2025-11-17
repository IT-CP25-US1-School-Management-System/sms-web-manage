<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { dataApiInstance } from "@/stores/api";
import MainLayout from "@/layouts/MainLayout.vue";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const authStore = useAuthStore();
const testResult = ref<string>("");
const isLoading = ref(false);

/**
 * Test DATA API call
 */
const testDataApi = async () => {
  try {
    isLoading.value = true;
    testResult.value = "กำลังทดสอบ...";

    const response = await dataApiInstance.get("/api/test");
    testResult.value = `สำเร็จ: ${JSON.stringify(response.data)}`;
  } catch (error: any) {
    testResult.value = `ข้อผิดพลาด: ${error.message}`;
    console.error("Test DATA API error:", error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  console.log("Home page loaded, user:", authStore.user);
});
</script>

<template>
  <MainLayout>
    <div class="container mx-auto p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold">แดชบอร์ด</h1>
      </div>

      <!-- User Info Card -->
      <Card v-if="authStore.user">
        <CardHeader>
          <CardTitle>ข้อมูลผู้ใช้</CardTitle>
          <CardDescription>ข้อมูลที่ได้จากการเข้าสู่ระบบ</CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <div><strong>ชื่อ:</strong> {{ authStore.user.name }}</div>
          <div><strong>อีเมล:</strong> {{ authStore.user.email }}</div>
          <div><strong>ID:</strong> {{ authStore.user.id }}</div>
          <div>
            <strong>สิทธิ์:</strong>
            {{ authStore.user.roles?.join(", ") || "ไม่มีข้อมูล" }}
          </div>
        </CardContent>
      </Card>

      <!-- API Test Card -->
      <Card>
        <CardHeader>
          <CardTitle>ทดสอบ DATA API</CardTitle>
          <CardDescription
            >ทดสอบการเรียก API ด้วย Axios instance</CardDescription
          >
        </CardHeader>
        <CardContent class="space-y-4">
          <Button @click="testDataApi" :disabled="isLoading">
            {{ isLoading ? "กำลังทดสอบ..." : "ทดสอบ DATA API" }}
          </Button>
          <div v-if="testResult" class="p-4 rounded-md text-sm bg-input">
            <pre>{{ testResult }}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  </MainLayout>
</template>

<style scoped>
pre {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
