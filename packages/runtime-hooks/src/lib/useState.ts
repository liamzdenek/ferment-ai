import { Fiber, HookFn } from '@ferment-ai/runtime-interfaces';

interface UseStateProps {

}

export const useState: HookFn<[string, UseStateProps], []> = (fiber) => (name, props) => {
    return []
}