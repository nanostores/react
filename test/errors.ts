import { map, WritableAtom } from 'nanostores'
import { useStore } from '..'

type TestType =
  | { id: string; isLoading: true }
  | { isLoading: false; a: string; b: number; c?: number }

let test = map<TestType>()

let testValue = useStore(test)
if (!testValue.isLoading) {
  testValue.b
}

// THROWS Property 'a' does not exist on type 'TestType'.
testValue.a

let testValueSlice = useStore(test, { keys: ['isLoading', 'a'] })
if (!testValueSlice.isLoading) {
  testValueSlice.a
  testValueSlice.b
}
if (testValueSlice.isLoading) {
  testValueSlice.id
  // THROWS Property 'a' does not exist on type
  testValueSlice.a
}

// THROWS Property 'a' does not exist on type 'TestType'.
testValueSlice.a

declare const customStore: WritableAtom<TestType> & {
  setKey: (key: 'hey' | 'there', value: unknown) => void
}
{
  // THROWS Type '"does-not-exist"' is not assignable
  useStore(customStore, { keys: ['does-not-exist'] })

  let testValueSlice = useStore(customStore, { keys: ['hey', 'there'] })
}
