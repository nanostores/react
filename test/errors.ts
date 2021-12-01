import { map } from 'nanostores'
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
  // The rest of the error is skipped, because order of properties varies
  // THROWS Property 'b' does not exist on type 'Pick<TestType,
  testValueSlice.b
}

testValueSlice.a
