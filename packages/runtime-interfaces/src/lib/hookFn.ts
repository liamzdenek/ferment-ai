import { Fiber } from "./fiber.js";

export type HookFn<I extends any[],O> = (fiber: Fiber) => (...i: I) => O;

export type BoundHookFn<I extends any[],O> = (...i: I) => O;