<script setup lang="ts">
import { ref, onMounted } from "vue";
import { watch } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "@/composables/useToast";

import MainLayout from "@/layouts/MainLayout.vue";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-vue-next";
import AlertModel from "../../components/introspaction/AlertModel.vue";
import { dataApiInstance } from "@/stores/api";
import type {
  Database,
  Columns,
  Tables,
  DatabaseSearchParams,
  Schemas,
} from "@/types/database";

// Reactive data
const database = ref<Database>({} as Database);
const route = useRoute();
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const schemas = ref<Schemas[]>([]);
const columns = ref<Columns[]>([]);
const tables = ref<Tables[]>([]);
const openSchemaId = ref<string | undefined>(undefined);
const openTableId = ref<string | undefined>(undefined);

// Dialog states
const showSchemaDialog = ref(false);
const showTableDialog = ref(false);
const showColumnDialog = ref(false);
const selectedSchema = ref<Schemas | null>(null);
const selectedTable = ref<Tables | null>(null);
const selectedColumn = ref<Columns | null>(null);

const { showError } = useToast();

// API functions
const getDatabasesDetail = async (): Promise<Database> => {
  try {
    const id = String(route.params.sourceId ?? null);

    const response = await dataApiInstance.get(`/v1/introspect/sources/${id}`);

    return response.data.data as Database;
  } catch (error: any) {
    console.error("Error fetching datasets:", error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถโหลดข้อมูล datasets ได้";
    throw new Error(errorMessage);
  }
};

// API functions
const getDatabasesSchemas = async (
  params?: DatabaseSearchParams
): Promise<Schemas[]> => {
  try {
    const response = await dataApiInstance.get<{ data: Schemas[] }>(
      `/v1/introspect/schemas`,
      {
        params,
      }
    );
    return response.data.data;
  } catch (error: any) {
    console.error("Error fetching datasets:", error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถโหลดข้อมูล datasets ได้";
    throw new Error(errorMessage);
  }
};

const getDatabasesColumns = async (
  params?: DatabaseSearchParams
): Promise<Columns[]> => {
  try {
    const response = await dataApiInstance.get<{ data: Columns[] }>(
      `/v1/introspect/columns`,
      {
        params,
      }
    );
    console.log(response.data.data);

    return response.data.data;
  } catch (error: any) {
    console.error("Error fetching datasets:", error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถโหลดข้อมูล datasets ได้";
    throw new Error(errorMessage);
  }
};

const getDatabasesTables = async (
  params?: DatabaseSearchParams
): Promise<Tables[]> => {
  try {
    const response = await dataApiInstance.get<{ data: Tables[] }>(
      `/v1/introspect/tables`,
      {
        params,
      }
    );
    console.log(response.data.data);

    return response.data.data;
  } catch (error: any) {
    console.error("Error fetching datasets:", error);
    const errorMessage =
      error.response?.data?.message || "ไม่สามารถโหลดข้อมูล datasets ได้";
    throw new Error(errorMessage);
  }
};

// Functions
const loadDatasets = async (type: string, params?: DatabaseSearchParams) => {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    if (type === "sources") {
      const response: Database = await getDatabasesDetail();
      database.value = response;
    } else if (type === "schemas") {
      const response: Schemas[] = await getDatabasesSchemas(params);
      schemas.value = response;
    } else if (type === "tables") {
      // load tables for a specific schema/source
      const response: Tables[] = await getDatabasesTables(params);
      tables.value = response;
      // clear columns when switching tables
      columns.value = [];
    } else if (type === "columns") {
      // load columns for a specific table/schema
      const response: Columns[] = await getDatabasesColumns(params);
      columns.value = response;
    }
  } catch (error: any) {
    console.error("Error loading datasets:", error);
    errorMessage.value = error.message || "ไม่สามารถโหลดข้อมูล datasets ได้";
    showError(error.message || "ไม่สามารถโหลดข้อมูล datasets ได้");
  } finally {
    isLoading.value = false;
  }
};

// When a schema is opened (v-model changes), fetch its tables.
watch(openSchemaId, async (newId) => {
  console.log(newId);

  if (!newId) {
    // closed
    tables.value = [];
    columns.value = [];
    openTableId.value = undefined;
    return;
  }
  // find schema object
  const schema = schemas.value.find((s) => s.id === newId);
  if (!schema) return;
  console.log("schema opened", schema);
  await loadDatasets("tables", {
    source_id: schema.sources_id,
    schema: schema.schema,
  });
});

// When a table is opened, fetch its columns
watch(openTableId, async (newId) => {
  console.log(newId);

  if (!newId) {
    columns.value = [];
    return;
  }
  const table = tables.value.find((t) => t.id === newId);
  if (!table) return;
  console.log("table opened", table);
  await loadDatasets("columns", {
    source_id: route.params.sourceId as string,
    schema: table.schema,
    table: table.table_name,
  });
});
// Lifecycle
onMounted(() => {
  loadDatasets("sources");
  loadDatasets("schemas"
    ,{
    source_id: route.params.sourceId as string,
  }
  );
});
</script>

<template>
  <MainLayout>
    <div class="flex-1 space-y-6 p-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Database</h1>
          <p class="text-muted-foreground mt-2">
            จัดการและดูข้อมูล ฐานข้อมูล ต่าง ๆ
          </p>
        </div>
      </div>

      <Card>
        <CardTitle>รายละเอียดฐานข้อมูล</CardTitle>
        <CardContent>
          <div class="flex flex-col gap-2">
            <p>id : {{ database.id }}</p>
            <p>name : {{ database.name }}</p>
            <p>description : {{ database.description }}</p>
            <p>type : {{ database.type }}</p>
            <p>is active : {{ database.is_active }}</p>
            <p>sensitivity : {{ database.sensitivity }}</p>
            <p>db type : {{ database.db_type }}</p>
            <p>host : {{ database.host }}</p>
            <p>port : {{ database.port }}</p>
            <p>username : {{ database.username }}</p>
            <p>database name : {{ database.database_name }}</p>
            <p v-if="database.params">params : {{ database.params }}</p>
            <p>created at : {{ database.created_at }}</p>
            <p>updated at : {{ database.updated_at }}</p>
          </div>
        </CardContent>
      </Card>

      <Accordion
        v-model="openSchemaId"
        type="single"
        collapsible
        class="w-full"
      >
        <AccordionItem
          v-for="schema in schemas"
          :key="schema.id"
          :value="schema.id"
        >
          <AccordionTrigger class="hover:no-underline">
            <div class="flex items-center justify-start w-full pr-4">
              <Button
                variant="ghost"
                size="sm"
                @click.stop="
                  selectedSchema = schema;
                  showSchemaDialog = true;
                "
              >
                <Info class="h-4 w-4" />
              </Button>
              <div class="flex items-center gap-3">
                <Badge variant="outline">Schema</Badge>
                <span class="font-medium">{{ schema.schema }}</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Accordion
              type="single"
              collapsible
              class="w-full ml-6"
              v-model="openTableId"
            >
              <AccordionItem
                v-for="table in tables"
                :key="table.id"
                :value="table.id"
              >
                <AccordionTrigger class="hover:no-underline">
                  <div class="flex items-center justify-start w-full pr-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      @click.stop="
                        selectedTable = table;
                        showTableDialog = true;
                      "
                    >
                      <Info class="h-4 w-4" />
                    </Button>
                    <div class="flex items-center gap-3">
                      <Badge variant="outline">Table</Badge>
                      <span class="font-medium">{{ table.table_name }}</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent class="overflow-visible">
                  <div class="grid gap-2 ml-6 mr-12">
                    <div
                      v-for="column in columns"
                      :key="column.id"
                      class="flex items-center justify-between p-3 rounded-md hover:bg-accent/50 cursor-pointer transition-colors border-2"
                      @click="
                        selectedColumn = column;
                        showColumnDialog = true;
                      "
                    >
                      <div class="flex items-center gap-3">
                        <Badge variant="secondary">Column</Badge>
                        <span class="font-medium">{{
                          column.column_name
                        }}</span>
                        <Badge variant="outline" class="text-xs">{{
                          column.data_type
                        }}</Badge>
                      </div>
                      <!-- <Button variant="ghost" size="sm">
                        <Info class="h-4 w-4" />
                      </Button> -->
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>

    <!-- Schema Details Dialog -->
    <AlertModel
      v-model:open="showSchemaDialog"
      type="schema"
      :selected-schema="selectedSchema"
    />

    <!-- Table Details Dialog -->
    <AlertModel
      v-model:open="showTableDialog"
      type="table"
      :selected-table="selectedTable"
    />

    <!-- Column Details Dialog -->
    <AlertModel
      v-model:open="showColumnDialog"
      type="column"
      :selected-column="selectedColumn"
    />
  </MainLayout>

  <RouterView />
</template>

<style scoped></style>
