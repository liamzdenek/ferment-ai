import * as z from 'zod';
import * as semver from 'semver';

export const PFN_DEF_SYM = Symbol("PFN_DEF_SYM");
export const PFN_IMPL_SYM = Symbol("PFN_IMPL_SYM");

interface PFnDef<ARGV extends z.ZodTypeAny, RETURN extends z.ZodTypeAny, YIELD extends z.ZodTypeAny> {
  [PFN_DEF_SYM]: true,
  name: string,
  inputType: ARGV,
  outputType: RETURN,
  yieldType: YIELD
}

export function definePFn<ARGV extends z.ZodTypeAny, RETURN extends z.ZodTypeAny, YIELD extends z.ZodTypeAny>(name: string, inputType: ARGV, outputType: RETURN, yieldType: YIELD): PFnDef<ARGV,RETURN,YIELD> {
  return {
    [PFN_DEF_SYM]: true,
    name,
    inputType,
    outputType,
    yieldType
  }
}

type PReturn<RETURN extends z.ZodTypeAny> = { type: 'return', v: z.infer<RETURN> }
type PBranch<RETURN extends z.ZodTypeAny, YIELD extends z.ZodTypeAny> = { type: 'branch', branchable: Branchable<any, RETURN, YIELD> };
type PCallRaw<YIELD extends z.ZodTypeAny, SUBCALL_ARGV extends z.ZodTypeAny> = { type: 'call', fn: PFnDef<SUBCALL_ARGV, any, YIELD>, argv: SUBCALL_ARGV }
type PCall<YIELD extends z.ZodTypeAny> = PCallRaw<YIELD, z.ZodTypeAny>
type PYield<YIELD extends z.ZodTypeAny> = { type: 'yield', v: z.infer<YIELD> };
type PCallResult = { type: 'result', result: unknown };

type PPause<RETURN extends z.ZodTypeAny, YIELD extends z.ZodTypeAny> = PBranch<RETURN, YIELD> | PReturn<RETURN> | PCall<YIELD> | PYield<YIELD>;
type PResume = PCallResult;

type FnCallCtx<ARGV extends z.ZodTypeAny, RETURN extends z.ZodTypeAny, YIELD extends z.ZodTypeAny> = {
  argv: z.infer<ARGV>,
  doReturn: (v: z.infer<RETURN>) => AsyncGenerator<PPause<RETURN, YIELD>, z.infer<RETURN>, PResume>
  doYield: (v: z.infer<YIELD>) => AsyncGenerator<PPause<RETURN, YIELD>, z.infer<YIELD>, PResume>
}

type PFnBody<ARGV extends z.ZodTypeAny, RETURN extends z.ZodTypeAny, YIELD extends z.ZodTypeAny> = (
  callCtx: FnCallCtx<ARGV, RETURN, YIELD>
) => AsyncGenerator<PPause<RETURN, YIELD>, z.infer<RETURN>, PResume>

type PFnBranch<LVALUE, RETURN extends z.ZodTypeAny, YIELD extends z.ZodTypeAny> = () => AsyncGenerator<PPause<RETURN, YIELD>, LVALUE, PCallResult>


interface PFnImpl<ARGV extends z.ZodTypeAny, RETURN extends z.ZodTypeAny, YIELD extends z.ZodTypeAny> {
  [PFN_IMPL_SYM]: true,
  defRef: PFnDef<ARGV,RETURN,YIELD>,
  version: string,
  body: PFnBody<ARGV,RETURN,YIELD>
}

