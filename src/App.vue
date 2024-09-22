<script setup lang="ts">
import { ref } from 'vue'
import Divider from 'primevue/divider'
import ProgressBar from 'primevue/progressbar'

import { forgesNames } from 'common/forges'
import IFileUpload from 'shared/IFileUpload.vue'

interface Item {
  name: string
  desc: string
  src: string
  level: string
}

interface ItemCraft {
  code: string
  craft: Craft[]
  forge: string
  name: string
}

interface Craft {
  code: string
  count: number
  name: string
}

const craftItems = ref<ItemCraft[]>([])
const itemsDesc = ref<{ [key: string]: Item }>({})
const isItemsReady = ref(false)

const itemsBarValue = ref(0)
const craftBarValue = ref(0)

function onLoadCraft(craft: String) {
  const forges = craft.split('function ')

  function cleanItemCraft() {
    return {
      code: '',
      craft: [],
      forge: '',
      name: ''
    }
  }

  for (const [index, forge] of forges.entries()) {
    craftBarValue.value = (100 / forges.length) * index
    const forgeStrings = forge.split('\r\n')
    let activeItem: ItemCraft = cleanItemCraft()
    let forgeName = ''
    for (const [index, line] of forgeStrings.entries()) {
      if (index === 0) forgeName = forgesNames[line.split(' takes')[0]] || ''
      activeItem.forge = forgeName

      if (line.includes('SetResultItem')) {
        activeItem.code = line.split("'")[1]
        if (activeItem.code === 'I0MC') continue
        if (itemsDesc.value[activeItem.code]) {
          activeItem.name = itemsDesc.value[activeItem.code].name
        }
      }

      if (line.includes('AddRequirement')) {
        const parentCode = line.split("'")[1]
        if (parentCode) {
          if (parentCode === 'I0MC') continue
          const existingParent = activeItem.craft.find((item) => item.code === parentCode)
          if (existingParent) existingParent.count += 1
          else {
            activeItem.craft.push({
              code: parentCode,
              count: Number(line.split("'")[2].replace(', ', '').replace(')', '')) || 1,
              name: itemsDesc.value[parentCode].name
            })
          }
        }
      }

      if (!line.includes('AddRequirement') && !line.includes('SetResultItem')) {
        if (
          activeItem.name &&
          !activeItem.craft.some((item) => item.code === 'I0MC') &&
          activeItem.craft.length
        ) {
          craftItems.value.push(activeItem)
        }
        activeItem = cleanItemCraft()
      }
    }
  }
  craftBarValue.value = 100

  let result = []
  for (const [key, value] of Object.entries(itemsDesc.value)) {
    if (key === 'I0MC') continue // блок крафта

    const itemCraft = craftItems.value.filter((item) => item.code === key)

    // if (itemCraft[1]?.forge) {
    //   console.log(value.name, itemCraft[1]?.forge, itemCraft[0]?.forge)
    // }

    result.push({
      code: key,
      name: value.name,
      desc: value.desc,
      level: value.level,
      src: value.src,
      forge: itemCraft[0]?.forge || '',
      alterForge: itemCraft[1]?.forge || '',
      craft: itemCraft[0]?.craft || [],
      alterCraft: itemCraft[1]?.craft || []
    })
  }

  // отфильтровываем всё не входящее в крафты
  result = result.filter((el) =>
    craftItems.value.some(
      (item) => item.craft.some((i) => i.code === el.code) || el.code === item.code
    )
  )

  createFile(result, 'craft')
}

function cleanString(str: String) {
  if (str.startsWith('ff') || str.startsWith('FF') || str.startsWith('00')) return str.slice(8)
  if (str.startsWith('"ff') || str.startsWith('"FF') || str.startsWith('"00')) return str.slice(9)
  return str
}

function getLevel(desc: String) {
  if (desc.includes('уровня и выше!')) {
    return desc.split(' уровня и выше!')[0].split(' ').at(-1) || '0'
  }
  if (desc.includes('уровня или выше!')) {
    return desc.split(' уровня или выше!')[0].split(' ').at(-1) || '0'
  }
  return '0'
}

function onLoadItems(items: String) {
  function cleanItem() {
    return {
      name: '',
      desc: '',
      src: ''
    }
  }

  let currentItem = cleanItem()
  let itemCode = ''
  const itemsLines = items.split('\r\n')
  for (let [index, line] of itemsLines.entries()) {
    itemsBarValue.value = (100 / itemsLines.length) * index
    line = line.replaceAll('|c', '').replaceAll('|r', '')
    if (line.startsWith('[')) {
      if (itemCode) {
        // console.log(currentItem.desc.split('\n').map((str) => cleanString(str)))
        const descr = currentItem.desc
          .split('\n')
          .map((str) => cleanString(str))
          .join('\n')
          .replaceAll('ffff0000', '')
          .replaceAll('ff80ff80', '')
          .replaceAll('ff808080', '')

        itemsDesc.value[itemCode] = {
          src: currentItem.src
            .replace('ReplaceableTextures\\CommandButtons\\', '')
            .replace('war3mapImported\\', ''),
          name: cleanString(currentItem.name).replaceAll('"', ''),
          desc: descr,
          level: getLevel(descr)
        }
      }

      currentItem = cleanItem()
      itemCode = line.split('[')[1].replace(']', '')
    }
    if (line.startsWith('Art')) currentItem.src = line.split('Art=')[1].split('.')[0] + '.png'
    if (line.startsWith('Name')) currentItem.name = line.split('Name=')[1]
    if (line.startsWith('Description')) currentItem.desc = line.split('Description=')[1]
  }
  itemsBarValue.value = 100
  isItemsReady.value = true
  // createFile(itemsDesc.value, 'items')
}

function createFile(data: any, name: String) {
  const blob = new Blob([JSON.stringify(data)], { type: 'text/plain' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${name}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}
</script>

<template>
  <header>Преобразование файлов с крафтом и предметами</header>

  <main>
    <IFileUpload @load="onLoadItems" title="Загрузить строки с предметами" class="button" />
    <ProgressBar :value="itemsBarValue" />
    <Divider />
    <div v-if="isItemsReady">
      <IFileUpload @load="onLoadCraft" title="Загрузить строки с крафтом" class="button" />
      <ProgressBar :value="craftBarValue" />
      <Divider />
    </div>
  </main>
</template>

<style>
header {
  padding: 20px;
  font-size: 24px;
}
main {
  max-width: 400px;
  padding: 20px;
}
.p-fileupload {
  width: fit-content;
  margin-bottom: 16px;
}
.p-fileupload span {
  display: none;
}
.p-fileupload span.p-button-label {
  display: inline;
}
</style>
