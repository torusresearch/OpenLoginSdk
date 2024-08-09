/* eslint-disable mocha/max-top-level-suites */
import assert from "assert";

import { errorCodes, providerErrors, rpcErrors } from "../src/errors";
import { getMessageFromCode, isPlainObject, JSON_RPC_SERVER_ERROR_MESSAGE } from "../src/errors/utils";
import { CUSTOM_ERROR_CODE, CUSTOM_ERROR_MESSAGE, dummyData, dummyDataWithCause, dummyMessage, SERVER_ERROR_CODE } from "./__fixtures__";

describe("rpcErrors.invalidInput", function () {
  it("accepts a single string argument where appropriate", function () {
    const error = rpcErrors.invalidInput(CUSTOM_ERROR_MESSAGE);
    assert.strictEqual(error.code, errorCodes.rpc.invalidInput);
    assert.strictEqual(error.message, CUSTOM_ERROR_MESSAGE);
  });
});

describe("providerErrors.unauthorized", function () {
  it("accepts a single string argument where appropriate", function () {
    const error = providerErrors.unauthorized(CUSTOM_ERROR_MESSAGE);
    assert.strictEqual(error.code, errorCodes.provider.unauthorized);
    assert.strictEqual(error.message, CUSTOM_ERROR_MESSAGE);
  });
});

describe("custom provider error options", function () {
  it("throws if the value is not an options object", function () {
    assert.throws(() => {
      // @ts-expect-error Invalid input
      providerErrors.custom("bar");
    }, new Error("Ethereum Provider custom errors must provide single object argument."));
  });

  it("throws if the value is invalid", function () {
    assert.throws(() => {
      // @ts-expect-error Invalid input
      providerErrors.custom({ code: 4009, message: 2 });
    }, new Error('"message" must be a nonempty string'));

    assert.throws(() => {
      providerErrors.custom({ code: 4009, message: "" });
    }, new Error('"message" must be a nonempty string'));
  });
});

describe("rpcErrors.server", function () {
  it("throws on invalid input", function () {
    assert.throws(() => {
      // @ts-expect-error Invalid input
      rpcErrors.server("bar");
    }, new Error("Ethereum RPC Server errors must provide single object argument."));

    assert.throws(() => {
      // @ts-expect-error Invalid input
      rpcErrors.server({ code: "bar" });
    }, new Error('"code" must be an integer such that: -32099 <= code <= -32005'));

    assert.throws(() => {
      rpcErrors.server({ code: 1 });
    }, new Error('"code" must be an integer such that: -32099 <= code <= -32005'));
  });

  it("returns appropriate value", function () {
    const error = rpcErrors.server({
      code: SERVER_ERROR_CODE,
      data: { ...dummyData },
    });

    assert.strictEqual(error.code <= -32000 && error.code >= -32099, true);
    assert.strictEqual(error.message, JSON_RPC_SERVER_ERROR_MESSAGE);
  });
});

