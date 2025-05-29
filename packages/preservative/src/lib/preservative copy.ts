import { TLSSocket } from 'tls';
import * as z from 'zod';
import * as semver from 'semver';

export const PFN_DEF_SYM = Symbol("PFN_DEF_SYM");
export const PFN_IMPL_SYM = Symbol("PFN_IMPL_SYM");

interface PFnDef<I extends z.ZodTypeAny, O extends z.ZodTypeAny> {
  [PFN_DEF_SYM]: true,
  inputType: I,
  outputType: O,
}

export function definePFn<I extends z.ZodTypeAny,O extends z.ZodTypeAny>(inputType: I, outputType: O): PFnDef<I,O> {
  return {
    [PFN_DEF_SYM]: true,
    inputType,
    outputType
  }
}

type PReturn<R> = { type: 'return', v: R }
type PBranch<R> = { type: 'branch', branchable: Branchable<any, R> };
//type PCall<R> = { type: 'call', fn: PFnDef<any, any> }
type PCallResult = { type: 'result', result: unknown };

type PPause<R> = PBranch<R> | PReturn<R>
type PResume = PCallResult;

type FnCallCtx<I extends z.ZodTypeAny, O extends z.ZodTypeAny> = {
  argv: z.infer<I>,
  doReturn: (v: z.infer<O>) => AsyncGenerator<PPause<z.infer<O>>, z.infer<O>, PResume>
}

type PFnBody<I extends z.ZodTypeAny, O extends z.ZodTypeAny> = (
  callCtx: FnCallCtx<I, O>
) => AsyncGenerator<PPause<z.infer<O>>, z.infer<O>, PResume>

type PFnBranch<O, R> = () => AsyncGenerator<PPause<R>, O, PCallResult>


interface PFnImpl<I extends z.ZodTypeAny, O extends z.ZodTypeAny> {
  [PFN_IMPL_SYM]: true,
  defRef: PFnDef<I,O>,
  version: string,
  body: PFnBody<I,O>
}

export function implPFn<I extends z.ZodTypeAny,O extends z.ZodTypeAny>(def: PFnDef<I,O>, version: string, body: PFnBody<I,O>): PFnImpl<I,O> {
  if(!(PFN_DEF_SYM in def)) {
    throw new Error("Object passed in as a definition to implement is not actually a definition")
  }

  return {
    [PFN_IMPL_SYM]: true,
    defRef: def,
    version,
    body
  }
}

type PFnCond = () => boolean

export interface PFnIf<O, R> {
  ifs: Array<{ cond: PFnCond, body: PFnBranch<O, R> }>
  else?: PFnBranch<O, R>
}

// Updated builder interface without else method
export interface PFnIfBuilder<O, EO, R> {
  elseIf<O2>(cond: PFnCond, body: PFnBranch<O2, R>): PFnIfBuilder<O | O2, EO, R>
  else<O2>(elseBody?: PFnBranch<O2, R>): PFnIfBuilder<O, O2, R>
  exec(): AsyncGenerator<PPause<O | EO>, O | EO, PResume>
}
export function doIf<O, R extends z.ZodTypeAny>(ctx: FnCallCtx<any, R>, cond: PFnCond, body: PFnBranch<O, R>): PFnIfBuilder<O, never, z.infer<R>> {
  class IfBuilderImpl<O, EO> implements PFnIfBuilder<O, EO, z.infer<R>> {
    // Private fields to store the conditions and bodies
    public _ifs: Array<{ cond: PFnCond, body: PFnBranch<O, z.infer<R>> }>;
    protected _elseBody?: PFnBranch<EO, z.infer<R>>;
    
    constructor(cond: PFnCond, body: PFnBranch<O, z.infer<R>>) {
      this._ifs = [{ cond, body }];
    }
    
    elseIf<O2>(cond: PFnCond, body: PFnBranch<O2, z.infer<R>>): PFnIfBuilder<O | O2, EO, z.infer<R>> {
      const newThis = this as unknown as IfBuilderImpl<O | O2, EO>;
      newThis._ifs.push({ cond, body });
      return newThis as PFnIfBuilder<O | O2, EO, z.infer<R>>;
    }
    
    else<O2>(elseBody?: PFnBranch<O2, z.infer<R>>): PFnIfBuilder<O, O2, z.infer<R>> {
      const newThis = this as unknown as IfBuilderImpl<O, O2>;
      if (elseBody) {
        newThis._elseBody = elseBody;
      }
      return newThis as unknown as PFnIfBuilder<O, O2, z.infer<R>>;
    }
    
    async *exec(): AsyncGenerator<PPause<O | EO>, O | EO, PResume> {

      // Create a branchable object that implements the required interface
      const branchable: Branchable<O | EO, z.infer<R>> = {
        getBranch: (id: string): PFnBranch<O | EO, z.infer<R>> => {
          // This would be implemented to return the appropriate branch
          // based on which condition evaluated to true
          if(id === 'else') {
            if(!this._elseBody) throw new Error("Invariant violation: Got 'else' branch, but there is no else statement defined");
            return this._elseBody;
          }
          if(id === 'noop') {
            const noopFn: PFnBranch<unknown, z.infer<R>> = async function*() { return; };
            return noopFn as unknown as PFnBranch<EO, z.infer<R>>; // it's guaranteed to be an EO by mere presence of noop
          }
          const nId = Number(id);
          console.log("id", nId);
          if(isNaN(nId)) { throw new Error("Invariant violation: If expected branch id of integer or 'else' literal, got "+id); }
          const ret = this._ifs[nId];

          if(!ret) throw new Error("Invariant violation: Got branch '"+id+"', but there's no if branch with that number (max "+this._ifs.length+")");

          return ret.body;
        },
        eval: () => {
          // Determine which branch to take
          for (const [i, { cond }] of this._ifs.entries()) {
            if (cond()) {
              return `${i}`; // Return the ID of the first true condition
            }
          }
          if(this._elseBody) {
            return "else"; // Return the ID for the else branch
          }
          return "noop";
        }
      };

      const result = yield* typesafeYield(branchable);

      return result;
    }
  }
  
  return new IfBuilderImpl<O, never>(cond, body);
}

