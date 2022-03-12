export default function timeout (milliseconds: number) {
  jest.advanceTimersByTime(milliseconds)
}