describe("rpcErrors", function () {
  // eslint-disable-next-line mocha/no-setup-in-describe
  Object.entries(rpcErrors)
    .filter(([key]) => key !== "server")
    .forEach(([key, value]) =>
      it(`${key} returns appropriate value`, function () {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createError = value as any;
        const error = createError({
          message: null,
          data: { ...dummyData },
        });
        // @ts-expect-error TypeScript does not like indexing into this with the key
        const rpcCode = errorCodes.rpc[key];
        assert.strictEqual(Object.values(errorCodes.rpc).includes(error.code) || (error.code <= -32000 && error.code >= -32099), true);
        assert.strictEqual(error.code, rpcCode);
        assert.strictEqual(error.message, getMessageFromCode(rpcCode));
      })
    );

  // eslint-disable-next-line mocha/no-setup-in-describe
  Object.entries(rpcErrors)
    .filter(([key]) => key !== "server")
    .forEach(([key, value]) =>
      it(`${key} propagates data.cause if set`, function () {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createError = value as any;
        const error = createError({
          message: null,
          data: { ...dummyDataWithCause },
        });
        // @ts-expect-error TypeScript does not like indexing into this with the key
        const rpcCode = errorCodes.rpc[key];
        assert.strictEqual(error.message, getMessageFromCode(rpcCode));
        assert.strictEqual(error.cause.message, dummyMessage);
      })
    );

  it("serializes a cause", function () {
    const error = rpcErrors.invalidInput({
      data: {
        foo: "bar",
        cause: new Error("foo"),
      },
    });

    const serializedError = error.serialize();
    assert(serializedError.data);
    assert(isPlainObject(serializedError.data));

    assert.ok(!((serializedError.data as { cause?: unknown }).cause instanceof Error));
    assert.equal(
      (
        serializedError.data as {
          foo: string;
          cause: Error;
        }
      ).foo,
      "bar"
    );
    assert.equal(
      (
        serializedError.data as {
          foo: string;
          cause: Error;
        }
      ).cause.message,
      "foo"
    );
    // assert.deepEqual(serializedError.data, {
    //   foo: "bar",
    //   cause: {
    //     message: "foo",
    //     stack: "Error: foo",
    //   },
    // });
  });

  it("serializes a non-Error-instance cause", function () {
    const error = rpcErrors.invalidInput({
      data: {
        foo: "bar",
        cause: "foo",
      },
    });

    const serializedError = error.serialize();
    assert(serializedError.data);
    assert(isPlainObject(serializedError.data));

    assert.ok(!((serializedError.data as { cause?: unknown }).cause instanceof Error));
    assert.deepStrictEqual(serializedError.data, {
      foo: "bar",
      cause: "foo",
    });
  });
});

describe("providerErrors", function () {
  // eslint-disable-next-line mocha/no-setup-in-describe
  Object.entries(providerErrors)
    .filter(([key]) => key !== "custom")
    .forEach(([key, value]) =>
      it(`${key} returns appropriate value`, function () {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createError = value as any;
        const error = createError({
          message: null,
          data: { ...dummyData },
        });
        // @ts-expect-error TypeScript does not like indexing into this with the key
        const providerCode = errorCodes.provider[key];
        assert.strictEqual(error.code >= 1000 && error.code < 5000, true);
        assert.strictEqual(error.code, providerCode);
        assert.strictEqual(error.message, getMessageFromCode(providerCode));
      })
    );

  // eslint-disable-next-line mocha/no-setup-in-describe
  Object.entries(providerErrors)
    .filter(([key]) => key !== "custom")
    .forEach(([key, value]) =>
      it(`${key} propagates data.cause if set`, function () {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createError = value as any;
        const error = createError({
          message: null,
          data: { ...dummyDataWithCause },
        });
        // @ts-expect-error TypeScript does not like indexing into this with the key
        const providerCode = errorCodes.provider[key];
        assert.strictEqual(error.message, getMessageFromCode(providerCode));
        assert.strictEqual(error.cause.message, dummyMessage);
      })
    );

  it("custom returns appropriate value", function () {
    const error = providerErrors.custom({
      code: CUSTOM_ERROR_CODE,
      message: CUSTOM_ERROR_MESSAGE,
      data: { ...dummyData },
    });
    assert.equal(error.code >= 1000 && error.code < 5000, true);
    assert.equal(error.code, CUSTOM_ERROR_CODE);
    assert.equal(error.message, CUSTOM_ERROR_MESSAGE);
  });

  it("serializes a cause", function () {
    const error = providerErrors.unauthorized({
      data: {
        foo: "bar",
        cause: new Error("foo"),
      },
    });

    const serializedError = error.serialize();
    assert(serializedError.data);
    assert(isPlainObject(serializedError.data));

    assert.ok(!((serializedError.data as { cause?: unknown }).cause instanceof Error));
    assert.equal(
      (
        serializedError.data as {
          foo: string;
          cause: Error;
        }
      ).foo,
      "bar"
    );
    assert.equal(
      (
        serializedError.data as {
          foo: string;
          cause: Error;
        }
      ).cause.message,
      "foo"
    );
  });

  it("serializes a non-Error-instance cause", function () {
    const error = providerErrors.unauthorized({
      data: {
        foo: "bar",
        cause: "foo",
      },
    });

    const serializedError = error.serialize();
    assert(serializedError.data);
    assert(isPlainObject(serializedError.data));

    assert.ok(!((serializedError.data as { cause?: unknown }).cause instanceof Error));
    assert.deepStrictEqual(serializedError.data, {
      foo: "bar",
      cause: "foo",
    });
  });
});