interface Branchable<O, R> {
  getBranch(id: string): PFnBranch<O, R>;
  eval(): string; // branch id
}

export async function* typesafeYield<O, R>(branchable: Branchable<O, R>): AsyncGenerator<PBranch<R>, O, PCallResult> {
  const o = yield { type: 'branch', branchable };
  if(o.type !== 'result') {
    throw new Error("Invariant violation: typesafeYield expected 'result' type to be returned from yield");
  }

  return o.result as O;
}

type CompiledFn<I extends z.ZodTypeAny, O extends z.ZodTypeAny> = (args: z.infer<I>) => AsyncGenerator<void, z.infer<O>, void>;

export function compileFunction<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(def: PFnDef<I,O>, allImpls: Array<PFnImpl<any,any>>): CompiledFn<I,O> {

  const implMap = new Map<PFnDef<any,any>, { [version: string]: PFnImpl<any, any> }>();

  for(const impl of allImpls) {
    const impls = implMap.get(impl.defRef) ?? {};
    impls[impl.version] = impl;
    implMap.set(impl.defRef, impls);
  }

  const latestVersion = new Map<PFnDef<any,any>, string>();
  for(const [def, impls] of implMap.entries()) {
    const latest = Object.keys(impls).sort((a,b) => semver.rcompare(a,b))[0];
    latestVersion.set(def, latest);
  }

  const fn: CompiledFn<I,O> = async function* (argv: z.infer<I>): AsyncGenerator<void, z.infer<O>, void> {
    const latest = latestVersion.get(def);
    if(!latest) { throw new Error("Missing latest version"); }

    const impl = implMap.get(def)?.[latest];

    if(!impl) {
      throw new Error("Missing implementation for fn");
    }

    const callCtx: FnCallCtx<I,O> = {
      argv: argv,
      doReturn: async function*(v: O) {
        const r: PReturn<O> = { type: "return", v };
        yield r;
      }
    }

    interface Stack {
      calls: StackCall[]
    }

    interface StackCall {
      generator: ReturnType<PFnBody<any,any>>
      branches: StackBranch[]
    }

    interface StackBranch {
      name: string;
      generator: ReturnType<PFnBranch<any, any>>
    }

    const stack: Stack = {
      calls: [
        {
          generator: impl.body(callCtx),
          branches: []
        }
      ]
    }

    let returnValue: [PCallResult] | [] = [];

    while(stack.calls.length !== 0) {
      const curCall = stack.calls[stack.calls.length-1];
      const isBranch = curCall.branches.length !== 0;

      const v: IteratorResult<PPause<any>, any> = isBranch ?
        await curCall.branches[curCall.branches.length - 1].generator.next(...returnValue) :
        await curCall.generator.next(...returnValue)
      ;

      returnValue = [];

      if(v.done) {
        returnValue = [{ type: 'result', result: v.value }];
        if(isBranch) curCall.branches.pop(); else stack.calls.pop();
      } else if(v.value.type === "branch") {
        const name = v.value.branchable.eval();
        const generator = v.value.branchable.getBranch(name)();
        curCall.branches.push({
          name,
          generator
        })
      } else if(v.value.type === "return") {
        returnValue = [{ type: 'result', result: v.value.v }];
        stack.calls.pop();
      } else {
        console.log("Unknown value returned from generator: "+v);
      }
    }

    return returnValue[0]?.result;
  }

  return fn;
}