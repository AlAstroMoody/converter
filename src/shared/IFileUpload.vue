<script setup lang="ts">
export type FileEventTarget = EventTarget & { files: FileList }
import FileUpload from 'primevue/fileupload'

defineProps<{ title: string }>()

const emit = defineEmits<{
  load: [id: string]
}>()

function onSelect(e: FileEventTarget) {
  let reader = new FileReader()
  reader.readAsText(e.files[0])

  reader.onload = function () {
    emit('load', reader.result as string)
  }

  reader.onerror = function () {
    console.log(reader.error)
  }
}
onSelect
</script>
<template>
  <FileUpload mode="basic" :maxFileSize="1000000" :chooseLabel="title" @select="onSelect" />
</template>
