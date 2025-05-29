import { compileFunction, definePFn, doIf, implPFn } from './preservative.js';
import * as z from 'zod';


describe('preservative', () => {
  it('should work', async () => {
    const inputType = z.tuple([z.number(), z.number()]);
    const outputType = z.number();
    const yieldType = z.string();
    
    const addFn = definePFn("add", inputType, outputType, yieldType);

    const addImpl = implPFn(addFn, "0.0.1", async function*(ctx) {

      const v = yield* doIf(ctx, () => ctx.argv[0] > 5, async function*() {
        console.log("branch A running");
        return 123;
      }).else(async function*() {
        console.log("branch B running");
        //return 321;

        yield* ctx.doYield("hello world");

        return yield* ctx.doReturn(333);
      }).exec();

      return yield* ctx.doReturn(111);
    })

    const addRunnable = compileFunction(addFn, [addImpl] as const);

    const gen = addRunnable([10, 10]);

    let next: Awaited<ReturnType<typeof gen.next>>;
    while(!((next = await gen.next()).done)) {
      console.log("Got next value", JSON.stringify(next.value));
    }

    console.log("Got final value", next.value)
  })
})
