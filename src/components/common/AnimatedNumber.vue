<template>
  <span class="animated-number" ref="numberRef">{{ displayValue }}</span>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  duration?: number
  decimals?: number 
  prefix?: string
  suffix?: string
}>(), {
  duration: 1500,
  decimals: 0,
  prefix: '',
  suffix: '',
})

const displayValue = ref(props.prefix + '0' + props.suffix)
const numberRef = ref<HTMLElement>()

const animateNumber = (target: number) => {
  const startTime = performance.now()
  const startValue = 0

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / props.duration, 1)

    // easeOutExpo 缓动函数
    const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)

    const currentValue = startValue + (target - startValue) * easeProgress
    displayValue.value = props.prefix + currentValue.toFixed(props.decimals) + props.suffix

    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }

  requestAnimationFrame(animate)
}

onMounted(() => {
  // 使用 IntersectionObserver 实现滚动到可见时触发
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateNumber(props.value)
          observer.disconnect()
        }
      })
    },
    { threshold: 0.1 }
  )

  if (numberRef.value) {
    observer.observe(numberRef.value)
  }
})

watch(() => props.value, (newValue) => {
  animateNumber(newValue)
})
</script>

<style scoped>
.animated-number {
  font-variant-numeric: tabular-nums;
}
</style>
