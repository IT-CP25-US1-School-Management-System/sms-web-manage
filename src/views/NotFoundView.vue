<script setup lang="ts">
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { ROUTE_NAMES } from "@/lib/constants";
import { Database, ArrowLeft, SearchX } from "lucide-vue-next";
import ModeToggle from "@/components/ModeToggle.vue";

const router = useRouter();
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-background text-foreground px-4 transition-colors"
  >
    <!-- Mode Toggle -->
    <div class="absolute top-4 right-4">
      <ModeToggle />
    </div>

    <div class="mx-auto max-w-lg text-center space-y-8">
      <!-- Icon -->
      <div class="flex justify-center">
        <div class="rounded-full bg-muted p-6 ring-1 ring-border">
          <SearchX class="h-12 w-12 text-muted-foreground" />
        </div>
      </div>

      <!-- 404 Number -->
      <div class="space-y-3">
        <h1
          class="text-9xl font-black tracking-tighter bg-gradient-to-b from-foreground to-muted-foreground/50 bg-clip-text text-transparent select-none"
        >
          404
        </h1>
        <div class="flex items-center justify-center gap-2">
          <div class="h-px flex-1 max-w-16 bg-border" />
          <span
            class="text-xs font-medium uppercase tracking-widest text-muted-foreground"
          >
            Page Not Found
          </span>
          <div class="h-px flex-1 max-w-16 bg-border" />
        </div>
      </div>

      <!-- Message -->
      <div class="space-y-2">
        <h2 class="text-2xl font-bold tracking-tight text-foreground">
          ไม่พบหน้าที่คุณต้องการ
        </h2>
        <p class="text-muted-foreground leading-relaxed">
          หน้าที่คุณกำลังมองหาอาจถูกย้าย ลบออกไปแล้ว หรือ URL ไม่ถูกต้อง
        </p>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-center gap-3 pt-2">
        <Button variant="outline" @click="router.back()" class="gap-2">
          <ArrowLeft class="h-4 w-4" />
          ย้อนกลับ
        </Button>
        <Button
          @click="router.push({ name: ROUTE_NAMES.MANAGE_DATABASE })"
          class="gap-2"
        >
          <Database class="h-4 w-4" />
          กลับหน้าหลัก
        </Button>
      </div>
    </div>
  </div>
</template>
