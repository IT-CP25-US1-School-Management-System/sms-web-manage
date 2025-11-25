<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-vue-next";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: "default" | "destructive";
}

interface Emits {
  (e: "update:open", value: boolean): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
}

withDefaults(defineProps<Props>(), {
  confirmText: "ตกลง",
  cancelText: "ยกเลิก",
  isLoading: false,
  variant: "default",
});

const emit = defineEmits<Emits>();

const handleOpenChange = (value: boolean) => {
  emit("update:open", value);
};

const handleConfirm = () => {
  emit("confirm");
};

const handleCancel = () => {
  emit("update:open", false);
  emit("cancel");
};
</script>

<template>
  <AlertDialog :open="open" @update:open="handleOpenChange">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription v-html="description" />
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="handleCancel">
          {{ cancelText }}
        </AlertDialogCancel>
        <AlertDialogAction
          @click="handleConfirm"
          :disabled="isLoading"
          :class="{
            'bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white':
              variant === 'destructive',
          }"
        >
          <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin mr-2" />
          {{ confirmText }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
