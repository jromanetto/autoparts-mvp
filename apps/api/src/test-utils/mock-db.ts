/**
 * Chainable mock for Drizzle ORM's query builder.
 *
 * Usage:
 *   const mockDb = createMockDb();
 *   mockDb._setResults(resultForFirstQuery, resultForSecondQuery, ...);
 *   // Each select()/insert()/update()/delete() call consumes the next result.
 */

function createChain(getResult: () => unknown) {
  const chain: unknown = new Proxy(function noop() {}, {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve?: (v: unknown) => unknown,
          reject?: (e: unknown) => unknown
        ) => {
          const result = getResult();
          if (result instanceof Error) {
            return Promise.reject(result).then(resolve, reject);
          }
          return Promise.resolve(result).then(resolve, reject);
        };
      }
      // Every other property (from, where, orderBy, limit, offset, returning, set, values, leftJoin, etc.)
      // returns a function that returns the same chain.
      return (..._args: unknown[]) => chain;
    },
    apply() {
      return chain;
    },
  });
  return chain;
}

export function createMockDb() {
  const results: unknown[] = [];
  let callIndex = 0;

  function nextResult(): unknown {
    const idx = callIndex++;
    return idx < results.length ? results[idx] : [];
  }

  const db = {
    select: (..._args: unknown[]) => createChain(nextResult),
    insert: (..._args: unknown[]) => createChain(nextResult),
    update: (..._args: unknown[]) => createChain(nextResult),
    delete: (..._args: unknown[]) => createChain(nextResult),

    /** Configure results for upcoming queries, in call order. */
    _setResults(...vals: unknown[]) {
      results.length = 0;
      results.push(...vals);
      callIndex = 0;
    },

    _reset() {
      results.length = 0;
      callIndex = 0;
    },
  };

  return db;
}

export type MockDb = ReturnType<typeof createMockDb>;
