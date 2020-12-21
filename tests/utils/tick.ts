import { nextTick } from '@vue/composition-api'

export default async function tick (times = 1) {
  for (let _ in [...Array(times).keys()]) {
    await nextTick()
  }
}
