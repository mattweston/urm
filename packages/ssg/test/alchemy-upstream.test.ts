import { Context } from "effect"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { resolveUpstream, upstreamAny } from "alchemy/Output"

describe("Alchemy dependency traversal compatibility", () => {
    // Allow the isolated process's own 10s deadline to expire before the test's.
    it(
        "plans and evaluates the actual state-store Worker without deploying it",
        { timeout: 15000 },
        () => {
            const output = execFileSync(
                process.execPath,
                [
                    "--input-type=module",
                    "-e",
                    `
            import assert from "node:assert/strict";
            import { Context, Effect } from "effect";
            import { Stack } from "alchemy/Stack";
            import { of, all, evaluate, upstream, upstreamAny } from "alchemy/Output";
            import { make } from "alchemy/Plan";
            import { State, InMemoryService } from "alchemy/State";
            import { Provider } from "alchemy/Provider";
            import { havePropsChanged, isResolved, stripEffects, stripUnresolved } from "alchemy/Diff";
            import { encodeState } from "alchemy/State/StateEncoding";
            const { default: Api } = await import(new URL(
                "Cloudflare/StateStore/Api.js", import.meta.resolve("alchemy")
            ));
            const stack = { name: "OfflineTest", stage: "test", resources: {}, bindings: {}, actions: {}, output: {} };
            Effect.runSync(Api.pipe(Effect.provideService(Stack, stack), Effect.asVoid));
            assert.ok(stack.resources.Api);
            for (const resource of Object.values(stack.resources)) {
                upstreamAny(resource.Props);
                const reference = of(resource);
                assert.deepEqual(upstreamAny({ repeated: all(reference, reference) }), { [resource.FQN]: resource });
                assert.deepEqual(upstream(all(reference, reference)), { [resource.FQN]: resource });
            }
            for (const bindings of Object.values(stack.bindings)) upstreamAny(bindings);
            let providers = Context.make(State, InMemoryService());
            for (const resource of Object.values(stack.resources)) {
                providers = Context.add(providers, Provider(resource.Type), {
                    Type: resource.Type,
                    stables: [],
                    diff: () => Effect.succeed({ action: "update" }),
                });
            }
            const plan = await Effect.runPromise(make(stack).pipe(Effect.provideContext(providers)));
            const captured = stack.resources.Api.Props.exports.Store.services;
            assert.ok(Context.isContext(captured));
            assert.equal(plan.resources.Api.props.exports.Store.services, captured);
            const outputs = Object.fromEntries(Object.keys(stack.resources).map(key => [key, {}]));
            const evaluated = await Effect.runPromise(evaluate(plan.resources.Api.props, outputs));
            assert.equal(evaluated.exports.Store.services, captured);
            const props = { services: captured, name: "test" };
            assert.equal(isResolved(props), true);
            assert.deepEqual(stripEffects(props), { services: undefined, name: "test" });
            assert.deepEqual(stripUnresolved(props), { services: undefined, name: "test" });
            assert.equal(havePropsChanged({ name: "test" }, props), false);
            assert.equal(havePropsChanged({ name: "different" }, props), true);
            assert.equal(JSON.stringify(encodeState(props)), '{"name":"test"}');
            console.log("state-store traversal passed");
        `,
                ],
                {
                    cwd: fileURLToPath(new URL("../", import.meta.url)),
                    encoding: "utf8",
                    timeout: 10000,
                }
            )
            expect(output.trim()).toBe("state-store traversal passed")
        }
    )

    it("handles a self-referencing Effect context", () => {
        const context = Context.empty()
        expect(resolveUpstream({ services: context })).toEqual({})
        expect(upstreamAny({ services: context })).toEqual({})
    })

    it("preserves dependencies through cycles, outputs, and shared references", () => {
        const first = { Type: "TestResource", FQN: "first" }
        const second = { Type: "TestResource", FQN: "second" }
        const cyclic: { self?: object; dependency: object } = {
            dependency: first,
        }
        cyclic.self = cyclic
        const array: object[] = [cyclic, second]
        array.push(array)
        const input = { cyclic, shared: cyclic, array }
        const expected = { first, second }

        expect(upstreamAny(input)).toEqual(expected)
        expect(resolveUpstream(input)).toEqual(expected)
        expect(upstreamAny([input, input])).toEqual(expected)
        expect(resolveUpstream(input)).toEqual(expected)
    })
})
