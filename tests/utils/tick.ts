import { nextTick } from 'vue'

export default async function tick (times = 1) {
  for (const _ in [...Array(times).keys()]) {
    await nextTick()
  }
}