export function implPFn<ARGV extends z.ZodTypeAny, RETURN extends z.ZodTypeAny, YIELD extends z.ZodTypeAny>(def: PFnDef<ARGV,RETURN,YIELD>, version: string, body: PFnBody<ARGV,RETURN,YIELD>): PFnImpl<ARGV,RETURN,YIELD> {
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

export interface PFnIf<LVALUE, RETURN extends z.ZodTypeAny, YIELD extends z.ZodTypeAny> {
  ifs: Array<{ cond: PFnCond, body: PFnBranch<LVALUE, RETURN, YIELD> }>
  else?: PFnBranch<LVALUE, RETURN, YIELD>
}

// Updated builder interface without else method
export interface PFnIfBuilder<LVALUE, ELSE_LVALUE, RETURN extends z.ZodTypeAny, YIELD extends z.ZodTypeAny> {
  elseIf<NEW_LVALUE>(cond: PFnCond, body: PFnBranch<NEW_LVALUE, RETURN, YIELD>): PFnIfBuilder<LVALUE | NEW_LVALUE, ELSE_LVALUE, RETURN, YIELD>
  else<NEW_ELSE_LVALUE>(elseBody?: PFnBranch<NEW_ELSE_LVALUE, RETURN, YIELD>): PFnIfBuilder<LVALUE, NEW_ELSE_LVALUE, RETURN, YIELD>
  exec(): AsyncGenerator<PPause<RETURN, YIELD>, LVALUE | ELSE_LVALUE, PResume>
}
export function doIf<LVALUE, RETURN extends z.ZodTypeAny, YIELD extends z.ZodTypeAny>(ctx: FnCallCtx<any, RETURN, YIELD>, cond: PFnCond, body: PFnBranch<LVALUE, RETURN, YIELD>): PFnIfBuilder<LVALUE, never, RETURN, YIELD> {
  class IfBuilderImpl<LVALUE, ELSE_LVALUE> implements PFnIfBuilder<LVALUE, ELSE_LVALUE, RETURN, YIELD> {
    // Private fields to store the conditions and bodies
    public _ifs: Array<{ cond: PFnCond, body: PFnBranch<LVALUE, RETURN, YIELD> }>;
    protected _elseBody?: PFnBranch<ELSE_LVALUE, RETURN, YIELD>;
    
    constructor(cond: PFnCond, body: PFnBranch<LVALUE, RETURN, YIELD>) {
      this._ifs = [{ cond, body }];
    }
    
    elseIf<NEW_LVALUE>(cond: PFnCond, body: PFnBranch<NEW_LVALUE, RETURN, YIELD>): PFnIfBuilder<LVALUE | NEW_LVALUE, ELSE_LVALUE, RETURN, YIELD> {
      const newThis = this as unknown as IfBuilderImpl<NEW_LVALUE | LVALUE, ELSE_LVALUE>;
      newThis._ifs.push({ cond, body });
      return newThis as PFnIfBuilder<NEW_LVALUE | LVALUE, ELSE_LVALUE, RETURN, YIELD>;
    }
    
    else<NEW_ELSE_LVALUE>(elseBody?: PFnBranch<NEW_ELSE_LVALUE, RETURN, YIELD>): PFnIfBuilder<LVALUE, NEW_ELSE_LVALUE, RETURN, YIELD> {
      const newThis = this as unknown as IfBuilderImpl<LVALUE, NEW_ELSE_LVALUE>;
      if (elseBody) {
        newThis._elseBody = elseBody;
      }
      return newThis as unknown as PFnIfBuilder<LVALUE, NEW_ELSE_LVALUE, RETURN, YIELD>;
    }
    
    async *exec(): AsyncGenerator<PPause<RETURN, YIELD>, LVALUE | ELSE_LVALUE, PResume> {

      // Create a branchable object that implements the required interface
      const branchable: Branchable<LVALUE | ELSE_LVALUE, RETURN, YIELD> = {
        getBranch: (id: string): PFnBranch<LVALUE | ELSE_LVALUE, RETURN, YIELD> => {
          // This would be implemented to return the appropriate branch
          // based on which condition evaluated to true
          if(id === 'else') {
            if(!this._elseBody) throw new Error("Invariant violation: Got 'else' branch, but there is no else statement defined");
            return this._elseBody;
          }
          if(id === 'noop') {
            const noopFn: PFnBranch<unknown, RETURN, YIELD> = async function*() { return; };
            return noopFn as unknown as PFnBranch<ELSE_LVALUE, RETURN, YIELD>; // it's guaranteed to be an EO by mere presence of noop
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
  
  return new IfBuilderImpl<LVALUE, never>(cond, body);
}

interface Branchable<LVALUE, RETURN extends z.ZodTypeAny, YIELD extends z.ZodTypeAny> {
  getBranch(id: string): PFnBranch<LVALUE, RETURN, YIELD>;
  eval(): string; // branch id
}

export async function* typesafeYield<LVALUE, RETURN extends z.ZodTypeAny, YIELD extends z.ZodTypeAny>(branchable: Branchable<LVALUE, RETURN, YIELD>): AsyncGenerator<PBranch<RETURN, YIELD>, LVALUE, PCallResult> {
  const o = yield { type: 'branch', branchable };
  if(o.type !== 'result') {
    throw new Error("Invariant violation: typesafeYield expected 'result' type to be returned from yield");
  }

  return o.result as LVALUE;
}

export type CompiledFn<ARGV extends z.ZodTypeAny, RETURN extends z.ZodTypeAny, YIELD extends z.ZodTypeAny> = (args: z.infer<ARGV>) => AsyncGenerator<CompiledYield<YIELD>, z.infer<RETURN>, void>;

export type CompiledYieldValue<YIELD extends z.ZodTypeAny> = { type: 'value', value: z.infer<YIELD> };
export type CompiledYieldFlowControl = { type: 'flowControl', stack: Array<{ name: string, version: string, branch: string[]}> };
export type CompiledYield<YIELD extends z.ZodTypeAny> = CompiledYieldValue<YIELD> | CompiledYieldFlowControl;

export function compileFunction<ARGV extends z.ZodTypeAny, RETURN extends z.ZodTypeAny, YIELD extends z.ZodTypeAny>(def: PFnDef<ARGV,RETURN,YIELD>, allImpls: Array<PFnImpl<any,any,YIELD>>): CompiledFn<ARGV, RETURN, YIELD> {

  const implMap = new Map<PFnDef<any,any,YIELD>, { [version: string]: PFnImpl<any, any, YIELD> }>();

  for(const impl of allImpls) {
    const impls = implMap.get(impl.defRef) ?? {};
    impls[impl.version] = impl;
    implMap.set(impl.defRef, impls);
  }

  const latestVersion = new Map<PFnDef<any,any,YIELD>, string>();
  for(const [def, impls] of implMap.entries()) {
    const latest = Object.keys(impls).sort((a,b) => semver.rcompare(a,b))[0];
    latestVersion.set(def, latest);
  }

  const fn: CompiledFn<ARGV, RETURN, YIELD> = async function* (argv: z.infer<ARGV>): AsyncGenerator<CompiledYield<YIELD>, z.infer<RETURN>, void> {
    const latest = latestVersion.get(def);
    if(!latest) { throw new Error("Missing latest version"); }

    const impl = implMap.get(def)?.[latest];

    if(!impl) {
      throw new Error("Missing implementation for fn");
    }

    const callCtx: FnCallCtx<ARGV, RETURN, YIELD> = {
      argv: argv,
      doReturn: async function*(v: RETURN) {
        const r: PReturn<RETURN> = { type: "return", v };
        yield r;
      },
      doYield: async function*(v: YIELD) {
        const r: PYield<YIELD> = { type: "yield", v };
        yield r;
      }
    }

    interface Stack {
      calls: StackCall[]
    }

    interface StackCall {
      impl: PFnImpl<any, any, YIELD>,
      generator: ReturnType<PFnBody<z.ZodTypeAny,z.ZodTypeAny,YIELD>>
      branches: StackBranch[]
    }

    interface StackBranch {
      name: string;
      generator: ReturnType<PFnBranch<z.ZodTypeAny, z.ZodTypeAny, YIELD>>
    }


    const stack: Stack = {
      calls: [
        {
          impl,
          generator: impl.body(callCtx),
          branches: []
        }
      ]
    }

    let returnValue: [PCallResult] | [] = [];

    const doStatus = function*() {
      const status: CompiledYieldFlowControl = {
        type: "flowControl",
        stack: stack.calls.map((call) => ({
          name: call.impl.defRef.name,
          version: call.impl.version,
          branch: call.branches.map(branch => branch.name)
        }))
      }
      yield status;
    }

    while(stack.calls.length !== 0) {
      const curCall = stack.calls[stack.calls.length-1];
      const isBranch = curCall.branches.length !== 0;

      const v: IteratorResult<PPause<any, YIELD>, any> = isBranch ?
        await curCall.branches[curCall.branches.length - 1].generator.next(...returnValue) :
        await curCall.generator.next(...returnValue)
      ;

      returnValue = [];

      if(v.done) {
        returnValue = [{ type: 'result', result: v.value }];
        if(isBranch) curCall.branches.pop(); else stack.calls.pop();
        yield* doStatus();
      } else if(v.value.type === "branch") {
        const name = v.value.branchable.eval();
        const generator = v.value.branchable.getBranch(name)();
        curCall.branches.push({
          name,
          generator
        })
        yield* doStatus();
      } else if(v.value.type === "return") {
        returnValue = [{ type: 'result', result: v.value.v }];
        stack.calls.pop();
      } else if(v.value.type === "yield") {
        const value = v.value.v;
        const doDis: CompiledYieldValue<YIELD> = { type: 'value', value }
        yield doDis;
      } else {
        console.log("Unknown value returned from generator: "+v);
      }
    }

    return returnValue[0]?.result;
  }

  return fn;
}